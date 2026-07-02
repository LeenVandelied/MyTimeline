package com.matimeline.eventmanager.infrastructure.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    // Durée de vie du token = 2 jours (BR-AUT-007). Extrait en constante pour
    // aligner l'expiration du JWT et celle enregistrée en base (SessionEntity.expiresAt).
    public static final long TOKEN_VALIDITY_MS = 1000L * 60 * 60 * 24 * 2;

    @Value("${jwt.secret}")
    private String secretKey;

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String username) {
        return Jwts.builder()
                   .setSubject(username)
                   .setIssuedAt(new Date())
                   .setExpiration(new Date(System.currentTimeMillis() + TOKEN_VALIDITY_MS))
                   .signWith(getSigningKey(), SignatureAlgorithm.HS256)
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
                .setSubject(authentication.getName())
                .setId(UUID.randomUUID().toString()) // claim "jti"
                .claim("role", userDetails.getAuthorities())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + TOKEN_VALIDITY_MS))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extrait le claim {@code jti} du token (#73). Renvoie {@code null} pour un token
     * legacy émis avant l'introduction du jti (aucun échec — le filtre traite l'absence
     * de jti comme "non révocable", cf. JwtFilter). Propage {@link ExpiredJwtException}
     * et les {@link JwtException} de signature/format, comme {@link #extractUsername}.
     */
    public String extractJti(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getId();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
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
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
    }
}