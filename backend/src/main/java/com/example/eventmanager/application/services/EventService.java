package com.example.eventmanager.application.services;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.domain.models.Product;
import com.example.eventmanager.domain.repositories.EventRepository;
import com.example.eventmanager.domain.repositories.ProductRepository;
import com.example.eventmanager.dtos.EventCreationRequest;
import com.example.eventmanager.utils.Utils;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final ProductRepository productRepository;

    @Autowired
    public EventService(EventRepository eventRepository,
                        ProductRepository productRepository) {
        this.eventRepository = eventRepository;
        this.productRepository = productRepository;
    }

    public Event createEvent(EventCreationRequest eventCreationRequest) {
        Product product = productRepository.findDomainProductById(eventCreationRequest.getProductId())
            .orElseThrow(() -> new RuntimeException("Product not found"));
        
        LocalDate startDate = (eventCreationRequest.getDate() != null) ? eventCreationRequest.getDate() : LocalDate.now();

        Event event = new Event(
                UUID.randomUUID(),
                eventCreationRequest.getName(),
                eventCreationRequest.getType(),
                eventCreationRequest.getDurationValue(),
                eventCreationRequest.getDurationUnit(),
                eventCreationRequest.getIsRecurring(),
                eventCreationRequest.getRecurrenceUnit(),
                startDate,
                Utils.calculateEndDate(eventCreationRequest, startDate),
                product.getId()
        );
        return eventRepository.save(event);
    }

    public List<Event> findDomainEventByProductId(UUID productId) {
        return eventRepository.findDomainEventByProductId(productId);
    }

    public void deleteById(UUID id) {
        eventRepository.deleteById(id);
    }

    public boolean existsById(UUID id) {
        return eventRepository.existsById(id);
    }   
    
    @Transactional
    public Event save(Event event) {
        return eventRepository.save(event);
    }
}