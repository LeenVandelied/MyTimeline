package com.example.eventmanager.dtos;

import java.util.List;
import java.util.UUID;

public class ProductCreationRequest {
    private String name;
    private UUID category;
    private UUID userId;
    private List<EventCreationRequest> events;

    public String getName() {
        return name;
    }
    
    public UUID getCategory() {
        return category;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public List<EventCreationRequest> getEvents() {
        return events;
    }
}