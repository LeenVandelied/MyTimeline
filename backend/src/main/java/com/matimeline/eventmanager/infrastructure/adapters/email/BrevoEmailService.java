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
import org.springframework.web.util.HtmlUtils;

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
 *       et BR-AUT-012 (réponse 200 systématique) est préservée.</li>
 * </ul>
 *
 * <p>⚠ Étiquette de règle corrigée (#142) : l'anti-énumération de forgot-password est
 * BR-AUT-012, PAS BR-AUT-005 (qui traite du 401 sur échec d'authentification). Le code
 * source portait la mauvaise référence depuis #49 — ne pas la réintroduire.
 *
 * <p>Deux occurrences de l'ancienne étiquette subsistent VOLONTAIREMENT :
 * <ul>
 *   <li>{@code V6__create_password_reset_tokens.sql} — une migration Flyway déjà
 *       appliquée ; modifier son texte, fût-ce un commentaire, change son checksum
 *       et fait échouer la validation au démarrage sur toute base existante.</li>
 *   <li>{@code AuthController} (chemin login) — là, BR-AUT-005 est la BONNE règle.</li>
 * </ul>
 *
 * <p>i18n (#142) : sujet et corps viennent du catalogue {@link PasswordResetEmailTemplate}
 * (fr/en/es/de). La sélection est un simple lookup en mémoire, sans I/O ni exception
 * possible : une locale inconnue retombe sur le français, donc aucune valeur d'entrée
 * ne peut changer le code de réponse ni créer d'écart de timing (BR-AUT-012).
 */
@Service
public class BrevoEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(BrevoEmailService.class);

    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

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
    public void sendPasswordResetEmail(
            String recipientEmail, String recipientName, String resetToken, String locale) {
        if (apiKey == null || apiKey.isBlank()) {
            // Pas de clé (dev/test) : on ne tente pas l'appel HTTP. Le flux métier
            // continue (token déjà persisté), réponse 200 préservée.
            log.warn("BREVO_API_KEY absente : envoi d'email de réinitialisation ignoré (no-op).");
            return;
        }

        String resetLink = resetUrlBase + "?token=" + resetToken;
        // Repli défensif sur le français : null / vide / locale inconnue (BR-AUT-012).
        PasswordResetEmailTemplate template = PasswordResetEmailTemplate.resolve(locale);
        Map<String, Object> payload = buildPayload(recipientEmail, recipientName, resetLink, template);

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
            // l'exception jusqu'au contrôleur (BR-AUT-012 : la réponse 200 ne doit
            // pas dépendre de la disponibilité de Brevo, sinon on fuit l'existence
            // du compte via un timing/erreur différent).
            log.error("Échec de l'envoi de l'email de réinitialisation via Brevo : {}", ex.getClass().getSimpleName());
        }
    }

    /**
     * Construit le corps JSON attendu par l'API Brevo (sender / to / subject /
     * htmlContent) à partir du template de la langue résolue (#142).
     */
    private Map<String, Object> buildPayload(
            String recipientEmail, String recipientName, String resetLink, PasswordResetEmailTemplate template) {
        String safeName = recipientName == null || recipientName.isBlank() ? "" : recipientName;
        // XSS : le nom est contrôlé par l'utilisateur (saisi à l'inscription). Échapper
        // AVANT insertion dans le HTML de l'email, sinon un nom contenant du markup
        // (ex. <img onerror=...>) s'exécuterait dans le client mail du destinataire.
        // On garde safeName brut pour le champ JSON "to.name" (sérialisé par Brevo,
        // pas du HTML) ; on n'échappe que la branche htmlContent.
        String escapedName = HtmlUtils.htmlEscape(safeName);
        // Defense-in-depth : le lien est sûr aujourd'hui (token UUID + base configurée),
        // mais on échappe l'URL avant insertion dans l'attribut href pour ne pas dépendre
        // d'une base future non contrôlée (cohérent avec l'échappement de safeName).
        String escapedResetLink = HtmlUtils.htmlEscape(resetLink);
        // L'échappement est appliqué AVANT le rendu, donc identiquement dans les 4
        // langues : le catalogue n'insère que des valeurs déjà neutralisées.
        String htmlContent = template.htmlContent(escapedName, escapedResetLink);

        return Map.of(
                "sender", Map.of("email", senderEmail, "name", senderName),
                "to", List.of(Map.of("email", recipientEmail, "name", safeName)),
                "subject", template.subject(),
                "htmlContent", htmlContent);
    }
}
