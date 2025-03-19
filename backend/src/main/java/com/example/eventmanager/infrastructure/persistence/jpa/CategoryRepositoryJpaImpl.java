package com.example.eventmanager.infrastructure.persistence.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.example.eventmanager.domain.models.Category;
import com.example.eventmanager.domain.repositories.CategoryRepository;
import com.example.eventmanager.infrastructure.persistence.entity.CategoryEntity;
import com.example.eventmanager.infrastructure.persistence.mapping.CategoryMapper;

import jakarta.persistence.EntityManager;

@Repository
public class CategoryRepositoryJpaImpl
    extends SimpleJpaRepository<CategoryEntity, UUID>
    implements CategoryRepository {

    private final EntityManager entityManager;
    private final CategoryMapper categoryMapper;

    @Autowired
    public CategoryRepositoryJpaImpl(EntityManager em, CategoryMapper categoryMapper) {
        super(CategoryEntity.class, em);
        this.entityManager = em;
        this.categoryMapper = categoryMapper;
    }

    @Override
    public Optional<Category> findDomainCategoryById(UUID id) {
        return super.findById(id)
            .map(categoryMapper::toDomain);
    }

    @Override
    public Optional<Category> findDomainCategoryByName(String name) {
        String jpql = "SELECT c FROM CategoryEntity c WHERE c.name = :catName";
        List<CategoryEntity> results = entityManager
            .createQuery(jpql, CategoryEntity.class)
            .setParameter("catName", name)
            .getResultList();

        if (results.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(
            categoryMapper.toDomain(results.get(0))
        );
    }

    @Override
    public List<Category> findAllCategories() {
        return super.findAll().stream()
            .map(categoryMapper::toDomain)
            .toList();
    }

    @Override
    public Category save(Category domainCategory) {
        CategoryEntity entity = categoryMapper.toEntity(domainCategory);
        CategoryEntity saved = super.save(entity); 
        return categoryMapper.toDomain(saved);
    }
}