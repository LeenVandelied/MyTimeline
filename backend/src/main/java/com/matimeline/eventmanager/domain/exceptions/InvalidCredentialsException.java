package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand l'ancien mot de passe fourni au changement (POST /api/me/change-password)
 * ne correspond pas au hash courant (BR-AUT-005 : message neutre).
 * Mappée en 400 BAD_REQUEST par {@code GlobalExceptionHandler}.
 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("invalid current password");
    }
}
