package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import com.matimeline.eventmanager.domain.models.User;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP de l'utilisateur courant (BR-AUT-008).
 * N'expose JAMAIS le hash du mot de passe : aucun champ {@code password}.
 */
@Getter
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String name;
    private String username;
    private String email;
    private String role;

    public static UserResponse fromDomain(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getRole());
    }
}
