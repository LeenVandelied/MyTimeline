package com.matimeline.eventmanager.infrastructure.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Entité JPA d'une session JWT active (issue #73). Mappe la table {@code sessions}
 * (migration V10).
 *
 * <p>ddl-auto=validate (dev/test/prod) : ce mapping DOIT correspondre EXACTEMENT à
 * V10 (colonnes id, jti UNIQUE non nul, user_id, device_info, ip_address,
 * last_activity, created_at, expires_at, revoked_at). Aucune {@code @Version} ni
 * audit listener : table technique pilotée applicativement (createdAt/lastActivity
 * posés à la création, revokedAt écrit via update ciblé). Pas de relation
 * {@code @ManyToOne} vers UserEntity — {@code user_id} est un UUID simple, aligné
 * sur l'absence de relations JPA du domaine auth (cf. br-auth §4).
 *
 * <p>RGPD : {@code ipAddress} contient l'IP TRONQUÉE (dernier octet IPv4 à zéro),
 * jamais l'IP complète en clair.
 */
@Entity
@Table(name = "sessions")
public class SessionEntity {

    @Id
    // Pas de @GeneratedValue : id UUID assigné applicativement avant persist
    // (SessionServiceImpl -> UUID.randomUUID()), même pattern que PasswordResetTokenEntity.
    private UUID id;

    @Column(nullable = false, unique = true)
    private String jti;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "last_activity", nullable = false)
    private LocalDateTime lastActivity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getJti() {
        return jti;
    }

    public void setJti(String jti) {
        this.jti = jti;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public LocalDateTime getLastActivity() {
        return lastActivity;
    }

    public void setLastActivity(LocalDateTime lastActivity) {
        this.lastActivity = lastActivity;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SessionEntity that = (SessionEntity) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
