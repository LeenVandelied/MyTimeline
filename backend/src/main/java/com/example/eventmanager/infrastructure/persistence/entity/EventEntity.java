package com.example.eventmanager.infrastructure.persistence.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.UUID;

import com.example.eventmanager.domain.models.Event;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "events")
public class EventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String title;
    private String type;
    private Integer durationValue;
    private String durationUnit;
    private Boolean isRecurring;
    private String recurrenceUnit;
    private LocalDate startDate;
    private LocalDate endDate;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    @JsonBackReference
    private ProductEntity product;

    public Event toDomainModel() {
        return new Event(
            id,
            title,
            type,
            durationValue,
            durationUnit,
            isRecurring,
            recurrenceUnit,
            startDate,
            endDate,
            product.getId()
        );
    }

    public static EventEntity fromDomainModel(Event event, ProductEntity productEntity) {
        EventEntity entity = new EventEntity();
        entity.id = event.getId();
        entity.title = event.getTitle();
        entity.type = event.getType();
        entity.durationValue = event.getDurationValue();
        entity.durationUnit = event.getDurationUnit();
        entity.isRecurring = event.getIsRecurring();
        entity.recurrenceUnit = event.getRecurrenceUnit();
        entity.startDate = (event.getStartDate() != null) ? event.getStartDate() : LocalDate.now();
        entity.endDate = event.getEndDate();
        entity.product = productEntity;
        return entity;
    }
}