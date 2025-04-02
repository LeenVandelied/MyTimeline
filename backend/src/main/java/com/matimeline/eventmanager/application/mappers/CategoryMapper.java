package com.matimeline.eventmanager.application.mappers;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;

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
