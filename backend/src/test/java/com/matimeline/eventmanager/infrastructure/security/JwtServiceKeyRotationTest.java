package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

import com.matimeline.eventmanager.application.dtos.JwkResponse;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MissingClaimException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;

/**
 * #489, correctifs de revue : sélection de la clé par l'en-tête parsé (kid), bornes des jetons
 * de la clé précédente, garde-fous de chargement de la clé précédente et WARN de rotation.
 *
 * <p>Tests PURS, sans contexte Spring. ⚠ Aucune clé committée : toutes les paires sont
 * générées en mémoire (le dépôt est public).
 */
class JwtServiceKeyRotationTest {

    private static KeyPair current;
    private static KeyPair previous;
    private static String currentPrivateKey;

    private ListAppender<ILoggingEvent> appender;
    private ch.qos.logback.classic.Logger logbackLogger;

    @BeforeAll
    static void generateKeyPairs() throws Exception {
        current = newKeyPair(2048);
        previous = newKeyPair(2048);
        currentPrivateKey = Base64.getEncoder().encodeToString(current.getPrivate().getEncoded());
    }

    @BeforeEach
    void captureLogs() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        logbackLogger = context.getLogger(JwtService.class);
        appender = new ListAppender<>();
        appender.start();
        logbackLogger.addAppender(appender);
    }

    @AfterEach
    void releaseLogs() {
        logbackLogger.detachAppender(appender);
    }

    // ---------------------------------------------------------------- helpers

    private static KeyPair newKeyPair(int bits) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(bits);
        return generator.generateKeyPair();
    }

    private static String spki(KeyPair pair) {
        return Base64.getEncoder().encodeToString(pair.getPublic().getEncoded());
    }

    private static JwtService service(String previousPublicKey) {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "privateKeyMaterial", currentPrivateKey);
        ReflectionTestUtils.setField(service, "previousPublicKeyMaterial", previousPublicKey);
        service.initKeyMaterial();
        return service;
    }

    private static JwtService rotatingService() {
        return service(spki(previous));
    }

    /** Jeton de alice comme le backend les émet (jti, iat, exp à une minute), sans kid. */
    private static JwtBuilder aliceToken() {
        Date now = new Date();
        return Jwts.builder()
                .subject("alice")
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 60_000));
    }

    private static String signedBy(JwtBuilder builder, PrivateKey key) {
        return builder.signWith(key, Jwts.SIG.RS256).compact();
    }

    private static String withKid(JwtBuilder builder, String kid, PrivateKey key) {
        return builder.header().keyId(kid).and().signWith(key, Jwts.SIG.RS256).compact();
    }

    private static String kid(JwtService service, int index) {
        return service.getPublicJwks().keys().get(index).kid();
    }

    // ------------------------------------------------------ sélection par kid

    @Test
    void extractUsername_kidOfPreviousKey_signedByPreviousKey_isAccepted() {
        JwtService service = rotatingService();
        String token = withKid(aliceToken(), kid(service, 1), previous.getPrivate());

        assertThat(service.extractUsername(token)).isEqualTo("alice");
    }

    @Test
    void extractUsername_kidOfCurrentKey_signedByPreviousKey_isRefused() {
        JwtService service = rotatingService();
        // Le kid désigne la courante : la précédente, qui a pourtant signé, n'est pas essayée.
        String token = withKid(aliceToken(), kid(service, 0), previous.getPrivate());

        assertThatThrownBy(() -> service.extractUsername(token))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void extractUsername_unknownKid_isRefused_evenIfSignedByPreviousKey() {
        JwtService service = rotatingService();
        String token = withKid(aliceToken(), "kid-inconnu", previous.getPrivate());

        assertThatThrownBy(() -> service.extractUsername(token))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void extractUsername_kidWithJsonEscape_isNotMistakenForAKnownKid() {
        JwtService service = rotatingService();
        // Échappement JSON du premier caractère du kid : la valeur décodée par jjwt est le kid
        // de la précédente, mais l'en-tête brut ne le contient pas. Le jeton signé par une clé
        // inconnue doit être refusé quelle que soit la façon dont le kid est écrit.
        String previousKid = kid(service, 1);
        String escapedKid = String.format("\\u%04x", (int) previousKid.charAt(0)) + previousKid.substring(1);
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        String header = b64.encodeToString(("{\"alg\":\"RS256\",\"kid\":\"" + escapedKid + "\"}")
                .getBytes(StandardCharsets.UTF_8));
        String reference = signedBy(aliceToken(), previous.getPrivate());
        String payload = reference.split("\\.")[1];
        String resignedByPrevious = header + "." + payload + "." + rs256(header + "." + payload, previous.getPrivate());
        String resignedByUnknown = header + "." + payload + "." + rs256(header + "." + payload, foreignKey());

        assertThat(service.extractUsername(resignedByPrevious))
                .as("le kid décodé par jjwt désigne bien la clé précédente")
                .isEqualTo("alice");
        assertThatThrownBy(() -> service.extractUsername(resignedByUnknown))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void extractUsername_noKid_signedByUnknownKey_throwsSignatureException() throws Exception {
        JwtService service = rotatingService();
        String foreign = signedBy(aliceToken(), newKeyPair(2048).getPrivate());

        assertThatThrownBy(() -> service.extractUsername(foreign))
                .as("une clé ni courante ni précédente : SignatureException, pas une autre erreur")
                .isInstanceOf(SignatureException.class);
    }

    // ------------------------------------------- jetons de la clé précédente

    @Test
    void extractUsername_expiredTokenOfPreviousKey_throwsExpiredJwtException() {
        JwtService service = rotatingService();
        long now = System.currentTimeMillis();
        String expired = signedBy(Jwts.builder()
                .subject("alice")
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date(now - 120_000))
                .expiration(new Date(now - 60_000)), previous.getPrivate());

        assertThatThrownBy(() -> service.extractUsername(expired))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void extractUsername_previousKeyTokenWithoutJti_isRefused() {
        JwtService service = rotatingService();
        String noJti = signedBy(aliceToken().id(null), previous.getPrivate());

        assertThatThrownBy(() -> service.extractUsername(noJti))
                .isInstanceOf(MissingClaimException.class)
                .hasMessageContaining("jti");
    }

    @Test
    void extractUsername_currentKeyTokenWithoutJti_keepsCurrentControls() {
        JwtService service = rotatingService();
        // Témoin : la règle ne vise que la clé précédente, la courante garde ses contrôles.
        String noJti = signedBy(aliceToken().id(null), current.getPrivate());

        assertThat(service.extractUsername(noJti)).isEqualTo("alice");
    }

    @Test
    void extractUsername_previousKeyTokenWithoutIat_isRefused() {
        JwtService service = rotatingService();
        String noIat = signedBy(aliceToken().issuedAt(null), previous.getPrivate());

        assertThatThrownBy(() -> service.extractUsername(noIat))
                .isInstanceOf(MissingClaimException.class)
                .hasMessageContaining("iat");
    }

    @Test
    void extractUsername_previousKeyTokenLivingLongerThanValidity_isRefused() {
        JwtService service = rotatingService();
        Date now = new Date();
        String tooLong = signedBy(aliceToken()
                .issuedAt(now)
                .expiration(new Date(now.getTime() + JwtService.TOKEN_VALIDITY_MS + 1_000)),
                previous.getPrivate());

        assertThatThrownBy(() -> service.extractUsername(tooLong))
                .isInstanceOf(IncorrectClaimException.class);
    }

    @Test
    void extractUsername_previousKeyTokenLivingExactlyTheValidity_isAccepted() {
        JwtService service = rotatingService();
        // Secondes entières : iat et exp sont sérialisés à la seconde.
        Date now = new Date((System.currentTimeMillis() / 1000) * 1000);
        String bounded = signedBy(aliceToken()
                .issuedAt(now)
                .expiration(new Date(now.getTime() + JwtService.TOKEN_VALIDITY_MS)),
                previous.getPrivate());

        assertThat(service.extractUsername(bounded)).isEqualTo("alice");
    }

    // ------------------------------------------ confusion d'algorithme

    @Test
    void extractUsername_noneAlgorithm_isRefused_withPreviousKeyConfigured() {
        JwtService service = rotatingService();
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        String header = b64.encodeToString(("{\"alg\":\"none\",\"kid\":\"" + kid(service, 1) + "\"}")
                .getBytes(StandardCharsets.UTF_8));
        String payload = b64.encodeToString(("{\"sub\":\"mallory\",\"jti\":\"x\",\"iat\":"
                + (System.currentTimeMillis() / 1000) + ",\"exp\":"
                + (System.currentTimeMillis() / 1000 + 60) + "}").getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.extractUsername(header + "." + payload + "."))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void extractUsername_hs256SignedWithPreviousPublicKeyBytes_isRefused() {
        JwtService service = rotatingService();
        // La clé précédente est PUBLIÉE : un HMAC signé avec ses octets ne doit rien valoir,
        // avec ou sans kid qui la désigne.
        SecretKey spkiAsHmac = Keys.hmacShaKeyFor(spki(previous).getBytes(StandardCharsets.UTF_8));
        SecretKey derAsHmac = Keys.hmacShaKeyFor(previous.getPublic().getEncoded());
        String withoutKid = aliceToken().subject("mallory").signWith(spkiAsHmac, Jwts.SIG.HS256).compact();
        String withPreviousKid = aliceToken().subject("mallory")
                .header().keyId(kid(service, 1)).and()
                .signWith(derAsHmac, Jwts.SIG.HS256).compact();

        assertThatThrownBy(() -> service.extractUsername(withoutKid)).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> service.extractUsername(withPreviousKid)).isInstanceOf(JwtException.class);
    }

    // ------------------------------------------ chargement de la clé précédente

    @Test
    void initKeyMaterial_previousKeyIdenticalToCurrent_publishesOneKey_withoutError() {
        assertThatCode(() -> service(spki(current))).doesNotThrowAnyException();

        JwtService service = service(spki(current));

        assertThat(service.getPublicJwks().keys()).hasSize(1);
        assertThat(warnings()).noneMatch(m -> m.contains("Rotation"));
    }

    @Test
    void initKeyMaterial_previousKeyShorterThan2048Bits_failsWithoutTheValue() throws Exception {
        String shortKey = spki(newKeyPair(1024));

        assertThatThrownBy(() -> service(shortKey))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.previous-public-key")
                .hasMessageContaining("2048")
                .hasMessageNotContaining(shortKey)
                .hasNoCause();
    }

    @Test
    void initKeyMaterial_privateKeyPastedAsPreviousKey_failsWithoutTheValue() {
        // Erreur d'exploitation plausible : coller l'ANCIENNE clé privée (PKCS#8) au lieu de
        // sa clé publique. Le démarrage échoue, et rien de la clé privée n'est repris.
        String pasted = Base64.getEncoder().encodeToString(previous.getPrivate().getEncoded());

        assertThatThrownBy(() -> service(pasted))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.previous-public-key")
                .hasMessageNotContaining(pasted)
                .hasMessageNotContaining(pasted.substring(0, 32))
                .hasNoCause();
    }

    @Test
    void initKeyMaterial_withPreviousKey_logsRotationWarningWithItsKid() {
        JwtService service = rotatingService();
        String previousKid = kid(service, 1);

        assertThat(warnings())
                .anySatisfy(m -> assertThat(m)
                        .contains("Rotation")
                        .contains(previousKid)
                        .contains("48 h")
                        .doesNotContain(spki(previous)));
    }

    @Test
    void initKeyMaterial_withoutPreviousKey_logsNoRotationWarning() {
        service("");

        assertThat(warnings()).noneMatch(m -> m.contains("Rotation"));
    }

    @Test
    void getPublicJwks_listsCurrentKeyFirst_thenPreviousKey() throws Exception {
        JwtService service = rotatingService();

        assertThat(service.getPublicJwks().keys()).extracting(JwkResponse::kid)
                .containsExactly(thumbprint(current), thumbprint(previous));
    }

    // ---------------------------------------------------------------- outils

    private java.util.List<String> warnings() {
        return appender.list.stream()
                .filter(e -> e.getLevel() == Level.WARN)
                .map(ILoggingEvent::getFormattedMessage)
                .toList();
    }

    private static String thumbprint(KeyPair pair) throws Exception {
        return RsaKeyMaterial.jwkThumbprint(
                RsaKeyMaterial.modulusBase64Url(pair.getPublic()),
                RsaKeyMaterial.publicExponentBase64Url(pair.getPublic()));
    }

    private static PrivateKey foreignKey() {
        try {
            return newKeyPair(2048).getPrivate();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String rs256(String signingInput, PrivateKey key) {
        try {
            java.security.Signature signer = java.security.Signature.getInstance("SHA256withRSA");
            signer.initSign(key);
            signer.update(signingInput.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signer.sign());
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
