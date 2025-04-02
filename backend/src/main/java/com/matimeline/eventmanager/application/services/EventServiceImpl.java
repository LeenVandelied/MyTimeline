package com.matimeline.eventmanager.application.services;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.utils.Utils;

@Service
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final ProductRepository productRepository;

    @Autowired
    public EventServiceImpl(EventRepository eventRepository,
                        ProductRepository productRepository) {
        this.eventRepository = eventRepository;
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public Event createEvent(EventCreationRequest eventCreationRequest) {
        Product product = productRepository.findDomainProductById(eventCreationRequest.getProductId())
            .orElseThrow(() -> new ProductNotFoundException(eventCreationRequest.getProductId()));
        
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
                product.getId(),
                eventCreationRequest.getIsAllDay()
        );
        return eventRepository.save(event);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Event> findDomainEventByProductId(UUID productId) {
        List<Event> events = eventRepository.findDomainEventByProductId(productId);
        if (events.isEmpty()) {
            throw new EventNotFoundException(productId, "No events found for this product");
        }
        return events;
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        if (!eventRepository.existsById(id)) {
            throw new EventNotFoundException(id);
        }
        eventRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return eventRepository.existsById(id);
    }   
    
    @Override
    @Transactional
    public Event save(Event event) {
        return eventRepository.save(event);
    }
} 