package com.matimeline.eventmanager.infrastructure.adapters.controllers;

/**
 * Stable, snake_case error codes returned in the {@code error} field of the
 * structured error body built by {@link GlobalExceptionHandler#buildBody}.
 *
 * <p>#127 : remplace {@code HttpStatus.getReasonPhrase()} (ex. "Not Found",
 * "Bad Request"), qui n'est pas un contrat stable pour le client (dépend de la
 * locale/impl du statut HTTP, pas fait pour être parsé). Ces codes sont le
 * contrat d'API attendu côté frontend depuis le Sprint 5.
 *
 * <p>Public (pas package-private) : réutilisable par les controllers de ce
 * package qui construisent leur propre corps {@code {"error": "..."}} sans
 * passer par {@code buildBody}. #288 : {@code AuthController} est désormais
 * MIGRÉ sur cet enum — il renvoyait auparavant un vocabulaire mixte (anglais
 * lisible, snake_case, français) dans {@code error}, contrat imprévisible. Le
 * champ {@code error} d'AuthController porte maintenant un code stable choisi
 * au niveau du STATUT HTTP ({@link #UNAUTHORIZED}, {@link #CONFLICT},
 * {@link #INTERNAL_ERROR}), en conservant la forme plate {@code {"error": <code>}}.
 */
public enum ErrorCode {

    NOT_FOUND("not_found"),
    VALIDATION_FAILED("validation_failed"),
    UNPROCESSABLE_ENTITY("unprocessable_entity"),
    // #288 : codes stables pour AuthController (taxonomie au niveau du statut HTTP).
    UNAUTHORIZED("unauthorized"),
    CONFLICT("conflict"),
    INTERNAL_ERROR("internal_error");

    private final String code;

    ErrorCode(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
