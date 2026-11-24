package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.models.UserTier;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #88 (R1) : tout compte porte le palier gratuit par défaut, de bout en bout (Postgres
 * jetable + Flyway + ddl-auto=validate). Chaque test relit le compte depuis la base
 * (flush + clear), puis la valeur BRUTE de la colonne {@code users.tier}.
 *
 * @Transactional -> rollback après chaque test ; données uniques par UUID.
 */
@SpringBootTest
@Transactional
class UserTierPersistenceIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager em;

    private String rawTier(UUID userId) {
        return (String) em.createNativeQuery("SELECT tier FROM users WHERE id = :id")
                .setParameter("id", userId)
                .getSingleResult();
    }

    @Test
    void newUser_hasFreeTierByDefault() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        // Aucun palier choisi à la création.
        User saved = userRepository.save(new User(
                null, "Tier " + suffix, "t" + suffix, "x", "ROLE_USER", "t" + suffix + "@example.test"));
        em.flush();
        em.clear();

        User reloaded = userRepository.findDomainUserById(saved.getId()).orElseThrow();

        assertThat(reloaded.getTier()).isEqualTo(UserTier.FREE);
        assertThat(rawTier(saved.getId())).isEqualTo("FREE");
    }

    @Test
    void existingUserRow_withoutTier_isFreeAfterMigration() {
        // Ligne créée en SQL sans aucune valeur de palier, comme avant la migration.
        UUID id = UUID.randomUUID();
        String suffix = id.toString();
        em.createNativeQuery(
                "INSERT INTO users "
                + "(id, created_at, updated_at, version, name, username, email, password, role) "
                + "VALUES (:id, now(), now(), 0, :name, :username, :email, 'x', 'ROLE_USER')")
                .setParameter("id", id)
                .setParameter("name", "i88-" + suffix)
                .setParameter("username", "i88-" + suffix)
                .setParameter("email", "i88-" + suffix + "@example.test")
                .executeUpdate();
        em.flush();
        em.clear();

        User reloaded = userRepository.findDomainUserById(id).orElseThrow();

        assertThat(reloaded.getTier()).isNotNull().isEqualTo(UserTier.FREE);
        assertThat(rawTier(id)).isNotNull().isEqualTo("FREE");
    }
}
