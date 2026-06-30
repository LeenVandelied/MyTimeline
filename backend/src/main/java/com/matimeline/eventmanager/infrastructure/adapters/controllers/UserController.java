package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.ChangePasswordRequest;
import com.matimeline.eventmanager.application.dtos.UserResponse;
import com.matimeline.eventmanager.application.dtos.UserUpdateRequest;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;

/**
 * Endpoints de gestion du profil de l'utilisateur COURANT (#70).
 *
 * <p>Identité dérivée du JWT (cookie {@code jwt}), jamais d'un path/body param — même
 * principe que {@code EventController} (BR ownership). Routes protégées par
 * {@code .anyRequest().authenticated()} de {@code SecurityConfig} + {@code JwtFilter}
 * (qui ne bypass QUE {@code /api/auth/**}).
 *
 * <p>Hexagonal (A8) : dépend des PORTS ({@code UserService}) et de {@code JwtService}
 * (infra), pas du concret {@code UserServiceImpl}. La logique de change-password
 * (vérif ancien hash + re-hash) vit dans {@code UserServiceImpl} via le port, pas ici.
 *
 * <p>BR-AUT-008 : aucune réponse n'expose le hash — {@code GET}/{@code PATCH} renvoient
 * {@code UserResponse} (projection sans {@code password}).
 */
@RestController
@RequestMapping("/api/me")
public class UserController {

    private final UserService userService;
    private final JwtService jwtService;

    public UserController(UserService userService,
                          JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    /**
     * GET /api/me — profil de l'utilisateur courant SANS hash (BR-AUT-008).
     */
    @GetMapping
    public ResponseEntity<?> getCurrentUser(@CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(UserResponse.fromDomain(caller));
    }

    /**
     * PATCH /api/me — met à jour name/email/username de l'utilisateur courant.
     * BR-AUT-001 : un {@code username} déjà porté par un AUTRE compte -> 409 CONFLICT.
     * BR-AUT-008 : renvoie {@code UserResponse} (jamais le hash).
     */
    @PatchMapping
    public ResponseEntity<?> updateCurrentUser(@Valid @RequestBody UserUpdateRequest request,
                                               @CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // BR-AUT-001 : unicité du username. On rejette si le username demandé est déjà
        // pris par un AUTRE compte (id différent). Le changement vers son propre username
        // inchangé reste autorisé. (Check applicatif seul — race possible tant que la
        // contrainte DB unique n'est pas posée, cf. #42.)
        if (!request.getUsername().equals(caller.getUsername())) {
            Optional<User> existing = userService.findDomainUserByUsername(request.getUsername());
            if (existing.isPresent() && !existing.get().getId().equals(caller.getId())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(java.util.Map.of("error", "username already taken"));
            }
        }

        // User est immuable : on reconstruit en conservant id/role/password (hash),
        // seuls name/username/email sont modifiés.
        User updated = new User(
                caller.getId(),
                request.getName(),
                request.getUsername(),
                caller.getPassword(),
                caller.getRole(),
                request.getEmail());

        User saved = userService.updateUser(updated);
        return ResponseEntity.ok(UserResponse.fromDomain(saved));
    }

    /**
     * POST /api/me/change-password — délègue au port {@code UserService.changePassword}
     * (vérif ancien hash + re-hash, A8/DIP). Le nouveau pwd est validé (>=6 via
     * {@code @Valid}). 400 si l'ancien est faux ({@code InvalidCredentialsException}
     * mappée par {@code GlobalExceptionHandler}), 204 en cas de succès.
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                            @CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        userService.changePassword(caller, request.getOldPassword(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    /**
     * Résout le {@code User} authentifié depuis le JWT, ou {@code null} si le token
     * est absent/malformé/expiré/invalide ({@code JwtException}) ou l'utilisateur
     * inconnu. Identité dérivée du JWT, jamais d'un param.
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
}
