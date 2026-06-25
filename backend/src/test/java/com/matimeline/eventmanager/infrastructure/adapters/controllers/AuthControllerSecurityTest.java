package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetails;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Issue #32 — couverture sécurité :
 * - BR-AUT-008 : /me ne sérialise jamais le hash du mot de passe.
 * - BR-AUT-001 : doublon username/email à l'inscription -> 409 propre.
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerSecurityTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtService jwtService;
    @Mock
    private CustomUserDetailsService userDetailsService;
    @Mock
    private UserServiceImpl userService;
    @Mock
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(
                authenticationManager, jwtService, userDetailsService, userService, passwordEncoder);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    private User sampleUser() {
        return new User(
                UUID.randomUUID(),
                "Alice",
                "alice",
                "$2a$10$bcryptHashThatMustNeverLeak",
                "ROLE_USER",
                "alice@example.com");
    }

    @Test
    void me_doesNotExposePasswordHash() throws Exception {
        User user = sampleUser();
        when(jwtService.extractUsername("valid-token")).thenReturn("alice");
        when(userService.findDomainUserByUsername("alice")).thenReturn(Optional.of(user));
        when(jwtService.validateToken(anyString(), any(CustomUserDetails.class))).thenReturn(true);

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "valid-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    void register_duplicateUsername_returns409() throws Exception {
        when(userService.findDomainUserByUsername(anyString())).thenReturn(Optional.empty());
        when(userService.createUser(any(User.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "could not execute statement; constraint [users.username]"));

        String body = "{\"name\":\"validName\",\"username\":\"validUser\","
                + "\"email\":\"valid@example.com\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("username already taken"));
    }

    @Test
    void register_duplicateEmail_returns409() throws Exception {
        when(userService.findDomainUserByUsername(anyString())).thenReturn(Optional.empty());
        when(userService.createUser(any(User.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "could not execute statement; constraint [users.email]"));

        String body = "{\"name\":\"validName\",\"username\":\"validUser\","
                + "\"email\":\"dupe@example.com\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("email already taken"));
    }
}
