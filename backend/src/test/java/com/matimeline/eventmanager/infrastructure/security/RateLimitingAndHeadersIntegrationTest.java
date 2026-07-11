package com.matimeline.eventmanager.infrastructure.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import io.github.bucket4j.TimeMeter;

/**
 * Integration contract for issue #33: per-IP rate limiting on the sensitive auth
 * POST endpoints + standard security headers. Runs through the real Spring
 * Security filter chain (@AutoConfigureMockMvc applies springSecurity), so the
 * RateLimitingFilter and the .headers(...) config in SecurityConfig actually fire.
 *
 * <p>The rate-limit window is exercised deterministically: a test-only
 * {@link ControllableTimeMeter} overrides the production TimeMeter bean so the
 * minute window can be advanced in-memory, never via Thread.sleep.
 */
@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@AutoConfigureMockMvc
class RateLimitingAndHeadersIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ControllableTimeMeter clock;

    private static final String LOGIN_BODY = "{\"username\":\"someuser\",\"password\":\"somepass\"}";

    /**
     * Overrides the SecurityConfig rateLimitTimeMeter bean with a meter whose
     * "now" is fully controlled by the test, so a window reset is observable
     * without sleeping a real minute.
     */
    @TestConfiguration
    static class ClockConfig {
        @Bean
        ControllableTimeMeter rateLimitTimeMeter() {
            return new ControllableTimeMeter();
        }
    }

    static class ControllableTimeMeter implements TimeMeter {
        private final AtomicLong nanos = new AtomicLong(0);

        @Override
        public long currentTimeNanos() {
            return nanos.get();
        }

        @Override
        public boolean isWallClockBased() {
            return false;
        }

        void advance(Duration d) {
            nanos.addAndGet(d.toNanos());
        }
    }

    /**
     * Issues a login keyed on a socket {@code remoteAddr} (the real rate-limit key
     * since XFF is ignored by default — see {@code app.rate-limit.trust-forwarded-header}).
     * Each test uses a distinct socket IP so the shared singleton buckets never collide
     * across test methods within the same Spring context.
     */
    private MvcResult login(String socketIp) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(socketIp); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andReturn();
    }

    /** (c) Under the threshold (login limit = 10), no request is rate-limited. */
    @Test
    void login_underThreshold_neverReturns429() throws Exception {
        String ip = "10.0.0.1";
        for (int i = 1; i <= 10; i++) {
            int sc = login(ip).getResponse().getStatus();
            assertNotEquals(429, sc, "request #" + i + " must not be throttled under the limit");
        }
    }

    /** (a) The 11th login within one minute from the same IP -> 429 + clean JSON. */
    @Test
    void login_eleventhWithinWindow_returns429JsonNoStackTrace() throws Exception {
        String ip = "10.0.0.2";
        for (int i = 1; i <= 10; i++) {
            login(ip);
        }
        mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("too_many_requests"));
    }

    /**
     * Regression for the post-review MAJOR: X-Forwarded-For is NOT trusted by default
     * (app.rate-limit.trust-forwarded-header=false). An attacker rotating XFF on every
     * request from the same socket must NOT escape throttling — all 10 land in the same
     * bucket (keyed on remoteAddr), so the 11th is 429 despite a fresh XFF each time.
     */
    @Test
    void login_spoofedForwardedHeader_doesNotBypassRateLimit() throws Exception {
        String socketIp = "10.0.0.9";
        for (int i = 1; i <= 10; i++) {
            int spoof = i; // distinct XFF per request
            int sc = mockMvc.perform(post("/api/auth/login")
                            .with(req -> { req.setRemoteAddr(socketIp); return req; })
                            .header("X-Forwarded-For", "203.0.113." + spoof)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(LOGIN_BODY))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "spoofed XFF must not grant extra quota (request #" + i + ")");
        }
        // 11th request, yet another fresh XFF, same socket -> throttled.
        mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(socketIp); return req; })
                        .header("X-Forwarded-For", "203.0.113.250")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().is(429))
                .andExpect(jsonPath("$.error").value("too_many_requests"));
    }

    /** The window resets: after advancing past one minute the same IP is allowed again. */
    @Test
    void login_afterWindowAdvance_isAllowedAgain() throws Exception {
        String ip = "10.0.0.3";
        for (int i = 1; i <= 10; i++) {
            login(ip);
        }
        // Bucket now empty -> next call is 429.
        assertEquals(429, login(ip).getResponse().getStatus());

        // Advance just past the one-minute window: the full quota is restored.
        clock.advance(Duration.ofSeconds(61));

        assertNotEquals(429, login(ip).getResponse().getStatus(),
                "after the window elapses the IP must be allowed again");
    }

    /**
     * Non-throttled auth POST (logout is not in the limited set) is never 429,
     * even well past any threshold — only login/register/refresh are limited.
     */
    @Test
    void logout_isNotRateLimited() throws Exception {
        String ip = "10.0.0.4";
        for (int i = 1; i <= 30; i++) {
            int sc = mockMvc.perform(post("/api/auth/logout")
                            .with(req -> { req.setRemoteAddr(ip); return req; }))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "logout must never be rate-limited (request #" + i + ")");
        }
    }

    /**
     * Non-régression #58 (MAJEUR post-audit) : la soumission de job d'export
     * (POST /api/export) est une opération lourde (pool async borné + écriture fichier).
     * Elle DOIT être throttlée (limite 5/min/IP). Le RateLimitingFilter est placé avant
     * l'AuthorizationFilter (addFilterBefore UsernamePasswordAuthenticationFilter), donc le
     * 429 court-circuite même sans JWT valide : les 5 premières passent (rejetées plus loin
     * par l'authz), la 6e depuis la même IP est throttlée. Les GET (téléchargement / statut /
     * json|markdown) ne passent PAS par ce throttle — c'est attendu, hors périmètre du MAJEUR.
     */
    @Test
    void exportSubmission_sixthWithinWindow_returns429() throws Exception {
        String ip = "10.0.0.58";
        for (int i = 1; i <= 5; i++) {
            int sc = mockMvc.perform(post("/api/export")
                            .with(req -> { req.setRemoteAddr(ip); return req; }))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "soumission #" + i + " sous la limite ne doit pas être throttlée");
        }
        mockMvc.perform(post("/api/export")
                        .with(req -> { req.setRemoteAddr(ip); return req; }))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("too_many_requests"));
    }

    /**
     * The hardened CSP (#101): explicit per-resource directives, no permissive
     * default-src catch-all granting scripts/styles. Asserted as the exact policy
     * string so any accidental loosening (e.g. re-adding 'unsafe-inline') fails CI.
     */
    private static final String EXPECTED_CSP =
            "default-src 'self'; "
            + "script-src 'self'; "
            + "style-src 'self'; "
            + "connect-src 'self'; "
            + "img-src 'self' data:; "
            + "font-src 'self'; "
            + "base-uri 'self'; "
            + "object-src 'none'; "
            + "frame-ancestors 'none'";

    /** (b) Standard security headers are present on an API response. */
    @Test
    void securityHeaders_arePresentOnResponse() throws Exception {
        mockMvc.perform(get("/api/events/00000000-0000-0000-0000-000000000000"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().exists("Strict-Transport-Security"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP));
    }

    /**
     * Issue #101 contract: the hardened CSP header is present on PUBLIC (unauthenticated)
     * endpoints too — the security filter chain writes headers before authn, so an
     * anonymous hit on the permitAll /api/auth/** path must still carry the strict CSP.
     */
    @Test
    void hardenedCsp_isPresentOnPublicEndpoint() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr("10.0.0.101"); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
                .andExpect(header().string("Content-Security-Policy",
                        org.hamcrest.Matchers.containsString("frame-ancestors 'none'")));
    }
}
