package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.matimeline.eventmanager.application.dtos.JwksResponse;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Publication JWKS de la clé PUBLIQUE de vérification RS256 (#358).
 *
 * <p><strong>Pourquoi cet endpoint existe.</strong> Depuis #323 le cookie {@code jwt} est signé
 * en RS256 et le middleware Next en vérifie la signature en Edge. La clé publique lui était
 * jusqu'ici recopiée À LA MAIN dans {@code AUTH_JWT_PUBLIC_KEY}, ce qui laissait deux trous :
 * une rotation de clé n'était pas atomique (fenêtre où backend et frontend divergent), et une
 * clé bien formée mais DÉPAREILLÉE faisait échouer 100 % des vérifications sans aucun signal.
 * En découvrant la clé ici, le frontend la tient de la SOURCE DE VÉRITÉ : les deux pannes
 * disparaissent par construction.
 *
 * <p><strong>PUBLIC, obligatoirement.</strong> {@code SecurityConfig} whiteliste ce chemin
 * ({@code permitAll}). Une clé publique n'est pas un secret, et surtout : le consommateur de
 * cet endpoint est précisément celui qui n'a pas encore de quoi s'authentifier. Le protéger
 * créerait une boucle (401 -> pas de clé -> 401).
 *
 * <p><strong>Chemin.</strong> {@code /.well-known/jwks.json}, hors du préfixe {@code /api} —
 * c'est l'emplacement conventionnel (RFC 8615) attendu par tout client OIDC/JOSE.
 *
 * <p>Aucun accès base, aucune identité, aucun état : la réponse est une pure fonction du
 * matériel de clé chargé au boot.
 */
@RestController
public class JwksController {

    /** Chemin canonique — référencé par {@code SecurityConfig} et par les tests. */
    public static final String JWKS_PATH = "/.well-known/jwks.json";

    /** Durée de fraîcheur annoncée. Le client (middleware Edge) tient SON propre cache ; */
    private static final Duration CACHE_MAX_AGE = Duration.ofMinutes(5);

    private final JwtService jwtService;

    public JwksController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * Renvoie le JWK Set courant.
     *
     * <p>{@code Cache-Control: public, max-age=300} est une INDICATION pour les caches
     * intermédiaires, pas la politique de fraîcheur du middleware : celui-ci mémorise la clé
     * dans son propre cache mémoire et redemande le document quand une signature valide ne
     * s'explique plus par les clés connues (cf. {@code frontend/src/lib/auth-jwks.ts}). Volontairement
     * COURTE : elle plafonne le temps pendant lequel un cache intermédiaire peut servir
     * l'ancienne clé après une rotation.
     */
    @GetMapping(value = JWKS_PATH, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JwksResponse> jwks() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(CACHE_MAX_AGE).cachePublic())
                .body(jwtService.getPublicJwks());
    }
}
