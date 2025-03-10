package com.example.eventmanager.domain.models;

import java.util.List;
import java.util.UUID;

public class Product {
    private UUID id;
    private String name;
    private String qrCode;
    private Category category;
    private User user;
    private List<Event> events;

    public Product(UUID id, String name, String qrCode, Category category, User user, List<Event> events) {
        this.id = id;
        this.name = name;
        this.qrCode = qrCode;
        this.category = category;
        this.user = user;
        this.events = events;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getQrCode() {
        return qrCode;
    }

    public void setQrCode(String qrCode) {
        this.qrCode = qrCode;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
    public List<Event> getEvents() {
        return events;
    }

    public void setEvents(List<Event> events) {
        this.events = events;
    }

    public boolean hasEvents() {
        return events != null && !events.isEmpty();
    }
}