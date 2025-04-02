package com.matimeline.eventmanager.application.mappers;

import java.time.LocalDate;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;

@Component
public class EventMapper {
  public Event toDomain(EventEntity eventEntity) {
      return new Event(
          eventEntity.getId(),
          eventEntity.getTitle(),
          eventEntity.getType(),
          eventEntity.getDurationValue(),
          eventEntity.getDurationUnit(),
          eventEntity.getIsRecurring(),
          eventEntity.getRecurrenceUnit(),
          eventEntity.getStartDate(),
          eventEntity.getEndDate(),
          eventEntity.getProduct().getId(),
          eventEntity.getIsAllDay()
      );
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
      entity.setStartDate((event.getStartDate() != null) ? event.getStartDate() : LocalDate.now());
      entity.setEndDate(event.getEndDate());
      entity.setProduct(productEntity);
      return entity;
  }
}
