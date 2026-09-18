package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.SessionService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Slice contrôleur (standaloneSetup, Spring Security bypassé) : prouve que le jti COURANT
 * transmis à {@link SessionService#revokeOtherSessions} est résolu depuis le cookie {@code jwt}
 * PUIS, à défaut, le header {@code Authorization: Bearer} — comme {@code JwtFilter} (BR-AUT-011).
 *
 * <p>FIX review PR #238 : en mode Bearer-only (aucun cookie), le contrôleur lisait le token du
 * cookie SEUL -> {@code token=null} -> {@code currentJti=null} -> {@code revokeOtherSessions}
 * dégénérait en revoke-all et révoquait la session de l'appel elle-même (self-DoS). Le test
 * Bearer garantit un jti NON null transmis au service ; le test cookie reste vert (non-régression).
 */
@ExtendWith(MockitoExtension.class)
class SessionControllerTest {

    @Mock
    private SessionService sessionService;
    @Mock
    private CallerResolver callerResolver;
    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;
    private UUID callerId;

    @BeforeEach
    void setUp() {
        SessionController controller = new SessionController(sessionService, callerResolver, jwtService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        callerId = UUID.randomUUID();
    }

    private User caller() {
        return new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
    }

    /**
     * Cœur du fix : requête Bearer-only (header Authorization, AUCUN cookie). Le jti courant doit
     * être résolu depuis le Bearer et transmis NON null à revokeOtherSessions -> la session de
     * l'appel N'est PAS révoquée (anti self-DoS).
     */
    @Test
    void revokeOtherSessions_bearerOnly_resolvesCurrentJti_notNull() throws Exception {
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller()));
        when(jwtService.extractJti("bearer-token")).thenReturn("jti-current");

        mockMvc.perform(delete("/api/sessions/others")
                        .header("Authorization", "Bearer bearer-token"))
                .andExpect(status().isNoContent());

        // jti NON null (== "jti-current") : la session courante est préservée (pas de revoke-all).
        verify(sessionService).revokeOtherSessions(eq(callerId), eq("jti-current"));
    }

    /** Non-régression : mode cookie (aucun header Bearer) résout toujours le jti du cookie. */
    @Test
    void revokeOtherSessions_cookieMode_resolvesCurrentJtiFromCookie() throws Exception {
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller()));
        when(jwtService.extractJti("cookie-token")).thenReturn("jti-cookie");

        mockMvc.perform(delete("/api/sessions/others")
                        .cookie(new Cookie("jwt", "cookie-token")))
                .andExpect(status().isNoContent());

        verify(sessionService).revokeOtherSessions(eq(callerId), eq("jti-cookie"));
    }

    /** Le cookie PRIME sur le Bearer (même ordre de priorité que JwtFilter). */
    @Test
    void revokeOtherSessions_cookieAndBearer_cookieWins() throws Exception {
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller()));
        when(jwtService.extractJti("cookie-token")).thenReturn("jti-cookie");

        mockMvc.perform(delete("/api/sessions/others")
                        .cookie(new Cookie("jwt", "cookie-token"))
                        .header("Authorization", "Bearer bearer-token"))
                .andExpect(status().isNoContent());

        verify(sessionService).revokeOtherSessions(eq(callerId), eq("jti-cookie"));
    }

    /** BR-AUT-005 : caller non authentifié -> 401, service jamais appelé. */
    @Test
    void revokeOtherSessions_unauthenticated_returns401() throws Exception {
        when(callerResolver.currentUser()).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/sessions/others")
                        .header("Authorization", "Bearer bearer-token"))
                .andExpect(status().isUnauthorized());

        org.mockito.Mockito.verifyNoInteractions(sessionService);
    }
}
