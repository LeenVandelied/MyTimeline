package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Requête "mot de passe oublié" (POST /api/auth/forgot-password).
 *
 * <p>Contrat figé pour le frontend #53 : champ {@code email}. Réponse TOUJOURS 200
 * (BR-AUT-005, anti-énumération) — la validation @Email/@NotBlank renvoie 400
 * uniquement sur un corps malformé, pas sur un email inconnu.
 */
public class ForgotPasswordRequest {

    @NotBlank
    @Email
    private String email;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
