package com.matimeline.eventmanager.domain.models;

import java.util.UUID;

public class User {
    private UUID id;
    private String username;
    private String name;
    private String password;
    private String role;
    private String email;
    private String avatar;
    // #653 (ADR-010, BR-AUT-013) : null = aucun choix explicite du compte (≠ SYSTEM).
    // En LECTURE seulement via ce modèle : l'écriture passe par le port dédié
    // UserRepository.updateThemePreference, jamais par save(User) — les chemins qui
    // reconstruisent un User (PATCH profil, mots de passe, avatar) ne peuvent donc pas
    // l'effacer par omission.
    private ThemePreference themePreference;

    public User(UUID id, String name, String username, String password, String role, String email) {
        this.id = id;
        this.name = name;
        this.username = username;
        this.password = password;
        this.role = role;
        this.email = email;
    }

    public User(UUID id, String name, String username, String password, String role, String email, String avatar) {
        this(id, name, username, password, role, email);
        this.avatar = avatar;
    }

    public User(UUID id, String name, String username, String password, String role, String email, String avatar,
                ThemePreference themePreference) {
        this(id, name, username, password, role, email, avatar);
        this.themePreference = themePreference;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }

    public String getRole() {
        return role;
    }

    public String getEmail() {
        return email;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public ThemePreference getThemePreference() {
        return themePreference;
    }

    /**
     * Copie de cet utilisateur portant {@code themePreference} (#653). Sert à l'adaptateur de
     * persistance pour hydrater la préférence SANS étendre {@code UserMapper} (application ->
     * infrastructure, dette gelée par {@code ArchitectureTest} règle 2). Aucun setter : le
     * modèle ne sert jamais à ÉCRIRE la préférence (cf. port {@code updateThemePreference}).
     */
    public User withThemePreference(ThemePreference themePreference) {
        return new User(id, name, username, password, role, email, avatar, themePreference);
    }
}