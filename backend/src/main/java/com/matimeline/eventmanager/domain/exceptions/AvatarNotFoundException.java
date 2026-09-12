package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand l'utilisateur courant demande son avatar (GET /api/me/avatar, #75) mais
 * n'en a aucun de stocké (champ {@code avatar} null, ou fichier introuvable). Mappée en
 * 404 NOT_FOUND par {@code GlobalExceptionHandler}. Message neutre (pas de fuite de
 * chemin de stockage).
 */
public class AvatarNotFoundException extends RuntimeException {
    public AvatarNotFoundException() {
        super("avatar not found");
    }
}
