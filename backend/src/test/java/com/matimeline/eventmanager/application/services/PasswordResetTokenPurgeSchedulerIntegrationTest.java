package com.matimeline.eventmanager.application.services;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #139 — purge TTL des tokens de reset password. Parcourt la VRAIE chaîne Postgres
 * (Testcontainers, migrations V1..V15 incl. la colonne @Version).
 *
 * <p>Test des BORNES (fenêtre de rétention par défaut = 24h) :
 * <ul>
 *   <li>token CONSOMMÉ ({@code used_at} non nul, même expiration future) -> supprimé ;</li>
 *   <li>token EXPIRÉ au-delà de la rétention ({@code expires_at} = now-48h) -> supprimé ;</li>
 *   <li>token VALIDE (non consommé, {@code expires_at} futur) -> CONSERVÉ (jamais purgé) ;</li>
 *   <li>token expiré RÉCEMMENT, dans la fenêtre de rétention ({@code expires_at} = now-30min)
 *       -> CONSERVÉ (la marge de rétention protège les expirations de dernière minute).</li>
 * </ul>
 *
 * <p>Déterminisme : on invoque {@link PasswordResetTokenPurgeScheduler#purgeConsumedAndExpired()}
 * DIRECTEMENT puis on asserte immédiatement — le tick {@code @Scheduled} automatique
 * (initial-delay 5 min par défaut) ne peut pas se déclencher pendant ce corps de test
 * (sous la seconde). On garde donc les propriétés PAR DÉFAUT (rétention 24h, aucun override) :
 * cela laisse ce test partager le contexte {@code @SpringBootTest} commun (mêmes propriétés)
 * plutôt que d'en cacher un nouveau — un contexte supplémentaire ajouterait un pool Hikari et
 * saturait les connexions Postgres ("too many clients") avec les nombreux @SpringBootTest.
 */
@SpringBootTest
class PasswordResetTokenPurgeSchedulerIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private PasswordResetTokenPurgeScheduler scheduler;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private EntityManager em;

    @Autowired
    private PlatformTransactionManager txManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Crée un utilisateur (FK password_reset_tokens.user_id -> users) et renvoie son id. */
    private UUID seedUser() {
        String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("PurgeTest");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
            em.persist(user);
            em.flush();
            return user.getId();
        });
    }

    /** Persiste un token avec expiration / consommation contrôlées. Renvoie sa valeur UUID. */
    private UUID seedToken(UUID ownerId, LocalDateTime expiresAt, LocalDateTime usedAt) {
        UUID tokenValue = UUID.randomUUID();
        new TransactionTemplate(txManager).executeWithoutResult(status ->
                tokenRepository.create(new PasswordResetToken(
                        UUID.randomUUID(), ownerId, tokenValue, expiresAt, usedAt)));
        return tokenValue;
    }

    @Test
    void purge_removesConsumedAndStaleExpired_keepsValidAndRecentlyExpired() {
        UUID ownerId = seedUser();
        LocalDateTime now = LocalDateTime.now();

        UUID consumed = seedToken(ownerId, now.plusMinutes(10), now.minusMinutes(1));
        UUID staleExpired = seedToken(ownerId, now.minusHours(48), null);
        UUID valid = seedToken(ownerId, now.plusMinutes(10), null);
        UUID recentlyExpired = seedToken(ownerId, now.minusMinutes(30), null);

        // Préconditions : les 4 tokens sont présents avant purge.
        assertTrue(tokenRepository.findByToken(consumed).isPresent());
        assertTrue(tokenRepository.findByToken(staleExpired).isPresent());
        assertTrue(tokenRepository.findByToken(valid).isPresent());
        assertTrue(tokenRepository.findByToken(recentlyExpired).isPresent());

        // Le proxy Spring applique le @Transactional du scheduler ; le DELETE est committé.
        scheduler.purgeConsumedAndExpired();

        // Consommé + expiré hors rétention -> supprimés.
        assertFalse(tokenRepository.findByToken(consumed).isPresent(),
                "token consommé purgé");
        assertFalse(tokenRepository.findByToken(staleExpired).isPresent(),
                "token expiré au-delà de la rétention purgé");
        // Valide + expiré dans la fenêtre de rétention -> conservés (bornes respectées).
        assertTrue(tokenRepository.findByToken(valid).isPresent(),
                "token valide non expiré JAMAIS purgé");
        assertTrue(tokenRepository.findByToken(recentlyExpired).isPresent(),
                "token récemment expiré (dans la rétention 24h) conservé");
    }
}
