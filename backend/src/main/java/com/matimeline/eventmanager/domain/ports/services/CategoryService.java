package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Category;

public interface CategoryService {
    Category createCategory(Category category);
    Category updateCategory(Category category);
    
    List<Category> getAllCategories();
    Optional<Category> getCategoryById(UUID id);
    Optional<Category> getCategoryByName(String name);
    
    void deleteCategory(UUID id);
    
    boolean existsById(UUID id);
} 