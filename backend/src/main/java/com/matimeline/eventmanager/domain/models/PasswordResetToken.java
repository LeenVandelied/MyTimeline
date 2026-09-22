package com.matimeline.eventmanager.domain.models;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Token de réinitialisation de mot de passe (issue #49).
 *
 * <p>Modèle de domaine pur (aucune dépendance framework). Un token est généré par
 * forgot-password, à usage unique, valide 15 min (durée de cadrage S8). Il est
 * consommé par reset-password qui pose {@code usedAt}.
 *
 * <p>Invariants de validité, encapsulés ici plutôt que dispersés dans le service :
 * un token est exploitable s'il n'est PAS expiré ({@code expiresAt} dans le futur)
 * ET PAS encore consommé ({@code usedAt == null}).
 */
public class PasswordResetToken {

    private final UUID id;
    private final UUID userId;
    private final UUID token;
    private final LocalDateTime expiresAt;
    private final LocalDateTime usedAt;

    public PasswordResetToken(UUID id, UUID userId, UUID token, LocalDateTime expiresAt, LocalDateTime usedAt) {
        this.id = id;
        this.userId = userId;
        this.token = token;
        this.expiresAt = expiresAt;
        this.usedAt = usedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getToken() {
        return token;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    /** {@code true} si le token a déjà été consommé (reset effectué). */
    public boolean isConsumed() {
        return usedAt != null;
    }

    /** {@code true} si le token est expiré à l'instant {@code now}. */
    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }

    /** {@code true} si le token est exploitable (ni expiré ni consommé) à {@code now}. */
    public boolean isUsable(LocalDateTime now) {
        return !isConsumed() && !isExpired(now);
    }

    /**
     * Retourne une copie marquée comme consommée à {@code usedAt}. Le modèle étant
     * immuable, la consommation produit un nouvel objet (persisté par le service).
     */
    public PasswordResetToken consume(LocalDateTime usedAt) {
        return new PasswordResetToken(id, userId, token, expiresAt, usedAt);
    }
}
