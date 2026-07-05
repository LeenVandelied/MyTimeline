package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand l'avatar uploadé (POST /api/me/avatar, #75) est invalide : fichier absent,
 * type MIME non autorisé (détecté par MAGIC BYTES, pas par le header Content-Type client),
 * ou taille dépassant la limite serveur. Mappée en 400 BAD_REQUEST par
 * {@code GlobalExceptionHandler}. Le message est explicite (guide le client) mais ne
 * fuite aucun détail interne (chemin de stockage, stack).
 */
public class InvalidAvatarException extends RuntimeException {
    public InvalidAvatarException(String message) {
        super(message);
    }
}
