package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import jakarta.validation.constraints.Size;

/**
 * Partial update request for a product (PATCH). Every field is optional:
 *   - name      : when present, BR-PRO-001 bounds apply (1..100). Absent (null) = unchanged.
 *   - categoryId: when present, BR-PRO-002 (category must exist) is enforced by the service.
 *                 Absent (null) = category unchanged.
 * A @NotBlank is deliberately NOT used on name: null means "do not touch". A blank/whitespace
 * name is still rejected via @Size(min = 1) once trimming is not applied — see service which
 * treats a supplied-but-empty name as a validation error path (400).
 */
public class ProductUpdateRequest {

    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String name;

    private UUID categoryId;

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
}
