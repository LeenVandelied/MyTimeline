package com.matimeline.eventmanager.infrastructure.security;

import java.time.Clock;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Signe et vérifie les tokens de TÉLÉCHARGEMENT d'export (#58, ADR-003). Il n'existe pas de
 * presignedUrl (stockage LOCAL) : l'« URL signée 24h » est un endpoint interne
 * {@code /api/export/download/{jobId}?token=…} dont ce token porte la capacité bornée dans
 * le temps.
 *
 * <p>Réutilise le MÉCANISME de signature existant (jjwt HS256, même {@code jwt.secret} que
 * l'auth). Claims : {@code sub = jobId}, {@code uid = ownerId}, {@code typ = "export-download"}
 * (isole ces tokens des tokens d'authentification — un token d'auth ne peut pas servir de
 * token de download, et inversement). L'expiration ({@code exp}) est portée par le token ET
 * revérifiée contre le {@link Clock} injecté (déterminisme des tests d'expiration).
 *
 * <p>{@link #verify(String)} ne lève JAMAIS : un token invalide/expiré/altéré →
 * {@link Optional#empty()} (le contrôleur renvoie 404). Aucun détail d'erreur n'est exposé.
 */
@Service
public class ExportTokenService {

    private static final String TOKEN_TYPE = "export-download";
    private static final String CLAIM_TYPE = "typ";
    private static final String CLAIM_UID = "uid";

    @Value("${jwt.secret}")
    private String secretKey;

    private final Clock clock;

    public ExportTokenService(Clock clock) {
        this.clock = clock;
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Signe un token de download liant {@code jobId} + {@code ownerId}, expirant à
     * {@code expiresAt} (= complétion + 24h, cf. ADR-003).
     */
    public String sign(UUID jobId, UUID ownerId, Date expiresAt) {
        return Jwts.builder()
                .subject(jobId.toString())
                .claim(CLAIM_UID, ownerId.toString())
                .claim(CLAIM_TYPE, TOKEN_TYPE)
                .issuedAt(Date.from(clock.instant()))
                .expiration(expiresAt)
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Vérifie signature, type et expiration (contre le {@link Clock} injecté). Renvoie les
     * revendications {@code (jobId, ownerId)} si valides, sinon {@link Optional#empty()}.
     */
    public Optional<ExportDownloadToken> verify(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (!TOKEN_TYPE.equals(claims.get(CLAIM_TYPE, String.class))) {
                return Optional.empty();
            }
            UUID jobId = UUID.fromString(claims.getSubject());
            UUID ownerId = UUID.fromString(claims.get(CLAIM_UID, String.class));
            return Optional.of(new ExportDownloadToken(jobId, ownerId));
        } catch (JwtException | IllegalArgumentException e) {
            // Signature invalide, token expiré, format/claims corrompus -> capacité refusée.
            return Optional.empty();
        }
    }

    /** Revendications utiles portées par un token de download vérifié. */
    public record ExportDownloadToken(UUID jobId, UUID ownerId) {
    }
}
