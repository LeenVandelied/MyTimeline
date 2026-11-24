package com.matimeline.eventmanager.infrastructure.adapters.controllers.mappers;

import java.util.UUID;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;

/**
 * Traduction DTO HTTP -> commande domaine pour la création d'événement, partagée par
 * EventController et ProductController (événements imbriqués). Le contrôleur (infra) est le
 * seul point de couplage au DTO.
 */
public final class EventCommandMapper {

    private EventCommandMapper() {
    }

    /** productId vient de l'appelant : celui du DTO pour /api/events, null pour un événement imbriqué. */
    public static EventCreateCommand toCreateCommand(EventCreationRequest request, UUID productId) {
        return new EventCreateCommand(
                request.getName(),
                request.getType(),
                request.getDurationValue(),
                request.getDurationUnit(),
                request.getIsRecurring(),
                request.getRecurrenceUnit(),
                request.getDate(),
                request.getIsAllDay(),
                request.getColor(),
                productId);
    }
}
