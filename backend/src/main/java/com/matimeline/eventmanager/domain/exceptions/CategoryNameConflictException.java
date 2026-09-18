package com.matimeline.eventmanager.domain.exceptions;

/**
 * BR-CAT-004 (#52) : le nom de catégorie est déjà porté par une AUTRE catégorie du
 * MÊME utilisateur (unicité PAR UTILISATEUR). Mappée en 409 CONFLICT par
 * {@code GlobalExceptionHandler}.
 */
public class CategoryNameConflictException extends RuntimeException {
    public CategoryNameConflictException(String name) {
        super("Category name already used: " + name);
    }
}
