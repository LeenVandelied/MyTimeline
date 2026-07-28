package com.matimeline.eventmanager.infrastructure.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Journalise (niveau INFO) la configuration cookie/CORS EFFECTIVE au démarrage,
 * uniquement en profil {@code prod} (#130).
 *
 * <p>Contexte : la config cookie ({@code app.cookie.domain}, {@code app.cookie.secure})
 * et CORS ({@code app.cors.allowed-origins}) est externalisée par profil (#117/#118/#120).
 * En production, une variable absente/typée/de-dev laisse l'application démarrer SANS
 * avertissement — le seul diagnostic possible est post-incident. Ce bean rend la config
 * résolue lisible dans les logs de boot, sans accès au code source.
 *
 * <p>ANTI-FUITE (#160) : SEULES ces valeurs de configuration NON sensibles sont journalisées.
 * Aucun secret ({@code JWT_PRIVATE_KEY}, {@code EXPORT_TOKEN_SECRET}, {@code DB_PASSWORD},
 * {@code BREVO_API_KEY}...) n'est lu ni loggé ici.
 *
 * <p>Écoute {@link ApplicationReadyEvent} : s'exécute après la création du contexte, donc
 * après les garde-fous d'environnement fail-fast ({@link ProfileSafetyGuard}, #111). Bean
 * {@code @Profile("prod")} STRICT : aucun log en dev/test.
 */
@Component
@Profile("prod")
public class ProdConfigStartupLogger {

    private static final Logger log = LoggerFactory.getLogger(ProdConfigStartupLogger.class);

    private final List<String> allowedOrigins;
    private final String cookieDomain;
    private final boolean cookieSecure;

    public ProdConfigStartupLogger(
            @Value("${app.cors.allowed-origins:}") List<String> allowedOrigins,
            @Value("${app.cookie.domain:}") String cookieDomain,
            @Value("${app.cookie.secure:false}") boolean cookieSecure) {
        this.allowedOrigins = allowedOrigins;
        this.cookieDomain = cookieDomain;
        this.cookieSecure = cookieSecure;
    }

    /** Journalise la config effective une fois le contexte prêt (démarrage prod). */
    @EventListener(ApplicationReadyEvent.class)
    public void logEffectiveConfig() {
        log.info(
                "[BOOT prod] Configuration effective sécurité — "
                + "app.cookie.secure={} app.cookie.domain='{}' app.cors.allowed-origins={}",
                cookieSecure, cookieDomain, allowedOrigins);

        // Les WARN historiques sur COOKIE_DOMAIN / CORS_ALLOWED_ORIGINS vides ont été RETIRÉS
        // (#253) : ces cas sont désormais des fail-fast dans ProfileSafetyGuard, exécutés au
        // plus tôt (ApplicationEnvironmentPreparedEvent, avant création des beans). En prod
        // effectif, un boot avec ces variables vides est déjà bloqué avant d'atteindre ce
        // logger (ApplicationReadyEvent) : le WARN serait donc du code mort. Le log INFO de la
        // config effective ci-dessus reste utile pour le diagnostic post-boot.
    }
}
