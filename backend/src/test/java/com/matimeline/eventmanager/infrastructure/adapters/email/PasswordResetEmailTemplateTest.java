package com.matimeline.eventmanager.infrastructure.adapters.email;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * #142 — sélection du template d'email de réinitialisation selon la langue.
 *
 * <p>Couvre l'AC de l'issue : un template par langue supportée (fr/en/es/de) et
 * repli déterministe sur le français pour toute entrée absente ou non supportée
 * (BR-AUT-012 : aucune locale ne doit faire échouer forgot-password).
 */
class PasswordResetEmailTemplateTest {

    @ParameterizedTest
    @CsvSource({"fr, FR", "en, EN", "es, ES", "de, DE"})
    void resolve_supportedLocale_selectsMatchingTemplate(String locale, PasswordResetEmailTemplate expected) {
        assertThat(PasswordResetEmailTemplate.resolve(locale)).isEqualTo(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "zz", "xx-YY", "fr;DROP", "42", "french"})
    void resolve_missingOrUnsupportedLocale_fallsBackToFrench(String locale) {
        assertThat(PasswordResetEmailTemplate.resolve(locale)).isEqualTo(PasswordResetEmailTemplate.FR);
    }

    @ParameterizedTest
    @CsvSource({"FR, FR", "De, DE", " es , ES", "en-GB, EN", "de_AT, DE", "es-419, ES"})
    void resolve_isCaseInsensitive_andIgnoresRegionSubtag(String locale, PasswordResetEmailTemplate expected) {
        assertThat(PasswordResetEmailTemplate.resolve(locale)).isEqualTo(expected);
    }

    @Test
    void eachLocale_hasItsOwnSubjectAndBody() {
        // Garde-fou anti copier-coller : 4 sujets distincts, 4 corps distincts.
        assertThat(Arrays.stream(PasswordResetEmailTemplate.values())
                .map(PasswordResetEmailTemplate::subject)
                .collect(Collectors.toSet()))
                .hasSize(PasswordResetEmailTemplate.values().length);

        assertThat(Arrays.stream(PasswordResetEmailTemplate.values())
                .map(t -> t.htmlContent("Alice", "https://app/reset?token=t"))
                .collect(Collectors.toSet()))
                .hasSize(PasswordResetEmailTemplate.values().length);
    }

    @ParameterizedTest
    @ValueSource(strings = {"fr", "en", "es", "de"})
    void htmlContent_insertsNameAndLink_inEveryLocale(String locale) {
        String html = PasswordResetEmailTemplate.resolve(locale)
                .htmlContent("Alice", "https://app.example/reset?token=abc");

        assertThat(html)
                .contains("Alice")
                .contains("href=\"https://app.example/reset?token=abc\"")
                .startsWith("<p>")
                .endsWith("</p>");
    }

    @ParameterizedTest
    @ValueSource(strings = {"fr", "en", "es", "de"})
    void htmlContent_doesNotReinterpretAlreadyEscapedValues(String locale) {
        // Le nom arrive DÉJÀ échappé par BrevoEmailService (HtmlUtils.htmlEscape).
        // Le rendu ne doit ni le désréchapper, ni le réinterpréter comme format.
        String escapedName = "&lt;img src=x onerror=alert(1)&gt; 100%";

        String html = PasswordResetEmailTemplate.resolve(locale)
                .htmlContent(escapedName, "https://app.example/reset?token=abc");

        assertThat(html).contains(escapedName);
        assertThat(html).doesNotContain("<img src=x");
    }

    @Test
    void defaultTemplate_isFrench() {
        assertThat(PasswordResetEmailTemplate.DEFAULT).isEqualTo(PasswordResetEmailTemplate.FR);
        assertThat(PasswordResetEmailTemplate.FR.languageTag()).isEqualTo("fr");
    }
}
