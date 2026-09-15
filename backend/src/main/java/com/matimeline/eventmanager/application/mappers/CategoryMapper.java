package com.matimeline.eventmanager.application.mappers;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;

@Component
public class CategoryMapper {
      public Category toDomain(CategoryEntity categoryEntity) {
        // #52 : owner_id NULL (catégorie système) -> ownerId domaine NULL. Sinon on
        // remonte l'id du propriétaire (getOwner() peut être un proxy LAZY : getId()
        // sur un proxy Hibernate ne déclenche pas de SELECT).
        return new Category(
            categoryEntity.getId(),
            categoryEntity.getName(),
            categoryEntity.getColor(),
            categoryEntity.getDescription(),
            categoryEntity.getOwner() != null ? categoryEntity.getOwner().getId() : null
        );
    }

    // NOTE #52 : toEntity ne pose PAS l'owner (relation @ManyToOne UserEntity). Le
    // rattachement du propriétaire se fait côté repository via entityManager.getReference
    // (référence gérée à partir de l'ownerId), pour ne pas attacher un UserEntity détaché.
    public CategoryEntity toEntity(Category category) {
        CategoryEntity entity = new CategoryEntity();
        entity.setId(category.getId());
        entity.setName(category.getName());
        entity.setColor(category.getColor());
        entity.setDescription(category.getDescription());
        return entity;
    }
}
