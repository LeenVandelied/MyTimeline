package com.example.eventmanager.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.util.Date;
import java.util.UUID;

import com.example.eventmanager.domain.models.Event;

@Entity
@Table(name = "events")
public class EventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String title;
    private Date startDate;
    private Date endDate;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    public Event toDomainModel() {
        return new Event(id, title, startDate, endDate, product.toDomainModel());
    }

    public static EventEntity fromDomainModel(Event event) {
        EventEntity entity = new EventEntity();
        entity.id = event.getId();
        entity.title = event.getTitle();
        entity.startDate = event.getStartDate();
        entity.endDate = event.getEndDate();
        entity.product = ProductEntity.fromDomainModel(event.getProduct());
        return entity;
    }
}