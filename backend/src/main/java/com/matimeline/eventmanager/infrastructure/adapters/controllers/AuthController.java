package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

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
import com.matimeline.eventmanager.application.dtos.RegisterRequest;
import com.matimeline.eventmanager.application.dtos.UserResponse;
import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetails;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserServiceImpl userService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, CustomUserDetailsService userDetailsService, UserServiceImpl userService, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    private static final String JWT_COOKIE = "jwt";
    private static final boolean COOKIE_SECURE = false;
    private static final String COOKIE_PATH = "/";
    private static final String COOKIE_DOMAIN = "localhost";
    private static final String COOKIE_SAME_SITE = "Lax";
    private static final int COOKIE_MAX_AGE = 60 * 60 * 24 * 2;

    /**
     * Construit le cookie {@code jwt} avec des attributs IDENTIQUES pour la pose
     * et la suppression (BR-AUT-010 / A6). Sans cette identité (HttpOnly, Secure,
     * Path, Domain, SameSite), le navigateur ne matche pas le cookie à effacer.
     *
     * @param value   valeur du token (vide pour suppression)
     * @param maxAge  durée de vie en secondes ; 0 pour supprimer
     */
    private Cookie buildJwtCookie(String value, int maxAge) {
        Cookie jwtCookie = new Cookie(JWT_COOKIE, value);
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(COOKIE_SECURE);
        jwtCookie.setPath(COOKIE_PATH);
        jwtCookie.setDomain(COOKIE_DOMAIN);
        jwtCookie.setMaxAge(maxAge);
        jwtCookie.setAttribute("SameSite", COOKIE_SAME_SITE);
        return jwtCookie;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest authRequest, HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword()));
                    
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwtToken = jwtService.generateToken(authentication);

            response.addCookie(buildJwtCookie(jwtToken, COOKIE_MAX_AGE));
            // BR-AUT-007 / anti-pattern A3 : le JWT est transmis UNIQUEMENT via le
            // cookie HttpOnly. Ne jamais renvoyer le token brut dans le body, sinon
            // un script XSS pourrait le lire et annuler le bénéfice du HttpOnly.
            return ResponseEntity.ok(java.util.Map.of("message", "Authentification réussie"));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Authentication failed");
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
    public ResponseEntity<?> logout(HttpServletResponse response) {
        try {
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
                                         HttpServletResponse response) {
        try {
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: No token provided");
            }

            String username = jwtService.extractUsername(token);
            Optional<User> user = userService.findDomainUserByUsername(username);

            if (user.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
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

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

            String newToken = jwtService.generateToken(authentication);

            response.addCookie(buildJwtCookie(newToken, COOKIE_MAX_AGE));
            return ResponseEntity.ok().body("Token refreshed successfully");
        } catch (JwtException e) {
            // BR-AUT-009 : token expiré (ExpiredJwtException) ou signature/format
            // invalide (SignatureException, MalformedJwtException...) levé par
            // extractUsername -> 401, jamais de ré-émission ni de 500.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "token expiré ou invalide"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred");
        }
    }
}