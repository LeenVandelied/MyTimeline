package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.UUID;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.models.Event;

public interface EventService {
    Event createEvent(EventCreationRequest eventCreationRequest);
    Event save(Event event);
    
    List<Event> findDomainEventByProductId(UUID productId);

    void deleteById(UUID id);
    
    boolean existsById(UUID id);
} 