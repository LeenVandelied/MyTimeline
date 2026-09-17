package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.domain.models.Product;

public interface ProductService {
    Product createProduct(ProductCreationRequest request);

    /**
     * Partial update of a product (PATCH). Applies BR-PRO-001 (name bounds) and
     * BR-PRO-002 (category must exist) only for the fields actually provided.
     * Throws ProductNotFoundException if the product does not exist (BR-PRO-007),
     * CategoryNotFoundException if a supplied categoryId is unknown.
     */
    Product updateProduct(UUID id, ProductUpdateRequest request);

    List<Product> getProductsWithEvents(UUID userId);
    Optional<Product> findDomainProductById(UUID id);

    /**
     * Soft delete (BR-PRO-007): sets archived = true. Throws ProductNotFoundException
     * if the product does not exist. No physical row removal.
     */
    void archiveById(UUID id);

    /**
     * #711 (BR-PRO-011) : produits archivés de l'utilisateur, événements non chargés.
     */
    List<Product> getArchivedProducts(UUID userId);

    /**
     * #711 (BR-PRO-007/011) : (Archived) -> (Created). Throws ProductNotFoundException when
     * no row matched — unknown id, product not archived, or owned by another user (a single
     * outcome on purpose: anti-enumeration, same as BR-PRO-010).
     */
    void restoreProduct(UUID productId, UUID userId);

    boolean existsById(UUID id);
}