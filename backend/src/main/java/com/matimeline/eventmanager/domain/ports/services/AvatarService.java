package com.matimeline.eventmanager.domain.ports.services;

import com.matimeline.eventmanager.domain.models.AvatarContent;
import com.matimeline.eventmanager.domain.models.User;

/**
 * Port métier de gestion de l'avatar de l'utilisateur COURANT (#75, BR-AUT-001 ownership).
 *
 * <p>Interface domaine ; impl {@code AvatarServiceImpl} en couche application. Toute
 * opération agit UNIQUEMENT sur le {@code caller} (identité dérivée du JWT côté
 * contrôleur), jamais sur un id fourni par le client — l'ownership est structurel.
 *
 * <p>Sécurité upload (checklist OWASP, cf. impl) : type validé par MAGIC BYTES (pas le
 * Content-Type client), taille bornée, nom de fichier stocké = référence opaque générée
 * (jamais le filename client), remplacement/suppression nettoient l'ancien fichier.
 */
public interface AvatarService {

    /**
     * Valide puis stocke l'avatar du {@code caller}, met à jour {@code User.avatar} en base
     * (référence opaque) et supprime l'ancien fichier s'il existait (pas d'orphelin).
     *
     * @param caller  utilisateur courant (identité JWT)
     * @param content octets bruts du fichier uploadé
     * @throws com.matimeline.eventmanager.domain.exceptions.InvalidAvatarException
     *         si {@code content} est vide, dépasse la taille max, ou n'est pas un
     *         JPEG/PNG/WebP (détection par magic bytes).
     */
    void uploadAvatar(User caller, byte[] content);

    /**
     * Relit l'avatar du {@code caller} pour streaming authentifié (GET /api/me/avatar).
     *
     * @throws com.matimeline.eventmanager.domain.exceptions.AvatarNotFoundException
     *         si le caller n'a pas d'avatar stocké ou si le fichier est introuvable.
     */
    AvatarContent getAvatar(User caller);

    /**
     * Réinitialise l'avatar du {@code caller} à {@code null} en base et supprime le fichier
     * stocké. Idempotent : un caller sans avatar est un no-op silencieux.
     */
    void deleteAvatar(User caller);
}
