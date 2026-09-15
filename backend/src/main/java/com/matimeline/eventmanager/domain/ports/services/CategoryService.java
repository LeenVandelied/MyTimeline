package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Category;

public interface CategoryService {

    /**
     * Crée une catégorie possédée par {@code ownerId} (#52). BR-CAT-001 : le nom doit
     * être non vide (garanti en amont par @Valid). BR-CAT-004 : lève
     * {@code CategoryNameConflictException} si {@code ownerId} possède déjà une
     * catégorie de même nom.
     */
    Category createCategory(String name, String color, String description, UUID ownerId);

    /**
     * Met à jour name/color/description d'une catégorie EXISTANTE et possédée (#52).
     * BR-CAT-003 : {@code CategoryNotFoundException} si l'id est inconnu. BR-CAT-004 :
     * {@code CategoryNameConflictException} si le nouveau nom est déjà pris par une
     * AUTRE catégorie du même owner. L'ownership (owner == caller) est vérifié EN AMONT
     * par le contrôleur (403).
     */
    Category updateCategory(UUID id, String name, String color, String description);

    /**
     * FIX review #153 : listing scopé (anti fuite cross-tenant). Renvoie UNIQUEMENT les
     * catégories possédées par {@code callerId} OU système (owner NULL). Utilisé par
     * {@code GET /api/categories}.
     */
    List<Category> getCategoriesForOwner(UUID callerId);

    Optional<Category> getCategoryById(UUID id);
    Optional<Category> getCategoryByName(String name);

    /**
     * Supprime une catégorie (#52), en réassignant d'abord ses produits vers
     * {@code reassignToCategoryId} si fourni — le tout en UNE transaction atomique.
     * <ul>
     *   <li>BR-CAT-002 : {@code CategoryNotFoundException} si l'id est inconnu.</li>
     *   <li>AP-CAT-05 : {@code CategoryInUseException} (409) si des produits référencent
     *       la catégorie ET qu'aucune cible de réassignation n'est fournie.</li>
     *   <li>Réassignation : bulk update des produits vers la cible AVANT le delete.</li>
     * </ul>
     * L'ownership de la catégorie ET de la cible est vérifié EN AMONT par le contrôleur.
     */
    void deleteCategory(UUID id, UUID reassignToCategoryId);

    boolean existsById(UUID id);
}
