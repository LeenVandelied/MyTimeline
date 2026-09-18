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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.domain.exceptions.EventConflictException;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa.EventRepositoryJpaImpl;
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
    private com.matimeline.eventmanager.domain.ports.repositories.EventRepository eventRepository;

    @Autowired
    private TransactionTemplate txTemplate;

    @Autowired
    private PlatformTransactionManager txManager;

    /**
     * Impl CONCRÈTE, autowirée pour le seul contrôle négatif #175 : elle seule expose encore
     * {@code existsById}/{@code deleteById} hérités de {@code SimpleJpaRepository}, tous deux
     * retirés du port {@code EventRepository}.
     */
    @Autowired
    private EventRepositoryJpaImpl legacyRepository;

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
     * #review S42 (BR-EVE-015) — Vérifie le CHECK DÉTERMINISTE côté service (pas le filet
     * Hibernate) : deux PATCH SÉQUENTIELS via le service réel, le 2e portant une {@code version}
     * cliente PÉRIMÉE, lèvent {@link EventConflictException} AVANT tout flux Hibernate — sans
     * {@code em.detach}/{@code merge}. C'est le chemin nominal du contrat 409 #231 (le formulaire
     * renvoie la version détenue au chargement). L'exception transporte l'état serveur GAGNANT
     * (version courante + entité), et le 1er update n'est pas écrasé.
     */
    @Test
    void staleClientVersion_isRejectedByDeterministicCheck_withoutHibernateRace() {
        UUID eventId = persistEventGraph();

        // (1) 1er PATCH committé via le service (version cliente 0 = état au chargement) : 0 -> 1.
        txTemplate.executeWithoutResult(status ->
                eventService.updateEvent(eventId, titleCommandWithVersion("titre-WINNER", 0)));

        // (2) 2e PATCH avec une version cliente PÉRIMÉE (0, alors que la base est à 1). Le service
        //     recharge l'entité MANAGÉE (version 1) et compare à command.version()=0 -> décalage
        //     -> EventConflictException DÉTERMINISTE, levée avant tout UPDATE (aucun em.detach).
        Throwable secondError = catchThrowable(() ->
                txTemplate.executeWithoutResult(status ->
                        eventService.updateEvent(eventId, titleCommandWithVersion("titre-LOSER", 0))));

        assertThat(secondError)
                .as("le 2e PATCH sur version cliente périmée doit lever EventConflictException")
                .isInstanceOf(EventConflictException.class);

        EventConflictException conflict = (EventConflictException) secondError;
        assertThat(conflict.getServerVersion())
                .as("l'exception porte la version serveur COURANTE (1)")
                .isEqualTo(1);
        assertThat(conflict.getServerEvent().getVersion()).isEqualTo(1);
        assertThat(conflict.getServerEvent().getTitle())
                .as("l'état serveur gagnant reflète le 1er update, pas le LOSER")
                .isEqualTo("titre-WINNER");

        // (3) Résultat observable : non-écrasement (le LOSER n'a jamais atteint la base).
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
    /**
     * #175 — SPÉCIFICATION du comportement retenu : « la suppression gagne toujours ».
     *
     * <p>Depuis #175, la suppression passe par un DELETE bulk JPQL
     * ({@code EventRepository.deleteByIdReturningRowCount}) qui émet {@code WHERE id = ?}
     * SANS clause de version, là où l'ancien chemin finissait par {@code em.remove(entity)}
     * ({@code WHERE id = ? AND version = ?}). Un événement édité concurremment est donc
     * SUPPRIMÉ au lieu de lever un conflit optimiste.
     *
     * <p>Ce test épingle cet arbitrage plutôt que de le laisser à l'état d'effet de bord :
     * {@code DELETE /api/events/{id}} ne transporte aucune version (contrairement au PATCH,
     * cf. les deux tests ci-dessus), le client ne peut donc pas exprimer « supprime la
     * version que j'ai vue » — il n'y a aucune intention utilisateur à protéger, et un 409
     * sur DELETE serait inexploitable côté frontend. Contraste voulu et VISIBLE avec
     * {@code staleVersionUpdate_isRejectedByOptimisticLock_withoutOverwriting} : sur le même
     * scénario de version périmée, l'UPDATE échoue et le DELETE passe.
     *
     * <p>Le jour où ce choix devrait être revu, c'est CE test qui doit rougir en premier.
     */
    @Test
    void concurrentEditThenDelete_deletionWins() {
        UUID eventId = persistEventGraph();

        // (1) Édition concurrente COMMITTÉE : version 0 -> 1 en base.
        txTemplate.executeWithoutResult(status ->
                eventService.updateEvent(eventId, titleCommand("titre-EDITE-CONCURREMMENT")));
        txTemplate.executeWithoutResult(status ->
                assertThat(em.find(EventEntity.class, eventId).getVersion()).isEqualTo(1));

        // (2) Suppression #175 sur une vue d'ownership chargée AVANT... et qui l'ignore : le
        //     DELETE bulk ne porte pas de clause de version, la suppression aboutit.
        txTemplate.executeWithoutResult(status -> {
            eventRepository.findEventById(eventId);   // ce que fait checkEventOwnership
            eventService.deleteById(eventId);
        });

        // (3) Résultat observable : la ligne est partie, aucun conflit levé.
        txTemplate.executeWithoutResult(status ->
                assertThat(em.find(EventEntity.class, eventId))
                        .as("la suppression l'emporte sur l'édition concurrente (#175)")
                        .isNull());
    }

    /**
     * #175 — CONTRÔLE NÉGATIF : mesure ce que l'ancien chemin faisait RÉELLEMENT, pour que la
     * décision ci-dessus repose sur une observation et non sur une déduction.
     *
     * <p>Il reproduit la condition de production d'avant #175 : {@code open-in-view} étant
     * actif, le contrôle d'ownership et la suppression partageaient le MÊME contexte de
     * persistance, donc le {@code findById} interne de {@code SimpleJpaRepository.deleteById}
     * tapait le cache de 1er niveau et réutilisait la version lue par l'ownership. Une édition
     * concurrente committée entre les deux rendait cette version PÉRIMÉE, et le
     * {@code DELETE ... WHERE version = 0} touchait 0 ligne -> conflit optimiste.
     *
     * <p>Enseignement porté par ce test : la fenêtre que l'ancien verrou protégeait n'était
     * PAS « quelqu'un a édité pendant que j'avais la page ouverte » mais les millisecondes
     * internes à la requête DELETE. C'est ce qui rend la perte acceptable.
     *
     * <p>Déterministe, sans thread ni timing (cf. PIT-S25-002) : l'édition concurrente est
     * committée par une transaction imbriquée {@code REQUIRES_NEW}, donc toujours entre le
     * chargement et le flush.
     */
    @Test
    void legacyDeletePath_underSharedPersistenceContext_didRaiseOptimisticLock() {
        UUID eventId = persistEventGraph();

        TransactionTemplate requiresNew = new TransactionTemplate(txManager);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        Throwable legacyError = catchThrowable(() ->
                txTemplate.executeWithoutResult(status -> {
                    // (1) Ownership : charge l'EventEntity (version 0) dans le contexte partagé.
                    eventRepository.findEventById(eventId);

                    // (2) Édition concurrente committée DANS une transaction séparée : 0 -> 1.
                    requiresNew.executeWithoutResult(inner ->
                            eventService.updateEvent(eventId, titleCommand("titre-CONCURRENT")));

                    // (3) Ancien chemin : existsById puis deleteById hérité. Son findById tape
                    //     le cache de 1er niveau -> entité à la version 0, désormais périmée.
                    assertThat(legacyRepository.existsById(eventId)).isTrue();
                    legacyRepository.deleteById(eventId);
                    em.flush();
                }));

        assertThat(legacyError)
                .as("l'ancien chemin de suppression levait bien un conflit sur version périmée")
                .isNotNull();
        assertThat(isOptimisticLockFailure(legacyError))
                .as("l'exception (%s) doit appartenir à la famille optimistic-lock", legacyError)
                .isTrue();

        cleanup(eventId);
    }

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

    private EventUpdateCommand titleCommandWithVersion(String title, Integer version) {
        return new EventUpdateCommand(title, null, null, null, null, null, null, null, null, null, null, version);
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
