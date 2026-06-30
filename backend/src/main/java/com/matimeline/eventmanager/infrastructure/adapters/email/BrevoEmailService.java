package com.matimeline.eventmanager.infrastructure.adapters.email;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.matimeline.eventmanager.domain.ports.services.EmailService;

/**
 * Adapter d'envoi d'email via l'API Brevo (issue #49).
 *
 * <p>Implémente le port domaine {@link EmailService}. Appelle
 * {@code POST https://api.brevo.com/v3/smtp/email} avec l'en-tête {@code api-key}.
 *
 * <p>Sécurité (DEC-S3-001 / règle secrets absolue) :
 * <ul>
 *   <li>La clé API provient UNIQUEMENT de {@code BREVO_API_KEY}
 *       ({@code brevo.api.key=${BREVO_API_KEY}}) — jamais en dur.</li>
 *   <li>La clé n'est JAMAIS loggée (ni en entier ni en fragment).</li>
 *   <li>Si la clé est absente (dev/test sans env var), l'envoi est NO-OP avec un
 *       warning : le flux forgot-password reste fonctionnel (token créé) sans crasher,
 *       et BR-AUT-005 (réponse 200 systématique) est préservée.</li>
 * </ul>
 *
 * <p>Template FR figé ici (abstraction emailLocale prévue en wave future, cf. risques #49).
 */
@Service
public class BrevoEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(BrevoEmailService.class);

    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
    private static final String EMAIL_SUBJECT = "Réinitialisation de votre mot de passe MyTimeline";

    private final RestClient restClient;
    private final String apiKey;
    private final String senderEmail;
    private final String senderName;
    private final String resetUrlBase;

    public BrevoEmailService(
            RestClient.Builder restClientBuilder,
            @Value("${brevo.api.key:}") String apiKey,
            @Value("${brevo.sender.email:no-reply@mytimeline.app}") String senderEmail,
            @Value("${brevo.sender.name:MyTimeline}") String senderName,
            @Value("${app.frontend.reset-url-base:http://localhost:3000/reset-password}") String resetUrlBase) {
        this.restClient = restClientBuilder.baseUrl(BREVO_ENDPOINT).build();
        this.apiKey = apiKey;
        this.senderEmail = senderEmail;
        this.senderName = senderName;
        this.resetUrlBase = resetUrlBase;
    }

    @Override
    public void sendPasswordResetEmail(String recipientEmail, String recipientName, String resetToken) {
        if (apiKey == null || apiKey.isBlank()) {
            // Pas de clé (dev/test) : on ne tente pas l'appel HTTP. Le flux métier
            // continue (token déjà persisté), réponse 200 préservée.
            log.warn("BREVO_API_KEY absente : envoi d'email de réinitialisation ignoré (no-op).");
            return;
        }

        String resetLink = resetUrlBase + "?token=" + resetToken;
        Map<String, Object> payload = buildPayload(recipientEmail, recipientName, resetLink);

        try {
            restClient.post()
                    .header("api-key", apiKey)
                    .header("accept", MediaType.APPLICATION_JSON_VALUE)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException ex) {
            // Échec d'envoi : on logue SANS le token ni la clé. On ne propage pas
            // l'exception jusqu'au contrôleur (BR-AUT-005 : la réponse 200 ne doit
            // pas dépendre de la disponibilité de Brevo, sinon on fuit l'existence
            // du compte via un timing/erreur différent).
            log.error("Échec de l'envoi de l'email de réinitialisation via Brevo : {}", ex.getMessage());
        }
    }

    /**
     * Construit le corps JSON attendu par l'API Brevo (sender / to / subject /
     * htmlContent). Template FR.
     */
    private Map<String, Object> buildPayload(String recipientEmail, String recipientName, String resetLink) {
        String safeName = recipientName == null || recipientName.isBlank() ? "" : recipientName;
        String htmlContent =
                "<p>Bonjour " + safeName + ",</p>"
                + "<p>Vous avez demandé la réinitialisation de votre mot de passe MyTimeline. "
                + "Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>"
                + "<p><a href=\"" + resetLink + "\">Réinitialiser mon mot de passe</a></p>"
                + "<p>Ce lien est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, "
                + "ignorez simplement cet email.</p>"
                + "<p>L'équipe MyTimeline</p>";

        return Map.of(
                "sender", Map.of("email", senderEmail, "name", senderName),
                "to", List.of(Map.of("email", recipientEmail, "name", safeName)),
                "subject", EMAIL_SUBJECT,
                "htmlContent", htmlContent);
    }
}
