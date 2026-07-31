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

        // ⚠ Journalisée dans LES DEUX cas (revue S50), pas seulement sur le chemin éphémère.
        // Avec JWT_PRIVATE_KEY posée (prod), c'était le SEUL moyen d'obtenir la valeur de
        // AUTH_JWT_PUBLIC_KEY sans re-dériver la clé à la main en openssl depuis le secret —
        // manipulation risquée qui produit une paire dépareillée au moindre écart. Le symptôme
        // d'une paire dépareillée est muet et coûteux : le middleware rejette tout cookie
        // authentique, donc l'utilisateur boucle vers /login sans message d'erreur.
        // Une clé PUBLIQUE n'est pas un secret : la publier dans les logs est sans risque.
        // ⚠ Passe par l'accesseur PUBLIC (revue S50) plutôt que de rappeler
        // `RsaKeyMaterial.toSpkiBase64` : sans cela `getPublicKeySpkiBase64()` n'avait aucun
        // appelant dans `main/`, et rien ne garantissait que la valeur journalisée reste bien
        // celle que l'accesseur — seule référence citée dans la doc d'exploitation — produit.
        log.info("Clé PUBLIQUE de vérification RS256 — valeur à poser dans AUTH_JWT_PUBLIC_KEY "
                 + "côté frontend pour activer la vérification de signature du middleware : {}",
                 getPublicKeySpkiBase64());
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
        // La clé publique est journalisée par `initKeyMaterial`, commune aux deux chemins.
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
        return parseClaims(token).getId();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Vérifie la signature ET FIGE l'algorithme à {@code RS256} (revue S50).
     *
     * <p>{@code verifyWith(PublicKey)} seul laisse jjwt accepter tout algorithme compatible
     * avec une clé RSA — {@code RS384}, {@code RS512}, {@code PS256}… — alors que le
     * middleware Edge (`auth-token-verify.ts`) exige STRICTEMENT {@code alg: RS256}. Les deux
     * moitiés de la garde divergeaient donc sur leur définition de « jeton acceptable ». Non
     * exploitable en l'état (forger un tel jeton exige la clé PRIVÉE), mais une divergence de
     * contrat entre deux vérificateurs n'a pas à exister : {@link #generateToken} n'émet que
     * du RS256, la lecture n'accepte que du RS256.
     *
     * <p>Lève une {@link JwtException} (comme le reste du chemin de parsing) : les appelants
     * — {@code JwtFilter}, {@link #validateToken} — la traitent déjà comme « jeton refusé ».
     *
     * <p>FU2 (S57) : un jeton {@code null}/blanc (cookie {@code jwt=} vide) fait lever à jjwt
     * une {@link IllegalArgumentException} — HORS de la hiérarchie {@link JwtException}. Cette
     * exception échappait donc au {@code catch (JwtException)} de {@code AuthController}
     * (#312) et retombait dans son {@code catch (Exception)} générique -> 500 + stacktrace,
     * alors qu'un token invalide/expiré/malformé renvoie 401. Ce 500 recréait exactement le
     * side-channel que #312 voulait supprimer (distinguer « token vide » de « token invalide »).
     * Gardé ICI plutôt que dans chaque appelant : {@link #parseClaims} est le SEUL chokepoint
     * commun à {@link #extractUsername}, {@link #extractJti}, {@link #extractExpiration} et
     * {@link #validateToken} — {@code AuthController} (/me, /refresh) ET {@code JwtFilter}
     * (chemin non-auth) en bénéficient sans dupliquer la garde. Lève {@link MalformedJwtException}
     * (sous-type de {@code JwtException}) : un jeton vide n'est pas structurellement différent
     * d'un jeton malformé pour l'appelant, qui doit déjà catcher {@code JwtException}.
     */
    private Claims parseClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new MalformedJwtException("Jeton JWT absent ou blanc.");
        }
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(verificationKey)
                .build()
                .parseSignedClaims(token);

        String algorithm = jws.getHeader().getAlgorithm();
        if (!Jwts.SIG.RS256.getId().equals(algorithm)) {
            throw new UnsupportedJwtException(
                    "Algorithme de signature refusé : seul " + Jwts.SIG.RS256.getId()
                    + " est accepté (cohérence avec la vérification du middleware Edge, #323).");
        }
        return jws.getPayload();
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
        return parseClaims(token).getExpiration();
    }
}
