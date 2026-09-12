package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand le {@code username} de confirmation fourni à DELETE /api/me (#78) ne
 * correspond PAS à l'utilisateur authentifié (dérivé du JWT). BR-AUT-001 (variante
 * ownership) : seul l'utilisateur identifié peut supprimer SON compte ; la re-saisie
 * du username est une double-sécurité UX.
 *
 * <p>Mappée en 400 BAD_REQUEST par {@code GlobalExceptionHandler}, corps plat
 * {"error":...}. Message neutre : ne révèle jamais si un AUTRE compte porte ce
 * username (anti-énumération).
 */
public class AccountDeletionMismatchException extends RuntimeException {
    public AccountDeletionMismatchException() {
        super("username confirmation does not match");
    }
}
