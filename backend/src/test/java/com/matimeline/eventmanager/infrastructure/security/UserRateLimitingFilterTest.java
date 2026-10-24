package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.matimeline.eventmanager.domain.models.User;

import io.github.bucket4j.TimeMeter;

/**
 * #831 (revue S112, reviewer backend MINEUR 1) — sort du principal authentifié que
 * {@link UserRateLimitingFilter} ne sait pas rattacher à un id de compte.
 *
 * <p>L'ancien repli {@code "name:" + getName()} est supprimé : dans cette chaîne, seul
 * {@code JwtFilter} authentifie, toujours avec un {@link CustomUserDetails} chargé en base.
 * Tout autre principal authentifié est REFUSÉ (fail-closed, 401 identique à l'entry point)
 * plutôt que laissé passer hors plafond. Test unitaire : ce cas est inatteignable par la chaîne
 * réelle, il ne peut être fabriqué qu'en posant le contexte à la main.
 */
class UserRateLimitingFilterTest {

    private static final String PATH = "/api/me/preferences";

    private final UserRateLimitingFilter filter =
            new UserRateLimitingFilter(TimeMeter.SYSTEM_MILLISECONDS, true);

    @BeforeEach
    void clearBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearAfter() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticate(Authentication authentication) {
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private static Authentication customUser(UUID id) {
        User user = new User(id, "Alice", "alice", "hash", "ROLE_USER", "alice@example.test");
        CustomUserDetails details = new CustomUserDetails(user, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
    }

    /** Principal authentifié qui n'est PAS un {@link CustomUserDetails} (ex. {@code @WithMockUser}, httpBasic). */
    private static Authentication foreignPrincipal() {
        var springUser = org.springframework.security.core.userdetails.User
                .withUsername("alice").password("x").authorities("ROLE_USER").build();
        return new UsernamePasswordAuthenticationToken(springUser, null, springUser.getAuthorities());
    }

    private record Outcome(MockHttpServletResponse response, boolean reachedChain) { }

    private Outcome run(UserRateLimitingFilter target, String method, String path) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        target.doFilter(new MockHttpServletRequest(method, path), response, chain);
        return new Outcome(response, chain.getRequest() != null);
    }

    @Test
    void foreignAuthenticatedPrincipal_onThrottledRoute_isRefused401_neverPassedThrough() throws Exception {
        authenticate(foreignPrincipal());

        Outcome out = run(filter, "PUT", PATH);

        assertEquals(401, out.response().getStatus());
        assertEquals("{\"error\":\"unauthorized\"}", out.response().getContentAsString());
        assertFalse(out.reachedChain(), "fail-closed : la requête ne doit pas atteindre le contrôleur");
    }

    @Test
    void customUserDetailsWithoutId_isRefused401() throws Exception {
        authenticate(customUser(null));

        Outcome out = run(filter, "PUT", PATH);

        assertEquals(401, out.response().getStatus());
        assertFalse(out.reachedChain());
    }

    @Test
    void customUserDetailsWithId_isCounted_upToTheCeiling() throws Exception {
        authenticate(customUser(UUID.randomUUID()));

        for (int i = 1; i <= UserRateLimitingFilter.DEFAULT_PREFERENCES_PER_MINUTE; i++) {
            Outcome ok = run(filter, "PUT", PATH);
            assertTrue(ok.reachedChain(), "PUT #" + i + " sous le plafond");
        }
        Outcome over = run(filter, "PUT", PATH);
        assertEquals(429, over.response().getStatus());
        assertFalse(over.reachedChain());
    }

    @Test
    void anonymous_passesThrough_forTheAuthorizationFilterToAnswer401() throws Exception {
        authenticate(new AnonymousAuthenticationToken("key", "anonymousUser",
                AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

        Outcome out = run(filter, "PUT", PATH);

        assertTrue(out.reachedChain());
        assertEquals(200, out.response().getStatus());
    }

    @Test
    void noAuthentication_passesThrough() throws Exception {
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        assertTrue(run(filter, "PUT", PATH).reachedChain());
    }

    @Test
    void foreignPrincipal_onNonThrottledRoute_isNotTouched() throws Exception {
        authenticate(foreignPrincipal());

        assertTrue(run(filter, "GET", PATH).reachedChain(), "GET n'est pas plafonné");
        assertTrue(run(filter, "PATCH", "/api/me").reachedChain(), "autre route non plafonnée");
    }

    @Test
    void masterSwitchOff_foreignPrincipal_isNotTouched() throws Exception {
        authenticate(foreignPrincipal());
        UserRateLimitingFilter disabled = new UserRateLimitingFilter(TimeMeter.SYSTEM_MILLISECONDS, false);

        Outcome out = run(disabled, "PUT", PATH);

        assertNotNull(out.response());
        assertTrue(out.reachedChain(), "app.rate-limit.enabled=false : filtre inerte");
    }
}
