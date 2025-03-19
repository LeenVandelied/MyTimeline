package com.example.eventmanager.application.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.eventmanager.domain.models.Category;
import com.example.eventmanager.domain.repositories.CategoryRepository;
import com.example.eventmanager.domain.services.CategoryService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Autowired
    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    @Override
    public Category updateCategory(Category category) {
        return categoryRepository.save(category);
    }

    @Override
    public List<Category> getAllCategories() {
        return categoryRepository.findAllCategories();
    }

    @Override
    public Optional<Category> getCategoryById(UUID id) {
        return categoryRepository.findDomainCategoryById(id);
    }

    @Override
    public Optional<Category> getCategoryByName(String name) {
        return categoryRepository.findDomainCategoryByName(name);
    }

    @Override
    public void deleteCategory(UUID id) {
        categoryRepository.deleteById(id);
    }

    @Override
    public boolean existsById(UUID id) {
        return categoryRepository.existsById(id);
    }
}