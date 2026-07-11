package com.matimeline.eventmanager.infrastructure.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    // Durée de vie du token = 2 jours (BR-AUT-007). Extrait en constante pour
    // aligner l'expiration du JWT et celle enregistrée en base (SessionEntity.expiresAt).
    public static final long TOKEN_VALIDITY_MS = 1000L * 60 * 60 * 24 * 2;

    @Value("${jwt.secret}")
    private String secretKey;

    /**
     * Garde-fou de boot (fail-fast) : valide le secret AU DÉMARRAGE plutôt qu'à
     * chaque requête. Un secret non Base64 (p.ex. contenant '-') ou trop court
     * (< 32 octets décodés, insuffisant pour HS256) faisait échouer getSigningKey()
     * à CHAQUE login/refresh -> 500 opaque en boucle. Ici l'app refuse de démarrer
     * avec un message clair. Le message n'expose JAMAIS la valeur du secret.
     */
    @PostConstruct
    void validateSecret() {
        try {
            getSigningKey();
        } catch (RuntimeException e) {
            throw new IllegalStateException(
                    "jwt.secret invalide : attendu du Base64 STANDARD décodant à >= 32 octets "
                    + "(HS256). Cause : " + e.getClass().getSimpleName() + " — " + e.getMessage(),
                    e);
        }
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String username) {
        return Jwts.builder()
                   .subject(username)
                   .issuedAt(new Date())
                   .expiration(new Date(System.currentTimeMillis() + TOKEN_VALIDITY_MS))
                   // Algo HS256 explicite : en jjwt 0.12+, signWith(key) seul déduirait
                   // HS256/384/512 de la taille de la clé → un secret > 256 bits changerait
                   // l'algo et invaliderait les tokens legacy. On fige HS256 (inchangé).
                   .signWith(getSigningKey(), Jwts.SIG.HS256)
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
                .signWith(getSigningKey(), Jwts.SIG.HS256)
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
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getId();
    }

    public String extractUsername(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
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
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getExpiration();
    }
}