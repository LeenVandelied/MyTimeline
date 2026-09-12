package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand le {@code type} d'un événement n'appartient pas aux valeurs autorisées
 * ({@code duration} / {@code single}, contrainte DB {@code ck_events_type}).
 *
 * <p>Symétrique de {@link InvalidDurationUnitException} : la donnée est syntaxiquement
 * recevable (le corps JSON a bien été désérialisé, {@code @NotBlank} passe) mais
 * sémantiquement invalide -> HTTP 422 Unprocessable Entity (mappé par
 * {@code GlobalExceptionHandler}). Sans cette validation applicative, un {@code type}
 * inconnu atteignait la contrainte DB et remontait en {@code DataIntegrityViolationException}
 * non gérée, masquée en 401 par le dispatch {@code /error} (fix worktree S31).
 */
public class InvalidEventTypeException extends RuntimeException {
    public InvalidEventTypeException(String type) {
        super("Type d'événement invalide (attendu 'duration' ou 'single') : "
                + (type == null ? "null" : type));
    }
}
