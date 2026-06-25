package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Issue #117 — couverture du profil Spring {@code dev} pour les attributs du
 * cookie JWT (suite triage clôture PR #113, follow-up S4).
 *
 * <p>Objectif : verrouiller le comportement attendu en environnement de
 * développement local (HTTP, localhost), où {@code application-dev.properties}
 * impose {@code app.cookie.secure=false} et {@code app.cookie.domain=localhost}.
 * Sans ce test, une régression sur la config dev passerait inaperçue et
 * bloquerait les développeurs en local (cookie {@code Secure} non posable sur
 * HTTP, domaine non matché).
 *
 * <p>Mécanisme : on charge le VRAI fichier {@code application-dev.properties}
 * via {@link TestPropertySource} (et non des valeurs littérales) pour que le
 * test casse si quelqu'un modifie ce fichier. Le contexte est volontairement
 * minimal — seul {@link AuthController} + ses collaborateurs mockés sont
 * présents — afin que les fields {@code @Value("${app.cookie.*}")} soient bien
 * résolus par Spring, SANS démarrer la base Postgres / Flyway / le secret JWT
 * (contrairement à un {@code @SpringBootTest} complet qui exigerait le socle
 * Testcontainers du profil {@code test}).
 *
 * <p>Pendant prod : les valeurs prod (Secure=true, domaine défini) sont déjà
 * couvertes par {@link AuthControllerSecurityTest#jwtCookieAttributes_areCoherent_acrossLoginRefreshLogout}.
 */
@SpringJUnitWebConfig(AuthControllerDevProfileCookieTest.MinimalConfig.class)
@TestPropertySource("classpath:application-dev.properties")
class AuthControllerDevProfileCookieTest {

    /**
     * Contexte minimal : enregistre {@link AuthController} comme bean (pour que
     * Spring injecte les {@code @Value} du profil dev) avec des collaborateurs
     * mockés. Aucune auto-configuration Spring Boot, donc aucune datasource ni
     * Flyway au démarrage.
     */
    @Configuration
    static class MinimalConfig {

        @Bean
        AuthenticationManager authenticationManager() {
            return mock(AuthenticationManager.class);
        }

        @Bean
        JwtService jwtService() {
            return mock(JwtService.class);
        }

        @Bean
        CustomUserDetailsService customUserDetailsService() {
            return mock(CustomUserDetailsService.class);
        }

        @Bean
        UserServiceImpl userService() {
            return mock(UserServiceImpl.class);
        }

        @Bean
        PasswordEncoder passwordEncoder() {
            return mock(PasswordEncoder.class);
        }

        @Bean
        AuthController authController(
                AuthenticationManager authenticationManager,
                JwtService jwtService,
                CustomUserDetailsService customUserDetailsService,
                UserServiceImpl userService,
                PasswordEncoder passwordEncoder) {
            return new AuthController(
                    authenticationManager, jwtService, customUserDetailsService, userService, passwordEncoder);
        }
    }

    @Autowired
    private AuthController authController;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuthenticationManager authenticationManager;

    /**
     * En profil dev, le cookie {@code jwt} posé au login doit avoir
     * {@code Secure=false} (HTTP local autorisé) et {@code Domain=localhost}.
     */
    @Test
    void login_inDevProfile_setsCookieSecureFalse_andDomainLocalhost() throws Exception {
        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(jwtService.generateToken(any(Authentication.class))).thenReturn("dev-token");

        // standaloneSetup sur le bean AuthController résolu par Spring : les
        // @Value du profil dev sont déjà injectés dans cette instance.
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(authController).build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"secret6\"}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("jwt"))
                // app.cookie.secure=false (application-dev.properties #99)
                .andExpect(cookie().secure("jwt", false))
                // app.cookie.domain=localhost (application-dev.properties #99)
                .andExpect(cookie().domain("jwt", "localhost"));
    }
}
