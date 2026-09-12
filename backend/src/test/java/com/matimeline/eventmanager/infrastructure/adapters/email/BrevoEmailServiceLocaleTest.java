package com.matimeline.eventmanager.infrastructure.adapters.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * #142 — l'email de réinitialisation part dans la langue demandée.
 *
 * <p>Le payload réellement envoyé à Brevo est intercepté ({@link MockRestServiceServer}
 * branché sur le {@code RestClient.Builder} injecté), donc on assert sur le contrat de
 * sortie (sujet + htmlContent) et pas seulement sur le catalogue.
 *
 * <p>Couvre aussi la contrainte BR-AUT-012 : aucune locale (nulle, vide, inconnue) ne
 * lève d'exception, et l'échappement XSS du nom reste actif dans les 4 langues.
 */
class BrevoEmailServiceLocaleTest {

    private static final String API_KEY = "xkeysib-test-key";
    private static final String RESET_URL_BASE = "http://localhost:3000/reset-password";
    private static final String TOKEN = "11111111-2222-3333-4444-555555555555";

    private final List<String> capturedBodies = new ArrayList<>();

    private BrevoEmailService serviceWith(String apiKey) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.brevo.com/v3/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(request -> capturedBodies.add(
                        new String(((MockClientHttpRequest) request).getBodyAsBytes(), StandardCharsets.UTF_8)))
                .andRespond(withSuccess());
        return new BrevoEmailService(builder, apiKey, "no-reply@mytimeline.app", "MyTimeline", RESET_URL_BASE);
    }

    /** Payload JSON réellement envoyé à Brevo, parsé (les assertions ciblent des champs précis). */
    private JsonNode sendAndCapturePayload(String locale, String recipientName) {
        serviceWith(API_KEY).sendPasswordResetEmail("alice@example.com", recipientName, TOKEN, locale);
        assertThat(capturedBodies).hasSize(1);
        try {
            return new ObjectMapper().readTree(capturedBodies.get(0));
        } catch (Exception ex) {
            throw new AssertionError("Payload Brevo non parsable", ex);
        }
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "fr | Réinitialisation de votre mot de passe MyTimeline | Réinitialiser mon mot de passe",
        "en | Reset your MyTimeline password                    | Reset my password",
        "es | Restablecimiento de tu contraseña de MyTimeline    | Restablecer mi contraseña",
        "de | Zurücksetzen Ihres MyTimeline-Passworts            | Mein Passwort zurücksetzen"
    })
    void sendPasswordResetEmail_usesSubjectAndBodyOfRequestedLocale(
            String locale, String expectedSubject, String expectedCtaLabel) {
        JsonNode payload = sendAndCapturePayload(locale, "Alice");

        assertThat(payload.get("subject").asText()).isEqualTo(expectedSubject.trim());
        assertThat(payload.get("htmlContent").asText()).contains(expectedCtaLabel.trim());
        // Le lien de réinitialisation est présent quelle que soit la langue.
        assertThat(payload.get("htmlContent").asText()).contains(RESET_URL_BASE + "?token=" + TOKEN);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "zz", "klingon"})
    void sendPasswordResetEmail_unknownLocale_fallsBackToFrench(String locale) {
        JsonNode payload = sendAndCapturePayload(locale, "Alice");

        assertThat(payload.get("subject").asText())
                .isEqualTo("Réinitialisation de votre mot de passe MyTimeline");
        assertThat(payload.get("htmlContent").asText())
                .contains("Réinitialiser mon mot de passe")
                .doesNotContain("Reset my password");
    }

    @ParameterizedTest
    @ValueSource(strings = {"fr", "en", "es", "de"})
    void sendPasswordResetEmail_escapesRecipientNameInEveryLocale(String locale) {
        // Protection XSS existante (nom saisi par l'utilisateur) : elle doit survivre
        // à l'i18n, sinon le markup s'exécuterait dans le client mail du destinataire.
        JsonNode payload = sendAndCapturePayload(locale, "<img src=x onerror=alert(1)>");

        // NB : le champ JSON "to.name" reste volontairement brut (non-HTML, sérialisé
        // par Brevo) — c'est le corps HTML, et lui seul, qui doit être échappé.
        String html = payload.get("htmlContent").asText();
        assertThat(html).doesNotContain("<img src=x onerror=alert(1)>");
        assertThat(html).contains("&lt;img src=x onerror=alert(1)&gt;");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"fr", "zz"})
    void sendPasswordResetEmail_neverThrows_whateverTheLocale(String locale) {
        // BR-AUT-012 : forgot-password répond 200 systématiquement — aucune locale ne
        // doit propager d'exception jusqu'au thread de traitement.
        assertThatCode(() -> serviceWith(API_KEY)
                .sendPasswordResetEmail("alice@example.com", "Alice", TOKEN, locale))
                .doesNotThrowAnyException();
    }

    @Test
    void sendPasswordResetEmail_withoutApiKey_staysNoOp_andSendsNothing() {
        // NO-OP dev/test : pas d'appel HTTP du tout, quelle que soit la langue.
        serviceWith("").sendPasswordResetEmail("alice@example.com", "Alice", TOKEN, "de");

        assertThat(capturedBodies).isEmpty();
    }
}
