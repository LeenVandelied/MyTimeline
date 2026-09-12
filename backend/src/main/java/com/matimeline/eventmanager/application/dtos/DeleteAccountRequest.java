package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.NotBlank;

/**
 * Requête de suppression de compte (DELETE /api/me, #78, RGPD droit à l'effacement).
 *
 * <p>Confirmation par re-saisie du {@code username}. C'est une double-sécurité UX
 * (BR-AUT-001 variante ownership) : la SOURCE d'identité reste le JWT (cookie), jamais
 * ce champ. Le service compare {@code username} à {@code caller.getUsername()} ; un
 * mismatch -> 400 ({@code AccountDeletionMismatchException}).
 *
 * <p>{@code @NotBlank} : un corps absent ou un username vide -> 400 via
 * {@code MethodArgumentNotValidException} (GlobalExceptionHandler), avant tout accès DB.
 * On ne révèle jamais si un autre compte porte ce username.
 */
public class DeleteAccountRequest {

    @NotBlank
    private String username;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
