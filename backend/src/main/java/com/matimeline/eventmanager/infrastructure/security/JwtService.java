package com.matimeline.eventmanager.infrastructure.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.SignatureException;

import jakarta.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.GeneralSecurityException;
import java.security.Key;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import com.matimeline.eventmanager.application.dtos.JwkResponse;
import com.matimeline.eventmanager.application.dtos.JwksResponse;

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

    /**
     * Clé PUBLIQUE précédente (SPKI Base64), facultative, pour la rotation sans déconnexion (#489).
     * Vide = pas de rotation. Procédure : y mettre l'ancienne clé publique en changeant
     * {@code JWT_PRIVATE_KEY}, puis la retirer une fois les anciens jetons expirés. Elle ne
     * sert qu'à VÉRIFIER : la signature utilise toujours la clé courante.
     */
    @Value("${jwt.previous-public-key:}")
    private String previousPublicKeyMaterial;

    private PrivateKey signingKey;
    private PublicKey verificationKey;
    private String verificationKid;
    // Clé précédente et son kid : null si absente ou identique à la courante.
    private PublicKey previousKey;
    private String previousKid;

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
        this.verificationKid = kidOf(verificationKey);
        this.previousKey = loadPreviousKey();
        this.previousKid = previousKey == null ? null : kidOf(previousKey);
        if (previousKey != null) {
            log.warn("Rotation de la clé de connexion en cours : clé PUBLIQUE précédente chargée "
                     + "(kid={}). Les jetons qu'elle a signés restent acceptés jusqu'à leur "
                     + "expiration. Retirer jwt.previous-public-key (JWT_PREVIOUS_PUBLIC_KEY) "
                     + "une fois écoulée la durée de validité des jetons ({} h) après la rotation.",
                     previousKid, TOKEN_VALIDITY_MS / (1000L * 60 * 60));
        }

        // ⚠ Journalisée dans LES DEUX cas, pas seulement sur le chemin éphémère.
        // #358 — ce log n'est PLUS une étape de configuration : la clé publique est désormais
        // PUBLIÉE par le backend sur /.well-known/jwks.json et découverte par le middleware
        // Next, il n'y a plus rien à recopier à la main (AUTH_JWT_PUBLIC_KEY n'existe plus).
        // Il reste un outil de DIAGNOSTIC : c'est la seule façon de constater d'un coup d'œil,
        // dans les logs, quelle clé un backend donné utilise réellement — utile après une
        // rotation, ou pour distinguer deux instances. Une clé PUBLIQUE n'est pas un secret.
        // ⚠ Passe par l'accesseur PUBLIC plutôt que de rappeler `RsaKeyMaterial.toSpkiBase64` :
        // sans cela `getPublicKeySpkiBase64()` n'aurait aucun appelant dans `main/`, et rien ne
        // garantirait que la valeur journalisée reste celle que l'accesseur produit.
        log.info("Clé PUBLIQUE de vérification RS256 (SPKI Base64) : {}", getPublicKeySpkiBase64());
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

    /**
     * Charge la clé précédente. ⚠ Ni la valeur ni le message de l'exception sous-jacente ne
     * sont repris (aucune cause enveloppée).
     */
    private PublicKey loadPreviousKey() {
        if (previousPublicKeyMaterial == null || previousPublicKeyMaterial.isBlank()) {
            return null;
        }
        PublicKey previous;
        try {
            previous = RsaKeyMaterial.publicFromSpki(previousPublicKeyMaterial);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "jwt.previous-public-key invalide : attendu une clé PUBLIQUE RSA X.509 SPKI "
                    + "en Base64 (corps d'un PEM '-----BEGIN PUBLIC KEY-----', armure et sauts de "
                    + "ligne tolérés), de modulus >= " + RsaKeyMaterial.MIN_MODULUS_BITS
                    + " bits. Cause : " + e.getClass().getSimpleName()
                    + " (valeur et détail volontairement non journalisés).");
        }
        if (Arrays.equals(previous.getEncoded(), verificationKey.getEncoded())) {
            log.info("jwt.previous-public-key identique à la clé courante : ignorée.");
            return null;
        }
        return previous;
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
     * Clé PUBLIQUE de vérification au format SPKI Base64. Ce n'est PAS un secret.
     *
     * <p>#358 — n'est plus destinée à être recopiée dans une variable d'environnement du
     * frontend : elle sert au log de démarrage (diagnostic) et à l'outillage de test. La
     * distribution de la clé au middleware Edge passe désormais par {@link #getPublicJwks()}.
     */
    public String getPublicKeySpkiBase64() {
        return RsaKeyMaterial.toSpkiBase64(verificationKey);
    }

    /**
     * Document JWK Set publiant les clés PUBLIQUES de vérification (#358, #489) : toujours la
     * clé courante, en première position, puis la clé précédente si
     * {@code jwt.previous-public-key} est renseignée (rotation en cours). Une ou deux entrées.
     *
     * <p>C'est la SOURCE DE VÉRITÉ des clés pour le middleware Next : celui-ci les découvre via
     * {@code /.well-known/jwks.json} au lieu de les lire dans une variable d'environnement
     * recopiée à la main. La clé courante est DÉRIVÉE, à chaque appel, du matériel qui signe
     * réellement les jetons. La clé précédente ne sert qu'à vérifier les jetons émis avant la
     * rotation, jusqu'à leur expiration.
     *
     * @throws IllegalStateException matériel de clé non encodable en JWK — inatteignable avec
     *                               une paire RSA, remonté en 500 plutôt que servi tronqué :
     *                               un JWKS incomplet ferait rejeter TOUS les cookies.
     */
    public JwksResponse getPublicJwks() {
        try {
            List<JwkResponse> keys = new ArrayList<>();
            keys.add(toJwk(verificationKey));
            if (previousKey != null) {
                keys.add(toJwk(previousKey));
            }
            return new JwksResponse(List.copyOf(keys));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(
                    "Publication JWKS impossible : " + e.getClass().getSimpleName()
                    + " (détail volontairement non journalisé).", e);
        }
    }

    private static JwkResponse toJwk(PublicKey key) throws GeneralSecurityException {
        String modulus = RsaKeyMaterial.modulusBase64Url(key);
        String exponent = RsaKeyMaterial.publicExponentBase64Url(key);
        return new JwkResponse("RSA", "sig", Jwts.SIG.RS256.getId(),
                RsaKeyMaterial.jwkThumbprint(modulus, exponent), modulus, exponent);
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
        Jws<Claims> jws = parseWithCandidateKeys(token);

        String algorithm = jws.getHeader().getAlgorithm();
        if (!Jwts.SIG.RS256.getId().equals(algorithm)) {
            throw new UnsupportedJwtException(
                    "Algorithme de signature refusé : seul " + Jwts.SIG.RS256.getId()
                    + " est accepté (cohérence avec la vérification du middleware Edge, #323).");
        }
        return jws.getPayload();
    }

    /**
     * #489 : la clé de vérification se choisit sur l'en-tête PARSÉ par jjwt. Jeton avec kid :
     * uniquement la clé (courante ou précédente) de ce kid, kid inconnu refusé. Jeton sans kid
     * (ceux qu'émet le backend) : courante, puis précédente si la signature ne correspond pas.
     * Un jeton vérifié par la clé précédente subit en plus {@link #assertBoundedPreviousKeyToken}.
     */
    private Jws<Claims> parseWithCandidateKeys(String token) {
        KidLocator current = new KidLocator(verificationKey);
        Jws<Claims> jws;
        PublicKey usedKey;
        try {
            jws = Jwts.parser().keyLocator(current).build().parseSignedClaims(token);
            usedKey = current.chosen;
        } catch (SignatureException e) {
            // Un kid désigne une seule clé : pas de seconde chance.
            if (previousKey == null || current.designatedByKid) {
                throw e;
            }
            KidLocator previous = new KidLocator(previousKey);
            jws = Jwts.parser().keyLocator(previous).build().parseSignedClaims(token);
            usedKey = previous.chosen;
        }
        if (usedKey == previousKey) {
            assertBoundedPreviousKeyToken(jws);
        }
        return jws;
    }

    /**
     * Défense en profondeur (#489) : un jeton de la clé précédente doit ressembler à ceux que le
     * backend émettait, soit un jti (révocable par session) et une durée exp - iat bornée par
     * {@link #TOKEN_VALIDITY_MS}. Sans cela, un jeton à très longue durée signé par l'ancienne
     * clé survivrait à toute la fenêtre de rotation.
     */
    private static void assertBoundedPreviousKeyToken(Jws<Claims> jws) {
        Claims claims = jws.getPayload();
        if (claims.getId() == null || claims.getId().isBlank()) {
            throw new MissingClaimException(jws.getHeader(), claims, Claims.ID, claims.getId(),
                    "Jeton de la clé précédente sans jti : refusé.");
        }
        Date issuedAt = claims.getIssuedAt();
        Date expiration = claims.getExpiration();
        if (issuedAt == null || expiration == null) {
            String missing = issuedAt == null ? Claims.ISSUED_AT : Claims.EXPIRATION;
            throw new MissingClaimException(jws.getHeader(), claims, missing, null,
                    "Jeton de la clé précédente sans " + missing + " : refusé.");
        }
        if (expiration.getTime() - issuedAt.getTime() > TOKEN_VALIDITY_MS) {
            throw new IncorrectClaimException(jws.getHeader(), claims, Claims.EXPIRATION, expiration,
                    "Jeton de la clé précédente de durée supérieure à la validité des jetons : refusé.");
        }
    }

    /** Clé de vérification d'après le kid de l'en-tête JWS ; retient la clé choisie pour l'appelant. */
    private final class KidLocator extends LocatorAdapter<Key> {

        private final PublicKey keyWithoutKid;
        private PublicKey chosen;
        private boolean designatedByKid;

        private KidLocator(PublicKey keyWithoutKid) {
            this.keyWithoutKid = keyWithoutKid;
        }

        @Override
        protected Key locate(JwsHeader header) {
            String kid = header.getKeyId();
            designatedByKid = kid != null;
            if (kid == null) {
                chosen = keyWithoutKid;
            } else if (kid.equals(verificationKid)) {
                chosen = verificationKey;
            } else if (previousKey != null && kid.equals(previousKid)) {
                chosen = previousKey;
            } else {
                throw new SignatureException("Clé de signature inconnue (kid non reconnu).");
            }
            return chosen;
        }
    }

    private static String kidOf(PublicKey key) {
        try {
            return RsaKeyMaterial.jwkThumbprint(
                    RsaKeyMaterial.modulusBase64Url(key), RsaKeyMaterial.publicExponentBase64Url(key));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Empreinte de clé impossible : " + e.getClass().getSimpleName());
        }
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
