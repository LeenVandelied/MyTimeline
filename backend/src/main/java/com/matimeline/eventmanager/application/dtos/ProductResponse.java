package com.matimeline.eventmanager.application.dtos;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Product;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP d'un {@link Product} (absorb S10, AP-CAT-03) — stoppe l'exposition
 * du domain model produit en sortie, dans la lignée de {@link CategoryResponse} (#52).
 *
 * <p>Forme JSON strictement alignée sur le contrat de lecture du front
 * ({@code frontend/src/types/product.ts} {@code productSchema}) :
 * {@code {id, name, category:{id,name}, events:[...]}}. Ne change RIEN d'autre.
 *
 * <p>⚠ Champs volontairement NON exposés : {@code user}/owner (fuite du User imbriqué,
 * la vulnérabilité corrigée ici), {@code archived} (bit interne de soft delete),
 * {@code color} produit (hors {@code productSchema}). La catégorie est réduite à un
 * sous-objet minimal {@code {id, name}} — on n'expose ni description, ni ownerId, ni
 * flag système inutiles au rendu produit.
 */
@Getter
@AllArgsConstructor
public class ProductResponse {
    private UUID id;
    private String name;
    private CategoryRef category;
    private List<EventResponse> events;

    public static ProductResponse fromDomain(Product product) {
        List<EventResponse> events = product.getEvents() == null
                ? Collections.emptyList()
                : product.getEvents().stream()
                        .map(EventResponse::fromDomain)
                        .collect(Collectors.toList());

        return new ProductResponse(
                product.getId(),
                product.getName(),
                CategoryRef.fromDomain(product.getCategory()),
                events);
    }

    /**
     * Sous-objet catégorie minimal {@code {id, name}} attendu par {@code productSchema}.
     * Null-safe : un produit sans catégorie sérialise {@code category: null}.
     */
    @Getter
    @AllArgsConstructor
    public static class CategoryRef {
        private UUID id;
        private String name;

        public static CategoryRef fromDomain(Category category) {
            if (category == null) {
                return null;
            }
            return new CategoryRef(category.getId(), category.getName());
        }
    }
}
