package com.matimeline.eventmanager.infrastructure.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Entité JPA du token de réinitialisation (issue #49). Mappe la table
 * {@code password_reset_tokens} (migration V6).
 *
 * <p>ddl-auto=validate (dev/test) : ce mapping DOIT correspondre EXACTEMENT au schéma
 * (colonnes id, user_id, token, expires_at, used_at de V6 + version de V15 ; token
 * unique non nul). Pas d'audit created_at/updated_at (table technique éphémère).
 *
 * <p>{@code version} (@Version, V15/#143) : verrou optimiste anti-TOCTOU sur la
 * consommation. Le UPDATE de {@code used_at} porte {@code WHERE version=?} avec la
 * version lue au CHECK -> une seule de deux consommations concurrentes réussit,
 * l'autre lève {@code ObjectOptimisticLockingFailureException} (cf.
 * {@code PasswordResetServiceImpl.resetPassword}).
 */
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetTokenEntity {

    @Id
    // Pas de @GeneratedValue : l'id UUID est assigné applicativement avant persist
    // (PasswordResetServiceImpl -> new PasswordResetToken(UUID.randomUUID(), ...)).
    // super.save() (SimpleJpaRepository) fait alors un merge/INSERT sur id non nul.
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, unique = true)
    private UUID token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    // Verrou optimiste (V15, #143) : anti-TOCTOU sur la consommation du token.
    @Version
    @Column(nullable = false)
    private Integer version;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getToken() {
        return token;
    }

    public void setToken(UUID token) {
        this.token = token;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }

    /** Version du verrou optimiste (gérée par Hibernate, pas de setter). */
    public Integer getVersion() {
        return version;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PasswordResetTokenEntity that = (PasswordResetTokenEntity) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
