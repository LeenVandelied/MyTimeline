package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Requête "réinitialiser le mot de passe" (POST /api/auth/reset-password).
 *
 * <p>Contrat figé pour le frontend #53 : champs {@code token} et {@code newPassword}.
 * {@code newPassword} >= 6 caractères (BR-AUT-003, cohérent avec register /
 * change-password). Token invalide/expiré/consommé -> 400 (géré côté service).
 */
public class ResetPasswordRequest {

    @NotBlank
    private String token;

    @NotBlank
    @Size(min = 6, message = "Le mot de passe doit contenir au moins 6 caractères")
    private String newPassword;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}
