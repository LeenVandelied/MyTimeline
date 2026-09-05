package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;

/**
 * Port métier des événements. #165 : les signatures prennent des COMMANDES DOMAINE
 * ({@link EventCreateCommand}/{@link EventUpdateCommand}) et non plus les DTOs applicatifs
 * {@code EventCreationRequest}/{@code EventUpdateRequest} — le domaine ne dépend plus de la
 * couche application (règle de dépendance hexagonale restaurée). Le contrôleur (infra)
 * traduit le DTO HTTP en commande avant l'appel.
 */
public interface EventService {
    Event createEvent(EventCreateCommand command);
    Event updateEvent(UUID id, EventUpdateCommand command);
    Event save(Event event);

    List<Event> findDomainEventByProductId(UUID productId);
    Optional<Event> findEventById(UUID id);

    /**
     * BR-EVE-015 (#231) : version optimiste courante de l'event (ou vide). Exposée pour
     * enrichir le corps 409 d'une édition concurrente sans faire remonter l'entité JPA.
     */
    Optional<Integer> findVersionById(UUID id);

    void deleteById(UUID id);
}
