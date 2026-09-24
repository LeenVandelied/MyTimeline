package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import com.matimeline.eventmanager.domain.models.User;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP de l'utilisateur courant (BR-AUT-008).
 * N'expose JAMAIS le hash du mot de passe : aucun champ {@code password}.
 *
 * <p>#75 / dette #151 : expose {@code avatarUrl}, l'URL RELATIVE de l'endpoint AUTHENTIFIÉ
 * de streaming de l'avatar ({@code /api/me/avatar}) quand l'utilisateur en a un, sinon
 * {@code null}. On NE renvoie PAS la référence de stockage interne (opaque) : le front
 * consomme une URL stable, découplée du backend de stockage (local aujourd'hui, objet
 * demain). Débloque {@code UserSchema} frontend (#151) consommé par #86/#87.
 *
 * <p>#653 (ADR-010, BR-AUT-013) : expose {@code themePreference} — {@code "light"},
 * {@code "dark"}, {@code "system"} ou {@code null} (le compte n'a encore rien choisi). La clé
 * est TOUJOURS présente dans le JSON (pas de {@code NON_NULL}) : le front distingue
 * « aucun choix » ({@code null}) d'un choix explicite pour arbitrer à la connexion. Cette
 * projection sert {@code GET /api/me}, {@code GET /api/auth/me} et
 * {@code PUT /api/me/preferences}.
 */
@Getter
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String name;
    private String username;
    private String email;
    private String role;
    private String avatarUrl;
    private String themePreference;

    /** Endpoint authentifié de streaming de l'avatar (pas d'URL publique permanente). */
    private static final String AVATAR_URL = "/api/me/avatar";

    public static UserResponse fromDomain(User user) {
        String avatarUrl = user.getAvatar() != null && !user.getAvatar().isBlank()
                ? AVATAR_URL
                : null;
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                avatarUrl,
                user.getThemePreference() != null ? user.getThemePreference().value() : null);
    }
}
