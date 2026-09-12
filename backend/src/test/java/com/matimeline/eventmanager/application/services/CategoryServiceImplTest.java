package com.matimeline.eventmanager.application.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import com.matimeline.eventmanager.domain.exceptions.CategoryInUseException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNameConflictException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.CategoryReassignTargetInvalidException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;

/**
 * Issue #52 — logique métier CRUD catégorie : unicité par owner (BR-CAT-004),
 * réassignation atomique + ordre (update AVANT delete), propagation d'échec (rollback).
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceImplTest {

    @Mock private CategoryRepository categoryRepository;
    @Mock private ProductRepository productRepository;

    private CategoryServiceImpl service;

    private UUID ownerId;

    @BeforeEach
    void setUp() {
        service = new CategoryServiceImpl(categoryRepository, productRepository);
        ownerId = UUID.randomUUID();
    }

    // ---- création : unicité par owner ----

    @Test
    void createCategory_nameFreeForOwner_persists() {
        when(categoryRepository.findByOwnerAndName(ownerId, "Travail")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Category created = service.createCategory("Travail", null, null, ownerId);

        assertEquals("Travail", created.getName());
        assertEquals(ownerId, created.getOwnerId());
    }

    @Test
    void createCategory_nameTakenByOwner_throwsConflict_andDoesNotSave() {
        when(categoryRepository.findByOwnerAndName(ownerId, "Travail"))
                .thenReturn(Optional.of(new Category(UUID.randomUUID(), "Travail", null, null, ownerId)));

        assertThrows(CategoryNameConflictException.class,
                () -> service.createCategory("Travail", null, null, ownerId));

        verify(categoryRepository, never()).save(any());
    }

    /**
     * FIX review #153 : filet anti-race d'unicité SCOPÉ au save (au lieu d'un handler
     * global DataIntegrityViolationException qui masquait toute autre violation). Deux
     * inserts concurrents passent le check applicatif -> la contrainte DB UNIQUE(owner_id,
     * name) lève DataIntegrityViolationException, mappée ICI en CategoryNameConflictException.
     */
    @Test
    void createCategory_uniqueRace_dataIntegrity_mappedToNameConflict() {
        when(categoryRepository.findByOwnerAndName(ownerId, "Travail")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class)))
                .thenThrow(new DataIntegrityViolationException("uq_categories_owner_name"));

        assertThrows(CategoryNameConflictException.class,
                () -> service.createCategory("Travail", null, null, ownerId));
    }

    @Test
    void updateCategory_uniqueRace_dataIntegrity_mappedToNameConflict() {
        UUID id = UUID.randomUUID();
        Category current = new Category(id, "old", null, null, ownerId);
        when(categoryRepository.findDomainCategoryById(id)).thenReturn(Optional.of(current));
        when(categoryRepository.findByOwnerAndName(ownerId, "new")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class)))
                .thenThrow(new DataIntegrityViolationException("uq_categories_owner_name"));

        assertThrows(CategoryNameConflictException.class,
                () -> service.updateCategory(id, "new", null, null));
    }

    // ---- listing scopé (FIX review #153) ----

    @Test
    void getCategoriesForOwner_delegatesToScopedRepoQuery() {
        Category mine = new Category(UUID.randomUUID(), "Mine", null, null, ownerId);
        Category system = new Category(UUID.randomUUID(), "Système", null, null, null);
        when(categoryRepository.findByOwnerIdOrSystem(ownerId)).thenReturn(List.of(mine, system));

        List<Category> result = service.getCategoriesForOwner(ownerId);

        assertEquals(2, result.size());
        verify(categoryRepository).findByOwnerIdOrSystem(ownerId);
    }

    // ---- update ----

    @Test
    void updateCategory_unknownId_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.findDomainCategoryById(id)).thenReturn(Optional.empty());

        assertThrows(CategoryNotFoundException.class,
                () -> service.updateCategory(id, "x", null, null));
    }

    @Test
    void updateCategory_renameToNameTakenBySibling_throwsConflict() {
        UUID id = UUID.randomUUID();
        Category current = new Category(id, "old", null, null, ownerId);
        when(categoryRepository.findDomainCategoryById(id)).thenReturn(Optional.of(current));
        when(categoryRepository.findByOwnerAndName(ownerId, "dup"))
                .thenReturn(Optional.of(new Category(UUID.randomUUID(), "dup", null, null, ownerId)));

        assertThrows(CategoryNameConflictException.class,
                () -> service.updateCategory(id, "dup", null, null));

        verify(categoryRepository, never()).save(any());
    }

    @Test
    void updateCategory_sameNameUnchanged_skipsConflictCheck_andSaves() {
        UUID id = UUID.randomUUID();
        Category current = new Category(id, "same", null, null, ownerId);
        when(categoryRepository.findDomainCategoryById(id)).thenReturn(Optional.of(current));
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        Category updated = service.updateCategory(id, "same", "#000", "desc");

        assertEquals("#000", updated.getColor());
        verify(categoryRepository, never()).findByOwnerAndName(any(), eq("same"));
    }

    // ---- delete + réassignation ----

    @Test
    void deleteCategory_unknownId_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.existsById(id)).thenReturn(false);

        assertThrows(CategoryNotFoundException.class, () -> service.deleteCategory(id, null));

        verify(productRepository, never()).updateCategoryForProducts(any(), any());
        verify(categoryRepository, never()).deleteById(any());
    }

    @Test
    void deleteCategory_noProducts_deletesDirectly() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.existsById(id)).thenReturn(true);
        when(productRepository.countByCategoryId(id)).thenReturn(0L);

        service.deleteCategory(id, null);

        verify(productRepository, never()).updateCategoryForProducts(any(), any());
        verify(categoryRepository).deleteById(id);
    }

    @Test
    void deleteCategory_referencedWithoutReassign_throwsInUse_andDoesNotDelete() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.existsById(id)).thenReturn(true);
        when(productRepository.countByCategoryId(id)).thenReturn(5L);

        CategoryInUseException ex = assertThrows(CategoryInUseException.class,
                () -> service.deleteCategory(id, null));
        assertEquals(5L, ex.getProductCount());

        verify(categoryRepository, never()).deleteById(any());
        verify(productRepository, never()).updateCategoryForProducts(any(), any());
    }

    @Test
    void deleteCategory_referencedWithReassign_reassignsBeforeDelete() {
        UUID id = UUID.randomUUID();
        UUID target = UUID.randomUUID();
        when(categoryRepository.existsById(id)).thenReturn(true);
        when(categoryRepository.existsById(target)).thenReturn(true);
        when(productRepository.countByCategoryId(id)).thenReturn(2L);

        service.deleteCategory(id, target);

        // Ordre atomique : réassignation AVANT suppression (sinon FK / orphelins).
        InOrder inOrder = Mockito.inOrder(productRepository, categoryRepository);
        inOrder.verify(productRepository).updateCategoryForProducts(id, target);
        inOrder.verify(categoryRepository).deleteById(id);
    }

    /**
     * FIX review #153 : réassigner vers la catégorie en cours de suppression (cible == source)
     * serait un no-op suivi d'un deleteById -> violation FK / produits orphelins. Le service
     * doit rejeter avec une exception DÉDIÉE (CategoryReassignTargetInvalidException, 409)
     * AVANT toute réassignation ou suppression — plus l'ambigu CategoryInUseException.
     */
    @Test
    void deleteCategory_reassignToSelf_throwsReassignTargetInvalid_andDoesNotReassignOrDelete() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.existsById(id)).thenReturn(true);
        when(productRepository.countByCategoryId(id)).thenReturn(3L);

        assertThrows(CategoryReassignTargetInvalidException.class,
                () -> service.deleteCategory(id, id));

        verify(productRepository, never()).updateCategoryForProducts(any(), any());
        verify(categoryRepository, never()).deleteById(any());
    }

    @Test
    void deleteCategory_reassignTargetUnknown_throwsNotFound_andDoesNotReassignOrDelete() {
        UUID id = UUID.randomUUID();
        UUID target = UUID.randomUUID();
        when(categoryRepository.existsById(id)).thenReturn(true);
        when(productRepository.countByCategoryId(id)).thenReturn(2L);
        when(categoryRepository.existsById(target)).thenReturn(false);

        assertThrows(CategoryNotFoundException.class, () -> service.deleteCategory(id, target));

        verify(productRepository, never()).updateCategoryForProducts(any(), any());
        verify(categoryRepository, never()).deleteById(any());
    }

    /**
     * Rollback : si la suppression échoue APRÈS la réassignation, l'exception se
     * propage (le @Transactional du service rollback alors la réassignation). On
     * vérifie ici que l'échec du delete n'est pas avalé et remonte à l'appelant.
     */
    @Test
    void deleteCategory_deleteFails_afterReassign_propagatesException() {
        UUID id = UUID.randomUUID();
        UUID target = UUID.randomUUID();
        when(categoryRepository.existsById(id)).thenReturn(true);
        when(categoryRepository.existsById(target)).thenReturn(true);
        when(productRepository.countByCategoryId(id)).thenReturn(2L);
        doThrow(new RuntimeException("FK violation")).when(categoryRepository).deleteById(id);

        assertThrows(RuntimeException.class, () -> service.deleteCategory(id, target));

        // La réassignation a bien été tentée avant l'échec (sera rollback par le tx).
        verify(productRepository).updateCategoryForProducts(id, target);
    }
}
