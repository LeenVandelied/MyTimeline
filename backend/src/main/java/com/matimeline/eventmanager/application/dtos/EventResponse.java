package com.matimeline.eventmanager.application.dtos;

import java.time.LocalDate;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP d'un {@link Event} (absorb S10, AP-CAT-03) — stoppe l'exposition
 * du domain model en sortie, dans la lignée de {@link CategoryResponse} (#52).
 *
 * <p>Changement de FORME uniquement : les champs et leurs noms JSON reproduisent
 * exactement ce que le front lit aujourd'hui (cf. {@code frontend/src/types/event.ts}
 * {@code eventSchema} + {@code mapToFullCalendarEvent}). Le seul champ retiré est
 * {@code archived} : bit interne de soft delete (BR-PRO-007), jamais lu côté client
 * et hors contrat — inutile de le divulguer.
 */
@Getter
@AllArgsConstructor
public class EventResponse {
    private UUID id;
    private String title;
    private String type;
    private Integer durationValue;
    private String durationUnit;
    private Boolean isRecurring;
    private RecurrenceUnit recurrenceUnit;
    private LocalDate recurrenceEndDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private UUID productId;
    private Boolean isAllDay;
    private String color;

    public static EventResponse fromDomain(Event event) {
        return new EventResponse(
                event.getId(),
                event.getTitle(),
                event.getType(),
                event.getDurationValue(),
                event.getDurationUnit(),
                event.getIsRecurring(),
                event.getRecurrenceUnit(),
                event.getRecurrenceEndDate(),
                event.getStartDate(),
                event.getEndDate(),
                event.getProductId(),
                event.getIsAllDay(),
                event.getColor());
    }
}
