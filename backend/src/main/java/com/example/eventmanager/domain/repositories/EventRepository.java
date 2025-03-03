package com.example.eventmanager.domain.repositories;

import com.example.eventmanager.domain.models.Event;

import java.util.List;
import java.util.UUID;

public interface EventRepository {
  List<Event> findDomainEventByProductId(UUID productId);
  Event save(Event event);
  void deleteById(UUID id);
  boolean existsById(UUID id);
}