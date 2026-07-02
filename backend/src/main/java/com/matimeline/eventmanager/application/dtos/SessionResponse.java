package com.matimeline.eventmanager.application.dtos;

import java.time.LocalDateTime;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Session;

/**
 * Projection HTTP d'une session active (issue #73, GET /api/sessions).
 *
 * <p>N'expose JAMAIS le {@code jti} (identifiant interne du token, servant à la
 * révocation côté serveur) ni {@code userId}/{@code revokedAt}. Seul l'{@code id}
 * métier est renvoyé (cible du DELETE /{id}). L'{@code ipAddress} est déjà tronquée
 * (dernier octet IPv4 à zéro, RGPD) à la persistance.
 *
 * <p>{@code current} = cette session correspond au token de la requête courante
 * (l'utilisateur ne peut pas se "déconnecter lui-même" via DELETE /{id} par erreur
 * — l'UI l'affiche distinctement).
 */
public record SessionResponse(
        UUID id,
        String deviceInfo,
        String ipAddress,
        LocalDateTime lastActivity,
        LocalDateTime createdAt,
        boolean current) {

    public static SessionResponse fromDomain(Session session, String currentJti) {
        return new SessionResponse(
                session.getId(),
                session.getDeviceInfo(),
                session.getIpAddress(),
                session.getLastActivity(),
                session.getCreatedAt(),
                session.getJti().equals(currentJti));
    }
}
