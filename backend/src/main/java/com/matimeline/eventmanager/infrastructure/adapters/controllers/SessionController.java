package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.SessionResponse;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.SessionService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import io.jsonwebtoken.JwtException;

/**
 * Gestion des sessions actives de l'utilisateur courant (issue #73).
 *
 * <p>Hexagonal (A8/DIP) : dépend des PORTS {@code SessionService}, {@code UserService}
 * et de {@code JwtService} pour dériver l'identité ET le jti courant du JWT (cookie
 * {@code jwt}), jamais d'un param. Sorties = DTOs {@code SessionResponse}, jamais le
 * domain model brut (le jti interne n'est jamais exposé).
 *
 * <ul>
 *   <li>{@code GET /api/sessions} : liste des sessions actives du caller.</li>
 *   <li>{@code DELETE /api/sessions/{id}} : révoque une session ciblée (ownership -> 404 sinon).</li>
 *   <li>{@code DELETE /api/sessions/others} : révoque toutes les sessions SAUF la courante.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessionService;
    private final UserService userService;
    private final JwtService jwtService;

    public SessionController(SessionService sessionService,
                             UserService userService,
                             JwtService jwtService) {
        this.sessionService = sessionService;
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<?> getActiveSessions(
            @CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String currentJti = extractJtiOrNull(token);
        List<SessionResponse> body = sessionService.getActiveSessions(caller.getId()).stream()
                .map(s -> SessionResponse.fromDomain(s, currentJti))
                .toList();
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/others")
    public ResponseEntity<?> revokeOtherSessions(
            @CookieValue(value = "jwt", required = false) String token) {
        // NB : mappé AVANT /{id} par Spring (chemin littéral prioritaire sur variable),
        // mais on garde /others explicite pour lever toute ambiguïté de routage.
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String currentJti = extractJtiOrNull(token);
        sessionService.revokeOtherSessions(caller.getId(), currentJti);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> revokeSession(
            @PathVariable UUID id,
            @CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // Ownership porté par le service : SessionNotFoundException (404) si la session
        // est inconnue OU appartient à autrui (anti-énumération, cf. GlobalExceptionHandler).
        sessionService.revokeSession(id, caller.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Résout le {@code User} authentifié depuis le JWT (cookie {@code jwt}), ou
     * {@code null} si absent/malformé/expiré/invalide ou utilisateur inconnu.
     * Identité dérivée du JWT, jamais d'un param — même pattern que CategoryController.
     */
    private User resolveCaller(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }
        try {
            String username = jwtService.extractUsername(token);
            return userService.findDomainUserByUsername(username).orElse(null);
        } catch (JwtException e) {
            return null;
        }
    }

    /** jti du token courant, ou {@code null} si absent/illisible (token legacy). */
    private String extractJtiOrNull(String token) {
        try {
            return jwtService.extractJti(token);
        } catch (JwtException e) {
            return null;
        }
    }
}
