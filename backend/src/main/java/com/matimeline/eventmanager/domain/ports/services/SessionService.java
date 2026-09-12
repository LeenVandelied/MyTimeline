package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Session;

/**
 * Port métier de gestion des sessions actives (issue #73).
 *
 * <p>Interface domaine ; implémentation en couche application
 * ({@code SessionServiceImpl}). Aucune dépendance framework / JWT / HTTP : la
 * troncature IP RGPD et la génération de jti sont assurées en amont (couche
 * infrastructure), le domaine ne manipule que des valeurs déjà nettoyées.
 *
 * <p>Contrat de révocation (BR-AUT-010/011, BR-AUT-009) :
 * <ul>
 *   <li>{@link #createSession} : enregistre une émission de token (au login).</li>
 *   <li>{@link #isSessionActive} : consulté par JwtFilter à chaque requête.</li>
 *   <li>{@link #revokeCurrentSession} : logout (révoque le jti courant).</li>
 *   <li>{@link #revokeSession} : révocation ciblée avec ownership.</li>
 *   <li>{@link #revokeOtherSessions} : "déconnecter les autres appareils".</li>
 *   <li>{@link #revokeAllSessions} : révocation totale — consommé par #78.</li>
 * </ul>
 */
public interface SessionService {

    /**
     * Enregistre une nouvelle session active à l'émission d'un token.
     *
     * @param jti          identifiant unique du JWT (claim jti)
     * @param userId       propriétaire de la session
     * @param deviceInfo   User-Agent (ou description device), peut être {@code null}
     * @param ipAddress    IP DÉJÀ TRONQUÉE (dernier octet IPv4 à zéro), jamais l'IP complète
     * @param expiresAt    expiration du token (alignée sur la durée de vie du JWT)
     */
    Session createSession(String jti, UUID userId, String deviceInfo, String ipAddress,
                          java.time.LocalDateTime expiresAt);

    /**
     * Vrai si une session ACTIVE (non révoquée) porte ce {@code jti}. Faux si le jti
     * est inconnu ou révoqué. Appelé par JwtFilter à CHAQUE requête authentifiée
     * (lookup indexé — BR-AUT-011).
     */
    boolean isSessionActive(String jti);

    /** Sessions actives du user courant (GET /api/sessions). */
    List<Session> getActiveSessions(UUID userId);

    /**
     * Révoque le token courant (POST /logout, BR-AUT-010). No-op idempotent si le jti
     * est inconnu / déjà révoqué. {@code jti} NULL toléré (no-op).
     */
    void revokeCurrentSession(String jti);

    /**
     * Révoque une session ciblée (DELETE /api/sessions/{id}). Vérifie l'OWNERSHIP :
     * la session doit appartenir à {@code userId}, sinon
     * {@code SessionNotFoundException} (404, anti-énumération).
     */
    void revokeSession(UUID sessionId, UUID userId);

    /**
     * Révoque toutes les sessions actives du user SAUF celle du jti courant
     * (DELETE /api/sessions/others). Renvoie le nombre de sessions révoquées.
     */
    int revokeOtherSessions(UUID userId, String currentJti);

    /**
     * Révoque TOUTES les sessions actives du user (déconnexion globale).
     * Consommé par #78 (changement de mot de passe / suppression de compte).
     * Renvoie le nombre de sessions révoquées.
     */
    int revokeAllSessions(UUID userId);
}
