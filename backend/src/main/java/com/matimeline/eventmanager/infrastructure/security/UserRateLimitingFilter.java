package com.matimeline.eventmanager.infrastructure.security;

import java.io.IOException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.TimeMeter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * #831 — rate limiting keyed on the AUTHENTICATED USER, not on the client IP, for the
 * authenticated self-service routes where a per-IP bucket is the wrong unit.
 *
 * <p><b>Why a second filter, and not a slot in {@link RateLimitingFilter}.</b> That filter
 * runs BEFORE {@link JwtFilter} (it must throttle the {@code permitAll} {@code /api/auth/*}
 * POSTs, which {@code JwtFilter} skips): at that point the {@code SecurityContext} is still
 * empty, so it can only key on the IP. A per-IP cap on {@code PUT /api/me/preferences} was
 * rejected at S111 (DEC-S111-005, ADR-010 § 7): the limiter is ARMED during the E2E run
 * (#547) and, behind the Next proxy, every authenticated spec shares one IP — a shared
 * bucket would fabricate silent 429s (the front tolerates the failed {@code PUT}). This
 * filter is therefore mounted AFTER authentication, just before the authorization decision
 * ({@code SecurityConfig}: {@code addFilterBefore(..., AuthorizationFilter.class)}), and reads
 * the principal populated by {@code JwtFilter}.
 *
 * <p><b>Why a filter, and not a guard in the application layer.</b> Throttling is a
 * transport concern (HTTP status 429, per-route table, in-memory bucket4j state): keeping it
 * in {@code infrastructure/security}, next to {@link RateLimitingFilter}, leaves the domain
 * and application layers untouched (no technical port, no exception mapped to 429) and gives
 * the SAME 429 as every other throttled route ({@link RateLimitingFilter#writeTooManyRequests}).
 *
 * <p><b>Key.</b> The user id (UUID) carried by {@link CustomUserDetails} — stable across a
 * username change ({@code PATCH /api/me}), so renaming the account does not reset the bucket.
 * An anonymous request is NOT throttled here: it passes through and the authorization filter
 * answers 401 — the route is unreachable without a valid, non-revoked session.
 *
 * <p><b>Fail-closed on an authenticated principal without an account id</b> (review S112).
 * In this chain the ONLY authentication source is {@code JwtFilter}, which always sets a
 * {@link CustomUserDetails} loaded from the database (non-null id): {@code SecurityConfig}
 * enables neither {@code httpBasic}, {@code formLogin}, remember-me nor OAuth2, and the session
 * is {@code STATELESS} (the context set by {@code AuthController.login} dies with that request).
 * Any other authenticated principal therefore signals a new authentication mechanism wired
 * without updating this filter. The former fallback keyed such a caller on
 * {@code "name:" + getName()} — unreachable, never tested, and a second key space whose
 * collision with a username nobody had reasoned about. Letting it through unthrottled would
 * silently void the ceiling for that mechanism. The request is instead REFUSED with the same
 * {@code 401 {"error":"unauthorized"}} as the entry point ({@link SecurityConfig#writeJsonError}),
 * consistent with {@link CallerResolver}, which answers 401 when no account can be resolved
 * (BR-AUT-005): a caller the limiter cannot tie to an account cannot write through it.
 *
 * <p><b>Ceiling.</b> {@value #DEFAULT_PREFERENCES_PER_MINUTE}/min/user on
 * {@code PUT /api/me/preferences}: one theme toggle = at most one {@code PUT} (the front skips
 * the call when the account already holds the value), so 30 covers a user clicking the toggle
 * repeatedly to compare themes, while bounding each account to one single-row UPDATE every 2 s.
 * Not tunable by profile: the E2E suite emits at most ONE real {@code PUT} per account (the
 * shared-account specs answer it in the browser, {@code e2e/support/theme-preference.ts}), and
 * a per-user bucket is immune to the shared E2E IP — no property, hence no prod upper-bound
 * guard to add (PIT-S88-014).
 *
 * <p><b>Memory.</b> One bucket per (user, route) seen, held in a synchronized access-order LRU
 * capped at {@link #MAX_TRACKED_USERS} (same pattern as the per-token map of
 * {@link RateLimitingFilter}): the key space is every account able to authenticate, which an
 * attacker can grow by registering (itself throttled per IP). Eviction only forfeits the
 * history of the least-recently-seen user. Per JVM instance, like {@link RateLimitingFilter}.
 *
 * <p>Honours the same master switch {@code app.rate-limit.enabled} as {@link RateLimitingFilter}.
 */
@Component
public class UserRateLimitingFilter extends OncePerRequestFilter {

    /** #831 — bucket key of the theme preference write (method + exact decoded path). */
    static final String PREFERENCES_KEY = "PUT /api/me/preferences";

    /** #831 — per-user ceiling of {@link #PREFERENCES_KEY}. Not tunable (see class javadoc). */
    public static final int DEFAULT_PREFERENCES_PER_MINUTE = 30;

    /** Requests per minute per authenticated user, per throttled {@code "METHOD /exact/path"}. */
    private static final Map<String, Integer> LIMITS = Map.of(
            PREFERENCES_KEY, DEFAULT_PREFERENCES_PER_MINUTE);

    /** Hard cap on the number of (user, route) buckets held in memory (bounded LRU). */
    static final int MAX_TRACKED_USERS = 100_000;

    private final Map<String, Bucket> buckets = Collections.synchronizedMap(
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
                    return size() > MAX_TRACKED_USERS;
                }
            });

    /** Same decoding as {@link RateLimitingFilter}: a re-encoded path must not dodge the table (#265). */
    private final UrlPathHelper pathHelper = new UrlPathHelper();

    private final TimeMeter timeMeter;
    private final boolean rateLimitEnabled;

    public UserRateLimitingFilter(
            TimeMeter timeMeter,
            @Value("${app.rate-limit.enabled:true}") boolean rateLimitEnabled) {
        this.timeMeter = timeMeter;
        this.rateLimitEnabled = rateLimitEnabled;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!rateLimitEnabled) {
            chain.doFilter(request, response);
            return;
        }
        String methodAndPath = request.getMethod() + " " + pathHelper.getPathWithinApplication(request);
        Integer limit = LIMITS.get(methodAndPath);
        if (limit == null) {
            chain.doFilter(request, response);
            return;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (isAnonymous(authentication)) {
            // Anonyme : l'AuthorizationFilter en aval répond 401 ; rien à compter ici.
            chain.doFilter(request, response);
            return;
        }
        String userKey = accountIdKey(authentication);
        if (userKey == null) {
            // Authentifié mais sans id de compte : fail-closed (voir JavaDoc de classe).
            SecurityConfig.writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "unauthorized");
            return;
        }
        // computeIfAbsent atomique sur la map synchronisée ; l'éviction LRU s'exécute sous le
        // même verrou. tryConsume hors verrou (le bucket est thread-safe).
        Bucket bucket = buckets.computeIfAbsent(userKey + "|" + methodAndPath,
                k -> RateLimitingFilter.newMinuteBucket(limit, timeMeter));
        if (!bucket.tryConsume(1)) {
            RateLimitingFilter.writeTooManyRequests(response);
            return;
        }
        chain.doFilter(request, response);
    }

    /** No usable authentication: absent, not authenticated, or the anonymous token. */
    private static boolean isAnonymous(Authentication authentication) {
        return authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken;
    }

    /**
     * {@code "id:<UUID>"} of the account behind an authenticated caller, or {@code null} when the
     * principal is not a {@link CustomUserDetails} carrying an id — the fail-closed case.
     */
    private static String accountIdKey(Authentication authentication) {
        if (authentication.getPrincipal() instanceof CustomUserDetails details
                && details.getUser() != null) {
            UUID id = details.getUser().getId();
            if (id != null) {
                return "id:" + id;
            }
        }
        return null;
    }
}
