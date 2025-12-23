package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Event;

public interface EventRepository {
  List<Event> findDomainEventByProductId(UUID productId);
  Event save(Event event);
  void deleteById(UUID id);
  boolean existsById(UUID id);
  Optional<Event> findEventById(UUID id);
}