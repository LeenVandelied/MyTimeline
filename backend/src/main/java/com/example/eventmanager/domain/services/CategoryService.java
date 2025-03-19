package com.example.eventmanager.domain.services;

import com.example.eventmanager.domain.models.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryService {
    Category createCategory(Category category);
    Category updateCategory(Category category);
    
    List<Category> getAllCategories();
    Optional<Category> getCategoryById(UUID id);
    Optional<Category> getCategoryByName(String name);
    
    void deleteCategory(UUID id);
    
    boolean existsById(UUID id);
} 