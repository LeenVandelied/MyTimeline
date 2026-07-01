package com.matimeline.eventmanager.domain.models;

import java.util.UUID;

public class Category {
    private UUID id;
    private String name;
    private String color;
    private String description;

    public Category(UUID id, String name) {
        this.id = id;
        this.name = name;
    }

    public Category(UUID id, String name, String color, String description) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.description = description;
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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
