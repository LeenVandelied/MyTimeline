package com.matimeline.eventmanager.infrastructure.config;

import com.matimeline.eventmanager.infrastructure.security.SecurityConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Journalise (niveau INFO) les origines CORS actives au démarrage en profil {@code dev} (#549).
 *
 * <p>Pourquoi : un front lancé sur un autre port que celui autorisé reçoit un 403 CORS peu
 * parlant. La liste résolue (surcharge {@code APP_CORS_ALLOWED_ORIGINS} comprise) permet de
 * le diagnostiquer d'un coup d'œil dans les logs de boot.
 *
 * <p>Les origines sont lues comme dans {@link SecurityConfig} (même expression). Absent en prod,
 * qui a {@link ProdConfigStartupLogger}, et en profil {@code e2e}.
 */
@Component
@Profile("dev & !e2e")
public class DevCorsStartupLogger {

    private static final Logger log = LoggerFactory.getLogger(DevCorsStartupLogger.class);

    private final List<String> allowedOrigins;

    public DevCorsStartupLogger(
            @Value(SecurityConfig.ALLOWED_ORIGINS_EXPRESSION) List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logActiveCorsConfig() {
        log.info("[BOOT dev] Configuration CORS active, app.cors.allowed-origins={}", allowedOrigins);
    }
}
