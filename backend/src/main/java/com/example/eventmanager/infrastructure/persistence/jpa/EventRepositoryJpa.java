package com.example.eventmanager.infrastructure.persistence.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.domain.repositories.EventRepository;
import com.example.eventmanager.infrastructure.persistence.entity.EventEntity;

@Repository
public interface EventRepositoryJpa extends JpaRepository<EventEntity, UUID>, EventRepository {
    Optional<EventEntity> findByProductId(UUID productId);
    
    default List<Event> findDomainEventByProductId(UUID productId) {
      return findByProductId(productId)
      .stream()
      .map(EventEntity::toDomainModel)
      .toList();
  }

  default void saveDomainEvent(Event user) {
      save(EventEntity.fromDomainModel(user));
  }
}
