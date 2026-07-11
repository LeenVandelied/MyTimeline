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

import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.CustomUserDetailsService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Issue #129 — filet de régression sur le FICHIER {@code application-prod.properties}
 * pour l'attribut {@code Secure} du cookie JWT (miroir prod de
 * {@link AuthControllerDevProfileCookieTest}).
 *
 * <p>Objectif : verrouiller le fait qu'en production {@code app.cookie.secure=true}
 * est bien défini DANS le fichier {@code application-prod.properties} (#99 /
 * BR-AUT-007). Les tests de comportement existants injectent des valeurs cookie
 * EN DUR ; aucun ne charge le vrai fichier prod. Résultat : si quelqu'un retire
 * {@code app.cookie.secure=true} du fichier (ou supprime le fichier), un cookie
 * de session serait posé SANS {@code Secure} en HTTPS prod — faille silencieuse.
 * Ce test CASSE dans ce cas car l'assertion cible la valeur RÉSOLUE depuis le
 * fichier via {@link TestPropertySource}, pas une constante littérale.
 *
 * <p>Mécanisme : contexte volontairement MINIMAL — seul {@link AuthController} +
 * ses collaborateurs mockés — pour que les fields {@code @Value("${app.cookie.*}")}
 * soient résolus par Spring SANS démarrer Postgres / Flyway / le secret JWT.
 * {@code application-prod.properties} référence {@code ${DB_PASSWORD}},
 * {@code ${JWT_SECRET}}, {@code ${CORS_ALLOWED_ORIGINS}}, {@code ${STORAGE_AVATAR_PATH}}
 * SANS default : un {@code @SpringBootTest} + {@code @ActiveProfiles("prod")} complet
 * exigerait Testcontainers + toutes ces env. Ici, ces placeholders ne sont jamais
 * injectés (aucun bean ne les consomme), donc le contexte boote sans eux — seuls
 * {@code app.cookie.secure} (littéral {@code true}) et {@code app.cookie.domain}
 * ({@code ${COOKIE_DOMAIN:}} → défaut vide) sont résolus.
 */
@SpringJUnitWebConfig(AuthControllerProdProfileCookieTest.MinimalConfig.class)
@TestPropertySource("classpath:application-prod.properties")
class AuthControllerProdProfileCookieTest {

    /**
     * Contexte minimal : enregistre {@link AuthController} comme bean (pour que
     * Spring injecte les {@code @Value} du profil prod) avec des collaborateurs
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
        UserService userService() {
            return mock(UserService.class);
        }

        @Bean
        PasswordEncoder passwordEncoder() {
            return mock(PasswordEncoder.class);
        }

        @Bean
        com.matimeline.eventmanager.domain.ports.services.PasswordResetService passwordResetService() {
            return mock(com.matimeline.eventmanager.domain.ports.services.PasswordResetService.class);
        }

        @Bean
        com.matimeline.eventmanager.domain.ports.services.SessionService sessionService() {
            return mock(com.matimeline.eventmanager.domain.ports.services.SessionService.class);
        }

        @Bean
        AuthController authController(
                AuthenticationManager authenticationManager,
                JwtService jwtService,
                CustomUserDetailsService customUserDetailsService,
                UserService userService,
                PasswordEncoder passwordEncoder,
                com.matimeline.eventmanager.domain.ports.services.PasswordResetService passwordResetService,
                com.matimeline.eventmanager.domain.ports.services.SessionService sessionService) {
            return new AuthController(
                    authenticationManager, jwtService, customUserDetailsService, userService, passwordEncoder,
                    passwordResetService, sessionService);
        }
    }

    @Autowired
    private AuthController authController;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuthenticationManager authenticationManager;

    /**
     * En profil prod, le cookie {@code jwt} posé au login doit avoir
     * {@code Secure=true} (HTTPS obligatoire). La valeur provient du fichier
     * {@code application-prod.properties} chargé via {@link TestPropertySource} :
     * retirer {@code app.cookie.secure=true} du fichier fait échouer ce test.
     */
    @Test
    void login_inProdProfile_setsCookieSecureTrue() throws Exception {
        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(jwtService.generateToken(any(Authentication.class))).thenReturn("prod-token");

        // standaloneSetup sur le bean AuthController résolu par Spring : les
        // @Value du profil prod sont déjà injectés dans cette instance.
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(authController).build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"secret6\"}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("jwt"))
                // app.cookie.secure=true (application-prod.properties #99) — filet
                // de régression : casse si Secure est retiré du fichier prod.
                .andExpect(cookie().secure("jwt", true));
    }
}
