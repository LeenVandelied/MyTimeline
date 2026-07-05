package com.matimeline.eventmanager.infrastructure.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import io.github.bucket4j.TimeMeter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * In-memory, per-IP rate limiting for the sensitive auth POST endpoints
 * (brute-force / credential-stuffing mitigation — issue #33, BR-AUT-002 family).
 *
 * <p>Only the POST endpoints listed in {@link #PATH_LIMITS} are throttled; every
 * other request (including {@code GET /api/auth/me}, {@code POST /api/auth/logout},
 * and the whole rest of the API) passes through untouched. On overflow the filter
 * short-circuits with HTTP 429 and a minimal JSON body — no stack trace, no
 * internal detail.
 *
 * <p><b>Scope of the limit:</b> buckets live in a {@link ConcurrentHashMap} inside
 * this single JVM, keyed by {@code clientIp + "|" + path}. The limits are therefore
 * PER INSTANCE: behind a load balancer with N replicas the effective ceiling is
 * N x the configured rate. This is acceptable for the current single-instance
 * deployment; a distributed backend (Redis + bucket4j-redis) is required before
 * scaling out. There is also no eviction — one entry per distinct (IP, path) seen.
 * Acceptable for the bounded set of auth paths; revisit if the key space grows.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    /** Requests per minute per IP, per throttled POST path. */
    private static final Map<String, Integer> PATH_LIMITS = Map.of(
            "/api/auth/login", 10,
            "/api/auth/register", 5,
            "/api/auth/refresh", 20,
            // #49 : forgot-password est une cible d'abus (spam mail / énumération).
            // Throttle strict par IP, cohérent avec le slot reset-password (#33).
            "/api/auth/forgot-password", 5,
            "/api/auth/reset-password", 5
    );

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final TimeMeter timeMeter;

    /**
     * When {@code true}, the first hop of {@code X-Forwarded-For} is used as the
     * rate-limit key. Defaults to {@code false} and MUST stay false unless the
     * service runs behind a trusted reverse proxy that overwrites the header.
     */
    private final boolean trustForwardedHeader;

    /**
     * Master switch for the whole filter. Defaults to {@code true} (fail-safe): rate
     * limiting is always ON unless explicitly disabled via
     * {@code app.rate-limit.enabled=false}. The ONLY intended use of {@code false} is
     * the ephemeral CI/e2e job, whose Playwright setup provisions several accounts from
     * the single runner IP and would otherwise trip the per-IP throttle. Never disable
     * this in prod or any long-lived environment.
     */
    private final boolean rateLimitEnabled;

    /**
     * @param timeMeter            time source backing every bucket. Production wires the
     *                             real nanotime meter; tests inject a controllable one to
     *                             advance the window deterministically without {@code Thread.sleep}.
     * @param trustForwardedHeader opt-in trust of {@code X-Forwarded-For}
     *                             ({@code app.rate-limit.trust-forwarded-header}, default false).
     * @param rateLimitEnabled     master switch ({@code app.rate-limit.enabled}, default true).
     *                             {@code false} bypasses the filter entirely — CI/e2e only.
     */
    public RateLimitingFilter(
            TimeMeter timeMeter,
            @Value("${app.rate-limit.trust-forwarded-header:false}") boolean trustForwardedHeader,
            @Value("${app.rate-limit.enabled:true}") boolean rateLimitEnabled) {
        this.timeMeter = timeMeter;
        this.trustForwardedHeader = trustForwardedHeader;
        this.rateLimitEnabled = rateLimitEnabled;
        if (!rateLimitEnabled) {
            log.warn("rate limiting DISABLED (app.rate-limit.enabled=false) — CI/e2e only. "
                    + "Do NOT run this configuration in prod or any long-lived environment.");
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        if (!rateLimitEnabled) {
            chain.doFilter(request, response);
            return;
        }

        Integer limit = throttledLimitFor(request);
        if (limit == null) {
            chain.doFilter(request, response);
            return;
        }

        String key = clientIp(request) + "|" + request.getRequestURI();
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket(limit));

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            writeTooManyRequests(response);
        }
    }

    /**
     * @return the per-minute limit if this request targets a throttled POST path,
     *         otherwise {@code null} (request must pass through).
     */
    private Integer throttledLimitFor(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return null;
        }
        return PATH_LIMITS.get(request.getRequestURI());
    }

    private Bucket newBucket(int permitsPerMinute) {
        // intervally(): the whole quota is restored once per fixed window, giving
        // clean "N per minute" semantics (rather than a trickle refill).
        Bandwidth limit = Bandwidth.classic(
                permitsPerMinute,
                Refill.intervally(permitsPerMinute, WINDOW));
        return Bucket.builder()
                .addLimit(limit)
                .withCustomTimePrecision(timeMeter)
                .build();
    }

    /**
     * Client IP used as the rate-limit key.
     *
     * <p><b>Security:</b> {@code X-Forwarded-For} is fully client-controllable. The
     * throttled endpoints ({@code /api/auth/*}) are {@code permitAll} and unauthenticated,
     * so honouring XFF unconditionally would let an attacker rotate the header on every
     * request, land in a fresh bucket each time, and brute-force without limit. We therefore
     * key on the socket {@link HttpServletRequest#getRemoteAddr() remoteAddr} by default and
     * ignore XFF entirely.
     *
     * <p>The first XFF hop is honoured ONLY when {@code app.rate-limit.trust-forwarded-header}
     * is explicitly set to {@code true} — i.e. the service is deployed behind a trusted reverse
     * proxy that strips/overwrites any client-supplied XFF. Do not enable this otherwise.
     */
    private String clientIp(HttpServletRequest request) {
        if (trustForwardedHeader) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"error\":\"too_many_requests\"}");
    }
}
