package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.PasswordResetToken;

/**
 * Port de persistance des tokens de réinitialisation (issue #49).
 */
public interface PasswordResetTokenRepository {

    /** Persiste (insert) un nouveau token. */
    PasswordResetToken save(PasswordResetToken token);

    /** Recherche un token par sa valeur UUID brute. */
    Optional<PasswordResetToken> findByToken(UUID token);
}
