package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.PasswordResetService;
import com.matimeline.eventmanager.domain.ports.services.SessionService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Issue #125 : contrat d'erreur JSON uniforme sur AuthController (/me, /register,
 * /logout). Toute réponse — erreur comme succès — doit être un corps JSON
 * ({@code {"error":...}} ou {@code {"message":...}}), Content-Type
 * application/json, jamais du texte brut (le frontend n'a plus à gérer deux
 * formats selon l'endpoint). Le format {@code {"error":...}} est celui posé par
 * #116 (/login) et SecurityConfig.writeJsonError.
 *
 * <p>standaloneSetup + mocks Mockito : on teste les corps produits DIRECTEMENT
 * par le contrôleur (branches d'erreur métier propres à AuthController), pas les
 * 401/403 de la chaîne Spring Security (couverts par
 * AuthErrorContractIntegrationTest).
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerErrorContractTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtService jwtService;
    @Mock
    private CustomUserDetailsService userDetailsService;
    @Mock
    private UserService userService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private PasswordResetService passwordResetService;
    @Mock
    private SessionService sessionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(
                authenticationManager, jwtService, userDetailsService, userService, passwordEncoder,
                passwordResetService, sessionService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    // ----- /me -----

    @Test
    void me_withoutToken_returns401JsonError() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("Unauthorized: No token provided"));
    }

    @Test
    void me_unknownUser_returns404JsonError() throws Exception {
        when(jwtService.extractUsername(anyString())).thenReturn("ghost");
        when(userService.findDomainUserByUsername("ghost")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/me").cookie(new Cookie("jwt", "dummy-token")))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("User not found"));
    }

    // ----- /register -----

    @Test
    void register_userAlreadyExists_returns409JsonError() throws Exception {
        User existing = new User(UUID.randomUUID(), "Alice Martin", "alice",
                "hash", "ROLE_USER", "alice@example.com");
        when(userService.findDomainUserByUsername("alice")).thenReturn(Optional.of(existing));

        String body = "{\"name\":\"Alice Martin\",\"username\":\"alice\","
                + "\"email\":\"alice@example.com\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("User already exists"));
    }

    @Test
    void register_success_returns201JsonMessage() throws Exception {
        when(userService.findDomainUserByUsername("bob")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");

        String body = "{\"name\":\"Bob Martin\",\"username\":\"bob\","
                + "\"email\":\"bob@example.com\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("User registered successfully"));
    }

    // ----- /logout -----

    @Test
    void logout_success_returns200JsonMessage() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Logged out successfully"));
    }
}
