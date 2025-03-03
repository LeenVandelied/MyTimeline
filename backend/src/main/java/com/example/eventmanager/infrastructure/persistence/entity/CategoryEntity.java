package com.example.eventmanager.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.util.UUID;

import com.example.eventmanager.domain.models.Category;

@Entity
@Table(name = "categories")
public class CategoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    private String name;

    public Category toDomainModel() {
        return new Category(id, name);
    }

    public static CategoryEntity fromDomainModel(Category category) {
        CategoryEntity entity = new CategoryEntity();
        entity.id = category.getId();
        entity.name = category.getName();
        return entity;
    }
}