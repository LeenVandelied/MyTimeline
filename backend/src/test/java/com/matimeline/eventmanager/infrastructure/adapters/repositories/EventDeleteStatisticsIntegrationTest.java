package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa.EventRepositoryJpaImpl;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

/**
 * #175 — Verrou de COMPTAGE SQL sur {@code EventServiceImpl.deleteById}, et preuve que
 * le contrat 404 est préservé.
 *
 * <p>AVANT #175, le service faisait {@code existsById(id)} puis
 * {@code eventRepository.deleteById(id)} hérité de {@code SimpleJpaRepository}
 * ({@code findById().ifPresent(this::delete)}). Le « double-hit » annoncé par l'issue était
 * en réalité un TRIPLE hit MESURÉ : {@code SELECT count(*)} + {@code SELECT} de l'entité +
 * {@code DELETE} = 3 instructions JDBC.
 *
 * <p>APRÈS #175, le port expose {@code deleteByIdReturningRowCount} (DELETE bulk JPQL bindé rendant
 * le nombre de lignes touchées) : 1 seule instruction, et le 404 est dérivé du compte de
 * lignes au lieu d'une sonde d'existence préalable.
 *
 * <p>Méthode de mesure : {@code Statistics.getPrepareStatementCount()} d'Hibernate, remis à
 * zéro juste avant l'appel mesuré, avec un {@code em.flush()}/{@code em.clear()} préalable
 * pour que le seed n'entre pas dans le compte et que le cache de premier niveau ne masque
 * pas un SELECT. Même famille que
 * {@code PasswordResetTokenCreateStatisticsIntegrationTest} (#286).
 */
@SpringBootTest
@Transactional
class EventDeleteStatisticsIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private EventService eventService;

    @Autowired
    private EventRepository eventRepository;

    /**
     * Impl CONCRÈTE, autowirée uniquement pour le contrôle négatif ci-dessous : elle seule
     * expose encore {@code existsById}/{@code deleteById} hérités de
     * {@code SimpleJpaRepository}, la séquence AVANT #175 ayant été retirée du port.
     */
    @Autowired
    private EventRepositoryJpaImpl legacyRepository;

    private UUID persistEvent() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("i175-user-" + suffix);
        user.setUsername("i175-user-" + suffix);
        user.setEmail("i175-user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("ROLE_USER");
        em.persist(user);

        CategoryEntity category = new CategoryEntity();
        category.setName("i175-cat-" + UUID.randomUUID());
        em.persist(category);

        ProductEntity product = new ProductEntity();
        product.setName("i175-product-" + UUID.randomUUID());
        product.setCategory(category);
        product.setUser(user);
        product.setArchived(false);
        em.persist(product);

        LocalDate start = LocalDate.of(2026, 1, 1);
        EventEntity entity = new EventEntity();
        entity.setTitle("i175-event-" + UUID.randomUUID());
        entity.setType("duration");
        entity.setDurationValue(5);
        entity.setDurationUnit("days");
        entity.setIsRecurring(false);
        entity.setStartDate(start);
        entity.setEndDate(start.plusDays(5));
        entity.setProduct(product);
        em.persist(entity);

        em.flush();
        em.clear();
        return entity.getId();
    }

    private Statistics freshStatistics() {
        Statistics stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();
        return stats;
    }

    /**
     * Chemin nominal : l'événement existe, il est réellement supprimé, et l'opération
     * n'émet qu'UNE SEULE instruction JDBC (le DELETE). Mesure AVANT #175 : 3.
     */
    @Test
    void deleteExistingEvent_issuesSingleStatement_andRemovesRow() {
        UUID eventId = persistEvent();

        Statistics stats = freshStatistics();
        eventService.deleteById(eventId);
        em.flush();
        long statements = stats.getPrepareStatementCount();

        System.out.println("[#175] deleteById(existant) — instructions JDBC = " + statements);

        assertThat(statements)
                .as("#175 : suppression d'un event existant = 1 seule instruction JDBC "
                        + "(3 avant : count + select + delete)")
                .isEqualTo(1L);

        em.clear();
        assertThat(eventRepository.findEventById(eventId))
                .as("la ligne est effectivement supprimée")
                .isEmpty();
    }

    /**
     * Contrat 404 préservé (branche « id inconnu ») : {@code EventNotFoundException} est
     * toujours levée, et le diagnostic ne coûte qu'UNE instruction (le DELETE qui touche
     * 0 ligne) au lieu du {@code SELECT count(*)} préalable.
     */
    @Test
    void deleteUnknownEvent_throwsEventNotFound_withSingleStatement() {
        UUID unknownId = UUID.randomUUID();

        Statistics stats = freshStatistics();
        assertThatThrownBy(() -> eventService.deleteById(unknownId))
                .isInstanceOf(EventNotFoundException.class);
        long statements = stats.getPrepareStatementCount();

        System.out.println("[#175] deleteById(inconnu) — instructions JDBC = " + statements);

        assertThat(statements)
                .as("#175 : id inconnu = 1 seule instruction JDBC (DELETE à 0 ligne)")
                .isEqualTo(1L);
    }

    /**
     * Contrôle négatif A/B sur la séquence RÉELLEMENT exécutée par
     * {@code EventController.deleteEvent} : le contrôle d'ownership charge d'abord
     * l'événement ({@code eventService.findEventById}), puis la suppression est appelée.
     * {@code spring.jpa.open-in-view} étant actif (défaut Spring Boot, WARN au boot), les
     * deux partagent le MÊME contexte de persistance sur une requête HTTP — ce que
     * reproduit ce test transactionnel.
     *
     * <p>Ce contexte partagé change le compte : le {@code findById} interne de l'ancien
     * {@code deleteById} tapait le cache de 1er niveau, donc le coût réel du chemin HTTP
     * n'était pas 3 mais celui mesuré ici. Le test joue les DEUX séquences dans les mêmes
     * conditions et compare, plutôt que de déduire.
     */
    @Test
    void controllerSequence_costsFewerStatementsThanLegacySequence() {
        UUID legacyId = persistEvent();

        Statistics stats = freshStatistics();
        eventRepository.findEventById(legacyId);              // checkEventOwnership
        boolean exists = legacyRepository.existsById(legacyId); // ancienne sonde d'existence
        assertThat(exists).isTrue();
        legacyRepository.deleteById(legacyId);                // ancien delete hérité
        em.flush();
        long legacyStatements = stats.getPrepareStatementCount();

        em.clear();
        UUID currentId = persistEvent();

        stats = freshStatistics();
        eventRepository.findEventById(currentId);             // checkEventOwnership
        eventService.deleteById(currentId);                   // chemin #175
        em.flush();
        long currentStatements = stats.getPrepareStatementCount();

        System.out.println("[#175] sequence controleur — AVANT = " + legacyStatements
                + " / APRES = " + currentStatements);

        assertThat(currentStatements)
                .as("#175 : la séquence ownership+suppression coûte moins qu'avant")
                .isLessThan(legacyStatements);
    }
}
