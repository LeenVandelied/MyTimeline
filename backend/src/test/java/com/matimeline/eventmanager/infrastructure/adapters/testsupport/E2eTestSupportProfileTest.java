package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.time.Clock;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.web.SecurityFilterChain;

import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;

import jakarta.persistence.EntityManager;

/**
 * Garde-fou #283 : le canal de capture test-only N'EXISTE QUE en profil {@code e2e}.
 *
 * <p>Exigence de la décision d'architecture (ADR-004) : un endpoint qui rend un token de
 * réinitialisation ne doit jamais pouvoir répondre en {@code prod} — ni en {@code dev}, ni en
 * {@code test}. Ce test PROUVE l'absence des beans hors {@code e2e} plutôt que de s'en remettre
 * à la relecture d'une annotation.
 *
 * <p>Tranche légère ({@link ApplicationContextRunner}, pattern {@code StorageConfigTest}) :
 * ni Postgres, ni contexte web, ni Docker — le test tourne en local et en CI en quelques ms.
 * Complété par {@code E2eTestSupportPackageGuardTest} (toute classe du package est annotée)
 * et par {@code E2eResetTokenEndpointIntegrationTest} (comportement réel sous {@code test,e2e}).
 */
class E2eTestSupportProfileTest {

    /** Les 3 classes conditionnées du canal (l'interface {@code E2eResetTokenFinder} n'est pas un bean). */
    private static final Class<?>[] TEST_SUPPORT_BEANS = {
        E2eResetTokenController.class,
        E2eResetTokenFinderJpaAdapter.class,
        E2eTestSupportSecurityConfig.class,
    };

    /**
     * Hors {@code e2e} : AUCUN bean du canal n'est créé. On couvre les 3 profils réellement
     * utilisés ({@code prod}, {@code dev}, {@code test}) et la combinaison {@code dev,prod},
     * plus le cas sans profil actif (test séparé ci-dessous).
     *
     * <p>Aucune dépendance (EntityManager, UserRepository, Clock, HttpSecurity) n'est fournie
     * au contexte : si l'un de ces beans était créé malgré le profil, le contexte échouerait au
     * démarrage — l'assertion « pas de bean » est donc doublée d'un « pas d'échec de boot ».
     */
    @ParameterizedTest(name = "profil(s) actif(s) = {0}")
    @ValueSource(strings = {"prod", "dev", "test", "dev,prod"})
    void testSupportBeans_areAbsent_outsideE2eProfile(String activeProfiles) {
        new ApplicationContextRunner()
                .withPropertyValues("spring.profiles.active=" + activeProfiles)
                .withUserConfiguration(TEST_SUPPORT_BEANS)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean(E2eResetTokenController.class);
                    assertThat(context).doesNotHaveBean(E2eResetTokenFinder.class);
                    // Aucune chaîne de sécurité test-only : le chemin /api/test-support/**
                    // retombe sur la chaîne principale (anyRequest().authenticated() -> 401).
                    assertThat(context).doesNotHaveBean(SecurityFilterChain.class);
                });
    }

    /** Aucun profil explicite (boot « nu ») : le canal reste absent. */
    @Test
    void testSupportBeans_areAbsent_whenNoProfileIsActive() {
        new ApplicationContextRunner()
                .withUserConfiguration(TEST_SUPPORT_BEANS)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean(E2eResetTokenController.class);
                    assertThat(context).doesNotHaveBean(E2eResetTokenFinder.class);
                    assertThat(context).doesNotHaveBean(SecurityFilterChain.class);
                });
    }

    /**
     * Contre-épreuve : en profil {@code e2e} le canal EST câblé (sinon le test d'absence
     * ci-dessus serait vert pour une mauvaise raison — ex. classes jamais enregistrées).
     *
     * <p>{@code E2eTestSupportSecurityConfig} est exclu de ce contexte : son bean exige un
     * {@code HttpSecurity} (auto-configuration Spring Security web complète), hors périmètre
     * d'une tranche légère. Sa présence effective sous {@code e2e} est couverte par
     * {@code E2eResetTokenEndpointIntegrationTest} (appel anonyme réel → 200/404, pas 401).
     */
    @Test
    void testSupportBeans_arePresent_underE2eProfile() {
        new ApplicationContextRunner()
                .withPropertyValues("spring.profiles.active=e2e")
                .withBean(EntityManager.class, () -> mock(EntityManager.class))
                .withBean(UserRepository.class, () -> mock(UserRepository.class))
                .withBean(Clock.class, Clock::systemUTC)
                .withUserConfiguration(E2eResetTokenController.class, E2eResetTokenFinderJpaAdapter.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(E2eResetTokenController.class);
                    assertThat(context).hasSingleBean(E2eResetTokenFinder.class);
                });
    }

    /**
     * Profil {@code e2e} ADDITIF (cas réel du job CI : {@code SPRING_PROFILES_ACTIVE=dev,e2e}) :
     * le canal est câblé, la config {@code dev} restant active par ailleurs. Verrouille la
     * décision ADR-004 — si quelqu'un remplaçait {@code @Profile("e2e")} par une expression
     * excluant {@code dev}, ce test tomberait.
     */
    @Test
    void testSupportBeans_arePresent_whenE2eIsAddedToDevProfile() {
        new ApplicationContextRunner()
                .withPropertyValues("spring.profiles.active=dev,e2e")
                .withBean(EntityManager.class, () -> mock(EntityManager.class))
                .withBean(UserRepository.class, () -> mock(UserRepository.class))
                .withBean(Clock.class, Clock::systemUTC)
                .withUserConfiguration(E2eResetTokenController.class, E2eResetTokenFinderJpaAdapter.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(E2eResetTokenController.class);
                    assertThat(context).hasSingleBean(E2eResetTokenFinder.class);
                });
    }
}
