package com.matimeline.eventmanager.infrastructure.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
     * par l'authz), la 6e depuis la même IP est throttlée. Depuis #265 le GET synchrone inline
     * (json|markdown) est LUI AUSSI throttlé (bucket séparé, cf. exportInlineGet_* ci-dessous) ;
     * seuls le polling /job et le re-download /download restent hors périmètre.
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
     * #265 : l'export SYNCHRONE inline (GET /api/export?format=json) recalcule l'export à chaque
     * appel (requêtes DB répétées) → vecteur de DoS. Il DOIT être throttlé (5/min/IP), au même
     * titre que la soumission POST. Le filtre court-circuite avant l'authz : les 5 premières
     * passent (rejetées plus loin faute de JWT), la 6e depuis la même IP est 429 + JSON propre.
     */
    @Test
    void exportInlineGet_sixthWithinWindow_returns429() throws Exception {
        String ip = "10.2.0.1";
        for (int i = 1; i <= 5; i++) {
            int sc = mockMvc.perform(get("/api/export").param("format", "json")
                            .with(req -> { req.setRemoteAddr(ip); return req; }))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "GET inline #" + i + " sous la limite ne doit pas être throttlé");
        }
        mockMvc.perform(get("/api/export").param("format", "json")
                        .with(req -> { req.setRemoteAddr(ip); return req; }))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("too_many_requests"));
    }

    /**
     * #265 (audit sécurité — bypass MAJEUR) : {@code getRequestURI()} n'est PAS décodé
     * (contrat Servlet). Un chemin ré-encodé — {@code GET /api/%65xport} ({@code e} → {@code %65})
     * — routait quand même vers {@code ExportController} (Spring décode l'URI), mais échappait
     * TOTALEMENT au throttle car la clé brute {@code "GET /api/%65xport"} ne matchait pas
     * {@code "GET /api/export"} dans LIMITS. Depuis la normalisation (UrlPathHelper) la clé est
     * calculée sur le chemin DÉCODÉ : le chemin encodé retombe dans le même bucket que la forme
     * canonique → la 6e requête est 429, plus de bypass. {@code setRequestURI} force l'URI brute
     * encodée telle qu'un client la poserait.
     */
    @Test
    void exportInlineGet_percentEncodedPath_isThrottled_noBypass() throws Exception {
        String ip = "10.2.0.5";
        String encodedUri = "/api/%65xport"; // "e" de "export" encodé -> /api/export après décodage
        for (int i = 1; i <= 5; i++) {
            int sc = mockMvc.perform(get("/api/export").param("format", "json")
                            .with(req -> { req.setRemoteAddr(ip); req.setRequestURI(encodedUri); return req; }))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "GET encodé #" + i + " sous la limite ne doit pas être throttlé");
        }
        // 6e requête sur le MÊME chemin encodé -> throttlée : le bypass par ré-encodage est fermé.
        mockMvc.perform(get("/api/export").param("format", "json")
                        .with(req -> { req.setRemoteAddr(ip); req.setRequestURI(encodedUri); return req; }))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("too_many_requests"));
    }

    /**
     * #265 : GET et POST /api/export ont des buckets INDÉPENDANTS (la clé inclut la méthode).
     * Épuiser le quota GET (5) depuis une IP ne doit PAS consommer le quota POST de la même IP :
     * la 1re soumission POST juste après doit passer (jamais 429).
     */
    @Test
    void exportGetAndPost_haveIndependentBuckets() throws Exception {
        String ip = "10.2.0.2";
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(get("/api/export").param("format", "json")
                    .with(req -> { req.setRemoteAddr(ip); return req; }));
        }
        // GET épuisé -> 429, mais le POST garde son propre quota intact.
        assertEquals(429, mockMvc.perform(get("/api/export").param("format", "json")
                        .with(req -> { req.setRemoteAddr(ip); return req; }))
                .andReturn().getResponse().getStatus());
        assertNotEquals(429, mockMvc.perform(post("/api/export")
                        .with(req -> { req.setRemoteAddr(ip); return req; }))
                .andReturn().getResponse().getStatus(),
                "le bucket POST doit être indépendant du bucket GET épuisé");
    }

    /**
     * #265 (décision tracée, ADR-003 § Rate-limiting) : le polling de statut
     * GET /api/export/job/{jobId} est LÉGER et volontairement HORS rate-limit — un client
     * légitime interroge un job en cours de nombreuses fois et ne doit jamais être throttlé.
     */
    @Test
    void exportJobPolling_isNotRateLimited() throws Exception {
        String ip = "10.2.0.3";
        String jobUrl = "/api/export/job/00000000-0000-0000-0000-000000000265";
        for (int i = 1; i <= 30; i++) {
            int sc = mockMvc.perform(get(jobUrl)
                            .with(req -> { req.setRemoteAddr(ip); return req; }))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "le polling /job ne doit jamais être throttlé (requête #" + i + ")");
        }
    }

    /**
     * #265 (décision tracée, ADR-003 § Rate-limiting) : le re-téléchargement d'un fichier déjà
     * COMPLETED GET /api/export/download/{jobId} lit des octets d'un blob privé (aucun recalcul)
     * et reste volontairement HORS rate-limit — self-service borné, pas d'énumération cross-user.
     */
    @Test
    void exportDownload_isNotRateLimited() throws Exception {
        String ip = "10.2.0.4";
        String dlUrl = "/api/export/download/00000000-0000-0000-0000-000000000265";
        for (int i = 1; i <= 30; i++) {
            int sc = mockMvc.perform(get(dlUrl).param("token", "irrelevant")
                            .with(req -> { req.setRemoteAddr(ip); return req; }))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "le re-download /download ne doit jamais être throttlé (requête #" + i + ")");
        }
    }

    // ----- #134 : /api/me entre dans la map de rate-limiting -----

    private static final String CHANGE_PASSWORD_BODY =
            "{\"oldPassword\":\"Secret60\",\"newPassword\":\"Secret61\"}";
    private static final String PATCH_ME_BODY =
            "{\"name\":\"Alice\",\"username\":\"someuser\",\"email\":\"alice@example.com\"}";

    /**
     * #134 : {@code POST /api/me/change-password} vérifie l'ANCIEN mot de passe — oracle de
     * credentials brute-forçable depuis une session volée, et jusqu'ici HORS de la map (seul
     * {@code /api/auth/*} y était). Slot strict 5/min/IP : les 5 premières passent (rejetées
     * plus loin faute de JWT — le filtre court-circuite AVANT l'authz), la 6e depuis la même
     * IP est 429 + JSON générique, sans stack trace.
     */
    @Test
    void changePassword_sixthWithinWindow_returns429() throws Exception {
        String ip = "10.3.0.1";
        for (int i = 1; i <= 5; i++) {
            int sc = mockMvc.perform(post("/api/me/change-password")
                            .with(req -> { req.setRemoteAddr(ip); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(CHANGE_PASSWORD_BODY))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "change-password #" + i + " sous la limite ne doit pas être throttlé");
        }
        mockMvc.perform(post("/api/me/change-password")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CHANGE_PASSWORD_BODY))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("too_many_requests"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("Exception"))));
    }

    /**
     * #134 : la fenêtre se réarme. Sans cette assertion, un bucket qui ne se recharge jamais
     * (429 définitif pour l'IP) passerait le test ci-dessus — un utilisateur légitime serait
     * verrouillé hors de son changement de mot de passe. Fenêtre avancée par le TimeMeter
     * contrôlable, jamais par un {@code Thread.sleep}.
     */
    @Test
    void changePassword_afterWindowAdvance_isAllowedAgain() throws Exception {
        String ip = "10.3.0.2";
        for (int i = 1; i <= 6; i++) {
            mockMvc.perform(post("/api/me/change-password")
                    .with(req -> { req.setRemoteAddr(ip); return req; })
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(CHANGE_PASSWORD_BODY));
        }
        clock.advance(Duration.ofMinutes(1).plusSeconds(1));

        int sc = mockMvc.perform(post("/api/me/change-password")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CHANGE_PASSWORD_BODY))
                .andReturn().getResponse().getStatus();
        assertNotEquals(429, sc, "après la fenêtre, le quota change-password doit être rechargé");
    }

    /**
     * #134 : {@code PATCH /api/me} renvoie 409 quand le username visé est déjà pris — oracle
     * d'énumération PAR STATUT, volontairement conservé (le corps, lui, est neutralisé côté
     * UserController). Le throttle 10/min/IP borne le débit de balayage : la 11e requête de la
     * même IP dans la fenêtre est 429.
     */
    @Test
    void patchMe_eleventhWithinWindow_returns429() throws Exception {
        String ip = "10.3.0.3";
        for (int i = 1; i <= 10; i++) {
            int sc = mockMvc.perform(patch("/api/me")
                            .with(req -> { req.setRemoteAddr(ip); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(PATCH_ME_BODY))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "PATCH /api/me #" + i + " sous la limite ne doit pas être throttlé");
        }
        mockMvc.perform(patch("/api/me")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PATCH_ME_BODY))
                .andExpect(status().is(429))
                .andExpect(jsonPath("$.error").value("too_many_requests"));
    }

    /**
     * #134 : PATCH et POST change-password ont des buckets INDÉPENDANTS (la clé embarque la
     * méthode ET le chemin). Épuiser change-password ne doit pas verrouiller l'édition de
     * profil depuis la même IP — sinon le throttle devient un vecteur de DoS entre endpoints.
     */
    @Test
    void changePasswordAndPatchMe_haveIndependentBuckets() throws Exception {
        String ip = "10.3.0.4";
        for (int i = 1; i <= 6; i++) {
            mockMvc.perform(post("/api/me/change-password")
                    .with(req -> { req.setRemoteAddr(ip); return req; })
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(CHANGE_PASSWORD_BODY));
        }
        int sc = mockMvc.perform(patch("/api/me")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PATCH_ME_BODY))
                .andReturn().getResponse().getStatus();
        assertNotEquals(429, sc, "le bucket PATCH /api/me est distinct de celui de change-password");
    }

    /**
     * #134 (non-régression) : {@code GET /api/me} est polled par le SPA à chaque navigation.
     * Il reste DÉLIBÉRÉMENT hors de la map (cf. javadoc de RateLimitingFilter) — le throttler
     * ne doit pas casser la navigation normale ni pénaliser les utilisateurs derrière un NAT.
     */
    @Test
    void getMe_isNotRateLimited() throws Exception {
        String ip = "10.3.0.5";
        for (int i = 1; i <= 30; i++) {
            int sc = mockMvc.perform(get("/api/me")
                            .with(req -> { req.setRemoteAddr(ip); return req; }))
                    .andReturn().getResponse().getStatus();
            assertNotEquals(429, sc, "GET /api/me ne doit jamais être throttlé (requête #" + i + ")");
        }
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
