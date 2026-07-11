package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Garde-fou de régression pour le bug « secret JWT dev non Base64 » : l'ancien
 * default {@code dev-only-insecure-secret-change-me-…} contenait des '-', invalides
 * en Base64 STANDARD, ce qui faisait échouer {@code getSigningKey()} et renvoyait
 * 500 sur chaque login. Ces tests sont purs (aucun contexte Spring, aucune DB) donc
 * exécutés en CI systématiquement — la faille précédente passait justement inaperçue
 * car l'e2e injectait un secret Base64 valide.
 */
class JwtServiceSecretValidationTest {

    /** Le default dev réellement committé, à garder synchronisé avec application-dev.properties. */
    private static final String DEV_DEFAULT_SECRET =
            "ZGV2LW9ubHktaW5zZWN1cmUtand0LXNlY3JldC1jaGFuZ2UtbWUtcGVyLXBvc3Qh";

    private JwtService newServiceWithSecret(String secret) {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey", secret);
        return service;
    }

    @Test
    void devDefaultSecret_isValidBase64_atLeast32Bytes() {
        byte[] decoded = Base64.getDecoder().decode(DEV_DEFAULT_SECRET);
        assertThat(decoded.length)
                .as("HS256 exige une clé >= 256 bits (32 octets)")
                .isGreaterThanOrEqualTo(32);
    }

    @Test
    void validateSecret_passes_andTokenRoundTrips_withValidBase64Secret() {
        JwtService service = newServiceWithSecret(DEV_DEFAULT_SECRET);

        // Boot fail-fast : ne doit PAS lever avec le default dev valide.
        assertThatCode(service::validateSecret).doesNotThrowAnyException();

        // Et un token émis avec ce secret se relit (ce qui échouait avec l'ancien default).
        String token = service.generateToken("alice");
        assertThat(service.extractUsername(token)).isEqualTo("alice");
    }

    @Test
    void validateSecret_failsFast_onLegacyDashSecret() {
        // Reproduit exactement l'ancien default dev cassé (contient des '-').
        JwtService service = newServiceWithSecret(
                "dev-only-insecure-secret-change-me-0000000000000000000000000000000000000000000000000000000000000000");

        assertThatThrownBy(service::validateSecret)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Base64");
    }
}
