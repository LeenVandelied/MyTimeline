package com.matimeline.eventmanager.application.dtos;

import java.util.List;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Product;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * #718 — Fiche en lecture seule d'un produit archivé
 * ({@code GET /users/{userId}/products/archived/{productId}}) : {@code id, name, color,
 * category{id,name,color}, events[]} (événements actifs ET archivés, au format
 * {@link EventResponse}). Mêmes exclusions que {@link ArchivedProductResponse}.
 */
@Getter
@AllArgsConstructor
public class ArchivedProductDetailResponse {
    private UUID id;
    private String name;
    private String color;
    private ProductResponse.CategoryRef category;
    private List<EventResponse> events;

    public static ArchivedProductDetailResponse fromDomain(Product product) {
        return new ArchivedProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getColor(),
                ProductResponse.CategoryRef.fromDomain(product.getCategory()),
                product.getEvents().stream().map(EventResponse::fromDomain).toList());
    }
}
