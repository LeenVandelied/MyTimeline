package com.matimeline.eventmanager.domain.ports.services;

/**
 * Port d'envoi d'email (issue #49, DEC-009 / architecture hexagonale).
 *
 * <p>Interface définie côté domaine ; l'adapter concret ({@code BrevoEmailService})
 * vit dans {@code infrastructure/}. Le domaine ne connaît NI Brevo, NI HTTP, NI
 * Spring : il exprime seulement le besoin métier "envoyer le mail de réinitialisation".
 */
public interface EmailService {

    /**
     * Envoie l'email "Réinitialisation de votre mot de passe MyTimeline" (template FR).
     *
     * @param recipientEmail adresse du destinataire (compte existant)
     * @param recipientName  nom affiché dans le corps du message
     * @param resetToken     token brut à insérer dans le lien de réinitialisation
     */
    void sendPasswordResetEmail(String recipientEmail, String recipientName, String resetToken);
}
