package com.example.eventmanager.domain.repositories;

import com.example.eventmanager.domain.models.Category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository {
  Optional<Category> findDomainCategoryByName(String name);
  Optional<Category> findDomainCategoryById(UUID id);
  List<Category> findAllCategories();
  Category save(Category category);
  void deleteById(UUID id);
  boolean existsById(UUID id);
}