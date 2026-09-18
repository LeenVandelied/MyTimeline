package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Tests d'intégration des endpoints mot de passe oublié (#49), incluant le test
 * absorbé de #103 (BR-AUT-011) : les deux endpoints sont accessibles SANS token
 * (sous /api/auth/**, permitAll + bypass JwtFilter). Passe par la vraie chaîne
 * Spring Security (@AutoConfigureMockMvc applique springSecurity).
 *
 * <p>BR-AUT-012 (anti-énumération) : forgot-password répond 200 même pour un email
 * inconnu. Pas de Brevo réel : BREVO_API_KEY absente en test -> BrevoEmailService
 * no-op (warning), le flux n'échoue pas.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PasswordResetEndpointsIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * #103/BR-AUT-011 + BR-AUT-012 : forgot-password accessible sans token et répond
     * 200 pour un email inconnu (anti-énumération). Email aléatoire => jamais en base.
     */
    @Test
    void forgotPassword_unknownEmail_noToken_returns200() throws Exception {
        String body = "{\"email\":\"" + UUID.randomUUID() + "@example.com\"}";

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    /**
     * Corps malformé (email absent) -> 400 via @Valid, PAS 200. Confirme que la
     * validation reste active sur le DTO.
     */
    @Test
    void forgotPassword_missingEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    /**
     * #103/BR-AUT-011 : reset-password accessible sans token. Token inexistant
     * (UUID aléatoire jamais émis) -> 400. #290 : corps structuré
     * {error:"bad_request", message:"invalid or expired token"}.
     */
    @Test
    void resetPassword_unknownToken_noAuth_returns400() throws Exception {
        String body = "{\"token\":\"" + UUID.randomUUID() + "\",\"newPassword\":\"NewSecret1\"}";

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                // #290 : `error`=code stable, message générique anti-énumération en `message`.
                .andExpect(jsonPath("$.error").value("bad_request"))
                .andExpect(jsonPath("$.message").value("invalid or expired token"));
    }

    /**
     * reset-password avec token mal formé (non-UUID) -> 400 (générique, pas de 500).
     */
    @Test
    void resetPassword_malformedToken_returns400() throws Exception {
        String body = "{\"token\":\"not-a-uuid\",\"newPassword\":\"NewSecret1\"}";

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    /**
     * reset-password avec newPassword hors politique (<8 caractères) -> 400 via @Valid (BR-AUT-003).
     */
    @Test
    void resetPassword_shortPassword_returns400() throws Exception {
        String body = "{\"token\":\"" + UUID.randomUUID() + "\",\"newPassword\":\"123\"}";

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
