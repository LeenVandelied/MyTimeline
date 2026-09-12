package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand le nouveau mot de passe fourni au changement (POST /api/me/change-password)
 * est identique à l'ancien. Vérifiée APRÈS la validation BCrypt de l'ancien mot de passe.
 * Mappée en 400 BAD_REQUEST par {@code GlobalExceptionHandler} (corps plat {"error":...}).
 */
public class SamePasswordException extends RuntimeException {
    public SamePasswordException() {
        super("new password must differ from current password");
    }
}
