package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.EndDateBeforeStartException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #54 — Vérifie de bout en bout (Postgres jetable + Flyway V1..V9) :
 *   - PATCH recalcule endDate EN BASE quand durationValue change (BR-EVE-002) ;
 *   - le CHECK ck_events_recurrence_unit (reposé par V9) rejette une valeur
 *     recurrence_unit hors {WEEK,MONTH,YEAR} au niveau DB.
 *
 * @Transactional -> rollback après chaque test ; données uniques par UUID.
 */
@SpringBootTest
@Transactional
class EventPatchAndRecurrenceIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private EventService eventService;

    @Autowired
    private EventRepository eventRepository;

    private ProductEntity persistProductGraph() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("i54-user-" + suffix);
        user.setUsername("i54-user-" + suffix);
        user.setEmail("i54-user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("ROLE_USER");
        em.persist(user);

        CategoryEntity category = new CategoryEntity();
        category.setName("i54-cat-" + UUID.randomUUID());
        em.persist(category);

        ProductEntity product = new ProductEntity();
        product.setName("i54-product-" + UUID.randomUUID());
        product.setCategory(category);
        product.setUser(user);
        product.setArchived(false);
        em.persist(product);
        return product;
    }

    /** Critère d'acceptation : PATCH durationValue -> endDate recalculée et persistée en base. */
    @Test
    void patchDurationValue_recalculatesEndDate_inDatabase() {
        ProductEntity product = persistProductGraph();
        LocalDate start = LocalDate.of(2026, 1, 1);

        EventEntity entity = new EventEntity();
        entity.setTitle("i54-event-" + UUID.randomUUID());
        entity.setType("duration");
        entity.setDurationValue(5);
        entity.setDurationUnit("days");
        entity.setIsRecurring(false);
        entity.setStartDate(start);
        entity.setEndDate(start.plusDays(5));
        entity.setProduct(product);
        em.persist(entity);
        em.flush();
        UUID eventId = entity.getId();
        em.clear();

        EventUpdateCommand request = new EventUpdateCommand(
                null, null, 10, null, null, null, null, null, null, null, null, null);
        eventService.updateEvent(eventId, request);
        em.flush();
        em.clear();

        Event reloaded = eventRepository.findEventById(eventId).orElseThrow();
        assertThat(reloaded.getEndDate()).isEqualTo(start.plusDays(10));
        assertThat(reloaded.getDurationValue()).isEqualTo(10);
    }

    /**
     * #201 — Critère d'acceptation : scénario de DÉSACCORD dates saisies vs enregistrées.
     * Un event 'single' reçoit startDate/endDate EXPLICITES au PATCH ; auparavant le DTO les
     * ignorait (le formulaire les envoyait pour rien). On vérifie qu'elles sont désormais
     * réellement PERSISTÉES telles quelles en base (contrat #201, type != 'duration').
     */
    @Test
    void patchSingleWithExplicitDates_persistsThemInDatabase() {
        ProductEntity product = persistProductGraph();
        LocalDate start = LocalDate.of(2026, 1, 1);

        EventEntity entity = new EventEntity();
        entity.setTitle("i201-event-" + UUID.randomUUID());
        entity.setType("single");
        entity.setIsRecurring(false);
        entity.setStartDate(start);
        entity.setEndDate(start);
        entity.setProduct(product);
        em.persist(entity);
        em.flush();
        UUID eventId = entity.getId();
        em.clear();

        LocalDate newStart = LocalDate.of(2026, 6, 10);
        LocalDate newEnd = LocalDate.of(2026, 6, 20);
        EventUpdateCommand request = new EventUpdateCommand(
                null, null, null, null, null, null, null, newStart, newEnd, null, null, null);
        eventService.updateEvent(eventId, request);
        em.flush();
        em.clear();

        Event reloaded = eventRepository.findEventById(eventId).orElseThrow();
        assertThat(reloaded.getStartDate()).isEqualTo(newStart);
        assertThat(reloaded.getEndDate()).isEqualTo(newEnd);
    }

    /**
     * #201 / BR-EVE-003 — Pour type='duration', déplacer startDate au PATCH re-dérive endDate
     * depuis la durée EN BASE (la durée reste la source de vérité, l'endDate explicite fournie
     * est volontairement écrasée).
     */
    @Test
    void patchDurationMovesStartDate_reDerivesEndDate_inDatabase() {
        ProductEntity product = persistProductGraph();
        LocalDate start = LocalDate.of(2026, 1, 1);

        EventEntity entity = new EventEntity();
        entity.setTitle("i201-event-" + UUID.randomUUID());
        entity.setType("duration");
        entity.setDurationValue(5);
        entity.setDurationUnit("days");
        entity.setIsRecurring(false);
        entity.setStartDate(start);
        entity.setEndDate(start.plusDays(5));
        entity.setProduct(product);
        em.persist(entity);
        em.flush();
        UUID eventId = entity.getId();
        em.clear();

        LocalDate newStart = LocalDate.of(2026, 2, 1);
        EventUpdateCommand request = new EventUpdateCommand(
                null, null, null, null, null, null, null,
                newStart, LocalDate.of(2099, 12, 31), null, null, null);
        eventService.updateEvent(eventId, request);
        em.flush();
        em.clear();

        Event reloaded = eventRepository.findEventById(eventId).orElseThrow();
        assertThat(reloaded.getStartDate()).isEqualTo(newStart);
        assertThat(reloaded.getEndDate()).isEqualTo(newStart.plusDays(5));
    }

    /**
     * #201 review MAJEUR-2 — trou de validation fermé. Un PATCH n'envoyant QUE endDate (sans
     * startDate) sur un event 'single', avec une endDate ANTÉRIEURE à la startDate DÉJÀ en base,
     * contourne le @AssertTrue DTO. La garde état-fusionné du service doit rejeter (422) et NE
     * RIEN persister : on vérifie que la ligne en base conserve son endDate d'origine.
     */
    @Test
    void patchEndDateOnly_beforePersistedStartDate_isRejected_andNotPersisted() {
        ProductEntity product = persistProductGraph();
        LocalDate start = LocalDate.of(2026, 5, 10);

        EventEntity entity = new EventEntity();
        entity.setTitle("i201-event-" + UUID.randomUUID());
        entity.setType("single");
        entity.setIsRecurring(false);
        entity.setStartDate(start);
        entity.setEndDate(start);
        entity.setProduct(product);
        em.persist(entity);
        em.flush();
        UUID eventId = entity.getId();
        em.clear();

        // endDate seule, antérieure à la startDate persistée (10 mai).
        EventUpdateCommand request = new EventUpdateCommand(
                null, null, null, null, null, null, null,
                null, LocalDate.of(2026, 5, 1), null, null, null);

        assertThatThrownBy(() -> {
            eventService.updateEvent(eventId, request);
            em.flush();
        }).isInstanceOf(EndDateBeforeStartException.class);

        em.clear();
        Event reloaded = eventRepository.findEventById(eventId).orElseThrow();
        assertThat(reloaded.getEndDate()).isEqualTo(start);
    }

    /**
     * BR-EVE-006 (#95fix) : PATCH isRecurring=true sur un event dont recurrence_unit est
     * null en base (jamais fourni) -> RecurrenceUnitRequiredException (mappée 400), état
     * incohérent NON persisté.
     */
    @Test
    void patchIsRecurringTrue_onEventWithoutRecurrenceUnit_isRejected() {
        ProductEntity product = persistProductGraph();
        LocalDate start = LocalDate.of(2026, 1, 1);

        EventEntity entity = new EventEntity();
        entity.setTitle("i95-event-" + UUID.randomUUID());
        entity.setType("single");
        entity.setIsRecurring(false);
        entity.setRecurrenceUnit(null);
        entity.setStartDate(start);
        entity.setEndDate(start);
        entity.setProduct(product);
        em.persist(entity);
        em.flush();
        UUID eventId = entity.getId();
        em.clear();

        EventUpdateCommand request = new EventUpdateCommand(
                null, null, null, null, true, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> {
            eventService.updateEvent(eventId, request);
            em.flush();
        }).isInstanceOf(RecurrenceUnitRequiredException.class);
    }

    /**
     * NON-RÉGRESSION BR-EVE-006 (#95fix) : PATCH isRecurring=true SANS recurrenceUnit dans
     * le payload, mais l'event porte DÉJÀ recurrence_unit=WEEK en base -> accepté, persisté.
     * C'est le cas que la garde état-fusionné ne DOIT pas casser.
     */
    @Test
    void patchIsRecurringTrue_onEventWithExistingRecurrenceUnit_isAccepted() {
        ProductEntity product = persistProductGraph();
        LocalDate start = LocalDate.of(2026, 1, 1);

        EventEntity entity = new EventEntity();
        entity.setTitle("i95-event-" + UUID.randomUUID());
        entity.setType("single");
        entity.setIsRecurring(false);
        entity.setRecurrenceUnit(RecurrenceUnit.WEEK);
        entity.setStartDate(start);
        entity.setEndDate(start);
        entity.setProduct(product);
        em.persist(entity);
        em.flush();
        UUID eventId = entity.getId();
        em.clear();

        EventUpdateCommand request = new EventUpdateCommand(
                null, null, null, null, true, null, null, null, null, null, null, null);
        eventService.updateEvent(eventId, request);
        em.flush();
        em.clear();

        Event reloaded = eventRepository.findEventById(eventId).orElseThrow();
        assertThat(reloaded.getIsRecurring()).isTrue();
        assertThat(reloaded.getRecurrenceUnit().name()).isEqualTo("WEEK");
    }

    /** V9 : le CHECK ck_events_recurrence_unit rejette une valeur invalide au niveau DB. */
    @Test
    void invalidRecurrenceUnit_rejectedByCheckConstraint() {
        ProductEntity product = persistProductGraph();
        em.flush();
        UUID productId = product.getId();

        assertThatThrownBy(() -> {
            em.createNativeQuery(
                    "INSERT INTO events "
                    + "(id, created_at, updated_at, version, title, type, is_recurring, "
                    + " recurrence_unit, start_date, archived, product_id) "
                    + "VALUES (:id, now(), now(), 0, 'bad', 'single', false, "
                    + " 'weekly', :start, false, :pid)")
                    .setParameter("id", UUID.randomUUID())
                    .setParameter("start", LocalDate.of(2026, 1, 1))
                    .setParameter("pid", productId)
                    .executeUpdate();
            em.flush();
        }).isInstanceOf(Exception.class);
    }
}
