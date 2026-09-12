package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #122 — Vérifie de bout en bout (Postgres jetable + Flyway V1..V12) le
 * durcissement posé par V12 sur {@code users.role} :
 *   - NOT NULL          : role NULL rejeté ;
 *   - ck_users_role     : role hors-enum rejeté (seuls ROLE_USER / ROLE_ADMIN OK).
 *
 * Couvre le REJET DB (NULL + hors-enum) ET la NON-RÉGRESSION des deux rôles
 * légitimes. Insertions en SQL natif pour court-circuiter les validations
 * applicatives (@Column(nullable=false) côté JPA) et frapper directement les
 * contraintes DB. Que V12 ait bootê prouve aussi que Flyway rejoue la chaîne
 * complète sans casser (base fraîche = UPDATE de l'étape 1 touche 0 ligne).
 *
 * @Transactional -> rollback après chaque test ; données uniques par UUID.
 */
@SpringBootTest
@Transactional
class UserRoleConstraintIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    /**
     * Insertion native minimale d'un user. {@code role} est bindé et peut valoir
     * NULL, court-circuitant @Column(nullable=false) pour tester la contrainte DB.
     */
    private void insertUser(String role) {
        String suffix = UUID.randomUUID().toString();
        em.createNativeQuery(
                "INSERT INTO users "
                + "(id, created_at, updated_at, version, name, username, email, password, role) "
                + "VALUES (:id, now(), now(), 0, :name, :username, :email, 'x', :role)")
                .setParameter("id", UUID.randomUUID())
                .setParameter("name", "i122-" + suffix)
                .setParameter("username", "i122-" + suffix)
                .setParameter("email", "i122-" + suffix + "@example.test")
                .setParameter("role", role)
                .executeUpdate();
        em.flush();
    }

    // ---------- REJET : NOT NULL ----------

    /** role NULL -> rejeté par la contrainte NOT NULL (V12 étape 2). */
    @Test
    void nullRole_isRejected() {
        assertThatThrownBy(() -> insertUser(null))
                .isInstanceOf(Exception.class);
    }

    // ---------- REJET : ck_users_role ----------

    /** role hors-enum -> rejeté par le CHECK (V12 étape 3). */
    @Test
    void invalidRole_isRejectedByCheckConstraint() {
        assertThatThrownBy(() -> insertUser("USER"))
                .isInstanceOf(Exception.class);
    }

    /** Autre valeur hors-enum -> rejetée. */
    @Test
    void arbitraryRole_isRejectedByCheckConstraint() {
        assertThatThrownBy(() -> insertUser("ROLE_SUPERADMIN"))
                .isInstanceOf(Exception.class);
    }

    // ---------- NON-RÉGRESSION : rôles légitimes acceptés ----------

    /** role='ROLE_USER' -> accepté. */
    @Test
    void roleUser_isAccepted() {
        assertThatCode(() -> insertUser("ROLE_USER"))
                .doesNotThrowAnyException();
    }

    /** role='ROLE_ADMIN' -> accepté. */
    @Test
    void roleAdmin_isAccepted() {
        assertThatCode(() -> insertUser("ROLE_ADMIN"))
                .doesNotThrowAnyException();
    }
}
