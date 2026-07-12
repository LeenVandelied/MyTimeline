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
 *
 * <p>Second garde-fou (#216) : refuse le boot si le master-switch
 * {@code app.rate-limit.enabled} vaut {@code false} ALORS que l'environnement est
 * <em>prod effectif</em> (marqueur prod OU profil {@code prod} actif). Désactiver le
 * rate-limit en production ne doit jamais résulter d'une simple fuite de config.
 * Le job CI e2e qui pose légitimement {@code false} tourne en profil {@code test}/{@code dev}
 * SANS marqueur prod : il n'est donc jamais bloqué (pas de collision avec ce check).
 *
 * <p>Troisième garde-fou (#254) : refuse le boot si le cookie JWT n'est pas marqué
 * {@code Secure} ({@code app.cookie.secure} absent OU {@code false}) ALORS que
 * l'environnement est <em>prod effectif</em>. Contrairement au rate-limit (#216) dont
 * le défaut fail-safe est {@code true}, le défaut d'{@code app.cookie.secure} est
 * {@code false} (cf. {@code ProdConfigStartupLogger}). Un cookie non-{@code Secure} en
 * prod peut être transmis en clair (risque MITM) : on exige donc un {@code true}
 * EXPLICITE en prod effectif, et on traite {@code absent OU false} comme non-sécurisé.
 */
public class ProfileSafetyGuard
        implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    /** Valeurs (insensibles à la casse) d'un marqueur d'env considérées comme "prod". */
    static final List<String> PROD_MARKER_VALUES = List.of("production", "prod");

    /** Noms de variables d'env inspectées comme marqueur d'environnement. */
    static final List<String> ENV_MARKER_KEYS = List.of("ENVIRONMENT", "APP_ENV");

    /** Master-switch du rate-limit (défaut fail-safe {@code true}). */
    static final String RATE_LIMIT_ENABLED_KEY = "app.rate-limit.enabled";

    /** Flag {@code Secure} du cookie JWT (défaut applicatif {@code false}, cf. ProdConfigStartupLogger). */
    static final String COOKIE_SECURE_KEY = "app.cookie.secure";

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        ConfigurableEnvironment env = event.getEnvironment();

        checkDevProfileInProduction(env);       // #111 (inchangé, prioritaire)
        checkRateLimitDisabledInProduction(env); // #216
        checkCookieInsecureInProduction(env);   // #254
    }

    /**
     * Check #111 : marqueur prod présent ALORS que le profil {@code dev} est actif
     * (fallback silencieux {@code SPRING_PROFILES_ACTIVE:dev}) → refuse de booter.
     */
    private void checkDevProfileInProduction(ConfigurableEnvironment env) {
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

    /**
     * Check #216 : en prod effectif, {@code app.rate-limit.enabled=false} → refuse de
     * booter. Ne se déclenche QU'en prod effectif ; un boot dev/test qui désactive le
     * rate-limit (job CI e2e) reste autorisé.
     */
    private void checkRateLimitDisabledInProduction(ConfigurableEnvironment env) {
        if (!isProductionEffective(env)) {
            return; // Ni marqueur prod ni profil prod → dev/test, blocage non pertinent.
        }
        if (!isRateLimitDisabled(env)) {
            return; // Rate-limit actif (défaut) ou property absente → configuration sûre.
        }

        throw new IllegalStateException(
                "ARRÊT FAIL-FAST (#216) : '" + RATE_LIMIT_ENABLED_KEY + "=false' détecté "
                + "en environnement de production effective (marqueur ENVIRONMENT/APP_ENV=prod "
                + "ou profil Spring 'prod' actif). Désactiver le rate-limit en production est "
                + "refusé (protection anti-abus). Retirer cette property ou la remettre à 'true' "
                + "en prod ; la désactivation n'est légitime que dans le job CI e2e (profil test/dev).");
    }

    /**
     * Check #254 : en prod effectif, un cookie JWT non-{@code Secure}
     * ({@code app.cookie.secure} absent OU {@code false}) → refuse de booter. Un cookie
     * transmissible en clair exposerait le token à une interception (MITM). Le blocage
     * ne concerne que la prod effective ; dev/test (cookie localhost non sécurisé)
     * reste autorisé.
     */
    private void checkCookieInsecureInProduction(ConfigurableEnvironment env) {
        if (!isProductionEffective(env)) {
            return; // Ni marqueur prod ni profil prod → dev/test, blocage non pertinent.
        }
        if (!isCookieInsecure(env)) {
            return; // Cookie Secure explicitement activé → configuration sûre.
        }

        throw new IllegalStateException(
                "ARRÊT FAIL-FAST (#254) : le cookie JWT doit être marqué 'Secure' en "
                + "production ('" + COOKIE_SECURE_KEY + "=true'). Valeur absente ou 'false' "
                + "détectée en environnement de production effective (marqueur ENVIRONMENT/APP_ENV=prod "
                + "ou profil Spring 'prod' actif). Un cookie non-Secure peut être transmis en clair "
                + "sur une connexion non chiffrée (risque d'interception du token). Définir "
                + "explicitement '" + COOKIE_SECURE_KEY + "=true' en prod.");
    }

    /**
     * Vrai si le cookie JWT n'est PAS sécurisé : {@code app.cookie.secure} absent OU
     * explicitement {@code false}. Défaut fail-safe {@code false} (property absente =
     * non-sécurisé), à l'inverse du rate-limit (#216) : ici on EXIGE un {@code true}
     * explicite en prod, cohérent avec le défaut applicatif {@code false} du flag.
     */
    private boolean isCookieInsecure(ConfigurableEnvironment env) {
        return !env.getProperty(COOKIE_SECURE_KEY, Boolean.class, Boolean.FALSE);
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
     * "Prod effectif" pour #216 : marqueur d'env prod présent OU profil {@code prod}
     * explicitement actif. Volontairement disjoint du critère de #111 (profil {@code dev}) :
     * aucune collision logique, chaque check cible sa propre configuration dangereuse.
     */
    private boolean isProductionEffective(ConfigurableEnvironment env) {
        return isProductionMarkerPresent(env) || isProfileActive(env, "prod");
    }

    /**
     * Vrai si {@code app.rate-limit.enabled} est explicitement {@code false}. La property
     * absente vaut {@code true} (défaut fail-safe) → non désactivé.
     */
    private boolean isRateLimitDisabled(ConfigurableEnvironment env) {
        return !env.getProperty(RATE_LIMIT_ENABLED_KEY, Boolean.class, Boolean.TRUE);
    }

    /**
     * Vrai si le profil {@code dev} est effectivement actif : soit explicitement,
     * soit par fallback (aucun profil actif ⇒ le default {@code dev} de
     * {@code application.properties} s'applique).
     */
    private boolean isDevProfileActive(ConfigurableEnvironment env) {
        return isProfileActive(env, "dev");
    }

    /**
     * Vrai si {@code profileName} est actif : soit explicitement présent dans les profils
     * actifs, soit — en l'absence de profil actif résolu — présent dans la property brute
     * {@code spring.profiles.active} (default {@code dev}).
     */
    private boolean isProfileActive(ConfigurableEnvironment env, String profileName) {
        List<String> active = Arrays.asList(env.getActiveProfiles());
        if (active.isEmpty()) {
            // À ce stade le default ${SPRING_PROFILES_ACTIVE:dev} n'est pas encore
            // résolu en profil actif ; on lit la property brute pour anticiper.
            String resolved = env.getProperty("spring.profiles.active", "dev");
            return Arrays.stream(resolved.split(","))
                    .map(String::trim)
                    .anyMatch(profileName::equalsIgnoreCase);
        }
        return active.stream().anyMatch(profileName::equalsIgnoreCase);
    }
}
