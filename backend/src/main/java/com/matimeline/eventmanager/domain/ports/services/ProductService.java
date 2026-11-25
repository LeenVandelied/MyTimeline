package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.ProductCreateCommand;
import com.matimeline.eventmanager.domain.models.ProductUpdateCommand;

public interface ProductService {
    Product createProduct(ProductCreateCommand command);

    /**
     * Partial update of a product (PATCH). Applies only the fields actually provided.
     * The name bounds (BR-PRO-001) are validated by the DTO annotations at the controller,
     * the service does not revalidate them. BR-PRO-002 (category must exist) is enforced here.
     * Throws ProductNotFoundException if the product does not exist (BR-PRO-007),
     * CategoryNotFoundException if a supplied categoryId is unknown.
     */
    Product updateProduct(UUID id, ProductUpdateCommand command);

    List<Product> getProductsByUser(UUID userId);
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