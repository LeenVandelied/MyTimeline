package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * #428 — Épingle la surcharge de {@code app.cors.allowed-origins} en profil dev.
 *
 * <p><b>Ce que ce test prouve.</b> Il charge le VRAI {@code application-dev.properties}
 * (via {@link ConfigDataApplicationContextInitializer}), simule des variables
 * d'environnement au rang de précédence réel de Spring Boot (source
 * {@code systemEnvironment}), résout l'expression de placeholder RÉELLE du constructeur
 * ({@link SecurityConfig#ALLOWED_ORIGINS_EXPRESSION}, jamais une copie), puis vérifie la
 * liste effectivement posée sur le {@code CorsConfigurationSource} produit par la vraie
 * méthode {@link SecurityConfig#corsConfigurationSource()}.
 *
 * <p><b>Contexte du bug.</b> Quand {@code :3000} est squatté, le front bascule sur
 * {@code :3100} et relaie {@code Origin: http://localhost:3100} au backend. Un backend
 * dev figé sur {@code :3000} répond 403, que {@code auth.setup.ts} rapporte comme un
 * « rate-limit probable » (diagnostic faussé, 3 sprints perdus : 47, 56, 57). Un
 * {@code curl} de contrôle réussit et disculpe à tort le backend, car il n'envoie aucun
 * en-tête {@code Origin} (PIT-S57-003).
 */
@DisplayName("#428 CORS dev — app.cors.allowed-origins surchargeable par variable d'environnement")
class CorsAllowedOriginsConfigIntegrationTest {

    private static final String ENV_VAR = "APP_CORS_ALLOWED_ORIGINS";
    private static final String DEFAULT_ORIGIN = "http://localhost:3000";
    private static final String FALLBACK_ORIGIN = "http://localhost:3100";

    /**
     * Runner qui rejoue la chaîne de configuration du profil dev.
     *
     * @param env variables d'environnement simulées ; la source {@code systemEnvironment}
     *            est REMPLACÉE (et non ajoutée), pour (a) conserver la position de
     *            précédence canonique de Spring — au-dessus des {@code application-*.properties}
     *            — et (b) isoler le test des variables réellement exportées sur le poste.
     */
    private static ApplicationContextRunner devRunnerWithEnv(Map<String, Object> env) {
        return new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withInitializer(context -> {
                    ConfigurableEnvironment environment = context.getEnvironment();
                    environment.getPropertySources().replace(
                            StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                            new SystemEnvironmentPropertySource(
                                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                                    new HashMap<>(env)));
                })
                .withPropertyValues("spring.profiles.active=dev")
                .withUserConfiguration(CorsProbeConfiguration.class);
    }

    /** Origines réellement appliquées au {@code CorsConfigurationSource} de production. */
    private static List<String> effectiveOrigins(UrlBasedCorsConfigurationSource source) {
        CorsConfiguration config = source.getCorsConfigurations().get("/**");
        assertThat(config).as("configuration CORS enregistrée sur /**").isNotNull();
        return config.getAllowedOrigins();
    }

    @Nested
    @DisplayName("Défaut (aucune surcharge)")
    class Defaut {

        @Test
        @DisplayName("profil dev sans variable d'environnement → http://localhost:3000")
        void devSansEnv_utiliseLeDefaut() {
            devRunnerWithEnv(Map.of()).run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(effectiveOrigins(context.getBean(UrlBasedCorsConfigurationSource.class)))
                        .containsExactly(DEFAULT_ORIGIN);
            });
        }
    }

    @Nested
    @DisplayName("Surcharge par variable d'environnement")
    class Surcharge {

        @Test
        @DisplayName("APP_CORS_ALLOWED_ORIGINS mono-valeur → remplace le défaut")
        void envMonoValeur_remplaceLeDefaut() {
            devRunnerWithEnv(Map.of(ENV_VAR, FALLBACK_ORIGIN)).run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(effectiveOrigins(context.getBean(UrlBasedCorsConfigurationSource.class)))
                        .containsExactly(FALLBACK_ORIGIN)
                        .doesNotContain(DEFAULT_ORIGIN);
            });
        }

        @Test
        @DisplayName("APP_CORS_ALLOWED_ORIGINS multi-ports → les DEUX origines passent checkOrigin")
        void envMultiValeurs_appliqueToutesLesOrigines() {
            devRunnerWithEnv(Map.of(ENV_VAR, DEFAULT_ORIGIN + "," + FALLBACK_ORIGIN)).run(context -> {
                assertThat(context).hasNotFailed();
                UrlBasedCorsConfigurationSource source = context.getBean(UrlBasedCorsConfigurationSource.class);
                assertThat(effectiveOrigins(source))
                        .containsExactly(DEFAULT_ORIGIN, FALLBACK_ORIGIN);

                // Le vrai contrat runtime : c'est checkOrigin qui décide du 403.
                CorsConfiguration config = source.getCorsConfigurations().get("/**");
                assertThat(config.checkOrigin(DEFAULT_ORIGIN)).isEqualTo(DEFAULT_ORIGIN);
                assertThat(config.checkOrigin(FALLBACK_ORIGIN)).isEqualTo(FALLBACK_ORIGIN);
                assertThat(config.checkOrigin("http://localhost:4000")).isNull();
            });
        }

        @Test
        @DisplayName("espaces autour des virgules tolérés (copier-coller depuis un shell)")
        void envAvecEspaces_estNormalise() {
            devRunnerWithEnv(Map.of(ENV_VAR, DEFAULT_ORIGIN + " , " + FALLBACK_ORIGIN)).run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(effectiveOrigins(context.getBean(UrlBasedCorsConfigurationSource.class)))
                        .containsExactly(DEFAULT_ORIGIN, FALLBACK_ORIGIN);
            });
        }
    }

    @Nested
    @DisplayName("Variable exportée VIDE — piège documenté (PIT-S55-001)")
    class VariableVide {

        /**
         * DÉCISION ASSUMÉE (#428) : une variable exportée VIDE écrase le défaut et produit
         * une liste d'origines VIDE, donc un CORS qui refuse TOUT — exactement le 403
         * trompeur que l'issue veut supprimer.
         *
         * <p>Le correctif retenu n'est PAS un garde-fou « blanc → défaut » dans
         * {@link SecurityConfig} (il ferait diverger dev et prod, où le vide DOIT rester un
         * échec fail-fast — cf. {@code ProfileSafetyGuard} check #253). Le correctif est de
         * ne JAMAIS déclarer cette variable dans un fichier chargé automatiquement
         * ({@code .env}, {@code .env.example}, {@code docker-compose}) : une ligne
         * {@code APP_CORS_ALLOWED_ORIGINS=} y suffirait à casser tous les postes.
         *
         * <p>Ce test épingle donc le comportement TEL QU'IL EST, pour que quiconque
         * l'assouplirait plus tard le fasse sciemment.
         */
        @Test
        @DisplayName("APP_CORS_ALLOWED_ORIGINS= (vide) → unique origine BLANCHE, CORS refuse tout")
        void envVide_refuseToutesLesOrigines() {
            devRunnerWithEnv(Map.of(ENV_VAR, "")).run(context -> {
                assertThat(context).hasNotFailed();
                UrlBasedCorsConfigurationSource source = context.getBean(UrlBasedCorsConfigurationSource.class);

                // MESURÉ (#428) : la conversion String -> List<String> de Spring ne produit PAS
                // une liste vide mais une liste d'UN token blanc. Nuance qui compte : la liste
                // n'est pas "absente" (aucun garde-fou ne se déclenche), elle est peuplée d'une
                // origine qui ne matchera jamais -> 403 sur TOUTES les origines.
                assertThat(effectiveOrigins(source)).containsExactly("");

                CorsConfiguration config = source.getCorsConfigurations().get("/**");
                assertThat(config.checkOrigin(DEFAULT_ORIGIN)).isNull();
                assertThat(config.checkOrigin(FALLBACK_ORIGIN)).isNull();
            });
        }
    }

    @Nested
    @DisplayName("Non-régression du profil prod")
    class Prod {

        @Test
        @DisplayName("le profil prod continue de lire CORS_ALLOWED_ORIGINS (et NON APP_CORS_ALLOWED_ORIGINS)")
        void prodLitSaPropreVariable() {
            // Le profil prod pose app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:} : c'est
            // CETTE variable qui doit piloter la prod. On vérifie que le nom de variable
            // documenté pour le dev n'a pas contaminé le fichier prod.
            assertThat(readResource("/application-prod.properties"))
                    .contains("app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:}")
                    .doesNotContain(ENV_VAR);
        }

        @Test
        @DisplayName("le défaut dev http://localhost:3000 reste écrit dans application-dev.properties")
        void devConserveSonDefaut() {
            assertThat(readResource("/application-dev.properties"))
                    .as("le défaut dev doit rester localhost:3000 — aucun poste ne doit casser sans surcharge")
                    .containsPattern("app\\.cors\\.allowed-origins=.*" + java.util.regex.Pattern.quote(DEFAULT_ORIGIN));
        }

        private String readResource(String path) {
            try (var in = CorsAllowedOriginsConfigIntegrationTest.class.getResourceAsStream(path)) {
                assertThat(in).as("ressource " + path).isNotNull();
                return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            } catch (java.io.IOException e) {
                throw new IllegalStateException(e);
            }
        }
    }

    /**
     * Expose le VRAI {@code CorsConfigurationSource} de production.
     *
     * <p>{@link SecurityConfig} n'est volontairement PAS enregistrée comme classe de
     * configuration : son {@code @EnableWebSecurity} exigerait un contexte web complet,
     * sans rien apporter au périmètre testé. On instancie la classe réelle et on appelle
     * sa vraie méthode {@code corsConfigurationSource()} ; les deux filtres injectés ne
     * sont jamais touchés par ce chemin de code.
     *
     * <p>⚠ {@code @TestConfiguration} (et NON {@code @Configuration}) : une classe
     * {@code @Configuration} imbriquée dans un test vit sur le même classpath que le code
     * de prod et se fait RAMASSER par le component scan de TOUS les {@code @SpringBootTest}.
     * Avec {@code @Configuration} et une méthode nommée {@code corsConfigurationSource},
     * ce probe entrait en collision avec le bean homonyme de {@link SecurityConfig} :
     * {@code BeanDefinitionOverrideException} sur 106 tests d'intégration, très loin du
     * périmètre de ce fichier. {@code @TestConfiguration} est exclu du scan (TypeExcludeFilter),
     * et le nom de méthode distinct est une seconde barrière.
     */
    @TestConfiguration
    static class CorsProbeConfiguration {

        @Bean
        UrlBasedCorsConfigurationSource probeCorsConfigurationSource(
                @Value(SecurityConfig.ALLOWED_ORIGINS_EXPRESSION) List<String> allowedOrigins) {
            return (UrlBasedCorsConfigurationSource)
                    new SecurityConfig(null, null, allowedOrigins).corsConfigurationSource();
        }
    }
}
