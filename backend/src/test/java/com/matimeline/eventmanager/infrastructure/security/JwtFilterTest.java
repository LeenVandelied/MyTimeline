package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;

import io.jsonwebtoken.MalformedJwtException;

import jakarta.servlet.http.Cookie;

import com.matimeline.eventmanager.domain.ports.services.SessionService;

/**
 * FU2 (S57) — la garde posée dans {@link JwtService#extractUsername} (jeton vide/blanc ->
 * {@link MalformedJwtException} au lieu d'une {@code IllegalArgumentException} brute de jjwt)
 * est partagée par {@link JwtFilter}. Ce test ancre que le chemin non-{@code /api/auth} reste
 * NON authentifié et n'explose pas quand le cookie {@code jwt} est présent mais vide — cas
 * qui, avant la garde, remontait à {@code catch (Exception)} (log error, mais requête non
 * bloquante : {@code chain.doFilter} est déjà appelé dans tous les cas par {@link JwtFilter}).
 *
 * <p>{@link JwtService} est MOCKÉ ici (comme dans {@code AuthControllerSecurityTest}) : on
 * simule le comportement RÉEL de {@link JwtService#extractUsername} pour un jeton vide,
 * vérifié séparément par {@code JwtServiceRs256Test#extractUsername_withEmptyToken_*}.
 */
class JwtFilterTest {

    private JwtService jwtService;
    private UserDetailsService userDetailsService;
    private SessionService sessionService;
    private JwtFilter filter;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        userDetailsService = mock(UserDetailsService.class);
        sessionService = mock(SessionService.class);
        filter = new JwtFilter(jwtService, userDetailsService, sessionService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_withEmptyJwtCookie_staysUnauthenticated_andDoesNotThrow() throws Exception {
        when(jwtService.extractUsername(""))
                .thenThrow(new MalformedJwtException("Jeton JWT absent ou blanc."));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/events");
        request.setCookies(new Cookie("jwt", ""));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        assertThatCode(() -> filter.doFilter(request, response, chain))
                .as("un cookie jwt vide ne doit jamais faire exploser le filtre (500)")
                .doesNotThrowAnyException();

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        // La chaîne continue toujours (comportement JwtFilter existant : anonyme -> 401 plus
        // loin via SecurityConfig, pas d'interruption ici) et aucun user n'est chargé.
        verify(userDetailsService, never()).loadUserByUsername(anyString());
        verify(sessionService, never()).isSessionActive(anyString());
    }
}
