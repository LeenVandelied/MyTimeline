package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

/**
 * Test unitaire du token de download d'export (#58, ADR-003). Couvre le critère
 * d'acceptation « l'URL signée expire bien après 24h » de façon déterministe via un
 * {@link Clock} fixe (pas de {@code Thread.sleep}).
 */
class ExportTokenServiceTest {

    // Base64 STANDARD, >= 32 octets décodés (HS256).
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
}
