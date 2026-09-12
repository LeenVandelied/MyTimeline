package com.matimeline.eventmanager.application.dtos;

import com.matimeline.eventmanager.application.validation.StrongPassword;

import jakarta.validation.constraints.NotBlank;

/**
 * Requête "réinitialiser le mot de passe" (POST /api/auth/reset-password).
 *
 * <p>Contrat figé pour le frontend #53 : champs {@code token} et {@code newPassword}.
 * {@code newPassword} : politique unique {@link StrongPassword} (BR-AUT-003 —
 * >= 8 caractères, une majuscule, un chiffre), identique à register et
 * change-password depuis #148. Token invalide/expiré/consommé -> 400 (service).
 */
public class ResetPasswordRequest {

    @NotBlank
    private String token;

    @NotBlank
    @StrongPassword
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
