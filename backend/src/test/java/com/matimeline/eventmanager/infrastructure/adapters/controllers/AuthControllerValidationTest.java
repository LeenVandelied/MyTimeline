package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Validates that @Valid on @RequestBody rejects malformed payloads with 400
 * before any business logic runs (issue #31). The controller body is never
 * reached, so collaborators need no stubbing.
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerValidationTest {

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
    @Mock
    private com.matimeline.eventmanager.domain.ports.services.PasswordResetService passwordResetService;
    @Mock
    private com.matimeline.eventmanager.domain.ports.services.SessionService sessionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(
                authenticationManager, jwtService, userDetailsService, userService, passwordEncoder,
                passwordResetService, sessionService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void register_invalidEmail_returns400() throws Exception {
        String body = "{\"name\":\"validName\",\"username\":\"validUser\","
                + "\"email\":\"not-an-email\",\"password\":\"secret6\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_blankPassword_returns400() throws Exception {
        String body = "{\"name\":\"validName\",\"username\":\"validUser\","
                + "\"email\":\"valid@example.com\",\"password\":\"\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_blankUsernameAndPassword_returns400() throws Exception {
        String body = "{\"username\":\"\",\"password\":\"\"}";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
