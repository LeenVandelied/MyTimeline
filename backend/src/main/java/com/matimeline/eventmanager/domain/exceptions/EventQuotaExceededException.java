package com.matimeline.eventmanager.domain.exceptions;

import java.util.UUID;

/**
 * Levée quand la politique de plan refuse la création d'un événement (quota du palier
 * atteint, issue #88). Mappée en HTTP 402 par {@code GlobalExceptionHandler}.
 */
public class EventQuotaExceededException extends RuntimeException {
    public EventQuotaExceededException(UUID userId) {
        super("Event quota exceeded for user " + userId);
    }
}
