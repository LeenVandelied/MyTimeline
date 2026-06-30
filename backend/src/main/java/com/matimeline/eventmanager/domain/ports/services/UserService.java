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

    Optional<User> findDomainUserById(UUID id);
    Optional<User> findDomainUserByUsername(String username);
    Optional<User> findDomainUserByEmail(String email);

} 