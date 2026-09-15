package com.matimeline.eventmanager.domain.exceptions;

import com.matimeline.eventmanager.domain.models.Event;

/**
 * BR-EVE-015 (#231) — Édition concurrente d'un event détectée par l'optimistic
 * locking (@Version sur EventEntity). Portée par {@code EventController.updateEvent}
 * APRÈS vérification d'ownership : elle transporte l'état serveur GAGNANT (le domain
 * model {@link Event} rechargé + sa version) pour permettre au {@code GlobalExceptionHandler}
 * de sérialiser un 409 ENRICHI (serverVersion + entité serveur) consommé par la modale
 * comparative frontend.
 *
 * <p>Hexagonal : exception DOMAINE pure — ne référence que {@code domain.models.Event}
 * (aucun import Spring/JPA/application). La conversion en projection HTTP ({@code EventResponse})
 * a lieu dans l'adaptateur (handler), pas ici.
 *
 * <p>{@code serverEvent} est {@code transient} : {@link Event} n'est pas {@link java.io.Serializable}
 * et l'exception ne transite jamais par sérialisation Java (usage strictement in-process).
 */
public class EventConflictException extends RuntimeException {

    private final transient Event serverEvent;
    private final Integer serverVersion;

    public EventConflictException(Event serverEvent, Integer serverVersion) {
        super("event was modified concurrently");
        this.serverEvent = serverEvent;
        this.serverVersion = serverVersion;
    }

    public Event getServerEvent() {
        return serverEvent;
    }

    public Integer getServerVersion() {
        return serverVersion;
    }
}
