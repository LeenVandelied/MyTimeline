package com.matimeline.eventmanager.infrastructure.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    /** Requests per minute per IP, per throttled POST path. */
    private static final Map<String, Integer> PATH_LIMITS = Map.of(
            "/api/auth/login", 10,
            "/api/auth/register", 5,
            "/api/auth/refresh", 20,
            // Reserved slot: endpoint not implemented yet, limit ready for when it is.
            "/api/auth/reset-password", 5
    );

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final TimeMeter timeMeter;

    /**
     * @param timeMeter time source backing every bucket. Production wires the real
     *                  nanotime meter; tests inject a controllable one to advance
     *                  the window deterministically without {@code Thread.sleep}.
     */
    public RateLimitingFilter(TimeMeter timeMeter) {
        this.timeMeter = timeMeter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

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
     * Best-effort client IP. Honours the first hop of {@code X-Forwarded-For} when
     * present (deployment is expected behind a trusted reverse proxy); falls back to
     * the socket remote address otherwise.
     */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
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
