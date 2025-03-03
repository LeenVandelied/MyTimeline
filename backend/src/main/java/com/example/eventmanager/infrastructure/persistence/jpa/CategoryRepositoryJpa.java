package com.example.eventmanager.infrastructure.persistence.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.eventmanager.domain.models.Category;
import com.example.eventmanager.domain.repositories.CategoryRepository;
import com.example.eventmanager.infrastructure.persistence.entity.CategoryEntity;

@Repository
public interface CategoryRepositoryJpa extends JpaRepository<CategoryEntity, UUID>, CategoryRepository {
  Optional<CategoryEntity> findByName(String name);
  
  @Override
  default Optional<Category> findDomainCategoryById(UUID id) {
    return findById(id).map(CategoryEntity::toDomainModel);
  }

  @Override
  default Optional<Category> findDomainCategoryByName(String name) {
    return findByName(name).map(CategoryEntity::toDomainModel);
  }

  @Override
  default List<Category> findAllCategories() {
      return findAll().stream().map(CategoryEntity::toDomainModel).toList();
  }

  default void saveDomainCategory(Category category) {
      save(CategoryEntity.fromDomainModel(category));
  }
}
