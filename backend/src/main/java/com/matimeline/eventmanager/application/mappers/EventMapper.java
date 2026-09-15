package com.matimeline.eventmanager.application.mappers;

import java.time.LocalDate;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;

@Component
public class EventMapper {
  public Event toDomain(EventEntity eventEntity) {
      Event event = new Event(
          eventEntity.getId(),
          eventEntity.getTitle(),
          eventEntity.getType(),
          eventEntity.getDurationValue(),
          eventEntity.getDurationUnit(),
          eventEntity.getIsRecurring(),
          eventEntity.getRecurrenceUnit(),
          eventEntity.getRecurrenceEndDate(),
          eventEntity.getStartDate(),
          eventEntity.getEndDate(),
          eventEntity.getProduct().getId(),
          eventEntity.getIsAllDay(),
          eventEntity.getColor(),
          eventEntity.isArchived()
      );
      // #absorb (BR-EVE-015) : la version @Version (infra) est remontée au domaine pour
      // l'exposer en sortie (EventResponse) et alimenter le check optimiste déterministe.
      event.setVersion(eventEntity.getVersion());
      return event;
  }

  public EventEntity toEntity(Event event, ProductEntity productEntity) {
      EventEntity entity = new EventEntity();
      entity.setId(event.getId());
      entity.setTitle(event.getTitle());
      entity.setType(event.getType());
      entity.setDurationValue(event.getDurationValue());
      entity.setDurationUnit(event.getDurationUnit());
      entity.setIsRecurring(event.getIsRecurring());
      entity.setRecurrenceUnit(event.getRecurrenceUnit());
      entity.setRecurrenceEndDate(event.getRecurrenceEndDate());
      entity.setStartDate((event.getStartDate() != null) ? event.getStartDate() : LocalDate.now());
      entity.setEndDate(event.getEndDate());
      entity.setProduct(productEntity);
      entity.setIsAllDay(event.getIsAllDay());
      entity.setColor(event.getColor());
      entity.setArchived(event.isArchived());
      return entity;
  }
}
