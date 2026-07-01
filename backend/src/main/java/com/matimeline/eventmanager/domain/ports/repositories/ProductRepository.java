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
}