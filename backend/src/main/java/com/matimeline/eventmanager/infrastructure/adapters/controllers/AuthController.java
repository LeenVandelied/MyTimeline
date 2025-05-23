package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest, HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword()));
                    
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwtToken = jwtService.generateToken(authentication);
    
            Cookie jwtCookie = new Cookie("jwt", jwtToken);
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false);
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(60 * 60 * 24 * 2);
            jwtCookie.setDomain("localhost");
            jwtCookie.setAttribute("SameSite", "Lax");
    
            response.addCookie(jwtCookie);
            return ResponseEntity.ok().body(jwtToken);
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e);
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

            return ResponseEntity.ok(user.get());
        } catch (ExpiredJwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Token expired");
        } catch (MalformedJwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Invalid token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
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
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred during registration");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        try {
            Cookie jwtCookie = new Cookie("jwt", "");
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(true);
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(0);
    
            response.addCookie(jwtCookie);
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
                
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
                
            String newToken = jwtService.generateToken(authentication);

            Cookie jwtCookie = new Cookie("jwt", newToken);
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false);
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(60 * 60 * 24 * 2);
            jwtCookie.setDomain("localhost");
            jwtCookie.setAttribute("SameSite", "Lax");

            response.addCookie(jwtCookie);
            return ResponseEntity.ok().body("Token refreshed successfully");
        } catch (ExpiredJwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Token expired");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred");
        }
    }
}