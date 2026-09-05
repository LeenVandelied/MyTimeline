package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Partial update request for a product (PATCH). Every field is optional:
 *   - name      : when present, BR-PRO-001 bounds apply (1..100) AND the value must contain
 *                 at least one non-whitespace character. Absent (null) = unchanged.
 *   - categoryId: when present, BR-PRO-002 (category must exist) is enforced by the service.
 *                 Absent (null) = category unchanged.
 * A @NotBlank is deliberately NOT used on name: null means "do not touch" and @NotBlank would
 * reject null. Instead @Pattern(".*\\S.*") rejects a supplied-but-blank name (e.g. " ") which
 * would otherwise slip past @Size(min = 1) and violate BR-PRO-001. @Pattern skips null values,
 * so partial patches without a name stay valid.
 *
 * #158 — Couleur produit (follow-up S11 #61) :
 *   - color     : quand présent (hex #RRGGBB), pose une surcharge couleur produit.
 *                 Absent (null) = couleur inchangée. @Pattern skip null.
 *   - clearColor: {@code true} = réinitialise la surcharge (color -> null en base,
 *                 le produit ré-hérite alors de la couleur de sa catégorie côté front).
 *                 Nécessaire car {@code color=null} signifie déjà « inchangé » et ne
 *                 peut donc PAS exprimer un reset. {@code color} et {@code clearColor}
 *                 sont mutuellement exclusifs (clearColor prime, cf. service).
 */
public class ProductUpdateRequest {

    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    @Pattern(regexp = ".*\\S.*", message = "Name must not be blank")
    private String name;

    private UUID categoryId;

    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Color must be a #RRGGBB hex value")
    private String color;

    private boolean clearColor;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(UUID categoryId) {
        this.categoryId = categoryId;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public boolean isClearColor() {
        return clearColor;
    }

    public void setClearColor(boolean clearColor) {
        this.clearColor = clearColor;
    }
}
