package com.matimeline.eventmanager.domain.ports.services;

/**
 * Port du flux "mot de passe oublié" (issue #49, DEC-009).
 *
 * <p>Interface domaine ; implémentation en couche application
 * ({@code PasswordResetServiceImpl}). Aucune dépendance framework / Brevo / HTTP.
 */
public interface PasswordResetService {

    /**
     * Étape "mot de passe oublié". Si {@code email} correspond à un compte existant,
     * génère un token UUID (valide 15 min, usage unique), le persiste et déclenche
     * l'envoi de l'email Brevo. Si l'email est inconnu, NE FAIT RIEN.
     *
     * <p>BR-AUT-005 (anti-énumération) : cette méthode ne lève JAMAIS d'exception
     * révélant l'existence/absence du compte et ne retourne aucune information ;
     * le contrôleur répond TOUJOURS 200 quel que soit le résultat du lookup.
     *
     * @param email adresse saisie par l'utilisateur
     */
    void requestReset(String email);

    /**
     * Étape "réinitialiser le mot de passe". Vérifie que le token existe, n'est pas
     * expiré (>15 min) et n'est pas déjà consommé ; ré-encode {@code newPassword}
     * en BCrypt (BR-AUT-002), met à jour le compte et marque le token consommé.
     *
     * @param token       token brut reçu par email
     * @param newPassword nouveau mot de passe en clair (>= 6 caractères, BR-AUT-003,
     *                    validé en amont par le DTO)
     * @throws com.matimeline.eventmanager.domain.exceptions.InvalidPasswordResetTokenException
     *         si le token est inexistant, mal formé, expiré ou déjà consommé (-> 400).
     */
    void resetPassword(String token, String newPassword);
}
