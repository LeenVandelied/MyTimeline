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
 */
public class ProductUpdateRequest {

    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    @Pattern(regexp = ".*\\S.*", message = "Name must not be blank")
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
