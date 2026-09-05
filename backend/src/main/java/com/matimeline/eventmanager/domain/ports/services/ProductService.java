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

    boolean existsById(UUID id);
}