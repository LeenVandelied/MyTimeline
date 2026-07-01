package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Category;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP d'une catégorie (issue #52) — fin de l'exposition du domain model
 * en sortie (AP-CAT-03). Expose id/name/color/description + ownerId (NULL == catégorie
 * système, cf. ADR-002).
 */
@Getter
@AllArgsConstructor
public class CategoryResponse {
    private UUID id;
    private String name;
    private String color;
    private String description;
    private UUID ownerId;

    public static CategoryResponse fromDomain(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getColor(),
                category.getDescription(),
                category.getOwnerId());
    }
}
