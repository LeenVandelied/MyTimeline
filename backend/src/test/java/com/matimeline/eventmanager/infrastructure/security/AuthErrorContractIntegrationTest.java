package com.matimeline.eventmanager.infrastructure.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Integration contract for issue #51: 401 vs 403 must be distinguished by the
 * real Spring Security filter chain, never collapse to 403-for-anonymous nor
 * leak a 500 / stack trace. Runs through the full chain (springSecurity applied
 * by @AutoConfigureMockMvc) so the authenticationEntryPoint / accessDeniedHandler
 * configured in SecurityConfig actually fire.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthErrorContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * Anonymous caller (no jwt cookie, no Bearer header) on a protected endpoint.
     * Expect 401 with the literal {"error":"unauthorized"} produced by the
     * authenticationEntryPoint — NOT the Spring default 403, NOT a 500.
     */
    @Test
    void protectedEndpoint_withoutToken_returns401UnauthorizedJson() throws Exception {
        mockMvc.perform(get("/api/events/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    /**
     * Authenticated caller whose granted authority is not ROLE_USER -> the
     * authorizeHttpRequests hasAuthority("ROLE_USER") rule denies access, the
     * accessDeniedHandler fires. Expect 403 {"error":"forbidden"}, never 500.
     */
    @Test
    @WithMockUser(username = "intruder", authorities = {"ROLE_NONE"})
    void protectedEndpoint_authenticatedWithoutRequiredAuthority_returns403ForbiddenJson() throws Exception {
        mockMvc.perform(get("/api/events/" + UUID.randomUUID()))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("forbidden"));
    }

    /**
     * Garbage Bearer token must not blow up the JwtFilter into a 500: the filter
     * logs and continues, leaving the context anonymous, so the entryPoint maps
     * it to a clean 401 without serializing the exception object.
     */
    @Test
    void protectedEndpoint_withInvalidToken_returns401NotServerError() throws Exception {
        mockMvc.perform(get("/api/events/" + UUID.randomUUID())
                        .header("Authorization", "Bearer not-a-real-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }
}
