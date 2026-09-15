package com.matimeline.eventmanager.domain.ports.services;

import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.User;

public interface UserService {
    User createUser(User user);
    User updateUser(User user);

    /**
     * Change le mot de passe de l'utilisateur courant (#70, A8/DIP).
     * Vérifie {@code oldPassword} contre le hash courant puis re-hashe {@code newPassword}.
     *
     * @throws com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException
     *         si {@code oldPassword} ne correspond pas au hash courant.
     */
    void changePassword(User caller, String oldPassword, String newPassword);

    /**
     * Supprime DÉFINITIVEMENT le compte du {@code caller} (DELETE /api/me, #78, RGPD
     * droit à l'effacement). Opération irréversible dans UNE transaction atomique.
     *
     * <p>BR-AUT-001 (variante ownership) : {@code confirmUsername} DOIT être exactement
     * égal à {@code caller.getUsername()} (identité dérivée du JWT). Mismatch ->
     * {@link com.matimeline.eventmanager.domain.exceptions.AccountDeletionMismatchException}
     * (400) ; aucune donnée n'est touchée.
     *
     * <p>Purge ordonnée (FK non-cascade V1/V8) : events -> products (archivés inclus)
     * -> catégories possédées (système préservées) -> user, + révocation de toutes les
     * sessions ({@code SessionService.revokeAllSessions}). Les FK ON DELETE CASCADE
     * (sessions V10, password_reset_tokens V6) sont purgées par la DB.
     *
     * @throws com.matimeline.eventmanager.domain.exceptions.AccountDeletionMismatchException
     *         si {@code confirmUsername != caller.getUsername()}.
     */
    void deleteAccount(User caller, String confirmUsername);

    Optional<User> findDomainUserById(UUID id);
    Optional<User> findDomainUserByUsername(String username);
    Optional<User> findDomainUserByEmail(String email);

} 