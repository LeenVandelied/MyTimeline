package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand un token de réinitialisation fourni à reset-password (issue #49)
 * est inexistant, mal formé, expiré (>15 min) ou déjà consommé.
 *
 * <p>Mappée en 400 BAD_REQUEST par {@code GlobalExceptionHandler} (corps plat
 * {"error":...}). Message volontairement générique : ne distingue pas les causes
 * (anti-énumération — un attaquant ne doit pas savoir si un token a existé).
 */
public class InvalidPasswordResetTokenException extends RuntimeException {
    public InvalidPasswordResetTokenException() {
        super("invalid or expired password reset token");
    }
}
