package com.matimeline.eventmanager.domain.models;

/**
 * Valeur immuable représentant un avatar relu depuis le stockage (#75) : octets bruts +
 * type MIME à renvoyer dans l'en-tête {@code Content-Type} du streaming authentifié
 * (GET /api/me/avatar). Type PUR domaine (aucun framework).
 */
public record AvatarContent(byte[] bytes, String contentType) {
}
