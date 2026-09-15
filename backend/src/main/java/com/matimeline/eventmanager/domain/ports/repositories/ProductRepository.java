package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.domain.models.Product;

@Repository
public interface ProductRepository {
    Optional<Product> findDomainProductById(UUID id);
    List<Product> findAllProducts();

    /**
     * #124 : liste les produits d'un utilisateur en filtrant EN SQL
     * ({@code WHERE user_id = :userId}) au lieu de charger toute la table puis filtrer
     * en Java. Exploite l'index {@code idx_products_user} (posé Sprint 5, #110).
     * #41 : retourne TOUS les produits du user, y compris ceux SANS événement — la
     * liste d'événements est éventuellement vide, jamais {@code null}. Les produits
     * archivés restent exclus via {@code @SQLRestriction("archived = false")} sur
     * {@code ProductEntity}.
     */
    List<Product> findByUserId(UUID userId);

    Product save(Product product);
    void deleteById(UUID id);
    boolean existsById(UUID id);

    /**
     * #52 : nombre de produits (y compris archivés) référençant cette catégorie.
     * Sert à décider si une suppression de catégorie exige une réassignation
     * (AP-CAT-05). Compte SANS le filtre soft-delete pour ne pas laisser d'orphelins
     * FK sur des produits archivés.
     */
    long countByCategoryId(UUID categoryId);

    /**
     * #52 : réassigne en masse tous les produits d'une catégorie source vers une
     * catégorie cible (bulk UPDATE), archivés inclus, AVANT suppression de la source.
     * Retourne le nombre de lignes déplacées.
     */
    int updateCategoryForProducts(UUID fromCategoryId, UUID toCategoryId);

    /**
     * #78 (RGPD) : supprime DÉFINITIVEMENT tous les produits de {@code userId},
     * ARCHIVÉS INCLUS. Suppression physique volontaire (pas de soft delete) — le
     * compte disparaît. Retourne le nombre de lignes supprimées.
     *
     * <p>ProductEntity porte {@code @SQLRestriction("archived = false")} : une purge
     * via lecture/bulk JPQL IGNORERAIT les produits archivés, laissant leur FK
     * {@code user_id} et bloquant le DELETE users. L'implémentation DOIT contourner le
     * filtre (SQL NATIF bindé), cf. PIT-S10-004 / countByCategoryId. À appeler AVANT
     * la suppression des catégories ({@code products.category_id} NOT NULL).
     */
    int deleteAllByUserId(UUID userId);
}