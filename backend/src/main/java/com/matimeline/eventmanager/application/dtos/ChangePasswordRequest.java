package com.matimeline.eventmanager.application.dtos;

import com.matimeline.eventmanager.application.validation.StrongPassword;

import jakarta.validation.constraints.NotBlank;

/**
 * Requête de changement de mot de passe (POST /api/me/change-password).
 * {@code oldPassword} : vérifié contre le hash BCrypt courant (échec -> 400).
 * {@code newPassword} : politique unique {@link StrongPassword} (BR-AUT-003 —
 * >= 8 caractères, une majuscule, un chiffre), identique à register et reset
 * depuis #148. {@code oldPassword} n'est PAS soumis à la politique : c'est un
 * mot de passe existant, potentiellement antérieur au durcissement.
 */
public class ChangePasswordRequest {

    @NotBlank
    private String oldPassword;

    @NotBlank
    @StrongPassword
    private String newPassword;

    public String getOldPassword() {
        return oldPassword;
    }

    public void setOldPassword(String oldPassword) {
        this.oldPassword = oldPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}
