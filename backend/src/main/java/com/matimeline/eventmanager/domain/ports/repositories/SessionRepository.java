package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Session;

/**
 * Port de persistance des sessions JWT (issue #73). Le lookup par {@code jti} est
 * appelé à CHAQUE requête authentifiée (JwtFilter) — l'implémentation s'appuie sur
 * un index UNIQUE sur {@code jti} (migration V10) pour rester O(index) et non O(table).
 */
public interface SessionRepository {

    /** Persiste (insert) une nouvelle session. */
    Session save(Session session);

    /** Lookup par jti (colonne indexée UNIQUE). Utilisé par JwtFilter à chaque requête. */
    Optional<Session> findByJti(String jti);

    /** Session par id métier. Utilisé par la révocation ciblée (ownership vérifié en amont). */
    Optional<Session> findDomainSessionById(UUID id);

    /** Sessions ACTIVES (revoked_at IS NULL) et non expirées du user, triées activité desc. */
    List<Session> findActiveByUserId(UUID userId);

    /**
     * Révoque (revoked_at = now) la session portant ce jti si elle est active.
     * No-op idempotent si le jti est inconnu ou déjà révoqué.
     */
    void revokeByJti(String jti);

    /** Révoque la session d'id donné (revoked_at = now) si active. */
    void revokeById(UUID id);

    /**
     * Révoque TOUTES les sessions actives du user SAUF celle portant {@code exceptJti}.
     * {@code exceptJti} NULL -> révoque toutes les sessions actives du user.
     * Renvoie le nombre de sessions révoquées.
     */
    int revokeAllByUserIdExcept(UUID userId, String exceptJti);
}
