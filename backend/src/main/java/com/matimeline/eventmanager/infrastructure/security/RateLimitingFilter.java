package com.matimeline.eventmanager.infrastructure.security;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import io.github.bucket4j.TimeMeter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
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
 * <p><b>Profile endpoints (#134):</b> {@code POST /api/me/change-password} (old-password
 * oracle — brute-forceable from a stolen session, previously unthrottled) and
 * {@code PATCH /api/me} (409 on a taken username — username-enumeration oracle by STATUS)
 * are throttled. The remaining {@code /api/me} routes are DELIBERATELY out of scope: they
 * act on the caller's own record only (structural ownership from the JWT), expose no
 * cross-user oracle, and throttling them would only degrade legitimate use:
 * <ul>
 *   <li>{@code GET /api/me} and {@code GET /api/me/avatar} — reads polled by the SPA on
 *       every navigation; a per-IP cap would break normal browsing (and shared-NAT users);</li>
 *   <li>{@code DELETE /api/me} — terminal, single-shot, guarded by a username re-type;</li>
 *   <li>{@code DELETE /api/me/avatar} — idempotent no-op reset.</li>
 * </ul>
 * {@code POST /api/me/avatar} (multipart upload, 5 MiB cap, magic-byte validation + disk
 * write) is a genuine resource-exhaustion surface but is NOT covered here — it is out of
 * the scope of #134 (anti-enumeration + credential brute-force) and is left as a tracked
 * follow-up rather than silently bundled in.
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
    private static final Map<String, Integer> LIMITS = Map.ofEntries(
            // Map.ofEntries (et non Map.of) : Map.of plafonne à 10 paires. La map en
            // comptait 8 avant #134 et en compte 10 après — pile la limite. ofEntries n'a
            // pas ce plafond : ajouter un futur slot ne demande plus de refactor.
            Map.entry("POST /api/auth/login", 10),
            Map.entry("POST /api/auth/register", 5),
            Map.entry("POST /api/auth/refresh", 20),
            // #49 : forgot-password est une cible d'abus (spam mail / énumération).
            // Throttle strict par IP, cohérent avec le slot reset-password (#33).
            Map.entry("POST /api/auth/forgot-password", 5),
            Map.entry("POST /api/auth/reset-password", 5),
            // #58 : soumission de job d'export RGPD (POST /api/export) — opération lourde
            // (pool async borné + écriture fichier sur disque, aucun quota). Sans throttle un
            // user authentifié peut spammer les soumissions → épuisement du pool + accumulation
            // de fichiers. Limite basse (5/min/IP) alignée sur les slots coûteux forgot/reset.
            Map.entry("POST /api/export", 5),
            // #265 : export SYNCHRONE inline (GET /api/export?format=json|markdown) — recalcule
            // l'export à chaque appel (requêtes DB User+Product+Category+Event répétées, rendu
            // inline). Vecteur de DoS/consommation CPU-IO par un user authentifié. Même limite
            // basse (5/min/IP) et bucket SÉPARÉ du POST (la clé inclut la méthode). Le polling
            // /job et le re-download /download restent volontairement hors périmètre (cf. javadoc
            // de classe + ADR-003 § Rate-limiting).
            Map.entry("GET /api/export", 5),
            // #134 : POST /api/me/change-password — la vérification de l'ANCIEN mot de passe
            // est un oracle de credentials. Une session volée (cookie jwt exfiltré) permettait
            // de deviner l'ancien mot de passe sans AUCUNE contrainte de débit, alors que la
            // même devinette via POST /api/auth/login est plafonnée à 10/min. Slot strict
            // (5/min/IP) : un utilisateur légitime change son mot de passe une fois, une erreur
            // de saisie en ajoute une ou deux — 5 couvre le cas honnête avec de la marge.
            Map.entry("POST /api/me/change-password", 5),
            // #134 : PATCH /api/me — le 409 sur username déjà pris reste un oracle PAR STATUT
            // (arbitrage assumé, cf. javadoc de UserController.updateCurrentUser : le corps est
            // neutralisé, pas le statut). Le throttle borne le DÉBIT d'énumération : 10/min/IP
            // rend le balayage d'un dictionnaire de usernames impraticable sans gêner l'édition
            // de profil (opération rare). Il ne SUPPRIME pas l'oracle.
            Map.entry("PATCH /api/me", 10)
    );

    private static final Duration WINDOW = Duration.ofMinutes(1);

    /**
     * #141 — the single {@code (method, path)} pair that additionally triggers the
     * PER-TOKEN throttle branch below (body is parsed to extract the reset token).
     */
    private static final String RESET_PASSWORD_KEY = "POST /api/auth/reset-password";

    /**
     * #141 — max validation attempts allowed against ANY single reset-token value
     * within {@link #WINDOW}. Defense-in-depth on top of the per-IP limit: an attacker
     * rotating source IPs (or distributed across a botnet) still cannot hammer one
     * given token beyond this ceiling. A legitimate user submits a token once; the
     * token is single-use, so repeated submissions of the same value are retries after
     * failure — throttling them is safe.
     */
    private static final int TOKEN_ATTEMPT_LIMIT = 5;

    /**
     * #141 — hard cap on the number of distinct per-token buckets held in memory. The
     * token value-space is attacker-influenced (any string can be POSTed), so — unlike
     * the bounded auth-path IP map — this map could otherwise grow without limit
     * (memory-exhaustion vector). When the cap is reached the LRU {@link #tokenBuckets}
     * EVICTS its oldest entry to make room for the new one (rather than refusing to add
     * it — which would silently let every fresh token, including a legitimate victim's,
     * dodge the per-token throttle once the map filled up). Memory stays bounded while the
     * most-recently-seen tokens remain throttled. Entries are tiny; sized generously.
     */
    private static final int MAX_TRACKED_TOKENS = 100_000;

    /**
     * #141 — upper bound (in bytes) on the reset-password request body the filter will
     * buffer to extract the token. A legitimate body ({@code {"token":"<uuid>",
     * "newPassword":"…"}}) is a few hundred bytes; 8 KiB is comfortably above any honest
     * request. Beyond this the filter does NOT buffer (anti-OOM): it skips the per-token
     * throttle and lets the per-IP limit (already applied) govern the request.
     */
    private static final int MAX_RESET_BODY_BYTES = 8 * 1024;

    /**
     * #141 — max length of a token value still treated as a per-token throttle KEY. The
     * token is an attacker-controlled JSON string; without a bound, a multi-megabyte
     * value would become a map key and blow the {@link #MAX_TRACKED_TOKENS} volume cap in
     * real memory. A real reset token is a UUID (36 chars); 128 leaves generous slack.
     * Longer values skip the per-token throttle (per-IP limit still applies).
     */
    private static final int MAX_TOKEN_KEY_LENGTH = 128;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * #141 — per reset-token buckets, keyed by the token value. Bounded LRU: a
     * synchronized access-order map that evicts its eldest entry once it exceeds
     * {@link #MAX_TRACKED_TOKENS} (see that constant). {@code synchronizedMap} makes
     * {@code computeIfAbsent} atomic and its {@code removeEldestEntry} eviction runs
     * under the same lock, so the size ceiling holds under concurrency.
     */
    private final Map<String, Bucket> tokenBuckets = Collections.synchronizedMap(
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
                    return size() > MAX_TRACKED_TOKENS;
                }
            });

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

        if (!bucket.tryConsume(1)) {
            writeTooManyRequests(response);
            return;
        }

        // #141 : sur reset-password un SECOND throttle, PAR TOKEN, s'ajoute au throttle
        // par IP ci-dessus. Il plafonne les tentatives de validation d'un MÊME token,
        // indépendamment de l'IP source (défense en profondeur : une rotation d'IP ne
        // permet pas de marteler un token donné). Le corps de la requête est lu ici puis
        // re-servi au controller via un wrapper — l'InputStream d'origine n'est
        // consommable qu'une seule fois.
        if (RESET_PASSWORD_KEY.equals(methodAndPath)) {
            handleResetPasswordTokenThrottle(request, response, chain);
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * #141 — per-token throttle branch of {@link #doFilterInternal} for
     * {@code POST /api/auth/reset-password}. The per-IP limit has ALREADY been applied
     * upstream; this method reads the (bounded) body, extracts the token, and — when the
     * token is a plausible key — applies the second, per-token throttle before re-serving
     * the cached body downstream. It always terminates the request (short-circuits with
     * 400/429, or forwards via the cached-body wrapper); the caller just returns after it.
     */
    private void handleResetPasswordTokenThrottle(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        // Anti-OOM (#141) : le corps d'un reset légitime fait quelques centaines d'octets.
        // Si Content-Length annonce déjà un corps hors norme, on ne bufferise RIEN : on
        // saute le throttle-par-token et on laisse le controller lire le corps lui-même.
        // Le throttle par IP ci-dessus a déjà statué sur cette requête.
        if (request.getContentLengthLong() > MAX_RESET_BODY_BYTES) {
            chain.doFilter(request, response);
            return;
        }
        // Lecture BORNÉE : défense en profondeur si Content-Length est absent (chunked)
        // ou ment sur la taille réelle. Jamais plus de MAX_RESET_BODY_BYTES+1 octets en
        // mémoire (vs StreamUtils.copyToByteArray qui lisait tout le corps sans borne).
        byte[] body = readBounded(request.getInputStream(), MAX_RESET_BODY_BYTES);
        if (body == null) {
            // Corps dépassant la borne alors que Content-Length ne l'annonçait pas :
            // requête illégitime pour un reset ; le stream est déjà partiellement
            // consommé, on ne peut le re-servir -> 400 générique.
            writeBadRequest(response);
            return;
        }
        String token = extractToken(body);
        // Throttle par token UNIQUEMENT si le token a une longueur plausible (une clé
        // de plusieurs Mo saturerait le cap volumétrique MAX_TRACKED_TOKENS). Sinon on
        // saute le throttle-par-token (repli sur le throttle par IP), corps re-servi.
        if (token != null && !token.isBlank() && isPlausibleTokenKey(token) && !tryConsumeToken(token)) {
            // Même 429 générique que le throttle par IP : aucune distinction
            // "token inconnu" vs "trop de tentatives" (anti-énumération, critère #141).
            writeTooManyRequests(response);
            return;
        }
        chain.doFilter(new CachedBodyHttpServletRequest(request, body), response);
    }

    /**
     * Extracts the {@code token} field from a reset-password JSON body. Returns
     * {@code null} when the body is absent/empty/not JSON or the field is missing — the
     * per-token throttle is then skipped and the request proceeds (the controller's
     * {@code @Valid} handles a malformed body with a 400). Never throws.
     */
    private String extractToken(byte[] body) {
        if (body == null || body.length == 0) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readTree(body).path("token").asText(null);
        } catch (IOException e) {
            return null;
        }
    }

    /**
     * Consumes one permit from the per-token bucket. Returns {@code true} when the attempt
     * is within {@link #TOKEN_ATTEMPT_LIMIT}. The lookup/create is atomic on the
     * synchronized LRU {@code tokenBuckets}; if adding this token pushes the map past
     * {@link #MAX_TRACKED_TOKENS}, its eldest entry is evicted (bounded memory) while the
     * freshly-seen token stays throttled. {@code tryConsume} runs off-lock (the bucket is
     * thread-safe); a concurrent eviction of the entry only forfeits its history — the
     * accepted LRU trade-off.
     */
    private boolean tryConsumeToken(String token) {
        Bucket bucket = tokenBuckets.computeIfAbsent(token, k -> newBucket(TOKEN_ATTEMPT_LIMIT));
        return bucket.tryConsume(1);
    }

    /**
     * #141 — {@code true} when the extracted token is short enough to be used as a
     * per-token bucket key. Guards against a multi-megabyte JSON {@code token} value
     * neutralising the {@link #MAX_TRACKED_TOKENS} volume cap. A real token is a 36-char
     * UUID; anything over {@link #MAX_TOKEN_KEY_LENGTH} is not a legitimate token and is
     * left to the per-IP throttle.
     */
    private static boolean isPlausibleTokenKey(String token) {
        return token.length() <= MAX_TOKEN_KEY_LENGTH;
    }

    /**
     * #141 — reads at most {@code max} bytes from {@code in}. Returns the exact bytes read
     * when the stream ends within the bound, or {@code null} when the body exceeds
     * {@code max} (overflow). Allocates {@code max + 1} bytes at most, so a hostile body
     * can never exhaust memory here (unlike an unbounded {@code copyToByteArray}).
     */
    private static byte[] readBounded(InputStream in, int max) throws IOException {
        byte[] buf = new byte[max + 1];
        int total = 0;
        int read;
        while (total <= max && (read = in.read(buf, total, buf.length - total)) != -1) {
            total += read;
        }
        if (total > max) {
            return null; // dépassement : corps plus gros que la borne
        }
        return Arrays.copyOf(buf, total);
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

    /**
     * #141 — generic 400 for a reset-password body exceeding {@link #MAX_RESET_BODY_BYTES}
     * without declaring it via Content-Length (the stream is then partially consumed and
     * cannot be re-served downstream). No detail leaked.
     */
    private void writeBadRequest(HttpServletResponse response) throws IOException {
        response.setStatus(400);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"error\":\"bad_request\"}");
    }

    /**
     * #141 — wraps a request whose body was already consumed in the filter (to read the
     * reset token) so the downstream {@code HttpMessageConverter} can still deserialize
     * it. The {@link ServletInputStream} is backed by the cached byte array.
     */
    private static final class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

        private final byte[] body;

        CachedBodyHttpServletRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream buffer = new ByteArrayInputStream(body);
            return new ServletInputStream() {
                @Override
                public int read() {
                    return buffer.read();
                }

                @Override
                public boolean isFinished() {
                    return buffer.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    // synchronous read only — no async listener needed
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
