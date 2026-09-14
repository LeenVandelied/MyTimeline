package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.PropertyPlaceholderAutoConfiguration;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import io.github.bucket4j.TimeMeter;

/**
 * Revue S88 — bords des plafonds réglables ({@code app.rate-limit.*-per-minute}) sur le VRAI
 * chemin du filtre : constructeur (plancher) puis {@code doFilter} (capacité effective du seau).
 *
 * <p>Sans contexte Spring portant une datasource (PIT-S37-002). Deux étages :
 * <ul>
 *   <li>les bords du plafond : le filtre est instancié directement, avec les valeurs que le binding
 *       {@code @Value Integer} lui passerait — {@code null} quand la propriété est absente ;</li>
 *   <li>#685 (revue S88 cycle 2 n°5) : le binding LUI-MÊME — conversion {@code ""} → {@code null}
 *       d'une propriété blanche ({@code APP_RATE_LIMIT_LOGIN_PER_MINUTE=}) — dans un contexte Spring
 *       minimal ({@link #bindingRunner}) qui n'enregistre que le filtre et son {@link TimeMeter}.
 *       Passer {@code null} au constructeur ne l'exécutait jamais.</li>
 * </ul>
 * Le 5e bord, « au-dessus du défaut EN PROD → refus », n'est pas du ressort du filtre : il est
 * porté par {@code ProfileSafetyGuard} et testé dans {@code ProfileSafetyGuardTest} (#547).
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

    // ── #685 — le vrai binding @Value Integer, sans datasource ───────────────────────────────

    /**
     * Contexte Spring MINIMAL : le filtre (constructeur résolu par Spring, {@code @Value} compris) et
     * un {@link TimeMeter} gelé. Ni datasource, ni pool Hikari, ni contexte web (PIT-S37-002). Rejoue
     * ce qu'un vrai boot Spring Boot fait sur ce chemin :
     * <ul>
     *   <li>{@link PropertyPlaceholderAutoConfiguration} : placeholders résolus en mode strict
     *       (cf. {@code StorageConfigTest}) ;</li>
     *   <li>{@link ApplicationConversionService} posé sur la bean factory, comme
     *       {@code SpringApplication} ({@code addConversionService=true}) : c'est lui qui convertit
     *       {@code ""} en {@code null} pour un {@code Integer} ;</li>
     *   <li>la source {@code systemEnvironment} REMPLACÉE par {@code env} (cf.
     *       {@code CorsAllowedOriginsConfigIntegrationTest}) : même traduction
     *       {@code APP_RATE_LIMIT_LOGIN_PER_MINUTE} → {@code app.rate-limit.login-per-minute}, et
     *       isolement des variables réellement exportées sur le poste.</li>
     * </ul>
     */
    private static ApplicationContextRunner bindingRunner(Map<String, Object> env) {
        return new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(PropertyPlaceholderAutoConfiguration.class))
                .withInitializer(context -> {
                    context.getBeanFactory().setConversionService(ApplicationConversionService.getSharedInstance());
                    context.getEnvironment().getPropertySources().replace(
                            StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                            new SystemEnvironmentPropertySource(
                                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                                    new HashMap<>(env)));
                })
                .withBean(TimeMeter.class, () -> FROZEN)
                .withBean(RateLimitingFilter.class);
    }

    @Test
    @DisplayName("#685 — propriété blanche (app.rate-limit.login-per-minute=) → défaut, via le vrai binding")
    void blankProperty_bindsToNull_appliesDefault() {
        bindingRunner(Map.of())
                .withPropertyValues("app.rate-limit.login-per-minute=")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(acceptedBeforeThrottle(context.getBean(RateLimitingFilter.class), "/api/auth/login", 50))
                            .as("\"\" must be converted to null by the @Value Integer binding, so the default applies")
                            .isEqualTo(RateLimitingFilter.DEFAULT_LOGIN_PER_MINUTE);
                });
    }

    @Test
    @DisplayName("#685 — variable d'env blanche (APP_RATE_LIMIT_LOGIN_PER_MINUTE=) → défaut, via le vrai binding")
    void blankEnvironmentVariable_bindsToNull_appliesDefault() {
        bindingRunner(Map.of("APP_RATE_LIMIT_LOGIN_PER_MINUTE", ""))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(acceptedBeforeThrottle(context.getBean(RateLimitingFilter.class), "/api/auth/login", 50))
                            .as("a blank env var must bind to null, so the default applies")
                            .isEqualTo(RateLimitingFilter.DEFAULT_LOGIN_PER_MINUTE);
                });
    }

    @Test
    @DisplayName("#685 contre-épreuve — propriété absente → défaut (le placeholder #{null} est bien celui lu)")
    void absentProperty_bindsToNull_appliesDefault() {
        bindingRunner(Map.of()).run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(acceptedBeforeThrottle(context.getBean(RateLimitingFilter.class), "/api/auth/login", 50))
                    .isEqualTo(RateLimitingFilter.DEFAULT_LOGIN_PER_MINUTE);
        });
    }

    @Test
    @DisplayName("#685 contre-épreuve — valeur posée (7) → appliquée : le binding lit bien cette propriété")
    void numericProperty_isBoundAndApplied() {
        bindingRunner(Map.of("APP_RATE_LIMIT_LOGIN_PER_MINUTE", "7")).run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(acceptedBeforeThrottle(context.getBean(RateLimitingFilter.class), "/api/auth/login", 50))
                    .isEqualTo(7);
        });
    }

    @Test
    @DisplayName("#685 contre-épreuve — valeur non numérique → création du filtre refusée par la conversion")
    void nonNumericProperty_failsTheBinding() {
        bindingRunner(Map.of())
                .withPropertyValues("app.rate-limit.login-per-minute=abc")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context).getFailure()
                            .hasRootCauseInstanceOf(NumberFormatException.class)
                            .rootCause().hasMessageContaining("abc");
                });
    }
}
