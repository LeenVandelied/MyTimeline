package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.ThemePreference;
import com.matimeline.eventmanager.domain.models.User;


public interface UserRepository {
    Optional<User> findDomainUserByUsername(String username);
    Optional<User> findDomainUserByEmail(String email);
    Optional<User> findDomainUserById(UUID id);
    /**
     * Crée ou met à jour un utilisateur. En MISE À JOUR, {@code themePreference} n'est
     * PAS recopiée (#653, ADR-010 § 3) : elle ne s'écrit que par
     * {@link #updateThemePreference}. Un {@code User} reconstruit sans préférence ne
     * l'efface donc pas.
     */
    User save(User user);

    /**
     * #653 (BR-AUT-013) : pose la préférence de thème du compte {@code userId}, seul
     * chemin d'écriture de cette donnée. {@code preference} non nulle (l'API ne remet
     * jamais un compte à « aucun choix »).
     *
     * @return l'utilisateur à jour, ou {@link Optional#empty()} si le compte n'existe plus.
     */
    Optional<User> updateThemePreference(UUID userId, ThemePreference preference);

    /**
     * #78 (RGPD) : supprime DÉFINITIVEMENT le compte {@code userId}. Suppression
     * physique volontaire (droit à l'effacement) — pas de soft delete sur users.
     * À appeler EN DERNIER, une fois events/products/categories(owner) purgés, sinon
     * les FK non-cascade (products/events/categories.owner_id) bloquent l'opération.
     * Les FK sessions/password_reset_tokens sont ON DELETE CASCADE (V10/V6) -> purge
     * DB automatique.
     */
    void deleteById(UUID userId);
}