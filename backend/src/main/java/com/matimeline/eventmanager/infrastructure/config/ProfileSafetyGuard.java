package com.matimeline.eventmanager.infrastructure.config;

import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Garde-fou fail-fast (#111) contre le fallback silencieux {@code SPRING_PROFILES_ACTIVE:dev}.
 *
 * <p>{@code application.properties} conserve le default {@code dev} pour le confort
 * de développement (mvn/IDE démarrent sans variable). Le risque : en production, si
 * {@code SPRING_PROFILES_ACTIVE} est oublié, Spring active SILENCIEUSEMENT le profil
 * {@code dev} avec ses defaults non-secrets. Ce listener refuse alors de booter.
 *
 * <p>Déclencheur : un marqueur d'environnement de production est présent
 * ({@code ENVIRONMENT=production|prod} ou {@code APP_ENV=production|prod}) ALORS que
 * le profil actif est {@code dev} (ou aucun profil explicite → default dev). On lève
 * alors une exception qui interrompt le démarrage AVANT tout refresh de contexte.
 *
 * <p>Listener volontairement enregistré via {@code spring.factories} pour s'exécuter
 * au plus tôt (event {@link ApplicationEnvironmentPreparedEvent}), avant la création
 * des beans, sans dépendre du contexte applicatif (donc testable sans Docker).
 */
public class ProfileSafetyGuard
        implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    /** Valeurs (insensibles à la casse) d'un marqueur d'env considérées comme "prod". */
    static final List<String> PROD_MARKER_VALUES = List.of("production", "prod");

    /** Noms de variables d'env inspectées comme marqueur d'environnement. */
    static final List<String> ENV_MARKER_KEYS = List.of("ENVIRONMENT", "APP_ENV");

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        ConfigurableEnvironment env = event.getEnvironment();

        if (!isProductionMarkerPresent(env)) {
            return; // Pas de marqueur prod → confort dev intact, aucun blocage.
        }
        if (!isDevProfileActive(env)) {
            return; // Marqueur prod + profil non-dev → configuration cohérente.
        }

        throw new IllegalStateException(
                "ARRÊT FAIL-FAST (#111) : un marqueur d'environnement de production est "
                + "présent (ENVIRONMENT/APP_ENV) mais le profil Spring actif est 'dev'. "
                + "Le fallback silencieux SPRING_PROFILES_ACTIVE:dev exposerait des defaults "
                + "non-secrets en production. Définir explicitement SPRING_PROFILES_ACTIVE=prod "
                + "(ou retirer le marqueur ENVIRONMENT en environnement de développement).");
    }

    /** Vrai si une des variables marqueur vaut une valeur "prod" (casse ignorée). */
    private boolean isProductionMarkerPresent(ConfigurableEnvironment env) {
        return ENV_MARKER_KEYS.stream()
                .map(env::getProperty)
                .filter(value -> value != null)
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .anyMatch(PROD_MARKER_VALUES::contains);
    }

    /**
     * Vrai si le profil {@code dev} est effectivement actif : soit explicitement,
     * soit par fallback (aucun profil actif ⇒ le default {@code dev} de
     * {@code application.properties} s'applique).
     */
    private boolean isDevProfileActive(ConfigurableEnvironment env) {
        List<String> active = Arrays.asList(env.getActiveProfiles());
        if (active.isEmpty()) {
            // À ce stade le default ${SPRING_PROFILES_ACTIVE:dev} n'est pas encore
            // résolu en profil actif ; on lit la property brute pour anticiper.
            String resolved = env.getProperty("spring.profiles.active", "dev");
            return Arrays.stream(resolved.split(","))
                    .map(String::trim)
                    .anyMatch("dev"::equalsIgnoreCase);
        }
        return active.stream().anyMatch("dev"::equalsIgnoreCase);
    }
}
