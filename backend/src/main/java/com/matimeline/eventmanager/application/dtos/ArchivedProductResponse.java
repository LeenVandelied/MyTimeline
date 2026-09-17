package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Product;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * #711 — Projection HTTP d'un produit ARCHIVÉ ({@code GET /users/{userId}/products/archived}).
 *
 * <p>Forme {@code {id, name, color, category:{id,name,color}}}, alignée sur
 * {@code archivedProductSchema} ({@code frontend/src/types/product.ts}).
 *
 * <p>POURQUOI PAS {@link ProductResponse} : la surface « Archivés » n'affiche aucun
 * événement, et les charger passerait par la collection paresseuse d'une entité filtrée
 * par {@code @SQLRestriction} (N+1 en prime). Renvoyer {@code events: []} dans un
 * {@code ProductResponse} mentirait sur le contenu ; un DTO sans le champ ne ment pas.
 *
 * <p>Mêmes exclusions que {@link ProductResponse} : ni {@code user}/owner, ni {@code archived}
 * (implicite pour cette route), catégorie réduite à {@code {id, name, color}}.
 */
@Getter
@AllArgsConstructor
public class ArchivedProductResponse {
    private UUID id;
    private String name;
    private String color;
    private ProductResponse.CategoryRef category;

    public static ArchivedProductResponse fromDomain(Product product) {
        return new ArchivedProductResponse(
                product.getId(),
                product.getName(),
                product.getColor(),
                ProductResponse.CategoryRef.fromDomain(product.getCategory()));
    }
}
