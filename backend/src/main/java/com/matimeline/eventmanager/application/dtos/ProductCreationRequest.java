package com.matimeline.eventmanager.application.dtos;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ProductCreationRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String name;

    @NotNull(message = "Category is required")
    private UUID category;

    @NotNull(message = "User ID is required")
    private UUID userId;

    private List<EventCreationRequest> events;

    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public UUID getCategory() {
        return category;
    }

    public void setCategory(UUID category) {
        this.category = category;
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

    public void setEvents(List<EventCreationRequest> events) {
        this.events = events;
    }
}