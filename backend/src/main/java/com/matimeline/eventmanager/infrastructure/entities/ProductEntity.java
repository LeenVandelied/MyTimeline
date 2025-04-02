package com.matimeline.eventmanager.infrastructure.entities;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO) UUID id;

    private String name;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private CategoryEntity category;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<EventEntity> events = new ArrayList<>();

    public UUID getId() {
        return id;
    }
    
    public String getName() {
        return name;
    }
    
    public CategoryEntity getCategory() {
        return category;
    }
    
    public UserEntity getUser() {
        return user;
    }
    
    public List<EventEntity> getEvents() {
        return events;
    }
    
    public boolean hasEvents() {
        return !events.isEmpty();
    }
    
    public void setId(UUID id) {
        this.id = id;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public void setCategory(CategoryEntity category) {
        this.category = category;
    }
    
    public void setUser(UserEntity user) {
        this.user = user;
    }
    
    public void setEvents(List<EventEntity> events) {
        this.events = events;
    }

    public void addEvent(EventEntity event) {
        this.events.add(event);
    }
    
    public void removeEvent(EventEntity event) {
        this.events.remove(event);
    }
}