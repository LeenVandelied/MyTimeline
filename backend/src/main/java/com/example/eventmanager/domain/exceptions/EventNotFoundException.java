package com.example.eventmanager.domain.exceptions;

import java.util.UUID;

public class EventNotFoundException extends RuntimeException {
    public EventNotFoundException(UUID id) {
        super("Event not found with id: " + id);
    }

    public EventNotFoundException(UUID productId, String message) {
        super("Event not found for product " + productId + ": " + message);
    }
} 