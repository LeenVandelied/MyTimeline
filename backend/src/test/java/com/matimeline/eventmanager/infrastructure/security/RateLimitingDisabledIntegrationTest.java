package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Contract for the CI/e2e escape hatch: with {@code app.rate-limit.enabled=false}
 * the {@link RateLimitingFilter} bypasses entirely — even a burst of logins from a
 * single IP well past the normal threshold (login limit = 10) never returns 429.
 *
 * <p>The DEFAULT (true) behaviour is covered by
 * {@link RateLimitingAndHeadersIntegrationTest}; this class only asserts the disabled
 * path so the security invariant "default stays ON" is not the thing being weakened.
 * The flag is set via {@link TestPropertySource}, giving this test its own Spring
 * context distinct from the always-on suite.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.rate-limit.enabled=false")
class RateLimitingDisabledIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String LOGIN_BODY = "{\"username\":\"someuser\",\"password\":\"somepass\"}";

    /** Well past the login limit (10/min) from one IP, yet no request is throttled. */
    @Test
    void disabled_burstFromSingleIp_neverReturns429() throws Exception {
        String ip = "10.9.9.9";
        for (int i = 1; i <= 25; i++) {
            int sc = mockMvc.perform(post("/api/auth/login")
                            .with(req -> { req.setRemoteAddr(ip); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(LOGIN_BODY))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "rate limit disabled: request #" + i + " must never be throttled");
        }
    }
}
