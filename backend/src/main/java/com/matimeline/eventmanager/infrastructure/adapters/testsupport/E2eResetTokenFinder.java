package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Contrat de lecture du token de réinitialisation pour le canal de capture E2E (issue #283).
 *
 * <p>POURQUOI CE CONTRAT VIT DANS {@code infrastructure} ET NON DANS {@code domain/ports} :
 * c'est un besoin d'OUTILLAGE DE TEST, pas une règle métier. Le domaine n'a aucune raison
 * de connaître « relire le dernier token exploitable d'un compte » — cette opération n'existe
 * dans AUCUN parcours utilisateur (le token ne sort que par email, BR-AUT-012). L'exposer sur
 * {@code PasswordResetTokenRepository} (port domaine) polluerait le contrat de production avec
 * une méthode dont le seul appelant serait un endpoint de test. Tout le canal reste donc confiné
 * à ce package, entièrement conditionné au profil {@code e2e}.
 *
 * <p>Le contrat existe malgré son implémentation unique pour que
 * {@code E2eResetTokenController} dépende d'une INTERFACE (convention projet : un controller
 * injecte des abstractions, jamais un {@code *Impl} concret).
 */
public interface E2eResetTokenFinder {

    /**
     * Retourne la valeur du token de réinitialisation le plus récent ENCORE exploitable
     * (non consommé ET non expiré à {@code now}) du compte {@code userId}.
     *
     * <p>Même critère d'exploitabilité que {@code PasswordResetToken#isUsable} : un canal de
     * test qui rendrait un token consommé/expiré ferait échouer le parcours E2E plus loin,
     * avec un diagnostic trompeur.
     *
     * @param userId identifiant du compte propriétaire des tokens.
     * @param now instant d'évaluation de l'expiration (horloge injectée, pas {@code now()} implicite).
     * @return le token UUID, ou {@link Optional#empty()} si aucun token exploitable.
     */
    Optional<UUID> findLatestUsableToken(UUID userId, LocalDateTime now);
}
