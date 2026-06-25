package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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
import com.matimeline.eventmanager.domain.models.Event;
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
                false, null, LocalDate.now(), LocalDate.now().plusDays(5),
                productId, false, "#000000", "#111111", "#ffffff");
    }

    @Test
    void updateEvent_appliesOnlyProvidedFields_partialPatch() {
        EventUpdateRequest request = new EventUpdateRequest();
        request.setTitle("New title");
        // type, durationValue, etc. left null -> must NOT change existing values

        when(eventRepository.existsById(eventId)).thenReturn(true);
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

        when(eventRepository.existsById(eventId)).thenReturn(true);
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
        request.setBackgroundColor("#aaaaaa");
        request.setBorderColor("#bbbbbb");
        request.setTextColor("#cccccc");

        when(eventRepository.existsById(eventId)).thenReturn(true);
        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getTitle()).isEqualTo("Updated");
        assertThat(result.getType()).isEqualTo("single");
        assertThat(result.getDurationValue()).isEqualTo(10);
        assertThat(result.getDurationUnit()).isEqualTo("weeks");
        assertThat(result.getIsRecurring()).isTrue();
        assertThat(result.getRecurrenceUnit()).isEqualTo("months");
        assertThat(result.getBackgroundColor()).isEqualTo("#aaaaaa");
        assertThat(result.getBorderColor()).isEqualTo("#bbbbbb");
        assertThat(result.getTextColor()).isEqualTo("#cccccc");
    }

    @Test
    void updateEvent_colorOnlyPatch_doesNotTouchTitle() {
        EventUpdateRequest request = new EventUpdateRequest();
        request.setBackgroundColor("#123456");

        when(eventRepository.existsById(eventId)).thenReturn(true);
        when(eventRepository.findEventById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        Event result = eventService.updateEvent(eventId, request);

        assertThat(result.getBackgroundColor()).isEqualTo("#123456");
        assertThat(result.getTitle()).isEqualTo("Original title");
    }

    @Test
    void updateEvent_notFound_throwsEventNotFoundException() {
        EventUpdateRequest request = new EventUpdateRequest();
        request.setTitle("New");

        when(eventRepository.existsById(eventId)).thenReturn(false);

        assertThatThrownBy(() -> eventService.updateEvent(eventId, request))
                .isInstanceOf(EventNotFoundException.class);

        verify(eventRepository, never()).save(any(Event.class));
    }
}
