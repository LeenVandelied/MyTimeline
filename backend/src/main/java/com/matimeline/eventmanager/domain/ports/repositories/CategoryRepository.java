package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Category;

public interface CategoryRepository {
  Optional<Category> findDomainCategoryByName(String name);
  Optional<Category> findDomainCategoryById(UUID id);
  List<Category> findAllCategories();
  Category save(Category category);
  void deleteById(UUID id);
  boolean existsById(UUID id);
}