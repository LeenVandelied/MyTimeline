package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Requête de mise à jour du profil de l'utilisateur courant (PATCH /api/me).
 * Mêmes contraintes que {@code RegisterRequest} (BR-AUT-003) sur les champs
 * modifiables : {@code name}/{@code username} 3..20, {@code email} valide.
 * Le mot de passe n'est PAS modifiable ici (voir POST /api/me/change-password).
 */
public class UserUpdateRequest {

    @NotBlank
    @Size(min = 3, max = 20)
    private String name;

    @NotBlank
    @Size(min = 3, max = 20)
    private String username;

    @NotBlank
    @Email
    private String email;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
