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
class RateLimitingAndHeadersIntegrationTest {

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

    private MvcResult login(String ip) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", ip)
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
                        .header("X-Forwarded-For", ip)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
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
                            .header("X-Forwarded-For", ip))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "logout must never be rate-limited (request #" + i + ")");
        }
    }

    /** (b) Standard security headers are present on an API response. */
    @Test
    void securityHeaders_arePresentOnResponse() throws Exception {
        mockMvc.perform(get("/api/events/00000000-0000-0000-0000-000000000000"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().exists("Strict-Transport-Security"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'"));
    }
}
