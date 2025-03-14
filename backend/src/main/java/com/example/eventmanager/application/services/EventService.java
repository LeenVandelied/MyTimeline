package com.example.eventmanager.application.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.infrastructure.persistence.entity.EventEntity;
import com.example.eventmanager.infrastructure.persistence.entity.ProductEntity;
import com.example.eventmanager.infrastructure.persistence.jpa.EventRepositoryJpa;
import com.example.eventmanager.infrastructure.persistence.jpa.ProductRepositoryJpa;

@Service
public class EventService {

    private final EventRepositoryJpa eventRepositoryJpa;
    private final ProductRepositoryJpa productRepositoryJpa;

    @Autowired
    public EventService(EventRepositoryJpa eventRepositoryJpa,
                        ProductRepositoryJpa productRepositoryJpa) {
        this.eventRepositoryJpa = eventRepositoryJpa;
        this.productRepositoryJpa = productRepositoryJpa;
    }

    public EventEntity createEvent(Event domainEvent) {
        ProductEntity productEntity = productRepositoryJpa.findById(domainEvent.getProductId())
            .orElseThrow(() -> new RuntimeException("Product not found"));

        EventEntity eventEntity = EventEntity.fromDomainModel(domainEvent, productEntity);

        return eventRepositoryJpa.save(eventEntity);
    }
}