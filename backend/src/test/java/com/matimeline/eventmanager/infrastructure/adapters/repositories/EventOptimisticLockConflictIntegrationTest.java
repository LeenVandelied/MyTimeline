package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import java.time.LocalDate;
import java.util.UUID;

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
 * #200 (BR-EVE-015) — Vérifie de bout en bout (Postgres jetable + Flyway) qu'un 2e update
 * s'appuyant sur une VERSION PÉRIMÉE (@Version) d'un event est REJETÉ par un conflit optimiste
 * et n'écrase PAS le 1er update — l'invariant métier "édition concurrente -> conflit -> 409".
 *
 * <p>SIMULATION DÉTERMINISTE (aucun thread, aucun timing) : c'est l'équivalent reproductible
 * de deux éditions concurrentes. On matérialise une VUE PÉRIMÉE de l'entité (détachée à la
 * version N), on applique un PREMIER update committé (N -> N+1 en base), puis on ré-attache la
 * vue périmée (toujours version N) et on force un {@code flush()} : Hibernate exécute
 * {@code UPDATE ... WHERE version = N}, touche 0 ligne et lève le conflit de façon systématique
 * — à chaque exécution, indépendamment de l'ordonnancement.
 *
 * <p>ASSERTION : l'exception qui surface au flush est la JPA {@code OptimisticLockException} /
 * Hibernate {@code StaleStateException} ; via un @Repository elle serait traduite en Spring
 * {@code OptimisticLockingFailureException} (mappée 409). {@code isOptimisticLockFailure} accepte
 * la FAMILLE (peu importe la couche émettrice, parcours de la chaîne de causes). Le mapping HTTP
 * 409 lui-même est verrouillé, lui, par {@code GlobalExceptionHandlerOptimisticLockTest} (slice
 * MockMvc). On vérifie aussi le RÉSULTAT OBSERVABLE : non-écrasement (version N+1, 1er update gardé).
 *
 * <p>PAS de {@code @Transactional} classe : commits réels requis pour matérialiser le bump de
 * version. Nettoyage natif en fin de test (conteneur Postgres partagé entre classes).
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
     * Critère d'acceptation #200 : un 2e update sur version périmée -> conflit optimiste
     * (famille mappée 409 par GlobalExceptionHandler), sans écraser le 1er update.
     */
    @Test
    void staleVersionUpdate_isRejectedByOptimisticLock_withoutOverwriting() {
        UUID eventId = persistEventGraph();

        // (1) Vue PÉRIMÉE : charge l'entité à la version 0 puis la détache (elle fige version=0).
        EventEntity staleView = txTemplate.execute(status -> {
            EventEntity managed = em.find(EventEntity.class, eventId);
            em.detach(managed);
            return managed;
        });
        assertThat(staleView.getVersion()).isEqualTo(0);

        // (2) 1er update committé via le service réel : version 0 -> 1 en base.
        txTemplate.executeWithoutResult(status ->
                eventService.updateEvent(eventId, titleCommand("titre-WINNER")));

        // (3) 2e update s'appuyant sur la version périmée 0 : merge de la vue détachée + flush
        //     -> UPDATE ... WHERE version = 0 -> 0 ligne -> conflit optimiste DÉTERMINISTE.
        Throwable secondError = catchThrowable(() ->
                txTemplate.executeWithoutResult(status -> {
                    staleView.setTitle("titre-LOSER");
                    em.merge(staleView);
                    em.flush();
                }));

        assertThat(secondError)
                .as("le 2e update sur version périmée doit être rejeté par un conflit optimiste")
                .isNotNull();
        assertThat(isOptimisticLockFailure(secondError))
                .as("l'exception (%s) doit appartenir à la famille optimistic-lock", secondError)
                .isTrue();

        // (4) Résultat observable : non-écrasement. Le 1er update a survécu, version bumpée à 1.
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
        return new EventUpdateCommand(title, null, null, null, null, null, null, null, null, null, null, null);
    }

    private UUID persistEventGraph() {
        return txTemplate.execute(status -> {
            String suffix = UUID.randomUUID().toString();
            UserEntity user = new UserEntity();
            user.setName("i200-user-" + suffix);
            user.setUsername("i200-user-" + suffix);
            user.setEmail("i200-user-" + suffix + "@example.test");
            user.setPassword("x");
            user.setRole("ROLE_USER");
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
}
