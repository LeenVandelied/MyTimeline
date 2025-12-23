package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.UUID;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.ports.services.EventService;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    private final EventService eventService;

    @Autowired
    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<Event> createEvent(@RequestBody EventCreationRequest request) {
        Event event = eventService.createEvent(request);
        return ResponseEntity.ok(event);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        Event event = eventService.findEventById(id)
            .orElseThrow(() -> new RuntimeException("Event not found"));
            
        UUID originalProductId = event.getProductId();
        
        if (updates.containsKey("title")) {
            String title = (String) updates.get("title");
            event.setTitle(title);
        }
        
        if (updates.containsKey("type")) {
            String type = (String) updates.get("type");
            event.setType(type);
        }
        
        if (updates.containsKey("durationValue")) {
            Integer durationValue = null;
            if (updates.get("durationValue") instanceof Integer) {
                durationValue = (Integer) updates.get("durationValue");
            } else if (updates.get("durationValue") instanceof String) {
                try {
                    durationValue = Integer.parseInt((String) updates.get("durationValue"));
                } catch (NumberFormatException e) {
                }
            }
            if (durationValue != null) {
                event.setDurationValue(durationValue);
            }
        }
        
        if (updates.containsKey("durationUnit")) {
            String durationUnit = (String) updates.get("durationUnit");
            event.setDurationUnit(durationUnit);
        }
        
        if (updates.containsKey("isRecurring")) {
            Boolean isRecurring = null;
            if (updates.get("isRecurring") instanceof Boolean) {
                isRecurring = (Boolean) updates.get("isRecurring");
            } else if (updates.get("isRecurring") instanceof String) {
                isRecurring = Boolean.parseBoolean((String) updates.get("isRecurring"));
            }
            if (isRecurring != null) {
                event.setIsRecurring(isRecurring);
            }
        }
        
        if (updates.containsKey("recurrenceUnit")) {
            String recurrenceUnit = (String) updates.get("recurrenceUnit");
            event.setRecurrenceUnit(recurrenceUnit);
        }
        
        if (updates.containsKey("backgroundColor")) {
            String backgroundColor = (String) updates.get("backgroundColor");
            event.setBackgroundColor(backgroundColor);
        }
        
        if (updates.containsKey("borderColor")) {
            String borderColor = (String) updates.get("borderColor");
            event.setBorderColor(borderColor);
        }
        
        if (updates.containsKey("textColor")) {
            String textColor = (String) updates.get("textColor");
            event.setTextColor(textColor);
        }
        
        event.setProduct(originalProductId);
        
        Event updatedEvent = eventService.save(event);
        return ResponseEntity.ok(updatedEvent);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        eventService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}