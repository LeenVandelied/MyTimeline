package com.matimeline.eventmanager.infrastructure.entities;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * #43 — Vérifie que l'audit JPA (@EnableJpaAuditing + AuditingEntityListener)
 * peuple createdAt/updatedAt/version au persist, et que equals/hashCode sont
 * robustes face à l'id transient (PK @GeneratedValue assignée au flush).
 *
 * @Transactional → rollback après chaque test : ne pollue pas la base dev.
 */
@SpringBootTest
@Transactional
class AuditingAndEqualityTest {

    @Autowired
    private EntityManager em;

    @Test
    void auditingPopulatesTimestampsAndVersionOnPersist() {
        CategoryEntity category = new CategoryEntity();
        category.setName("audit-test-" + UUID.randomUUID());

        em.persist(category);
        em.flush();

        assertThat(category.getId()).isNotNull();
        assertThat(category.getCreatedAt()).isNotNull();
        assertThat(category.getUpdatedAt()).isNotNull();
        assertThat(category.getVersion()).isZero();
    }

    @Test
    void versionIncrementsOnUpdate() {
        CategoryEntity category = new CategoryEntity();
        category.setName("audit-version-" + UUID.randomUUID());
        em.persist(category);
        em.flush();

        category.setName("audit-version-updated-" + UUID.randomUUID());
        em.flush();

        assertThat(category.getVersion()).isEqualTo(1);
    }

    @Test
    void equalsHandlesTransientIdWithoutClash() {
        CategoryEntity a = new CategoryEntity();
        CategoryEntity b = new CategoryEntity();

        // id transient (null) des deux côtés → instances distinctes non égales
        assertThat(a).isNotEqualTo(b);
        // réflexif même transient
        assertThat(a).isEqualTo(a);
        // hashCode stable (constante de classe) avant/après persist
        int hashBefore = a.hashCode();
        em.persist(a);
        em.flush();
        assertThat(a.hashCode()).isEqualTo(hashBefore);
        // une fois l'id assigné, égalité basée sur l'id
        assertThat(a).isNotEqualTo(b);
    }
}
