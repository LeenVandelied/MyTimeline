package com.matimeline.eventmanager.domain.models;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Session JWT active (issue #73). Représente une émission de token identifiée par
 * son {@code jti} (claim unique du JWT). Persistée en base (pas de Redis sur ce
 * projet) pour permettre la RÉVOCATION d'un token stateless avant son expiration
 * naturelle (BR-AUT-010 logout, BR-AUT-011 filtre, BR-AUT-009 refresh).
 *
 * <p>POJO domaine PUR (aucun framework). {@code revokedAt} NULL == session active ;
 * non NULL == révoquée (les requêtes portant ce jti sont rejetées en 401).
 *
 * <p>RGPD : {@code ipAddress} est déjà TRONQUÉ (dernier octet IPv4 mis à zéro) en
 * amont de la construction — le domaine ne stocke jamais l'IP complète en clair.
 */
public class Session {

    private UUID id;
    private String jti;
    private UUID userId;
    private String deviceInfo;
    private String ipAddress;
    private LocalDateTime lastActivity;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;

    public Session(UUID id,
                   String jti,
                   UUID userId,
                   String deviceInfo,
                   String ipAddress,
                   LocalDateTime lastActivity,
                   LocalDateTime createdAt,
                   LocalDateTime expiresAt,
                   LocalDateTime revokedAt) {
        this.id = id;
        this.jti = jti;
        this.userId = userId;
        this.deviceInfo = deviceInfo;
        this.ipAddress = ipAddress;
        this.lastActivity = lastActivity;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.revokedAt = revokedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getJti() {
        return jti;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public LocalDateTime getLastActivity() {
        return lastActivity;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    /** Session active = non révoquée. */
    public boolean isActive() {
        return revokedAt == null;
    }
}
