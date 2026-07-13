package com.matimeline.eventmanager.domain.ports.repositories;

import java.time.LocalDateTime;
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

    /**
     * Purge (issue #139) : supprime en masse les tokens devenus inutiles, soit
     * déjà consommés ({@code usedAt} non nul), soit expirés avant {@code expiredBefore}
     * (borne de rétention = {@code now - fenêtre}). Un token valide en cours d'usage
     * ({@code usedAt} nul ET {@code expiresAt} dans le futur) n'est JAMAIS ciblé.
     *
     * @param expiredBefore borne haute d'expiration : seuls les tokens expirés STRICTEMENT
     *                      avant cette date sont supprimés (marge de rétention).
     * @return nombre de lignes supprimées.
     */
    int deleteConsumedOrExpiredBefore(LocalDateTime expiredBefore);
}
