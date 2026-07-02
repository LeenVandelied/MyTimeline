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

import com.matimeline.eventmanager.application.dtos.EventUpdateRequest;
import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.models.Event;
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

    @Test
    void updateEvent_appliesOnlyProvidedFields_partialPatch() {
        EventUpdateRequest request = new EventUpdateRequest();
        request.setTitle("New title");
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
        EventUpdateRequest request = new EventUpdateRequest();
        request.setTitle("Whatever");

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<Event> captor = ArgumentCaptor.forClass(Event.class);
        eventService.updateEvent(eventId, request);

        verify(eventRepository).save(captor.capture());
        assertThat(captor.getValue().getProductId()).isEqualTo(productId);
    }

    @Test
    void updateEvent_appliesAllProvidedFields() {
        EventUpdateRequest request = new EventUpdateRequest();
        request.setTitle("Updated");
        request.setType("single");
        request.setDurationValue(10);
        request.setDurationUnit("weeks");
        request.setIsRecurring(true);
        request.setRecurrenceUnit("months");
        request.setColor("#aaaaaa");
        request.setArchived(true);

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
        EventUpdateRequest request = new EventUpdateRequest();
        request.setColor("#123456");

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

        EventUpdateRequest request = new EventUpdateRequest();
        request.setDurationValue(10);

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

        EventUpdateRequest request = new EventUpdateRequest();
        request.setDurationUnit("weeks");

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

        EventUpdateRequest request = new EventUpdateRequest();
        request.setType("single");

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

        EventUpdateRequest request = new EventUpdateRequest();
        request.setColor("#ffffff");

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
        EventUpdateRequest request = new EventUpdateRequest();
        request.setIsRecurring(true);

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

        EventUpdateRequest request = new EventUpdateRequest();
        request.setIsRecurring(true);

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
        EventUpdateRequest request = new EventUpdateRequest();
        request.setIsRecurring(true);
        request.setRecurrenceUnit("WEEK");

        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getIsRecurring()).isTrue();
        assertThat(result.getRecurrenceUnit()).isEqualTo(RecurrenceUnit.WEEK);
    }

    @Test
    void updateEvent_notFound_throwsEventNotFoundException() {
        EventUpdateRequest request = new EventUpdateRequest();
        request.setTitle("New");

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

    @Test
    void findEventById_repositoryThrows_propagatesInsteadOfSwallowing() {
        // #95 : plus de try/catch + printStackTrace ; l'erreur remonte au lieu d'un Optional.empty() masquant.
        RuntimeException boom = new RuntimeException("db down");
        when(eventRepository.findEventById(eventId)).thenThrow(boom);

        assertThatThrownBy(() -> eventService.findEventById(eventId))
                .isSameAs(boom);
    }
}
