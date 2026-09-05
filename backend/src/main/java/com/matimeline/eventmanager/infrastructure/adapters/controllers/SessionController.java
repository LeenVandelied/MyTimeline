package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.SessionResponse;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.SessionService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import io.jsonwebtoken.JwtException;

/**
 * Gestion des sessions actives de l'utilisateur courant (issue #73).
 *
 * <p>Hexagonal (A8/DIP) : dépend des PORTS {@code SessionService}, de {@code CallerResolver}
 * (identité via SecurityContext #93) et de {@code JwtService} pour extraire le jti COURANT du
 * cookie {@code jwt} (claim non porté par le SecurityContext), jamais d'un param. Sorties =
 * DTOs {@code SessionResponse}, jamais le domain model brut (le jti interne n'est jamais exposé).
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
    private final CallerResolver callerResolver;
    private final JwtService jwtService;

    public SessionController(SessionService sessionService,
                             CallerResolver callerResolver,
                             JwtService jwtService) {
        this.sessionService = sessionService;
        this.callerResolver = callerResolver;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<?> getActiveSessions(
            @CookieValue(value = "jwt", required = false) String cookieToken,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();
        String currentJti = extractJtiOrNull(resolveToken(cookieToken, authHeader));
        List<SessionResponse> body = sessionService.getActiveSessions(caller.getId()).stream()
                .map(s -> SessionResponse.fromDomain(s, currentJti))
                .toList();
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/others")
    public ResponseEntity<?> revokeOtherSessions(
            @CookieValue(value = "jwt", required = false) String cookieToken,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // NB : mappé AVANT /{id} par Spring (chemin littéral prioritaire sur variable),
        // mais on garde /others explicite pour lever toute ambiguïté de routage.
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // Résout le jti COURANT comme JwtFilter (cookie PUIS Bearer, BR-AUT-011) : sinon un client
        // Bearer-only aurait token=null -> currentJti=null -> revokeAllByUserIdExcept(userId, null)
        // dégénère en revoke-all et révoque la session de l'appel elle-même (self-DoS).
        String currentJti = extractJtiOrNull(resolveToken(cookieToken, authHeader));
        sessionService.revokeOtherSessions(callerOpt.get().getId(), currentJti);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> revokeSession(@PathVariable UUID id) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // Ownership porté par le service : SessionNotFoundException (404) si la session
        // est inconnue OU appartient à autrui (anti-énumération, cf. GlobalExceptionHandler).
        sessionService.revokeSession(id, callerOpt.get().getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Résout le token JWT courant à la MÊME source que {@link JwtFilter} (BR-AUT-011) : cookie
     * {@code jwt} en priorité, sinon header {@code Authorization: Bearer <token>}, sinon {@code null}.
     * Garantit que {@code extractJtiOrNull} fonctionne dans les DEUX modes d'auth (cookie ET Bearer).
     */
    private String resolveToken(String cookieToken, String authHeader) {
        if (cookieToken != null && !cookieToken.isEmpty()) {
            return cookieToken;
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
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
