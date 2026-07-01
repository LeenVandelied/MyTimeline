package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Requête de création d'une catégorie (POST /api/categories) — issue #52.
 *
 * <p>BR-CAT-001 : {@code name} obligatoire (non null/vide) -> {@code @NotBlank}
 * produit un 400 via {@code GlobalExceptionHandler} avant d'atteindre le service.
 * {@code color}/{@code description} restent optionnels (#44).
 *
 * <p>Fin de l'exposition du domain model en entrée HTTP (AP-CAT-03) : le contrôleur
 * accepte ce DTO, pas {@code Category}.
 */
public class CategoryRequest {

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
