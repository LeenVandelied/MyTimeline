package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceEndDateBeforeStartException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;

@ExtendWith(MockitoExtension.class)
class EventServiceImplTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private EventServiceImpl eventService;

    private UUID eventId;
    private UUID productId;
    private Event existingEvent;

    @BeforeEach
    void setUp() {
        eventId = UUID.randomUUID();
        productId = UUID.randomUUID();
        existingEvent = new Event(
                eventId, "Original title", "duration", 5, "days",
                false, null, null, LocalDate.now(), LocalDate.now().plusDays(5),
                productId, false, "#000000", false);
    }

    /**
     * Builder de commande PATCH partielle : tous les champs à null par défaut
     * (= "non fourni"), setters fluides pour ne poser que les champs sous test.
     * Miroir de l'ancien {@code new EventUpdateRequest()}.
     */
    private static final class Upd {
        private String title;
        private String type;
        private Integer durationValue;
        private String durationUnit;
        private Boolean isRecurring;
        private String recurrenceUnit;
        private LocalDate recurrenceEndDate;
        private String color;
        private Boolean archived;

        Upd title(String v) { this.title = v; return this; }
        Upd type(String v) { this.type = v; return this; }
        Upd durationValue(Integer v) { this.durationValue = v; return this; }
        Upd durationUnit(String v) { this.durationUnit = v; return this; }
        Upd isRecurring(Boolean v) { this.isRecurring = v; return this; }
        Upd recurrenceUnit(String v) { this.recurrenceUnit = v; return this; }
        Upd recurrenceEndDate(LocalDate v) { this.recurrenceEndDate = v; return this; }
        Upd color(String v) { this.color = v; return this; }
        Upd archived(Boolean v) { this.archived = v; return this; }

        EventUpdateCommand build() {
            return new EventUpdateCommand(title, type, durationValue, durationUnit,
                    isRecurring, recurrenceUnit, recurrenceEndDate, color, archived);
        }
    }

    private static Upd upd() { return new Upd(); }

    @Test
    void updateEvent_appliesOnlyProvidedFields_partialPatch() {
        EventUpdateCommand request = upd().title("New title").build();
        // type, durationValue, etc. left null -> must NOT change existing values

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getTitle()).isEqualTo("New title");
        assertThat(result.getType()).isEqualTo("duration");
        assertThat(result.getDurationValue()).isEqualTo(5);
        assertThat(result.getDurationUnit()).isEqualTo("days");
    }

    @Test
    void updateEvent_preservesProductLink() {
        EventUpdateCommand request = upd().title("Whatever").build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<Event> captor = ArgumentCaptor.forClass(Event.class);
        eventService.updateEvent(eventId, request);

        verify(eventRepository).save(captor.capture());
        assertThat(captor.getValue().getProductId()).isEqualTo(productId);
    }

    @Test
    void updateEvent_appliesAllProvidedFields() {
        EventUpdateCommand request = upd()
                .title("Updated")
                .type("single")
                .durationValue(10)
                .durationUnit("weeks")
                .isRecurring(true)
                .recurrenceUnit("months")
                .color("#aaaaaa")
                .archived(true)
                .build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getTitle()).isEqualTo("Updated");
        assertThat(result.getType()).isEqualTo("single");
        assertThat(result.getDurationValue()).isEqualTo(10);
        assertThat(result.getDurationUnit()).isEqualTo("weeks");
        assertThat(result.getIsRecurring()).isTrue();
        assertThat(result.getRecurrenceUnit()).isEqualTo(RecurrenceUnit.MONTH);
        assertThat(result.getColor()).isEqualTo("#aaaaaa");
        assertThat(result.isArchived()).isTrue();
    }

    @Test
    void updateEvent_colorOnlyPatch_doesNotTouchTitle() {
        EventUpdateCommand request = upd().color("#123456").build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getColor()).isEqualTo("#123456");
        assertThat(result.getTitle()).isEqualTo("Original title");
    }

    @Test
    void updateEvent_newDurationValue_recalculatesEndDate() {
        // BR-EVE-002 (#54) : un nouveau durationValue recalcule endDate sur la startDate persistée.
        LocalDate start = LocalDate.of(2026, 1, 1);
        Event event = new Event(
                eventId, "T", "duration", 5, "days",
                false, null, null, start, start.plusDays(5),
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().durationValue(10).build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getEndDate()).isEqualTo(start.plusDays(10));
    }

    @Test
    void updateEvent_newDurationUnit_recalculatesEndDate() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        Event event = new Event(
                eventId, "T", "duration", 3, "days",
                false, null, null, start, start.plusDays(3),
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().durationUnit("weeks").build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getEndDate()).isEqualTo(start.plusWeeks(3));
    }

    @Test
    void updateEvent_typeToSingle_collapsesEndDateToStartDate() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        Event event = new Event(
                eventId, "T", "duration", 5, "days",
                false, null, null, start, start.plusDays(5),
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().type("single").build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getEndDate()).isEqualTo(start);
    }

    @Test
    void updateEvent_colorOnlyPatch_doesNotRecalculateEndDate() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate originalEnd = start.plusDays(5);
        Event event = new Event(
                eventId, "T", "duration", 5, "days",
                false, null, null, start, originalEnd,
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().color("#ffffff").build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getEndDate()).isEqualTo(originalEnd);
    }

    @Test
    void updateEvent_setIsRecurringTrue_onEventWithoutRecurrenceUnit_throws() {
        // BR-EVE-006 (#95fix) : PATCH {isRecurring:true} sur un event dont recurrenceUnit
        // est null en base (jamais fourni) -> état fusionné incohérent -> exception (400).
        // existingEvent a recurrenceUnit=null (voir setUp).
        EventUpdateCommand request = upd().isRecurring(true).build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));

        assertThatThrownBy(() -> eventService.updateEvent(eventId, request))
                .isInstanceOf(RecurrenceUnitRequiredException.class);

        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    void updateEvent_setIsRecurringTrue_onEventWithExistingRecurrenceUnit_accepts() {
        // NON-RÉGRESSION BR-EVE-006 (#95fix) : PATCH {isRecurring:true} SANS recurrenceUnit
        // dans le payload, mais l'event a DÉJÀ un recurrenceUnit valide en base -> 200, PAS
        // de rejet. C'est le cas que la garde ne DOIT pas casser (état fusionné valide).
        Event recurringEvent = new Event(
                eventId, "T", "single", 0, null,
                false, RecurrenceUnit.WEEK, null, LocalDate.now(), LocalDate.now(),
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().isRecurring(true).build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(recurringEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getIsRecurring()).isTrue();
        assertThat(result.getRecurrenceUnit()).isEqualTo(RecurrenceUnit.WEEK);
        verify(eventRepository, times(1)).save(any(Event.class));
    }

    @Test
    void updateEvent_setIsRecurringTrueAndRecurrenceUnitTogether_accepts() {
        // BR-EVE-006 (#95fix) : payload fournissant isRecurring=true + recurrenceUnit -> 200.
        EventUpdateCommand request = upd().isRecurring(true).recurrenceUnit("WEEK").build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getIsRecurring()).isTrue();
        assertThat(result.getRecurrenceUnit()).isEqualTo(RecurrenceUnit.WEEK);
    }

    @Test
    void updateEvent_notFound_throwsEventNotFoundException() {
        EventUpdateCommand request = upd().title("New").build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.updateEvent(eventId, request))
                .isInstanceOf(EventNotFoundException.class);

        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    void findEventById_singleDbHit_delegatesToRepository() {
        // #95 : plus de double-hit (existsById supprimé), délégation directe au repo.
        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));

        Optional<Event> result = eventService.findEventById(eventId);

        assertThat(result).containsSame(existingEvent);
        verify(eventRepository, times(1)).findEventById(eventId);
        verify(eventRepository, never()).existsById(any(UUID.class));
    }

    @Test
    void findEventById_notFound_returnsRepositoryEmptyOptional() {
        when(eventRepository.findEventById(eventId)).thenReturn(Optional.empty());

        Optional<Event> result = eventService.findEventById(eventId);

        assertThat(result).isEmpty();
        verify(eventRepository, times(1)).findEventById(eventId);
        verify(eventRepository, never()).existsById(any(UUID.class));
    }

    // ---- BR-EVE-014 (#168) : color fournissable dès la création ----

    @Test
    void createEvent_withColor_persistsColorFromCreationRequest() {
        // BR-EVE-014 : color fourni au create -> porté par l'Event persisté (auparavant
        // impossible, il fallait créer puis PATCH). Constructeur 14-arg côté service.
        EventCreateCommand request = new EventCreateCommand(
                "Colored", "single", 1, "days", false, null, null, null, "#abcdef", productId);

        when(productRepository.findDomainProductById(productId))
                .thenReturn(Optional.of(new Product(productId, "P", null, null, null)));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.createEvent(request);

        assertThat(result.getColor()).isEqualTo("#abcdef");
        assertThat(result.isArchived()).isFalse();
    }

    @Test
    void createEvent_withoutColor_keepsNullColor_nonBreaking() {
        // BR-EVE-014 : color est ADDITIF optionnel — un client existant qui ne l'envoie pas
        // reste valide, color reste null (non-cassant).
        EventCreateCommand request = new EventCreateCommand(
                "NoColor", "single", 1, "days", false, null, null, null, null, productId);

        when(productRepository.findDomainProductById(productId))
                .thenReturn(Optional.of(new Product(productId, "P", null, null, null)));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.createEvent(request);

        assertThat(result.getColor()).isNull();
    }

    // ---- BR-EVE-012 (#168) : recurrenceEndDate < startDate rejetée (422) ----

    @Test
    void updateEvent_recurrenceEndDateBeforeStartDate_throws() {
        // BR-EVE-012 : PATCH recurrenceEndDate antérieure à la startDate persistée -> rejet
        // (RecurrenceEndDateBeforeStartException -> 422). Auparavant accepté silencieusement.
        LocalDate start = LocalDate.of(2026, 6, 1);
        Event event = new Event(
                eventId, "T", "single", 0, null,
                false, null, null, start, start,
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().recurrenceEndDate(start.minusDays(1)).build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> eventService.updateEvent(eventId, request))
                .isInstanceOf(RecurrenceEndDateBeforeStartException.class);

        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    void updateEvent_recurrenceEndDateEqualsStartDate_accepts() {
        // BR-EVE-012 : borne inférieure — end == start est toléré (isBefore stricte).
        LocalDate start = LocalDate.of(2026, 6, 1);
        Event event = new Event(
                eventId, "T", "single", 0, null,
                false, null, null, start, start,
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().recurrenceEndDate(start).build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getRecurrenceEndDate()).isEqualTo(start);
    }

    @Test
    void updateEvent_recurrenceEndDateAfterStartDate_accepts() {
        // NON-RÉGRESSION BR-EVE-012 : une recurrenceEndDate postérieure au début -> 200.
        LocalDate start = LocalDate.of(2026, 6, 1);
        Event event = new Event(
                eventId, "T", "single", 0, null,
                false, null, null, start, start,
                productId, false, "#000000", false);

        EventUpdateCommand request = upd().recurrenceEndDate(start.plusMonths(3)).build();

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getRecurrenceEndDate()).isEqualTo(start.plusMonths(3));
    }

    @Test
    void findEventById_repositoryThrows_propagatesInsteadOfSwallowing() {
        // #95 : plus de try/catch + printStackTrace ; l'erreur remonte au lieu d'un Optional.empty() masquant.
        RuntimeException boom = new RuntimeException("db down");
        when(eventRepository.findEventById(eventId)).thenThrow(boom);

        assertThatThrownBy(() -> eventService.findEventById(eventId))
                .isSameAs(boom);
    }
}
