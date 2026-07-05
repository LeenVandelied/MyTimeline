package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import com.matimeline.eventmanager.application.dtos.ChangePasswordRequest;
import com.matimeline.eventmanager.application.dtos.DeleteAccountRequest;
import com.matimeline.eventmanager.application.dtos.UserResponse;
import com.matimeline.eventmanager.application.dtos.UserUpdateRequest;
import com.matimeline.eventmanager.domain.exceptions.InvalidAvatarException;
import com.matimeline.eventmanager.domain.models.AvatarContent;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.AvatarService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
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
    // #75 : gestion avatar via le PORT (A8/DIP), jamais l'impl concrète.
    private final AvatarService avatarService;

    public UserController(UserService userService,
                          JwtService jwtService,
                          AvatarService avatarService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.avatarService = avatarService;
    }

    private static final String JWT_COOKIE = "jwt";
    private static final String COOKIE_PATH = "/";
    private static final String COOKIE_SAME_SITE = "Lax";

    // BR-AUT-007 / A6/A7 : attributs Secure et Domain externalisés par profil, IDENTIQUES
    // à la pose du cookie dans AuthController. Sans cette identité (HttpOnly/Secure/Path/
    // Domain/SameSite), le navigateur ne matche pas le cookie à effacer (BR-AUT-010).
    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    @Value("${app.cookie.domain}")
    private String cookieDomain;

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
                request.getEmail(),
                caller.getAvatar());

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
     * DELETE /api/me — supprime DÉFINITIVEMENT le compte du caller (#78, RGPD droit à
     * l'effacement). Confirmation par re-saisie du {@code username} (double-sécurité UX) :
     * l'identité vient TOUJOURS du JWT ({@code resolveCaller}), jamais du body.
     *
     * <p>Flux : 401 si non authentifié ; 400 si body absent/vide (@Valid) ou username !=
     * caller ({@code AccountDeletionMismatchException}, GlobalExceptionHandler) ; sinon la
     * purge ordonnée (events -> products archivés inclus -> catégories possédées -> user)
     * + révocation des sessions s'exécute dans UNE transaction ({@code UserService}). En
     * cas de succès : cookie {@code jwt} effacé (MaxAge=0, BR-AUT-010) + 204 sans body.
     * Un 2e appel avec le même token -> {@code resolveCaller} renvoie null (user purgé) ->
     * 401 (BR-AUT-011).
     */
    @DeleteMapping
    public ResponseEntity<?> deleteCurrentUser(@Valid @RequestBody DeleteAccountRequest request,
                                               @CookieValue(value = "jwt", required = false) String token,
                                               HttpServletResponse response) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Mismatch username -> AccountDeletionMismatchException (400) levée ici, AVANT toute
        // écriture. Sinon suppression ordonnée + révocation sessions dans la transaction.
        userService.deleteAccount(caller, request.getUsername());

        // BR-AUT-010 : effacer le cookie avec des attributs IDENTIQUES à la pose (login),
        // pour que le navigateur matche et supprime. MaxAge=0 = suppression immédiate.
        response.addCookie(buildExpiredJwtCookie());
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/me/avatar — upload de l'avatar de l'utilisateur COURANT (#75, BR-AUT-001).
     *
     * <p>Multipart mono-fichier (part {@code file}). Le service valide le type par MAGIC
     * BYTES (pas le Content-Type client) + la taille (5 Mo), stocke via {@code StoragePort}
     * (nom généré, jamais le filename client), met à jour {@code User.avatar} et nettoie
     * l'ancien fichier. Ownership STRUCTUREL : l'action porte sur {@code caller} (JWT),
     * jamais sur un id client. 400 si fichier invalide/absent/trop lourd
     * ({@code InvalidAvatarException} -> GlobalExceptionHandler) ; 401 si non authentifié.
     * Succès -> 200 + {@code UserResponse} (contient {@code avatarUrl} = /api/me/avatar).
     */
    @PostMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file,
                                          @CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        byte[] content;
        try {
            // Un part présent mais vide (file.isEmpty()) est traité comme fichier invalide
            // par le service (content vide -> 400), pas comme une erreur technique.
            content = file.isEmpty() ? new byte[0] : file.getBytes();
        } catch (IOException e) {
            // Lecture du part impossible -> 400 message générique (aucune fuite de détail).
            throw new InvalidAvatarException("fichier illisible");
        }

        avatarService.uploadAvatar(caller, content);

        // Relire le caller pour renvoyer un UserResponse à jour (avatarUrl désormais posé).
        User refreshed = userService.findDomainUserById(caller.getId()).orElse(caller);
        return ResponseEntity.ok(UserResponse.fromDomain(refreshed));
    }

    /**
     * GET /api/me/avatar — streame les octets de l'avatar du caller (#75). AUTHENTIFIÉ :
     * pas de resource statique publique, pas d'URL permanente. Ownership structurel
     * (BR-AUT-001). 404 si aucun avatar ({@code AvatarNotFoundException}) ; 401 si non
     * authentifié. Content-Type dérivé du type réel stocké (jpeg/png/webp).
     */
    @GetMapping("/avatar")
    public ResponseEntity<?> getAvatar(@CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AvatarContent avatar = avatarService.getAvatar(caller);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.contentType()))
                .body(avatar.bytes());
    }

    /**
     * DELETE /api/me/avatar — réinitialise {@code User.avatar} à null + supprime le fichier
     * stocké (#75, BR-AUT-001). Idempotent (caller sans avatar -> no-op). 401 si non
     * authentifié ; 204 sinon. Ownership structurel : agit sur le caller (JWT) uniquement.
     */
    @DeleteMapping("/avatar")
    public ResponseEntity<?> deleteAvatar(@CookieValue(value = "jwt", required = false) String token) {
        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        avatarService.deleteAvatar(caller);
        return ResponseEntity.noContent().build();
    }

    /**
     * Construit le cookie {@code jwt} de SUPPRESSION (valeur vide, MaxAge=0) avec des
     * attributs identiques à la pose (AuthController.buildJwtCookie) — HttpOnly, Secure,
     * Path, Domain, SameSite — sans quoi le navigateur ne matche pas le cookie (BR-AUT-010).
     */
    private Cookie buildExpiredJwtCookie() {
        Cookie jwtCookie = new Cookie(JWT_COOKIE, "");
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(cookieSecure);
        jwtCookie.setPath(COOKIE_PATH);
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            jwtCookie.setDomain(cookieDomain);
        }
        jwtCookie.setMaxAge(0);
        jwtCookie.setAttribute("SameSite", COOKIE_SAME_SITE);
        return jwtCookie;
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
