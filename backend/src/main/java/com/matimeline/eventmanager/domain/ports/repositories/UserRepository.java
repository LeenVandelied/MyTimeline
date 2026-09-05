package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.User;


public interface UserRepository {
    Optional<User> findDomainUserByUsername(String username);
    Optional<User> findDomainUserByEmail(String email);
    Optional<User> findDomainUserById(UUID id);
    User save(User user);

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