package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Category;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP d'une catégorie (issue #52) — fin de l'exposition du domain model
 * en sortie (AP-CAT-03).
 *
 * <p>FIX review #153 : n'expose PLUS {@code ownerId} (UUID d'un utilisateur) — fuite
 * d'identifiant + sape l'anti-énumération. Le seul bit d'information utile au front est
 * de savoir si la catégorie est « système » (owner NULL, non éditable, cf. ADR-002) :
 * on expose donc un booléen {@code system} dérivé ({@code ownerId == null}).
 */
@Getter
@AllArgsConstructor
public class CategoryResponse {
    private UUID id;
    private String name;
    private String color;
    private String description;
    private boolean system;

    public static CategoryResponse fromDomain(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getColor(),
                category.getDescription(),
                category.getOwnerId() == null);
    }
}
