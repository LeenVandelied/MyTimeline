package com.matimeline.eventmanager.application.dtos;

/**
 * Une entrée JWK décrivant une clé PUBLIQUE RSA de vérification RS256
 * (RFC 7517 §4 pour les paramètres communs, RFC 7518 §6.3.1 pour {@code n}/{@code e}).
 *
 * <p>Publiée telle quelle par {@code JwksController} sur {@code /.well-known/jwks.json} (#358).
 * <strong>Ne contient aucun secret</strong> : modulus et exposant public sont, par
 * construction, la moitié publique de la paire. La clé privée ({@code JWT_PRIVATE_KEY})
 * n'est jamais sérialisée ici, et aucun champ de cette classe ne peut la reconstituer.
 *
 * <p>L'ordre des composants du record fixe l'ordre des champs JSON — sans importance pour un
 * consommateur JWK conforme, qui indexe par nom.
 *
 * @param kty famille de clé, toujours {@code "RSA"}
 * @param use usage prévu, toujours {@code "sig"} (vérification de signature)
 * @param alg algorithme, toujours {@code "RS256"} — figé à l'émission par {@code JwtService}
 * @param kid identifiant stable de la clé : empreinte JWK RFC 7638 (SHA-256 de la forme
 *            canonique). Purement informatif aujourd'hui — {@code JwtService} n'émet PAS
 *            d'en-tête {@code kid}, et le middleware Edge essaie toutes les clés publiées.
 *            Il est présent parce qu'un JWKS sans {@code kid} est inexploitable par tout
 *            client standard dès qu'une seconde clé apparaît.
 * @param n   modulus RSA, entier positif big-endian en Base64url NON padé
 * @param e   exposant public RSA, même encodage
 */
public record JwkResponse(String kty, String use, String alg, String kid, String n, String e) {
}
