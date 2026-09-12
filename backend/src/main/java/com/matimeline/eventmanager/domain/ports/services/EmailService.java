package com.matimeline.eventmanager.domain.ports.services;

/**
 * Port d'envoi d'email (issue #49, DEC-009 / architecture hexagonale).
 *
 * <p>Interface définie côté domaine ; l'adapter concret ({@code BrevoEmailService})
 * vit dans {@code infrastructure/}. Le domaine ne connaît NI Brevo, NI HTTP, NI
 * Spring : il exprime seulement le besoin métier "envoyer le mail de réinitialisation".
 *
 * <p>La locale est portée par un {@code String} neutre (étiquette de langue type
 * {@code "fr"}, {@code "en"}, {@code "es"}, {@code "de"}) : le domaine ne dépend
 * d'aucun type framework, et le choix du template concret appartient à l'adapter.
 */
public interface EmailService {

    /**
     * Envoie l'email "réinitialisation de mot de passe" dans la langue demandée (issue #142).
     *
     * <p>BR-AUT-012 : l'implémentation NE DOIT lever aucune exception liée à la locale.
     * Une locale {@code null}, vide ou non supportée retombe silencieusement sur le
     * template français, sans travail supplémentaire observable.
     *
     * @param recipientEmail adresse du destinataire (compte existant)
     * @param recipientName  nom affiché dans le corps du message
     * @param resetToken     token brut à insérer dans le lien de réinitialisation
     * @param locale         étiquette de langue souhaitée ({@code fr}/{@code en}/{@code es}/
     *                       {@code de}) ; {@code null} ou inconnue -> français
     */
    void sendPasswordResetEmail(String recipientEmail, String recipientName, String resetToken, String locale);
}
