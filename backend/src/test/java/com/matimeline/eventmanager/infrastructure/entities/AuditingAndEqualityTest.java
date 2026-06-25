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

    // ---------------------------------------------------------------------
    // #43 review — même pattern audit/version/equals sur User/Product/Event.
    // FK NOT NULL (V1 baseline) : product→category, event→product → on monte
    // le graphe minimal requis pour persister.
    // ---------------------------------------------------------------------

    private UserEntity newUser() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("audit-user-" + suffix);
        user.setUsername("user-" + suffix);
        user.setEmail("user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("USER");
        return user;
    }

    private CategoryEntity persistCategory() {
        CategoryEntity category = new CategoryEntity();
        category.setName("audit-cat-" + UUID.randomUUID());
        em.persist(category);
        return category;
    }

    private ProductEntity newProduct() {
        ProductEntity product = new ProductEntity();
        product.setName("audit-product-" + UUID.randomUUID());
        product.setCategory(persistCategory());
        return product;
    }

    private EventEntity newEvent() {
        ProductEntity product = newProduct();
        em.persist(product);
        EventEntity event = new EventEntity();
        event.setTitle("audit-event-" + UUID.randomUUID());
        event.setType("single");
        event.setProduct(product);
        return event;
    }

    // ---- UserEntity ----

    @Test
    void userAuditingPopulatesTimestampsAndVersionOnPersist() {
        UserEntity user = newUser();

        em.persist(user);
        em.flush();

        assertThat(user.getId()).isNotNull();
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();
        assertThat(user.getVersion()).isZero();
    }

    @Test
    void userVersionIncrementsOnUpdate() {
        UserEntity user = newUser();
        em.persist(user);
        em.flush();

        user.setName("audit-user-updated-" + UUID.randomUUID());
        em.flush();

        assertThat(user.getVersion()).isEqualTo(1);
    }

    @Test
    void userEqualsHandlesTransientIdWithoutClash() {
        UserEntity a = new UserEntity();
        UserEntity b = new UserEntity();

        assertThat(a).isNotEqualTo(b);
        assertThat(a).isEqualTo(a);
        int hashBefore = a.hashCode();
        em.persist(newUserFrom(a));
        em.flush();
        assertThat(a.hashCode()).isEqualTo(hashBefore);
    }

    private UserEntity newUserFrom(UserEntity a) {
        String suffix = UUID.randomUUID().toString();
        a.setName("audit-user-" + suffix);
        a.setUsername("user-" + suffix);
        a.setEmail("user-" + suffix + "@example.test");
        a.setPassword("x");
        a.setRole("USER");
        return a;
    }

    // ---- ProductEntity ----

    @Test
    void productAuditingPopulatesTimestampsAndVersionOnPersist() {
        ProductEntity product = newProduct();

        em.persist(product);
        em.flush();

        assertThat(product.getId()).isNotNull();
        assertThat(product.getCreatedAt()).isNotNull();
        assertThat(product.getUpdatedAt()).isNotNull();
        assertThat(product.getVersion()).isZero();
    }

    @Test
    void productVersionIncrementsOnUpdate() {
        ProductEntity product = newProduct();
        em.persist(product);
        em.flush();

        product.setName("audit-product-updated-" + UUID.randomUUID());
        em.flush();

        assertThat(product.getVersion()).isEqualTo(1);
    }

    @Test
    void productEqualsHandlesTransientIdWithoutClash() {
        ProductEntity a = new ProductEntity();
        ProductEntity b = new ProductEntity();

        assertThat(a).isNotEqualTo(b);
        assertThat(a).isEqualTo(a);
        int hashBefore = a.hashCode();
        a.setName("audit-product-" + UUID.randomUUID());
        a.setCategory(persistCategory());
        em.persist(a);
        em.flush();
        assertThat(a.hashCode()).isEqualTo(hashBefore);
    }

    // ---- EventEntity ----

    @Test
    void eventAuditingPopulatesTimestampsAndVersionOnPersist() {
        EventEntity event = newEvent();

        em.persist(event);
        em.flush();

        assertThat(event.getId()).isNotNull();
        assertThat(event.getCreatedAt()).isNotNull();
        assertThat(event.getUpdatedAt()).isNotNull();
        assertThat(event.getVersion()).isZero();
    }

    @Test
    void eventVersionIncrementsOnUpdate() {
        EventEntity event = newEvent();
        em.persist(event);
        em.flush();

        event.setTitle("audit-event-updated-" + UUID.randomUUID());
        em.flush();

        assertThat(event.getVersion()).isEqualTo(1);
    }

    @Test
    void eventEqualsHandlesTransientIdWithoutClash() {
        EventEntity a = new EventEntity();
        EventEntity b = new EventEntity();

        assertThat(a).isNotEqualTo(b);
        assertThat(a).isEqualTo(a);
        int hashBefore = a.hashCode();
        ProductEntity product = newProduct();
        em.persist(product);
        a.setTitle("audit-event-" + UUID.randomUUID());
        a.setType("single");
        a.setProduct(product);
        em.persist(a);
        em.flush();
        assertThat(a.hashCode()).isEqualTo(hashBefore);
    }
}
