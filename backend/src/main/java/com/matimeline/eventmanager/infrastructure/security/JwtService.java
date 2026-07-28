package com.matimeline.eventmanager.infrastructure.security;

import io.jsonwebtoken.*;

import jakarta.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    // Durée de vie du token = 2 jours (BR-AUT-007). Extrait en constante pour
    // aligner l'expiration du JWT et celle enregistrée en base (SessionEntity.expiresAt).
    public static final long TOKEN_VALIDITY_MS = 1000L * 60 * 60 * 24 * 2;

    /**
     * Clé privée de signature, PKCS#8 Base64 (armure PEM tolérée), via {@code JWT_PRIVATE_KEY}.
     * VIDE = paire éphémère générée au boot (dev/test uniquement, cf. {@link #initKeyMaterial()}).
     * Le profil {@code prod} exige une valeur explicite (garde-fou {@code ProfileSafetyGuard} #323).
     */
    @Value("${jwt.private-key:}")
    private String privateKeyMaterial;

    private PrivateKey signingKey;
    private PublicKey verificationKey;

    /**
     * Garde-fou de boot (fail-fast) : charge et valide le matériel de signature AU DÉMARRAGE
     * plutôt qu'à chaque requête. Une clé mal formée faisait auparavant échouer la signature à
     * CHAQUE login/refresh -> 500 opaque en boucle ; ici l'app refuse de démarrer.
     *
     * <p>⚠ Le message d'erreur ne reprend NI la valeur configurée NI le message de l'exception
     * sous-jacente (seulement son type) : sur une clé privée, un décodeur bavard pourrait
     * recracher du matériel dans les logs. C'est un durcissement par rapport à HS256 (#323).
     *
     * <p>Matériel absent -> paire ÉPHÉMÈRE : le dépôt étant PUBLIC, aucune clé RSA, même
     * « de dev », n'y est committée. Conséquence assumée et journalisée en WARN : les sessions
     * ne survivent pas à un redémarrage local.
     */
    @PostConstruct
    void initKeyMaterial() {
        KeyPair keyPair = privateKeyMaterial == null || privateKeyMaterial.isBlank()
                ? ephemeralKeyPair()
                : configuredKeyPair();
        this.signingKey = keyPair.getPrivate();
        this.verificationKey = keyPair.getPublic();
    }

    private KeyPair configuredKeyPair() {
        try {
            return RsaKeyMaterial.fromPkcs8(privateKeyMaterial);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "jwt.private-key (JWT_PRIVATE_KEY) invalide : attendu une clé privée RSA "
                    + "PKCS#8 en Base64 (corps d'un PEM '-----BEGIN PRIVATE KEY-----', armure et "
                    + "sauts de ligne tolérés), de modulus >= " + RsaKeyMaterial.MIN_MODULUS_BITS
                    + " bits (RS256). Générer : openssl genpkey -algorithm RSA "
                    + "-pkeyopt rsa_keygen_bits:" + RsaKeyMaterial.MIN_MODULUS_BITS
                    + ". Cause : " + e.getClass().getSimpleName()
                    + " (valeur et détail volontairement non journalisés).",
                    e);
        }
    }

    private KeyPair ephemeralKeyPair() {
        KeyPair keyPair = RsaKeyMaterial.generateEphemeral();
        log.warn("jwt.private-key (JWT_PRIVATE_KEY) non configurée : paire RS256 ÉPHÉMÈRE générée "
                 + "au démarrage. Tous les jetons émis seront invalidés au prochain redémarrage. "
                 + "Acceptable en dev/test UNIQUEMENT — le profil 'prod' refuse ce mode.");
        log.info("Clé publique de vérification (à publier dans AUTH_JWT_PUBLIC_KEY côté frontend "
                 + "pour activer la vérification de signature du middleware) : {}",
                 RsaKeyMaterial.toSpkiBase64(keyPair.getPublic()));
        return keyPair;
    }

    /**
     * Clé PUBLIQUE de vérification au format SPKI Base64 — valeur à publier telle quelle dans
     * {@code AUTH_JWT_PUBLIC_KEY} côté frontend (#323). Ce n'est PAS un secret.
     */
    public String getPublicKeySpkiBase64() {
        return RsaKeyMaterial.toSpkiBase64(verificationKey);
    }

    public String generateToken(String username) {
        return Jwts.builder()
                   .subject(username)
                   .issuedAt(new Date())
                   .expiration(new Date(System.currentTimeMillis() + TOKEN_VALIDITY_MS))
                   // Algo RS256 explicite (#323) : la vérification se fait aussi dans le
                   // middleware Next (Edge), qui exige `alg: RS256` dans l'en-tête et rejette
                   // tout autre algorithme (défense contre la confusion d'algorithme). Figer
                   // l'algo ici garantit que les deux côtés ne peuvent pas diverger.
                   .signWith(signingKey, Jwts.SIG.RS256)
                   .compact();
    }

    /**
     * #73 : chaque token émis embarque un claim {@code jti} (UUID) unique, support de
     * la révocation côté serveur (une session = un jti en base). Générer le jti ICI
     * (et non côté appelant) garantit qu'aucun token n'est émis sans jti. Le caller
     * récupère le jti via {@link #extractJti(String)} pour enregistrer la session.
     */
    public String generateToken(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return Jwts.builder()
                .subject(authentication.getName())
                .id(UUID.randomUUID().toString()) // claim "jti"
                .claim("role", userDetails.getAuthorities())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + TOKEN_VALIDITY_MS))
                .signWith(signingKey, Jwts.SIG.RS256)
                .compact();
    }

    /**
     * Extrait le claim {@code jti} du token (#73). Renvoie {@code null} pour un token
     * legacy émis avant l'introduction du jti (aucun échec — le filtre traite l'absence
     * de jti comme "non révocable", cf. JwtFilter). Propage {@link ExpiredJwtException}
     * et les {@link JwtException} de signature/format, comme {@link #extractUsername}.
     */
    public String extractJti(String token) {
        if (token == null) {
            return null;
        }
        return Jwts.parser()
                .verifyWith(verificationKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getId();
    }

    public String extractUsername(String token) {
        return Jwts.parser()
                .verifyWith(verificationKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return Jwts.parser()
                .verifyWith(verificationKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getExpiration();
    }
}
