package com.matimeline.eventmanager.domain.exceptions;

import java.util.UUID;

/**
 * Session inexistante OU n'appartenant pas au caller (issue #73). Levée à la
 * révocation d'une session ({@code DELETE /api/sessions/{id}}) quand l'id est
 * inconnu ou possédé par un AUTRE utilisateur.
 *
 * <p>Anti-énumération : le contrôleur mappe cette exception en 404 (jamais 403),
 * pour ne pas révéler qu'un id de session existe mais appartient à autrui.
 */
public class SessionNotFoundException extends RuntimeException {
    public SessionNotFoundException(UUID id) {
        super("Session not found with id: " + id);
    }
}
