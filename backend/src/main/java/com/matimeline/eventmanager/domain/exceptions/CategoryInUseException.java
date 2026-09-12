package com.matimeline.eventmanager.domain.exceptions;

/**
 * AP-CAT-05 (#52) : suppression d'une catégorie encore référencée par des produits,
 * SANS cible de réassignation ({@code reassignToCategoryId} absent). Mappée en 409
 * CONFLICT avec un message métier explicite (nombre de produits + marche à suivre).
 */
public class CategoryInUseException extends RuntimeException {
    private final long productCount;

    public CategoryInUseException(long productCount) {
        super("La catégorie est utilisée par " + productCount
                + " produits. Fournissez reassignToCategoryId.");
        this.productCount = productCount;
    }

    public long getProductCount() {
        return productCount;
    }
}
