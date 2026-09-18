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
 * <p>Forme JSON alignée sur le contrat de lecture du front
 * ({@code frontend/src/types/product.ts} {@code productSchema}) :
 * {@code {id, name, color, category:{id,name,color}, events:[...]}}.
 *
 * <p>#158 (follow-up S11 #61) : le produit expose désormais sa {@code color} propre
 * (nullable, {@code null} = héritage de la catégorie). La couleur de la catégorie est
 * remontée dans {@code CategoryRef.color} pour que le front calcule la couleur effective
 * (surcharge produit ∪ héritage catégorie) depuis la seule réponse produit.
 *
 * <p>⚠ Champs volontairement NON exposés : {@code user}/owner (fuite du User imbriqué),
 * {@code archived} (bit interne de soft delete). La catégorie reste réduite à
 * {@code {id, name, color}} — ni description, ni ownerId, ni flag système.
 */
@Getter
@AllArgsConstructor
public class ProductResponse {
    private UUID id;
    private String name;
    private String color;
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
                product.getColor(),
                CategoryRef.fromDomain(product.getCategory()),
                events);
    }

    /**
     * Sous-objet catégorie minimal {@code {id, name, color}} attendu par {@code productSchema}.
     * {@code color} (#158) = couleur héritée par défaut du produit. Null-safe : un produit sans
     * catégorie sérialise {@code category: null}.
     */
    @Getter
    @AllArgsConstructor
    public static class CategoryRef {
        private UUID id;
        private String name;
        private String color;

        public static CategoryRef fromDomain(Category category) {
            if (category == null) {
                return null;
            }
            return new CategoryRef(category.getId(), category.getName(), category.getColor());
        }
    }
}
