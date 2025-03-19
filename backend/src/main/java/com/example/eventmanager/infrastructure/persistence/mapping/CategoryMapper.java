package com.example.eventmanager.infrastructure.persistence.mapping;

import org.springframework.stereotype.Component;

import com.example.eventmanager.domain.models.Category;
import com.example.eventmanager.infrastructure.persistence.entity.CategoryEntity;

@Component
public class CategoryMapper {
      public Category toDomain(CategoryEntity categoryEntity) {
        return new Category(categoryEntity.getId(), categoryEntity.getName());
    }

    public CategoryEntity toEntity(Category category) {
        CategoryEntity entity = new CategoryEntity();
        entity.setId(category.getId());
        entity.setName(category.getName());
        return entity;
    }
}
