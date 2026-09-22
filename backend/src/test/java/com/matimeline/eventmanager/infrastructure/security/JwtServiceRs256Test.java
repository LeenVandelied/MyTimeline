package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.Date;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;

/**
 * #323 — migration de la signature d'authentification de HS256 (HMAC symétrique) vers RS256
 * (RSA asymétrique), qui rend possible la vérification de signature côté Edge dans
 * {@code frontend/middleware.ts} sans y publier de clé de frappe de jetons.
 *
 * <p>Tests PURS (aucun contexte Spring, aucune DB) donc exécutés en CI systématiquement.
 * ⚠ AUCUNE clé n'est committée : la paire de test est générée une fois dans le
 * {@link BeforeAll} (le dépôt est public).
 *
 * <p>Remplace {@code JwtServiceSecretValidationTest}, qui ancrait le default dev HS256 —
 * cette valeur n'existe plus.
 */
class JwtServiceRs256Test {

    private static KeyPair keyPair;
    private static String privateKeyBase64;

    @BeforeAll
    static void generateTestKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keyPair = generator.generateKeyPair();
        privateKeyBase64 = Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
    }

    private JwtService serviceWithKey(String material) {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "privateKeyMaterial", material);
        service.initKeyMaterial();
        return service;
    }

    /** En-tête JOSE décodé (1er segment du JWT) — permet d'assertir l'algo RÉELLEMENT émis. */
    private String decodedHeader(String token) {
        String header = token.split("\\.")[0];
        return new String(Base64.getUrlDecoder().decode(header), StandardCharsets.UTF_8);
    }

    // ---------------------------------------------------------------- émission

    @Test
    void generateToken_emitsRs256_notHs256() {
        String token = serviceWithKey(privateKeyBase64).generateToken("alice");

        assertThat(decodedHeader(token))
                .as("l'en-tête JOSE doit annoncer RS256 (le middleware Edge l'exige)")
                .contains("\"alg\":\"RS256\"")
                .doesNotContain("HS256");
    }

    @Test
    void generateToken_isVerifiableWithThePublicKeyAlone() {
        String token = serviceWithKey(privateKeyBase64).generateToken("alice");

        // Cœur de #323 : la clé PUBLIQUE suffit à vérifier — c'est elle (et elle seule)
        // qui part dans l'environnement du frontend.
        assertThat(Jwts.parser()
                        .verifyWith(keyPair.getPublic())
                        .build()
                        .parseSignedClaims(token)
                        .getPayload()
                        .getSubject())
                .isEqualTo("alice");
    }

    @Test
    void publicKeyExposedForEdge_isSpkiOfTheConfiguredPrivateKey() {
        String exposed = serviceWithKey(privateKeyBase64).getPublicKeySpkiBase64();

        // La valeur publiée dans AUTH_JWT_PUBLIC_KEY doit être EXACTEMENT le SPKI dérivé
        // de la clé privée configurée — sinon le middleware rejetterait des jetons valides.
        assertThat(exposed)
                .isEqualTo(Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded()));
    }

    @Test
    void keyMaterial_acceptsPemArmorAndLineBreaks() {
        String pem = "-----BEGIN PRIVATE KEY-----\n"
                + privateKeyBase64.replaceAll("(.{64})", "$1\n")
                + "\n-----END PRIVATE KEY-----\n";

        // Un opérateur qui colle un fichier .pem entier ne doit pas obtenir un boot cassé.
        assertThatCode(() -> serviceWithKey(pem)).doesNotThrowAnyException();
        assertThat(serviceWithKey(pem).getPublicKeySpkiBase64())
                .isEqualTo(serviceWithKey(privateKeyBase64).getPublicKeySpkiBase64());
    }

    // -------------------------------------------------------------- validation

    @Test
    void extractUsername_roundTrips_andRejectsTokenSignedByAnotherKey() throws Exception {
        JwtService service = serviceWithKey(privateKeyBase64);
        assertThat(service.extractUsername(service.generateToken("alice"))).isEqualTo("alice");

        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        String foreign = Jwts.builder()
                .subject("mallory")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(generator.generateKeyPair().getPrivate(), Jwts.SIG.RS256)
                .compact();

        assertThatThrownBy(() -> service.extractUsername(foreign))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void validateToken_rejectsHs256TokenForgedFromThePublicKey() {
        JwtService service = serviceWithKey(privateKeyBase64);

        // Confusion d'algorithme : la clé publique est DESTINÉE à être publique. Si le parseur
        // acceptait un HS256 signé AVEC elle, n'importe qui pourrait forger une identité.
        SecretKey publicAsHmac = Keys.hmacShaKeyFor(
                Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded())
                        .getBytes(StandardCharsets.UTF_8));
        String forged = Jwts.builder()
                .subject("mallory")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(publicAsHmac, Jwts.SIG.HS256)
                .compact();

        assertThatThrownBy(() -> service.extractUsername(forged))
                .as("un JWT HS256 ne doit jamais être accepté par un parseur configuré en RSA")
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }

    @Test
    void validateToken_rejectsUnsecuredNoneAlgorithmToken() {
        JwtService service = serviceWithKey(privateKeyBase64);

        // Confusion d'algorithme, variante `none` : un JWT « non sécurisé » (RFC 7519 §6) porte
        // `alg: none` et une signature VIDE. L'accepter revient à laisser n'importe qui écrire
        // l'identité de son choix.
        //
        // POURQUOI CE TEST (revue S50) : le middleware Edge ancre déjà ce rejet côté frontend
        // (`auth-token-verify.ts` exige `alg === 'RS256'`), mais le backend — qui reste le SEUL
        // juge — n'y opposait que le DÉFAUT de jjwt, non testé. Un `.unsecured()` ajouté un jour
        // au parseur ouvrirait la porte SANS faire rougir un seul test.
        //
        // Le token est forgé À LA MAIN plutôt qu'avec `Jwts.builder().unsecured()` : on veut
        // ancrer le rejet de la valeur SUR LE FIL, pas la façon dont jjwt la produit.
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        String header = b64.encodeToString(
                "{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = b64.encodeToString(
                ("{\"sub\":\"mallory\",\"exp\":" + (System.currentTimeMillis() / 1000 + 60) + "}")
                        .getBytes(StandardCharsets.UTF_8));
        String unsecured = header + "." + payload + ".";

        assertThatThrownBy(() -> service.extractUsername(unsecured))
                .as("un JWT `alg: none` ne doit jamais être accepté")
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }

    // ------------------------------------------------------- garde-fou de boot

    @Test
    void initKeyMaterial_failsFast_onMalformedKey_withoutLeakingTheValue() {
        String bogus = "ceci-n-est-pas-une-cle-pkcs8-#!";

        assertThatThrownBy(() -> serviceWithKey(bogus))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_PRIVATE_KEY")
                .hasMessageContaining("PKCS#8")
                // Le message ne doit JAMAIS reprendre la valeur configurée, ni le message de
                // l'exception sous-jacente (un décodeur bavard pourrait recracher du matériel).
                .hasMessageNotContaining(bogus);
    }

    @Test
    void initKeyMaterial_failsFast_onTooShortModulus() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(1024); // < 2048 : interdit pour RS256 (RFC 7518 §3.3)
        String shortKey = Base64.getEncoder()
                .encodeToString(generator.generateKeyPair().getPrivate().getEncoded());

        assertThatThrownBy(() -> serviceWithKey(shortKey))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("2048");
    }

    // ---------------------------------------------------------- jeton vide (FU2 S57)

    /**
     * FU2 (S57) — cookie {@code jwt=} vide : jjwt lève nativement une
     * {@link IllegalArgumentException} sur une chaîne vide/blanche, HORS de la hiérarchie
     * {@link io.jsonwebtoken.JwtException}. {@code AuthController} (#312) et {@code JwtFilter}
     * ne catchent que {@code JwtException} -> sans garde, ce cas échappait au 401 attendu
     * (500 sur /me et /refresh). {@link JwtService#parseClaims} doit donc lever une
     * {@link MalformedJwtException} (sous-type de {@code JwtException}), jamais laisser
     * fuiter l'{@code IllegalArgumentException} brute de jjwt.
     */
    @Test
    void extractUsername_withEmptyToken_throwsJwtExceptionNotIllegalArgument() {
        JwtService service = serviceWithKey(privateKeyBase64);

        assertThatThrownBy(() -> service.extractUsername(""))
                .isInstanceOf(io.jsonwebtoken.JwtException.class)
                .isNotInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void extractUsername_withBlankToken_throwsJwtExceptionNotIllegalArgument() {
        JwtService service = serviceWithKey(privateKeyBase64);

        assertThatThrownBy(() -> service.extractUsername("   "))
                .isInstanceOf(io.jsonwebtoken.JwtException.class)
                .isNotInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void extractJti_withEmptyToken_throwsJwtExceptionNotIllegalArgument() {
        JwtService service = serviceWithKey(privateKeyBase64);

        // extractJti ne renvoie null QUE pour un token null (legacy sans jti) ; une chaîne
        // vide doit suivre le même chemin de parsing que extractUsername, pas un null silencieux.
        assertThatThrownBy(() -> service.extractJti(""))
                .isInstanceOf(io.jsonwebtoken.JwtException.class)
                .isNotInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validateToken_withEmptyToken_returnsFalse_doesNotThrow() {
        JwtService service = serviceWithKey(privateKeyBase64);
        org.springframework.security.core.userdetails.UserDetails userDetails =
                org.springframework.security.core.userdetails.User.withUsername("alice")
                        .password("irrelevant")
                        .authorities("ROLE_USER")
                        .build();

        // validateToken catche déjà Exception largement -> false, jamais de propagation.
        // Non-régression explicite après l'ajout de la garde dans parseClaims.
        assertThat(service.validateToken("", userDetails)).isFalse();
    }

    @Test
    void initKeyMaterial_blankMaterial_fallsBackToEphemeralKeyPair() {
        // Dev/test : pas de clé committée (dépôt public) -> paire jetable, app fonctionnelle.
        JwtService first = serviceWithKey("");
        JwtService second = serviceWithKey("   ");

        assertThat(first.extractUsername(first.generateToken("alice"))).isEqualTo("alice");
        // Deux boots = deux paires : c'est précisément la limite qui interdit ce mode en prod
        // (garde-fou ProfileSafetyGuard #323).
        assertThat(first.getPublicKeySpkiBase64()).isNotEqualTo(second.getPublicKeySpkiBase64());
    }
}
