package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import io.github.bucket4j.TimeMeter;

/**
 * Contrat d'intégration issue #141 : lockout / rate-limit PAR TOKEN sur les tentatives
 * de validation d'un token de réinitialisation (défense en profondeur, en plus du
 * throttle par IP #33/#49). Passe par la vraie chaîne Spring Security
 * (@AutoConfigureMockMvc applique springSecurity), donc le RateLimitingFilter fire.
 *
 * <p>Clé du test : chaque requête utilise une IP socket DIFFÉRENTE, de sorte que le
 * throttle PAR IP (limite 5/min) ne se déclenche jamais — un éventuel 429 ne peut donc
 * provenir QUE du throttle par token. Le meter est piloté par un
 * {@link ControllableTimeMeter} pour avancer la fenêtre sans {@code Thread.sleep}.
 */
@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@AutoConfigureMockMvc
class ResetPasswordTokenRateLimitIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ControllableTimeMeter clock;

    /** Remplace le meter de prod par un meter contrôlable pour avancer la fenêtre. */
    @TestConfiguration
    static class TokenClockConfig {
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
     * POST /api/auth/reset-password avec un token donné, depuis une IP socket donnée.
     * Le mot de passe respecte la politique BR-AUT-003 (>=8, majuscule, chiffre) pour que le seul motif d'échec possible soit le
     * token (jamais un 400 de @Valid sur le mot de passe).
     */
    private int reset(String token, String socketIp) throws Exception {
        String body = "{\"token\":\"" + token + "\",\"newPassword\":\"NewSecret1\"}";
        return mockMvc.perform(post("/api/auth/reset-password")
                        .with(req -> { req.setRemoteAddr(socketIp); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getStatus();
    }

    /**
     * Critère #141 : au-delà de N (=5) tentatives sur un MÊME token, la suivante est
     * bloquée (429), MÊME en variant l'IP à chaque requête (le throttle par IP ne peut
     * donc pas expliquer le blocage → c'est bien la limite par token). Les 5 premières
     * renvoient 400 (token inexistant), la 6e 429 + JSON générique.
     */
    @Test
    void sameToken_sixthAttempt_returns429_acrossRotatingIps() throws Exception {
        String token = UUID.randomUUID().toString();
        for (int i = 1; i <= 5; i++) {
            int sc = reset(token, "10.41.0." + i); // IP distincte à chaque tour
            assertNotEquals(429, sc, "tentative #" + i + " sous la limite par token ne doit pas être 429");
        }
        // 6e tentative sur le MÊME token, encore une IP neuve -> throttlée par token.
        String body = "{\"token\":\"" + token + "\",\"newPassword\":\"NewSecret1\"}";
        mockMvc.perform(post("/api/auth/reset-password")
                        .with(req -> { req.setRemoteAddr("10.41.0.99"); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is(429))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("too_many_requests"));
    }

    /** Sous le seuil (5 tentatives sur un même token) : aucune n'est throttlée. */
    @Test
    void sameToken_underThreshold_neverThrottled() throws Exception {
        String token = UUID.randomUUID().toString();
        for (int i = 1; i <= 5; i++) {
            int sc = reset(token, "10.42.0." + i);
            assertNotEquals(429, sc, "tentative #" + i + " sous le seuil ne doit pas être throttlée");
        }
    }

    /**
     * Non-régression : la limite est bien PAR TOKEN, pas globale. 15 tentatives avec un
     * token DIFFÉRENT à chaque fois (et une IP différente) ne déclenchent jamais de 429,
     * bien que le total dépasse largement le seuil par token (5).
     */
    @Test
    void distinctTokens_neverThrottledByTokenLimit() throws Exception {
        for (int i = 1; i <= 15; i++) {
            int sc = reset(UUID.randomUUID().toString(), "10.43.0." + i);
            assertNotEquals(429, sc, "des tokens distincts ne doivent pas se partager un bucket (req #" + i + ")");
        }
    }

    /**
     * La fenêtre se réinitialise : après épuisement du quota d'un token puis avancée de
     * plus d'une minute, le même token est de nouveau accepté (ralentissement, pas
     * verrouillage définitif — conforme "bloqué OU ralenti").
     */
    @Test
    void sameToken_afterWindowAdvance_allowedAgain() throws Exception {
        String token = UUID.randomUUID().toString();
        for (int i = 1; i <= 5; i++) {
            reset(token, "10.44.0." + i);
        }
        // Bucket token vidé -> la tentative suivante est 429.
        assertEquals(429, reset(token, "10.44.0.6"));

        // Avance juste au-delà de la fenêtre d'une minute : quota par token restauré.
        clock.advance(Duration.ofSeconds(61));

        assertNotEquals(429, reset(token, "10.44.0.7"),
                "après écoulement de la fenêtre le token doit être de nouveau accepté");
    }
}
