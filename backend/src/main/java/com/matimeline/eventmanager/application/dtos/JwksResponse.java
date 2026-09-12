package com.matimeline.eventmanager.application.dtos;

import java.util.List;

/**
 * Document JWK Set (RFC 7517 §5) publié sur {@code /.well-known/jwks.json} (#358).
 *
 * <p>Le backend ne détient QU'UNE clé de signature à la fois ({@code JWT_PRIVATE_KEY}, dont la
 * publique est dérivée — cf. {@code RsaKeyMaterial}) : la liste ne porte donc jamais plus d'un
 * élément aujourd'hui. Elle reste une LISTE parce que c'est le contrat du format, et parce
 * qu'une rotation à recouvrement (publier l'ancienne et la nouvelle le temps que les jetons
 * en circulation expirent) est le seul chemin d'évolution qui ne déconnecte personne.
 *
 * @param keys clés publiques de vérification acceptées
 */
public record JwksResponse(List<JwkResponse> keys) {
}
