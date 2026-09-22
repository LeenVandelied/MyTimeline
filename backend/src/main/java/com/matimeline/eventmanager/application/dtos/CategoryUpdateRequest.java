package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Requête de mise à jour d'une catégorie (PATCH /api/categories/{id}) — issue #52.
 *
 * <p>BR-CAT-001/BR-CAT-003 : {@code name} reste obligatoire à la mise à jour
 * ({@code @NotBlank} -> 400). {@code color}/{@code description} optionnels.
 *
 * <p>Sémantique PATCH : {@code name} est toujours porté (contrat 400 si vide) ;
 * {@code color}/{@code description} écrasent la valeur cible (y compris à null pour
 * effacer). Le contrôleur exige l'ownership (owner_id == JWT) avant d'appliquer.
 */
public class CategoryUpdateRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 255)
    private String color;

    @Size(max = 255)
    private String description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
