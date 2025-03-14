package com.example.eventmanager.infrastructure.persistence.entity;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.example.eventmanager.domain.models.Product;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO) UUID id;

    private String name;
    private String qrCode;

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

    public String getQrCode() {
        return qrCode;
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

    public Product toDomainModel() {
        return new Product(id, name, qrCode, category.toDomainModel(), user.toDomainModel(), 
            events.stream().map(EventEntity::toDomainModel).collect(Collectors.toList()));
    }

    public boolean hasEvents() {
        return !events.isEmpty();
    }

    public static ProductEntity fromDomainModel(Product product, boolean includeEvents) {
        ProductEntity entity = new ProductEntity();
        if (product.getId() != null) {
            entity.id = product.getId();
        }
        entity.name = product.getName();
        entity.qrCode = product.getQrCode();
        entity.category = CategoryEntity.fromDomainModel(product.getCategory());
        entity.user = UserEntity.fromDomainModel(product.getUser());
    
        if (includeEvents) {
            entity.events = product.getEvents().stream()
                .map(ev -> {
                    EventEntity evEntity = EventEntity.fromDomainModel(ev, entity);
                    return evEntity;
                })
                .collect(Collectors.toList());
        }
    
        return entity;
    }
}