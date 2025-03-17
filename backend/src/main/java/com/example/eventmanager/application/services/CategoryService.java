package com.example.eventmanager.application.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.eventmanager.domain.models.Category;
import com.example.eventmanager.domain.repositories.CategoryRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Autowired
    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> findAllCategories() {
        return categoryRepository.findAllCategories();
    }

    public Optional<Category> findDomainCategoryById(UUID id) {
        return categoryRepository.findDomainCategoryById(id);
    }

    public Optional<Category> findDomainCategoryByName(String name) {
        return categoryRepository.findDomainCategoryByName(name);
    }

    public boolean existsById(UUID id) {
        return categoryRepository.existsById(id);
    }

    public void deleteById(UUID id) {
        categoryRepository.deleteById(id);
    }

    public Category save(Category category) {
        return categoryRepository.save(category);
    }
}