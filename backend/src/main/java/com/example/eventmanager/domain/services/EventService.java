package com.example.eventmanager.domain.services;

import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.dtos.EventCreationRequest;
import java.util.List;
import java.util.UUID;

public interface EventService {
    Event createEvent(EventCreationRequest eventCreationRequest);
    Event save(Event event);
    
    List<Event> findDomainEventByProductId(UUID productId);

    void deleteById(UUID id);
    
    boolean existsById(UUID id);
} 