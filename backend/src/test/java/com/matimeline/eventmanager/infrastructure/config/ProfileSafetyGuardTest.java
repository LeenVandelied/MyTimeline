package com.matimeline.eventmanager.infrastructure.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires (sans contexte Spring ni Docker) du garde-fou #111.
 *
 * <p>On instancie directement {@link ProfileSafetyGuard} et on lui soumet un
 * {@link MockEnvironment} configuré pour reproduire chaque combinaison
 * (marqueur prod présent/absent) × (profil dev/prod/défaut).
 */
class ProfileSafetyGuardTest {

    private final ProfileSafetyGuard guard = new ProfileSafetyGuard();

    private ApplicationEnvironmentPreparedEvent eventFor(MockEnvironment env) {
        ApplicationEnvironmentPreparedEvent event =
                mock(ApplicationEnvironmentPreparedEvent.class);
        when(event.getEnvironment()).thenReturn(env);
        return event;
    }

    @Test
    @DisplayName("Marqueur prod + profil dev explicite → refuse de booter")
    void shouldFail_whenProdMarkerAndDevProfileActive() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("ENVIRONMENT", "production");
        env.setActiveProfiles("dev");

        assertThatThrownBy(() -> guard.onApplicationEvent(eventFor(env)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("#111")
                .hasMessageContaining("SPRING_PROFILES_ACTIVE=prod");
    }

    @Test
    @DisplayName("Marqueur prod + profil dev résolu par défaut (aucun actif) → refuse de booter")
    void shouldFail_whenProdMarkerAndDefaultDevFallback() {
        // Aucun profil actif posé : le default ${SPRING_PROFILES_ACTIVE:dev} s'appliquera.
        MockEnvironment env = new MockEnvironment()
                .withProperty("APP_ENV", "prod")
                .withProperty("spring.profiles.active", "dev");

        assertThatThrownBy(() -> guard.onApplicationEvent(eventFor(env)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("#111")
                .hasMessageContaining("SPRING_PROFILES_ACTIVE=prod");
    }

    @Test
    @DisplayName("Marqueur prod (casse mixte) + dev → refuse de booter")
    void shouldFail_caseInsensitiveMarker() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("ENVIRONMENT", "Production");
        env.setActiveProfiles("dev");

        assertThatThrownBy(() -> guard.onApplicationEvent(eventFor(env)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Marqueur prod + profil prod → boot autorisé")
    void shouldPass_whenProdMarkerAndProdProfile() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("ENVIRONMENT", "production");
        env.setActiveProfiles("prod");

        assertThatCode(() -> guard.onApplicationEvent(eventFor(env)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Aucun marqueur prod + profil dev → boot autorisé (confort dev intact)")
    void shouldPass_whenNoMarkerAndDevProfile() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        assertThatCode(() -> guard.onApplicationEvent(eventFor(env)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Marqueur non-prod (staging) + profil dev → boot autorisé")
    void shouldPass_whenNonProdMarker() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("ENVIRONMENT", "staging");
        env.setActiveProfiles("dev");

        assertThatCode(() -> guard.onApplicationEvent(eventFor(env)))
                .doesNotThrowAnyException();
    }

    // --- #216 : refuse le boot si rate-limit désactivé en prod effectif ---

    @Test
    @DisplayName("#216 profil prod + rate-limit false → refuse de booter")
    void shouldFail_whenProdProfileAndRateLimitDisabled() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.rate-limit.enabled", "false");
        env.setActiveProfiles("prod");

        assertThatThrownBy(() -> guard.onApplicationEvent(eventFor(env)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("#216")
                .hasMessageContaining("app.rate-limit.enabled");
    }

    @Test
    @DisplayName("#216 marqueur prod + profil prod + rate-limit false → refuse de booter")
    void shouldFail_whenProdMarkerAndRateLimitDisabled() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("ENVIRONMENT", "production")
                .withProperty("app.rate-limit.enabled", "false");
        env.setActiveProfiles("prod");

        assertThatThrownBy(() -> guard.onApplicationEvent(eventFor(env)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("#216");
    }

    @Test
    @DisplayName("#216 profil prod + rate-limit true → boot autorisé")
    void shouldPass_whenProdProfileAndRateLimitEnabled() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.rate-limit.enabled", "true");
        env.setActiveProfiles("prod");

        assertThatCode(() -> guard.onApplicationEvent(eventFor(env)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("#216 profil prod + property rate-limit absente → boot autorisé (défaut fail-safe true)")
    void shouldPass_whenProdProfileAndRateLimitAbsent() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        assertThatCode(() -> guard.onApplicationEvent(eventFor(env)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("#216 profil dev + rate-limit false (CI e2e) → boot autorisé")
    void shouldPass_whenDevProfileAndRateLimitDisabled() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.rate-limit.enabled", "false");
        env.setActiveProfiles("dev");

        assertThatCode(() -> guard.onApplicationEvent(eventFor(env)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("#216 profil test + rate-limit false (CI e2e) → boot autorisé")
    void shouldPass_whenTestProfileAndRateLimitDisabled() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.rate-limit.enabled", "false");
        env.setActiveProfiles("test");

        assertThatCode(() -> guard.onApplicationEvent(eventFor(env)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("#216 marqueur prod (APP_ENV) sans profil + rate-limit false → refuse de booter")
    void shouldFail_whenProdMarkerOnlyAndRateLimitDisabled() {
        // Aucun profil actif : le fallback default 'dev' ne rend PAS prod effectif via profil,
        // mais le marqueur APP_ENV=prod suffit à déclencher #216.
        MockEnvironment env = new MockEnvironment()
                .withProperty("APP_ENV", "prod")
                .withProperty("app.rate-limit.enabled", "false")
                .withProperty("spring.profiles.active", "prod");

        assertThatThrownBy(() -> guard.onApplicationEvent(eventFor(env)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("#216");
    }
}
