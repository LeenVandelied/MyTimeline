package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.CategoryRequest;
import com.matimeline.eventmanager.application.dtos.CategoryResponse;
import com.matimeline.eventmanager.application.dtos.CategoryUpdateRequest;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.CategoryService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

import jakarta.validation.Valid;

/**
 * CRUD des catégories (#52). Propriété PAR UTILISATEUR (ADR-002) : PATCH/DELETE
 * exigent {@code category.ownerId == caller.id} (403 sinon). Les catégories système
 * (ownerId NULL) sont lisibles de tous mais modifiables par personne.
 *
 * <p>Hexagonal (AP-CAT-01/02) : dépend du PORT {@code CategoryService} (pas de l'impl)
 * et de {@code CallerResolver} (infra/security) pour dériver l'identité du JWT via le
 * SecurityContext (cookie {@code jwt} OU Bearer, #93), jamais d'un param. AP-CAT-03 :
 * entrées/sorties = DTOs, jamais le domain model brut. AP-CAT-04 : plus de double
 * {@code existsById} — le service porte le 404.
 */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final CallerResolver callerResolver;

    public CategoryController(CategoryService categoryService,
                              CallerResolver callerResolver) {
        this.categoryService = categoryService;
        this.callerResolver = callerResolver;
    }

    @PostMapping
    public ResponseEntity<?> createCategory(@Valid @RequestBody CategoryRequest request) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();
        Category created = categoryService.createCategory(
                request.getName(), request.getColor(), request.getDescription(), caller.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoryResponse.fromDomain(created));
    }

    @GetMapping
    public ResponseEntity<?> getAllCategories() {
        // FIX review #153 : listing SCOPÉ au caller + catégories système (owner NULL).
        // Sans ce filtre, GET renvoyait les catégories de TOUS les utilisateurs (fuite
        // cross-tenant). Identité dérivée du JWT (401 si absent/invalide).
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();
        List<CategoryResponse> body = categoryService.getCategoriesForOwner(caller.getId()).stream()
                .map(CategoryResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCategoryById(@PathVariable UUID id) {
        // FIX review #153 : lecture au singulier SCOPÉE. 401 si non authentifié ; 404 si
        // la catégorie n'est ni possédée par le caller ni système (anti fuite cross-tenant
        // + anti-énumération : on ne distingue pas « inexistante » de « appartient à autrui »).
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();
        return categoryService.getCategoryById(id)
                .filter(c -> isVisibleTo(c, caller.getId()))
                .<ResponseEntity<?>>map(c -> ResponseEntity.ok(CategoryResponse.fromDomain(c)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable UUID id,
                                            @Valid @RequestBody CategoryUpdateRequest request) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();

        Optional<Category> existing = categoryService.getCategoryById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        // Ownership (ADR-002) : owner NULL (système) ou owner != caller -> 403.
        if (!isOwnedBy(existing.get(), caller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Category updated = categoryService.updateCategory(
                id, request.getName(), request.getColor(), request.getDescription());
        return ResponseEntity.ok(CategoryResponse.fromDomain(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(
            @PathVariable UUID id,
            @RequestParam(value = "reassignToCategoryId", required = false) UUID reassignToCategoryId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();

        Optional<Category> target = categoryService.getCategoryById(id);
        if (target.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (!isOwnedBy(target.get(), caller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Si réassignation demandée, la catégorie CIBLE doit aussi appartenir au caller.
        if (reassignToCategoryId != null) {
            Optional<Category> reassign = categoryService.getCategoryById(reassignToCategoryId);
            if (reassign.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            if (!isOwnedBy(reassign.get(), caller.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        // AP-CAT-05 : le service porte le 409 (CategoryInUseException) si des produits
        // référencent la catégorie sans cible de réassignation, et fait la réassignation
        // + suppression en UNE transaction atomique.
        categoryService.deleteCategory(id, reassignToCategoryId);
        return ResponseEntity.noContent().build();
    }

    /** Ownership : la catégorie appartient au caller (owner NON NULL == callerId). */
    private boolean isOwnedBy(Category category, UUID callerId) {
        return category.getOwnerId() != null && category.getOwnerId().equals(callerId);
    }

    /**
     * Visibilité en LECTURE (FIX review #153) : la catégorie est possédée par le caller
     * OU système (owner NULL, visible de tous). Plus permissif que {@link #isOwnedBy}
     * (qui exclut le système car non modifiable).
     */
    private boolean isVisibleTo(Category category, UUID callerId) {
        return category.getOwnerId() == null || category.getOwnerId().equals(callerId);
    }
}
