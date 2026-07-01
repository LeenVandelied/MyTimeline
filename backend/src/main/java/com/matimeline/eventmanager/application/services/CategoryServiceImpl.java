package com.matimeline.eventmanager.application.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.CategoryInUseException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNameConflictException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.services.CategoryService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Autowired
    public CategoryServiceImpl(CategoryRepository categoryRepository,
                               ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public Category createCategory(String name, String color, String description, UUID ownerId) {
        // BR-CAT-004 : unicité PAR UTILISATEUR. Check applicatif -> 409 ; la contrainte
        // DB UNIQUE(owner_id, name) reste le filet en cas de course.
        categoryRepository.findByOwnerAndName(ownerId, name).ifPresent(existing -> {
            throw new CategoryNameConflictException(name);
        });
        Category toCreate = new Category(null, name, color, description, ownerId);
        return categoryRepository.save(toCreate);
    }

    @Override
    @Transactional
    public Category updateCategory(UUID id, String name, String color, String description) {
        // BR-CAT-003 : la catégorie doit exister.
        Category existing = categoryRepository.findDomainCategoryById(id)
                .orElseThrow(() -> new CategoryNotFoundException(id));

        // BR-CAT-004 : le nouveau nom ne doit pas être déjà porté par une AUTRE
        // catégorie du même owner. Un renommage vers son propre nom inchangé passe.
        if (!name.equals(existing.getName())) {
            categoryRepository.findByOwnerAndName(existing.getOwnerId(), name)
                    .filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw new CategoryNameConflictException(name);
                    });
        }

        existing.setName(name);
        existing.setColor(color);
        existing.setDescription(description);
        // owner inchangé (l'update-in-place du repo recopie l'ownerId courant).
        return categoryRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAllCategories();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Category> getCategoryById(UUID id) {
        return categoryRepository.findDomainCategoryById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Category> getCategoryByName(String name) {
        return categoryRepository.findDomainCategoryByName(name);
    }

    @Override
    @Transactional
    public void deleteCategory(UUID id, UUID reassignToCategoryId) {
        // BR-CAT-002 : la catégorie doit exister.
        if (!categoryRepository.existsById(id)) {
            throw new CategoryNotFoundException(id);
        }

        long referencing = productRepository.countByCategoryId(id);

        if (referencing > 0) {
            // AP-CAT-05 : suppression d'une catégorie référencée -> réassignation
            // OBLIGATOIRE. Sans cible : 409 avec message métier explicite.
            if (reassignToCategoryId == null) {
                throw new CategoryInUseException(referencing);
            }
            // FIX review S10 : réassigner vers la catégorie en cours de suppression est
            // un no-op suivi d'un deleteById -> violation FK / produits orphelins. On
            // rejette AVANT toute réassignation. Réutilise CategoryInUseException -> 409.
            if (id.equals(reassignToCategoryId)) {
                throw new CategoryInUseException(referencing);
            }
            // La cible doit exister (l'ownership de la cible est vérifié en amont par
            // le contrôleur). Réassignation AVANT suppression, DANS la même transaction :
            // si le delete échoue, le bulk update est rollback -> aucun produit orphelin.
            if (!categoryRepository.existsById(reassignToCategoryId)) {
                throw new CategoryNotFoundException(reassignToCategoryId);
            }
            productRepository.updateCategoryForProducts(id, reassignToCategoryId);
        }

        categoryRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return categoryRepository.existsById(id);
    }
}
