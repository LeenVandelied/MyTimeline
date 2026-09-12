package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.domain.exceptions.InvalidPasswordResetTokenException;
import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.PasswordResetService;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Test de concurrence anti-TOCTOU sur la consommation du token de reset (issue #143).
 *
 * <p>AC : deux requêtes {@code reset-password} concurrentes portant le MÊME token ->
 * une seule doit réussir. Le verrou optimiste {@code @Version} (V15) sur
 * {@code PasswordResetTokenEntity} garantit l'invariant : le UPDATE de {@code used_at}
 * porte {@code WHERE version=<version-lue-au-CHECK>}. Selon l'ordonnancement, la requête
 * perdante est rejetée soit au CHECK ({@code isUsable} faux car déjà consommé), soit au
 * flush ({@code ObjectOptimisticLockingFailureException} convertie en 400 générique).
 * Dans les deux cas : jamais deux succès.
 *
 * <p>Classe volontairement NON {@code @Transactional} : on a besoin de vrais commits
 * (le seed doit être visible des threads concurrents) et de transactions séparées par
 * thread ({@code resetPassword} est {@code @Transactional}, borné par thread).
 * Container Postgres jetable (données uniques par UUID, pas de cleanup requis).
 */
@SpringBootTest
class PasswordResetTokenConcurrencyIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private TransactionTemplate txTemplate;

    @Test
    void concurrentConsumptionOfSameToken_onlyOneSucceeds() throws Exception {
        // --- Seed COMMITTÉ (visible des threads concurrents) : un user + un token valide.
        // On enveloppe dans un TransactionTemplate : appelé directement (hors service
        // @Transactional), repository.save fait des super.save internes qui court-circuitent
        // le proxy transactionnel -> sans tx, l'INSERT ne serait jamais committé.
        // id=null OBLIGATOIRE en création : UserEntity porte @GeneratedValue -> l'UUID est
        // assigné par Hibernate. On relit l'id RÉELLEMENT persisté (le renvoyé par save).
        String suffix = shortId();
        UUID userId = txTemplate.execute(status -> userRepository.save(new User(
                null,
                "Alice " + suffix,
                "u" + suffix,
                "$2a$10$abcdefghijklmnopqrstuv", // hash factice (aucune validation au persist)
                "ROLE_USER",
                suffix + "@example.com")).getId());

        UUID tokenValue = UUID.randomUUID();
        txTemplate.executeWithoutResult(status -> tokenRepository.create(new PasswordResetToken(
                UUID.randomUUID(), userId, tokenValue, LocalDateTime.now().plusHours(1), null)));

        // --- Deux consommations concurrentes du MÊME token, relâchées simultanément ---
        int threads = 2;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        List<Future<Boolean>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < threads; i++) {
                String newPassword = "newpass" + i;
                Callable<Boolean> task = () -> {
                    startGate.await();
                    try {
                        passwordResetService.resetPassword(tokenValue.toString(), newPassword);
                        return Boolean.TRUE; // succès
                    } catch (InvalidPasswordResetTokenException ex) {
                        return Boolean.FALSE; // rejet propre (CHECK ou verrou optimiste)
                    }
                };
                futures.add(pool.submit(task));
            }
            startGate.countDown(); // top départ synchronisé

            int success = 0;
            int rejected = 0;
            for (Future<Boolean> f : futures) {
                if (f.get(30, TimeUnit.SECONDS)) {
                    success++;
                } else {
                    rejected++;
                }
            }

            // Invariant central de l'AC : exactement un succès, un rejet. Jamais deux succès.
            assertThat(success).as("exactement une consommation réussie").isEqualTo(1);
            assertThat(rejected).as("exactement une consommation rejetée").isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }

        // Token désormais consommé : toute nouvelle tentative est rejetée (usage unique).
        assertThatThrownBy(() -> passwordResetService.resetPassword(tokenValue.toString(), "again"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);
    }

    /** Suffixe court unique -> username/email valides (username @Size 3..20, unique). */
    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
