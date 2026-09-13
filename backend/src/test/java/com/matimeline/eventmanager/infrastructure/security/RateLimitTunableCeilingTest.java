package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import io.github.bucket4j.TimeMeter;

/**
 * Revue S88 — bords des plafonds réglables ({@code app.rate-limit.*-per-minute}) sur le VRAI
 * chemin du filtre : constructeur (plancher) puis {@code doFilter} (capacité effective du seau).
 *
 * <p>Test UNITAIRE, sans contexte Spring (PIT-S37-002) : le filtre est instancié tel que Spring
 * l'instancie, avec les valeurs que le binding {@code @Value Integer} lui passerait — {@code null}
 * quand la propriété est absente. Le 5e bord, « au-dessus du défaut EN PROD → refus », n'est pas
 * du ressort du filtre : il est porté par {@code ProfileSafetyGuard} et testé dans
 * {@code ProfileSafetyGuardTest} (#547).
 *
 * <p>Temps GELÉ ({@link TimeMeter} constant) : aucun remplissage de seau pendant le test, donc
 * « la N+1e prend 429 » ne dépend pas de l'horloge.
 */
class RateLimitTunableCeilingTest {

    private static final TimeMeter FROZEN = new TimeMeter() {
        @Override
        public long currentTimeNanos() {
            return 0L;
        }

        @Override
        public boolean isWallClockBased() {
            return false;
        }
    };

    private static RateLimitingFilter filter(Integer register, Integer login, Integer resetPassword) {
        return new RateLimitingFilter(FROZEN, false, true, register, login, resetPassword);
    }

    /** Nombre de requêtes acceptées (non 429) avant le premier 429, borné à {@code max}. */
    private static int acceptedBeforeThrottle(RateLimitingFilter filter, String path, int max) throws Exception {
        for (int i = 0; i < max; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
            request.setRemoteAddr("10.88.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            if (response.getStatus() == 429) {
                return i;
            }
        }
        return max;
    }

    @Test
    @DisplayName("valeur 0 → refus au boot (capacité 0 = toutes les requêtes en 429)")
    void zero_isRejected() {
        assertThatThrownBy(() -> filter(null, 0, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.rate-limit.login-per-minute must be >= 1 (got 0)");
    }

    @Test
    @DisplayName("valeur négative → refus au boot")
    void negative_isRejected() {
        assertThatThrownBy(() -> filter(-3, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.rate-limit.register-per-minute must be >= 1 (got -3)");
        assertThatThrownBy(() -> filter(null, null, -1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.rate-limit.reset-password-per-minute must be >= 1 (got -1)");
    }

    @Test
    @DisplayName("valeur 1 (plancher) → acceptée, 1 requête passe puis 429")
    void one_isTheFloor() throws Exception {
        assertThat(acceptedBeforeThrottle(filter(1, null, null), "/api/auth/register", 5)).isEqualTo(1);
    }

    @Test
    @DisplayName("propriétés absentes → défauts 5 / 10 / 5 appliqués par le seau")
    void absent_appliesDefaults() throws Exception {
        assertThat(acceptedBeforeThrottle(filter(null, null, null), "/api/auth/register", 50))
                .isEqualTo(RateLimitingFilter.DEFAULT_REGISTER_PER_MINUTE);
        assertThat(acceptedBeforeThrottle(filter(null, null, null), "/api/auth/login", 50))
                .isEqualTo(RateLimitingFilter.DEFAULT_LOGIN_PER_MINUTE);
        assertThat(acceptedBeforeThrottle(filter(null, null, null), "/api/auth/reset-password", 50))
                .isEqualTo(RateLimitingFilter.DEFAULT_RESET_PASSWORD_PER_MINUTE);
    }

    @Test
    @DisplayName("au-dessus du défaut HORS prod (valeurs e2e 30 / 30 / 15) → accepté et appliqué")
    void aboveDefaultOutsideProd_isAcceptedAndApplied() throws Exception {
        assertThatCode(() -> filter(30, 30, 15)).doesNotThrowAnyException();
        assertThat(acceptedBeforeThrottle(filter(30, 30, 15), "/api/auth/register", 50)).isEqualTo(30);
        assertThat(acceptedBeforeThrottle(filter(30, 30, 15), "/api/auth/login", 50)).isEqualTo(30);
        assertThat(acceptedBeforeThrottle(filter(30, 30, 15), "/api/auth/reset-password", 50)).isEqualTo(15);
    }
}
