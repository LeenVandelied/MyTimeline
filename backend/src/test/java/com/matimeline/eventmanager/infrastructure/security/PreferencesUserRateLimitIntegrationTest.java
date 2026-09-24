package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #831 — plafond de débit PAR UTILISATEUR authentifié sur {@code PUT /api/me/preferences},
 * à travers la VRAIE chaîne Spring Security ({@code @AutoConfigureMockMvc}) : {@code JwtFilter}
 * pose le principal, {@link UserRateLimitingFilter} le lit juste avant l'autorisation.
 *
 * <p>Le critère « par utilisateur, pas par IP » est prouvé dans les deux sens :
 * <ul>
 *   <li>un utilisateur A qui dépasse le plafond reste à 429 même depuis une AUTRE IP ;</li>
 *   <li>un utilisateur B depuis la MÊME IP que A n'est pas affecté.</li>
 * </ul>
 * Si le filtre était monté AVANT l'authentification (principal absent), aucune requête ne
 * serait jamais comptée et le premier test échouerait : il prouve aussi l'ordre des filtres.
 *
 * <p>Pas de meter contrôlable : la classe partage le contexte Spring par défaut (même
 * configuration que {@code ThemePreferenceIntegrationTest}) ; chaque test crée ses propres
 * comptes, donc ses propres seaux. La recharge par fenêtre est celle de
 * {@link RateLimitingFilter#newMinuteBucket}, couverte par les tests du filtre par IP.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PreferencesUserRateLimitIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final int CEILING = UserRateLimitingFilter.DEFAULT_PREFERENCES_PER_MINUTE;

    /** IP partagée par A et B pour les PUT (sous-réseau dédié, aucun seau par IP sur la route). */
    private static final String SHARED_IP = "10.154.250.1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    /** IP de LOGIN, distincte à chaque appel : le seau login (10/min/IP) ne doit jamais interférer. */
    private static String nextLoginIp() {
        int n = IP_SEQ.incrementAndGet();
        return "10.154." + ((n >> 8) & 0x7F) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContextBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContextAfter() {
        SecurityContextHolder.clearContext();
    }

    private String seedUser() {
        String username = "rl" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        new TransactionTemplate(txManager).executeWithoutResult(status -> {
            UserEntity user = new UserEntity();
            user.setName("RateLimit");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
            em.persist(user);
            em.flush();
        });
        return username;
    }

    private Cookie login(String username) throws Exception {
        String ip = nextLoginIp();
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"Secret60\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie jwt = res.getResponse().getCookie("jwt");
        assertNotNull(jwt, "login doit poser le cookie jwt");
        return jwt;
    }

    private int putPreference(Cookie jwt, String ip, String value) throws Exception {
        var request = put("/api/me/preferences")
                .with(req -> { req.setRemoteAddr(ip); return req; })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"themePreference\":\"" + value + "\"}");
        if (jwt != null) {
            request = request.cookie(jwt);
        }
        return mockMvc.perform(request).andReturn().getResponse().getStatus();
    }

    /** Consomme tout le plafond de l'utilisateur : chaque PUT sous le plafond doit réussir (200). */
    private void exhaust(Cookie jwt, String ip) throws Exception {
        for (int i = 1; i <= CEILING; i++) {
            assertEquals(200, putPreference(jwt, ip, i % 2 == 0 ? "dark" : "light"),
                    "PUT #" + i + " sous le plafond (" + CEILING + "/min/utilisateur) doit passer");
        }
    }

    @Test
    void userOverCeiling_gets429_withTheSameShapeAsTheIpLimiter() throws Exception {
        Cookie jwtA = login(seedUser());
        exhaust(jwtA, SHARED_IP);

        mockMvc.perform(put("/api/me/preferences")
                        .with(req -> { req.setRemoteAddr(SHARED_IP); return req; })
                        .cookie(jwtA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"themePreference\":\"dark\"}"))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"error\":\"too_many_requests\"}", true));
    }

    @Test
    void ceilingIsPerUser_notPerIp() throws Exception {
        Cookie jwtA = login(seedUser());
        Cookie jwtB = login(seedUser());
        exhaust(jwtA, SHARED_IP);

        // B, MÊME IP que A : son propre seau, intact.
        assertEquals(200, putPreference(jwtB, SHARED_IP, "dark"),
                "un autre utilisateur depuis la même IP ne doit pas hériter du plafond de A");
        // A, AUTRE IP : toujours throttlé — la clé est l'utilisateur, pas l'IP.
        assertEquals(429, putPreference(jwtA, "10.154.251.9", "dark"),
                "changer d'IP ne doit pas réinitialiser le plafond de A");
    }

    @Test
    void throttledUser_keepsOtherRoutes_andAnonymousStill401() throws Exception {
        Cookie jwtA = login(seedUser());
        exhaust(jwtA, SHARED_IP);
        assertEquals(429, putPreference(jwtA, SHARED_IP, "dark"));

        // Le plafond ne vise que PUT /api/me/preferences : la lecture du profil reste servie.
        mockMvc.perform(get("/api/me").cookie(jwtA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themePreference").exists());

        // Anonyme : jamais compté ici, l'autorisation répond 401 (pas 429).
        assertEquals(401, putPreference(null, SHARED_IP, "dark"));
    }
}
