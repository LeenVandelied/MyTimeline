package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.hibernate.StaleStateException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;
import jakarta.persistence.OptimisticLockException;

/**
 * #200 (BR-EVE-015) — Vérifie de bout en bout (Postgres jetable + Flyway) que deux mises à jour
 * VRAIMENT CONCURRENTES du même event, chacune dans SA transaction, produisent un CONFLIT
 * OPTIMISTE sur la seconde à committer : l'update perdant est REJETÉ et n'écrase PAS le gagnant.
 *
 * <p>Course réelle sur DEUX threads : chaque thread ouvre sa propre transaction, appelle
 * {@code eventService.updateEvent} (qui charge l'entité gérée v0 via le repository) et attend une
 * barrière AVANT de committer, garantissant que les deux ont lu la version 0. Le premier commit
 * passe (v0 -> v1) ; le second, dont le flush exécute {@code UPDATE ... WHERE version = 0}, touche
 * 0 ligne -> conflit optimiste.
 *
 * <p>ASSERTION DÉTERMINISTE (fix flakiness suite complète) : selon le moment exact du flush,
 * l'exception qui SURFACE au bord du {@code TransactionTemplate} peut être soit la Spring
 * {@code OptimisticLockingFailureException} (traduite par le PersistenceExceptionTranslationPostProcessor
 * sur le @Repository), soit l'exception JPA/Hibernate brute ({@code OptimisticLockException} /
 * {@code StaleStateException}) quand la détection se produit au commit de la transaction plutôt
 * qu'au save du repository. Les DEUX prouvent le même comportement métier. On assert donc sur la
 * FAMILLE d'exception optimiste (peu importe la couche qui l'émet) + sur le RÉSULTAT OBSERVABLE
 * (non-écrasement : titre gagnant persisté, version=1). Le mapping HTTP 409 lui-même est verrouillé
 * de façon déterministe par {@code GlobalExceptionHandlerOptimisticLockTest} (slice MockMvc).
 *
 * <p>PAS de {@code @Transactional} classe : commits réels requis. Nettoyage natif en fin de test
 * (conteneur Postgres partagé entre classes).
 */
@SpringBootTest
class EventOptimisticLockConflictIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private EventService eventService;

    @Autowired
    private TransactionTemplate txTemplate;

    /**
     * Critère d'acceptation #200 : 2 updates concurrents -> le 2e est rejeté par un conflit
     * optimiste (famille mappée 409 par GlobalExceptionHandler) et n'écrase PAS le gagnant.
     */
    @Test
    void twoConcurrentUpdates_secondFailsWithOptimisticLock() throws Exception {
        UUID eventId = persistEventGraph();

        // Deux transactions ouvrent, lisent (v0), puis attendent la barrière avant de committer.
        CountDownLatch bothLoaded = new CountDownLatch(2);
        CountDownLatch firstCommitted = new CountDownLatch(1);
        AtomicReference<Throwable> secondError = new AtomicReference<>();

        Runnable winner = () -> txTemplate.executeWithoutResult(status -> {
            eventService.updateEvent(eventId, titleCommand("titre-WINNER"));
            bothLoaded.countDown();
            await(bothLoaded);         // s'assure que le perdant a lu v0 AVANT ce commit
            // fin du lambda -> commit (v0 -> v1)
        });

        Runnable loser = () -> {
            try {
                txTemplate.executeWithoutResult(status -> {
                    eventService.updateEvent(eventId, titleCommand("titre-LOSER"));
                    bothLoaded.countDown();
                    await(bothLoaded);     // les deux ont lu v0
                    await(firstCommitted); // laisse le gagnant committer d'abord
                    status.flush();        // force le flush -> UPDATE ... WHERE version=0 -> conflit
                });
            } catch (Throwable t) {
                secondError.set(t);
            }
        };

        Thread tLoser = new Thread(loser, "opt-lock-loser");
        tLoser.start();

        Thread tWinner = new Thread(winner, "opt-lock-winner");
        tWinner.start();
        tWinner.join(10_000);
        firstCommitted.countDown(); // le gagnant a committé, le perdant peut tenter son flush
        tLoser.join(10_000);

        // Le 2e update est REJETÉ par un conflit optimiste — famille acceptée (Spring OU JPA/Hibernate),
        // insensible au moment exact du flush qui décide de la couche émettrice.
        assertThat(secondError.get())
                .as("le 2e update concurrent doit être rejeté par un conflit optimiste")
                .isNotNull();
        assertThat(isOptimisticLockFailure(secondError.get()))
                .as("l'exception du 2e update (%s) doit appartenir à la famille optimistic-lock",
                        secondError.get())
                .isTrue();

        // Résultat observable (déterministe) : non-écrasement. Le gagnant a survécu, version bumpée.
        txTemplate.executeWithoutResult(status -> {
            EventEntity reloaded = em.find(EventEntity.class, eventId);
            assertThat(reloaded.getTitle()).isEqualTo("titre-WINNER");
            assertThat(reloaded.getVersion()).isEqualTo(1);
        });

        cleanup(eventId);
    }

    /**
     * Reconnaît un conflit optimiste quelle que soit la couche émettrice, en parcourant la chaîne
     * de causes : Spring {@link OptimisticLockingFailureException} (dont dérive celle mappée en 409),
     * ou JPA {@link OptimisticLockException} / Hibernate {@link StaleStateException} brutes.
     */
    private boolean isOptimisticLockFailure(Throwable t) {
        for (Throwable cur = t; cur != null; cur = cur.getCause()) {
            if (cur instanceof OptimisticLockingFailureException
                    || cur instanceof OptimisticLockException
                    || cur instanceof StaleStateException) {
                return true;
            }
            if (cur.getCause() == cur) {
                break;
            }
        }
        return false;
    }

    private EventUpdateCommand titleCommand(String title) {
        return new EventUpdateCommand(title, null, null, null, null, null, null, null, null, null, null);
    }

    private UUID persistEventGraph() {
        return txTemplate.execute(status -> {
            String suffix = UUID.randomUUID().toString();
            UserEntity user = new UserEntity();
            user.setName("i200-user-" + suffix);
            user.setUsername("i200-user-" + suffix);
            user.setEmail("i200-user-" + suffix + "@example.test");
            user.setPassword("x");
            user.setRole("USER");
            em.persist(user);

            CategoryEntity category = new CategoryEntity();
            category.setName("i200-cat-" + UUID.randomUUID());
            em.persist(category);

            ProductEntity product = new ProductEntity();
            product.setName("i200-product-" + UUID.randomUUID());
            product.setCategory(category);
            product.setUser(user);
            product.setArchived(false);
            em.persist(product);

            EventEntity entity = new EventEntity();
            entity.setTitle("i200-event-" + UUID.randomUUID());
            entity.setType("single");
            entity.setIsRecurring(false);
            entity.setStartDate(LocalDate.of(2026, 1, 1));
            entity.setEndDate(LocalDate.of(2026, 1, 1));
            entity.setProduct(product);
            em.persist(entity);
            return entity.getId();
        });
    }

    private void cleanup(UUID eventId) {
        txTemplate.executeWithoutResult(status ->
                em.createNativeQuery("DELETE FROM events WHERE id = :id")
                        .setParameter("id", eventId)
                        .executeUpdate());
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
