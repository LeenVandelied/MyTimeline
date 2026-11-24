package com.matimeline.eventmanager.application.dtos;

import java.util.List;

/**
 * Document JWK Set (RFC 7517 §5) publié sur {@code /.well-known/jwks.json} (#358).
 *
 * <p>Le backend ne SIGNE qu'avec une clé à la fois ({@code JWT_PRIVATE_KEY}, dont la publique
 * est dérivée — cf. {@code RsaKeyMaterial}), publiée en première position. Pendant une rotation
 * (#489), la clé publique précédente ({@code JWT_PREVIOUS_PUBLIC_KEY}) est publiée en second :
 * les jetons émis avant la rotation restent vérifiables jusqu'à leur expiration, sans
 * déconnecter personne. La liste porte donc une ou deux clés.
 *
 * @param keys clés publiques de vérification acceptées (courante, puis précédente éventuelle)
 */
public record JwksResponse(List<JwkResponse> keys) {
}
