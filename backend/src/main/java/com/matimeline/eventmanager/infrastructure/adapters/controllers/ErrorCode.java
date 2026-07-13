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
 * passer par {@code buildBody}. NOTE : {@code AuthController} (#125) renvoie
 * volontairement des messages lisibles dans {@code error} (AC de l'issue) et
 * n'utilise pas encore cet enum — unification des vocabulaires à arbitrer
 * (follow-up Sprint 38).
 */
public enum ErrorCode {

    NOT_FOUND("not_found"),
    VALIDATION_FAILED("validation_failed"),
    UNPROCESSABLE_ENTITY("unprocessable_entity");

    private final String code;

    ErrorCode(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
