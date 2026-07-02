package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Category;

public interface CategoryRepository {
  Optional<Category> findDomainCategoryByName(String name);
  Optional<Category> findDomainCategoryById(UUID id);

  /**
   * #52 (BR-CAT-004) : unicité du nom PAR UTILISATEUR. Renvoie la catégorie possédée
   * par {@code ownerId} portant exactement {@code name}, s'il en existe une. Utilisé
   * pour le check applicatif 409 avant création/mise à jour (le filet DB étant la
   * contrainte UNIQUE(owner_id, name)).
   */
  Optional<Category> findByOwnerAndName(UUID ownerId, String name);

  /**
   * FIX review #153 : scoping cross-tenant du listing. Renvoie UNIQUEMENT les catégories
   * possédées par {@code ownerId} OU système ({@code owner_id IS NULL}). Filtre en SQL
   * (pas de scan complet + filtre applicatif). Utilisé par {@code GET /api/categories}.
   */
  List<Category> findByOwnerIdOrSystem(UUID ownerId);

  Category save(Category category);
  void deleteById(UUID id);
  boolean existsById(UUID id);

  /**
   * #78 (RGPD) : supprime les catégories POSSÉDÉES par {@code ownerId}
   * ({@code owner_id = :ownerId}). NE TOUCHE PAS aux catégories SYSTÈME
   * ({@code owner_id IS NULL}), partagées et non rattachées à un compte. À appeler
   * APRÈS la purge des produits ({@code products.category_id} NOT NULL référence
   * categories). Retourne le nombre de lignes supprimées.
   */
  int deleteAllByOwnerId(UUID ownerId);
}