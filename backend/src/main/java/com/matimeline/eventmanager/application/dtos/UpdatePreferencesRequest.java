package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Requête de {@code PUT /api/me/preferences} (#653, ADR-010, BR-AUT-013).
 *
 * <p>Validation STRICTE : {@code themePreference} DOIT valoir exactement {@code light},
 * {@code dark} ou {@code system} (minuscules, sans espace). {@code null}/absent, chaîne vide,
 * {@code LIGHT}, {@code " dark"}, {@code auto}... -> 400 {@code VALIDATION_FAILED} via
 * {@code @Valid} + {@code GlobalExceptionHandler}. Le motif est ancré implicitement :
 * {@code @Pattern} exige une correspondance de la chaîne ENTIÈRE.
 *
 * <p>Porté en {@code String} (et non directement en enum) pour que toute valeur invalide
 * produise le MÊME 400 de validation, au lieu d'une erreur de désérialisation Jackson.
 */
public record UpdatePreferencesRequest(
        @NotNull
        @Pattern(regexp = "light|dark|system")
        String themePreference) {
}
