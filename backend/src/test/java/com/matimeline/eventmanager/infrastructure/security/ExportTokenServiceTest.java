package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.matimeline.eventmanager.infrastructure.security.ExportTokenService.ExportDownloadToken;

import io.jsonwebtoken.JwtException;

/**
 * Test unitaire du token de download d'export (#58, ADR-003). Couvre le critère
 * d'acceptation « l'URL signée expire bien après 24h » de façon déterministe via un
 * {@link Clock} fixe (pas de {@code Thread.sleep}).
 *
 * <p>#323 : le secret n'est plus {@code jwt.secret} (supprimé avec la migration RS256 de
 * l'auth) mais {@code app.export.token-secret} ({@code EXPORT_TOKEN_SECRET}), DÉDIÉ. Le
 * mécanisme reste HS256 — ces tokens ne sont vérifiés que par le backend lui-même.
 */
class ExportTokenServiceTest {

    // Base64 STANDARD, >= 32 octets décodés (HS256). Valeur de test, non secrète.
    private static final String SECRET = "dGVzdC1vbmx5LWluc2VjdXJlLWp3dC1zZWNyZXQtY2hhbmdlLW1lLXBlci1wb3N0IQ==";
    private static final Instant T0 = Instant.parse("2026-07-11T10:00:00Z");
    private static final UUID JOB_ID = UUID.randomUUID();
    private static final UUID OWNER_ID = UUID.randomUUID();

    private ExportTokenService serviceAt(Instant instant) {
        ExportTokenService service = new ExportTokenService(Clock.fixed(instant, ZoneOffset.UTC));
        ReflectionTestUtils.setField(service, "secretKey", SECRET);
        return service;
    }

    private String signAtT0() {
        Date expiry = Date.from(T0.plus(Duration.ofHours(24)));
        return serviceAt(T0).sign(JOB_ID, OWNER_ID, expiry);
    }

    @Test
    void verify_validTokenWithin24h_returnsClaims() {
        String token = signAtT0();
        Optional<ExportDownloadToken> claims = serviceAt(T0.plus(Duration.ofHours(23))).verify(token);

        assertTrue(claims.isPresent(), "token valide à T0+23h");
        assertEquals(JOB_ID, claims.get().jobId());
        assertEquals(OWNER_ID, claims.get().ownerId());
    }

    @Test
    void verify_afterExpiry_returnsEmpty() {
        String token = signAtT0();
        // À T0+25h, l'expiration (T0+24h) est dépassée -> capacité refusée.
        assertTrue(serviceAt(T0.plus(Duration.ofHours(25))).verify(token).isEmpty(),
                "token expiré après 24h");
    }

    @Test
    void verify_tamperedToken_returnsEmpty() {
        String token = signAtT0();
        String tampered = token.substring(0, token.length() - 3) + "abc";
        assertTrue(serviceAt(T0).verify(tampered).isEmpty(), "signature altérée rejetée");
    }

    @Test
    void verify_wrongSecret_returnsEmpty() {
        String token = signAtT0();
        ExportTokenService otherSecret = new ExportTokenService(Clock.fixed(T0, ZoneOffset.UTC));
        ReflectionTestUtils.setField(otherSecret, "secretKey",
                "b3RoZXItc2VjcmV0LWtleS1mb3ItdGVzdGluZy1vbmx5LTEyMzQ1Ng==");
        assertTrue(otherSecret.verify(token).isEmpty(), "token signé par une autre clé rejeté");
    }

    @Test
    void verify_nullOrBlank_returnsEmpty() {
        ExportTokenService service = serviceAt(T0);
        assertTrue(service.verify(null).isEmpty());
        assertTrue(service.verify("   ").isEmpty());
        assertTrue(service.verify("not-a-jwt").isEmpty());
    }

    // ------------------------------------------------------------------- #323

    /**
     * Garde-fou de boot ajouté par #323 : le secret d'export n'est plus couvert par la
     * validation de {@code jwt.secret} (supprimé). Le message ne doit pas exposer la valeur.
     */
    @Test
    void validateSecret_failsFast_onNonBase64Secret_withoutLeakingTheValue() {
        String bogus = "not-base64-secret-with-dashes-0000000000000000000000000000";
        ExportTokenService service = new ExportTokenService(Clock.fixed(T0, ZoneOffset.UTC));
        ReflectionTestUtils.setField(service, "secretKey", bogus);

        IllegalStateException failure =
                assertThrows(IllegalStateException.class, service::validateSecret);
        assertTrue(failure.getMessage().contains("EXPORT_TOKEN_SECRET"),
                "le message doit nommer la variable d'environnement");
        assertFalse(failure.getMessage().contains(bogus),
                "le message ne doit jamais reprendre la valeur configurée");
    }

    @Test
    void validateSecret_passes_onValidSecret() {
        assertDoesNotThrow(serviceAt(T0)::validateSecret);
    }

    /**
     * #323 — ISOLATION AUTH / DOWNLOAD. Avant cette issue, les deux familles de tokens
     * partageaient {@code jwt.secret} : seul le claim {@code typ} empêchait un token d'auth
     * de servir de token de download. Depuis la migration RS256, elles ne partagent même plus
     * de matériel de signature. Ce test verrouille les DEUX barrières à la fois :
     * un token émis par {@link JwtService} (RS256, sans claim {@code typ}) est refusé ici.
     */
    @Test
    void verify_rejectsAnAuthenticationToken() {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "privateKeyMaterial", ""); // paire éphémère
        jwtService.initKeyMaterial();
        String authToken = jwtService.generateToken(JOB_ID.toString());

        assertTrue(serviceAt(T0).verify(authToken).isEmpty(),
                "un token d'authentification ne doit jamais valoir capacité de téléchargement");
    }

    /**
     * Réciproque : un token de download ne doit pas être relisible par {@link JwtService}.
     * Sans cette assertion, l'isolation ne serait vérifiée que dans un sens.
     */
    @Test
    void authenticationService_rejectsADownloadToken() {
        String downloadToken = signAtT0();
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "privateKeyMaterial", "");
        jwtService.initKeyMaterial();

        assertThrows(JwtException.class, () -> jwtService.extractUsername(downloadToken));
    }
}
