package com.matimeline.eventmanager.infrastructure.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import io.github.bucket4j.TimeMeter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * In-memory, per-IP rate limiting for the sensitive / resource-heavy endpoints
 * (brute-force / credential-stuffing mitigation — issue #33, BR-AUT-002 family ;
 * resource-exhaustion mitigation for the RGPD export — issues #58, #265).
 *
 * <p>Only the {@code (method, exact-path)} pairs listed in {@link #LIMITS} are
 * throttled; every other request (including {@code GET /api/auth/me},
 * {@code POST /api/auth/logout}, and the whole rest of the API) passes through
 * untouched. On overflow the filter short-circuits with HTTP 429 and a minimal
 * JSON body — no stack trace, no internal detail.
 *
 * <p><b>Export endpoints (#265):</b> both {@code POST /api/export} (async job
 * submission, #58) and {@code GET /api/export} (synchronous inline export —
 * repeated User+Product+Category+Event DB reads per call) are throttled: they are
 * the resource-heavy operations. The two other export GETs are DELIBERATELY left
 * out of scope:
 * <ul>
 *   <li>{@code GET /api/export/job/{jobId}} — cheap status polling; a legitimate
 *       client polls a running job several times and must not be penalised;</li>
 *   <li>{@code GET /api/export/download/{jobId}} — re-download of an already
 *       COMPLETED file (bytes read from a private blob, no export recomputation).</li>
 * </ul>
 * Both are strictly self-service (owner-scoped, job of another user → 404, no
 * cross-user enumeration), so the abuse surface is bounded to a user hammering
 * their own already-produced artefacts — an accepted residual, tracked in
 * {@code docs/adr/ADR-003-export-rgpd-async-job.md} (§ Rate-limiting). Because the
 * bucket key is exact-URI based, these two nested paths never match {@link #LIMITS}.
 *
 * <p><b>Scope of the limit:</b> buckets live in a {@link ConcurrentHashMap} inside
 * this single JVM, keyed by {@code clientIp + "|" + method + " " + path}. The limits are therefore
 * PER INSTANCE: behind a load balancer with N replicas the effective ceiling is
 * N x the configured rate. This is acceptable for the current single-instance
 * deployment; a distributed backend (Redis + bucket4j-redis) is required before
 * scaling out. There is also no eviction — one entry per distinct (IP, path) seen.
 * Acceptable for the bounded set of auth paths; revisit if the key space grows.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    /**
     * Requests per minute per IP, per throttled {@code "METHOD /exact/path"} pair.
     * The key embeds the HTTP method so a single URI can be throttled on some verbs
     * only (e.g. {@code /api/export} is limited on both POST and GET, while a bare
     * path is otherwise POST-only here).
     */
    private static final Map<String, Integer> LIMITS = Map.of(
            "POST /api/auth/login", 10,
            "POST /api/auth/register", 5,
            "POST /api/auth/refresh", 20,
            // #49 : forgot-password est une cible d'abus (spam mail / énumération).
            // Throttle strict par IP, cohérent avec le slot reset-password (#33).
            "POST /api/auth/forgot-password", 5,
            "POST /api/auth/reset-password", 5,
            // #58 : soumission de job d'export RGPD (POST /api/export) — opération lourde
            // (pool async borné + écriture fichier sur disque, aucun quota). Sans throttle un
            // user authentifié peut spammer les soumissions → épuisement du pool + accumulation
            // de fichiers. Limite basse (5/min/IP) alignée sur les slots coûteux forgot/reset.
            "POST /api/export", 5,
            // #265 : export SYNCHRONE inline (GET /api/export?format=json|markdown) — recalcule
            // l'export à chaque appel (requêtes DB User+Product+Category+Event répétées, rendu
            // inline). Vecteur de DoS/consommation CPU-IO par un user authentifié. Même limite
            // basse (5/min/IP) et bucket SÉPARÉ du POST (la clé inclut la méthode). Le polling
            // /job et le re-download /download restent volontairement hors périmètre (cf. javadoc
            // de classe + ADR-003 § Rate-limiting).
            "GET /api/export", 5
    );

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final TimeMeter timeMeter;

    /**
     * Decodes + normalises the request path before matching against {@link #LIMITS}.
     *
     * <p><b>Why (audit #265):</b> {@link HttpServletRequest#getRequestURI()} is the RAW,
     * still-percent-encoded URI (Servlet contract). Matching {@code LIMITS} on it lets an
     * attacker bypass the throttle with a trivially re-encoded path: {@code GET /api/%65xport}
     * ({@code e} → {@code %65}) yields the raw string {@code "GET /api/%65xport"}, which does
     * not equal {@code "GET /api/export"} → no bucket → unlimited hits, while Spring still
     * decodes and routes the request to {@code ExportController} (the costly recompute). The
     * default {@code StrictHttpFirewall} does not reject the encoding of an ordinary letter.
     *
     * <p>{@code getPathWithinApplication} URL-decodes and strips the context-path, so the
     * encoded and canonical forms collapse to the same lookup/bucket key. The instance is
     * stateless after construction and thread-safe.
     */
    private final UrlPathHelper pathHelper = new UrlPathHelper();

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

        // Decoded + context-path-stripped path: matching on the RAW getRequestURI() would let
        // a re-encoded path (e.g. /api/%65xport) dodge the throttle while still routing to the
        // controller (audit #265). Both lookup and bucket key are built from this canonical path.
        String path = pathHelper.getPathWithinApplication(request);
        String methodAndPath = request.getMethod() + " " + path;

        Integer limit = LIMITS.get(methodAndPath);
        if (limit == null) {
            chain.doFilter(request, response);
            return;
        }

        // Method is part of the key: GET and POST on the same URI (e.g. /api/export)
        // get INDEPENDENT buckets, so their distinct limits never collide.
        String key = clientIp(request) + "|" + methodAndPath;
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket(limit));

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            writeTooManyRequests(response);
        }
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
