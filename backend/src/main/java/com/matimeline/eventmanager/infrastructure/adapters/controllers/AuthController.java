package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.AuthRequest;
import com.matimeline.eventmanager.application.dtos.ForgotPasswordRequest;
import com.matimeline.eventmanager.application.dtos.RegisterRequest;
import com.matimeline.eventmanager.application.dtos.ResetPasswordRequest;
import com.matimeline.eventmanager.application.dtos.UserResponse;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.PasswordResetService;
import com.matimeline.eventmanager.domain.ports.services.SessionService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.ClientIpAnonymizer;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetails;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    // A8/DIP : injection via le PORT (interface domaine), pas l'impl concrète.
    private final PasswordResetService passwordResetService;
    // #73 : enregistrement/révocation des sessions (jti). Port métier, pas l'impl.
    private final SessionService sessionService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, CustomUserDetailsService userDetailsService, UserService userService, PasswordEncoder passwordEncoder, PasswordResetService passwordResetService, SessionService sessionService) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetService = passwordResetService;
        this.sessionService = sessionService;
    }

    private static final String JWT_COOKIE = "jwt";
    private static final String COOKIE_PATH = "/";
    private static final String COOKIE_SAME_SITE = "Lax";
    private static final int COOKIE_MAX_AGE = 60 * 60 * 24 * 2;

    // BR-AUT-007 / A6 / A7 : attributs Secure et Domain externalisés par profil
    // (application-{dev,prod}.properties). En dur, Secure=false exposait le token
    // hors HTTPS et domain="localhost" cassait tout déploiement non-localhost.
    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    @Value("${app.cookie.domain}")
    private String cookieDomain;

    /**
     * Construit le cookie {@code jwt} avec des attributs IDENTIQUES pour la pose
     * et la suppression (BR-AUT-010 / A6). Sans cette identité (HttpOnly, Secure,
     * Path, Domain, SameSite), le navigateur ne matche pas le cookie à effacer.
     * Secure et Domain proviennent du profil actif ({@code app.cookie.*}).
     *
     * @param value   valeur du token (vide pour suppression)
     * @param maxAge  durée de vie en secondes ; 0 pour supprimer
     */
    private Cookie buildJwtCookie(String value, int maxAge) {
        Cookie jwtCookie = new Cookie(JWT_COOKIE, value);
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(cookieSecure);
        jwtCookie.setPath(COOKIE_PATH);
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            jwtCookie.setDomain(cookieDomain);
        }
        jwtCookie.setMaxAge(maxAge);
        jwtCookie.setAttribute("SameSite", COOKIE_SAME_SITE);
        return jwtCookie;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest authRequest,
                                   HttpServletRequest request, HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwtToken = jwtService.generateToken(authentication);

            // #73 : enregistrer la session pour rendre le token révocable. Le jti est
            // porté par le token (généré dans generateToken) ; on l'extrait pour la clé
            // de session. deviceInfo = User-Agent (borné) ; IP TRONQUÉE (RGPD) avant
            // persistance (jamais l'IP complète en clair). Résolution du user pour l'id.
            registerSession(jwtToken, authentication.getName(), request);

            response.addCookie(buildJwtCookie(jwtToken, COOKIE_MAX_AGE));
            // BR-AUT-007 / anti-pattern A3 : le JWT est transmis UNIQUEMENT via le
            // cookie HttpOnly. Ne jamais renvoyer le token brut dans le body, sinon
            // un script XSS pourrait le lire et annuler le bénéfice du HttpOnly.
            return ResponseEntity.ok(java.util.Map.of("message", "Authentification réussie"));
        } catch (BadCredentialsException e) {
            // BR-AUT-005 : message neutre (ne distingue pas username inconnu vs
            // mot de passe faux) et body JSON {"error":...} cohérent avec les
            // autres réponses d'erreur du contrôleur (register/refresh).
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Invalid username or password"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", "authentication_failed"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getUserDetails(@CookieValue(name = "jwt", required = false) String token) {
        try {
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: No token provided");
            }

            String username = jwtService.extractUsername(token);
            Optional<User> user = userService.findDomainUserByUsername(username);

            if (user.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            if (!jwtService.validateToken(token, new CustomUserDetails(user.get(), List.of(new SimpleGrantedAuthority(user.get().getRole()))))) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Invalid token");
            }

            // #73 (BR-AUT-011) : /api/auth/** est bypassé par JwtFilter, la révocation
            // n'est donc PAS vérifiée par la chaîne Security. Sans ce contrôle, un token
            // RÉVOQUÉ (logout / DELETE session) lirait encore /me (200) et le frontend
            // croirait la session active. isSessionActive : false si jti révoqué/inconnu ;
            // true si token legacy sans jti (compatibilité descendante préservée).
            String jti = jwtService.extractJti(token);
            if (!sessionService.isSessionActive(jti)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: session révoquée");
            }

            return ResponseEntity.ok(UserResponse.fromDomain(user.get()));
        } catch (ExpiredJwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Token expired");
        } catch (MalformedJwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Invalid token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            Optional<User> existingUser = userService.findDomainUserByUsername(registerRequest.getUsername());

            if (existingUser.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("User already exists");
            }

            String hashedPassword = passwordEncoder.encode(registerRequest.getPassword());

            User newUser = new User(
                UUID.randomUUID(),
                registerRequest.getName(),
                registerRequest.getUsername(),
                hashedPassword,
                "ROLE_USER", 
                registerRequest.getEmail()
            );

            userService.createUser(newUser);

            return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully");
        } catch (DataIntegrityViolationException e) {
            // BR-AUT-001 : violation de contrainte unique (username/email).
            // Couvre la course concurrente non rattrapée par le pré-check applicatif
            // ainsi que l'unicité de l'email (aucun pré-check applicatif).
            String detail = e.getMostSpecificCause().getMessage();
            String field = detail != null && detail.toLowerCase().contains("email")
                    ? "email"
                    : "username";
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("error", field + " already taken"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred during registration");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@CookieValue(name = "jwt", required = false) String token,
                                    HttpServletResponse response) {
        try {
            // #73 (BR-AUT-010) : logout révoque désormais le jti courant EN BASE — le
            // token capturé avant expiration est neutralisé côté serveur, pas seulement
            // effacé du navigateur. Idempotent : jti inconnu/déjà révoqué/absent -> no-op.
            revokeSessionSilently(token);
            // BR-AUT-010 : attributs identiques à la pose (login/refresh) pour
            // que le navigateur matche et efface le cookie. maxAge=0 = suppression.
            response.addCookie(buildJwtCookie("", 0));
            return ResponseEntity.ok("Logged out successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred during logout");
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@CookieValue(name = "jwt", required = false) String token,
                                         HttpServletRequest request,
                                         HttpServletResponse response) {
        try {
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(java.util.Map.of("error", "token expiré ou invalide"));
            }

            String username = jwtService.extractUsername(token);
            Optional<User> user = userService.findDomainUserByUsername(username);

            if (user.isEmpty()) {
                // Anti-énumération de compte (review PR #113) : un username inexistant
                // dans un token signé valide doit renvoyer le MÊME 401 générique qu'un
                // token expiré/invalide. Un 404 distinct permettrait de distinguer
                // "compte inexistant" de "token invalide" et d'énumérer les comptes.
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(java.util.Map.of("error", "token expiré ou invalide"));
            }

            CustomUserDetails userDetails = new CustomUserDetails(user.get(),
                List.of(new SimpleGrantedAuthority(user.get().getRole())));

            // BR-AUT-009 / anti-pattern A5 : valider l'expiration ET la signature
            // du token courant AVANT toute ré-émission. Sans ce contrôle, un token
            // expiré pourrait être renouvelé indéfiniment, contournant la durée de
            // vie des sessions. validateToken renvoie false sur expiration ou
            // signature invalide ; ExpiredJwtException (levée plus haut par
            // extractUsername) et toute JwtException sont rattrapées ci-dessous.
            if (!jwtService.validateToken(token, userDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(java.util.Map.of("error", "token expiré ou invalide"));
            }

            // #73 (BR-AUT-009 étendue) : refuser un token dont le jti est RÉVOQUÉ, même
            // s'il est encore valide (non expiré, signé). Sans ce contrôle, un token
            // révoqué (logout / DELETE session) pourrait être renouvelé indéfiniment,
            // contournant la révocation. isSessionActive : false si jti révoqué/inconnu ;
            // true si token legacy sans jti (n'entrave pas la compatibilité descendante).
            String currentJti = jwtService.extractJti(token);
            if (!sessionService.isSessionActive(currentJti)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(java.util.Map.of("error", "token expiré ou invalide"));
            }

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

            String newToken = jwtService.generateToken(authentication);

            // Rotation de session : révoquer l'ancien jti et enregistrer le nouveau, pour
            // que la liste des sessions reste cohérente et que l'ancien token soit neutralisé.
            revokeSessionSilently(token);
            registerSession(newToken, user.get().getUsername(), request);

            response.addCookie(buildJwtCookie(newToken, COOKIE_MAX_AGE));
            return ResponseEntity.ok().body("Token refreshed successfully");
        } catch (JwtException e) {
            // BR-AUT-009 : token expiré (ExpiredJwtException) ou signature/format
            // invalide (SignatureException, MalformedJwtException...) levé par
            // extractUsername -> 401, jamais de ré-émission ni de 500.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "token expiré ou invalide"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", "an_error_occurred"));
        }
    }

    /**
     * Mot de passe oublié (#49). Génère + envoie un token de réinitialisation si
     * l'email correspond à un compte existant.
     *
     * <p>BR-AUT-005 (anti-énumération) : répond TOUJOURS 200 quel que soit le
     * résultat du lookup — le service ne lève aucune exception révélant l'existence
     * du compte. Le seul 400 possible vient de la validation @Valid (corps malformé /
     * email absent), traité par GlobalExceptionHandler.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.getEmail());
        // Message neutre identique dans tous les cas (compte trouvé ou non).
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Si un compte correspond à cet email, un lien de réinitialisation a été envoyé."));
    }

    /**
     * Réinitialise le mot de passe (#49). Token valide (existant, non expiré >15 min,
     * non consommé) -> met à jour le hash BCrypt + marque consommé -> 200. Token
     * invalide/expiré/déjà utilisé -> InvalidPasswordResetTokenException -> 400
     * (GlobalExceptionHandler).
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(java.util.Map.of("message", "Mot de passe réinitialisé avec succès."));
    }

    /**
     * #73 : enregistre la session correspondant au token émis (jti extrait du token).
     * deviceInfo = User-Agent borné à 255 caractères ; IP TRONQUÉE (RGPD) — l'IP
     * complète n'est JAMAIS persistée. expiresAt aligné sur la durée de vie du JWT.
     * Best-effort : un jti absent (ne devrait pas arriver) ou un user introuvable ne
     * casse pas le login.
     */
    private void registerSession(String token, String username, HttpServletRequest request) {
        Optional<User> user = userService.findDomainUserByUsername(username);
        if (user.isEmpty()) {
            return;
        }
        String jti = jwtService.extractJti(token);
        if (jti == null) {
            return;
        }
        sessionService.createSession(
                jti,
                user.get().getId(),
                deviceInfo(request),
                ClientIpAnonymizer.anonymize(request.getRemoteAddr()),
                LocalDateTime.now().plusSeconds(COOKIE_MAX_AGE));
    }

    /**
     * Révoque le jti porté par {@code token}. Silencieux : un token null/malformé/expiré
     * ou sans jti est un no-op (logout doit toujours réussir côté cookie).
     */
    private void revokeSessionSilently(String token) {
        if (token == null || token.isEmpty()) {
            return;
        }
        try {
            sessionService.revokeCurrentSession(jwtService.extractJti(token));
        } catch (JwtException e) {
            // token expiré/malformé -> rien à révoquer (déjà inutilisable).
        }
    }

    /** User-Agent borné (255 car., taille de la colonne device_info). */
    private String deviceInfo(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        if (ua == null) {
            return null;
        }
        return ua.length() > 255 ? ua.substring(0, 255) : ua;
    }
}