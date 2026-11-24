package com.matimeline.eventmanager.infrastructure.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.ConfigurableApplicationContext;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #549 : log INFO de la configuration CORS active au boot en profil dev (hors e2e).
 *
 * <p>Test de contexte léger ({@link ApplicationContextRunner}) : seul le logger est enregistré,
 * les profils sont réellement évalués par Spring, sans @SpringBootTest (donc sans
 * Testcontainers). Les application*.properties du profil sont lus pour de vrai
 * (ConfigDataApplicationContextInitializer), donc la surcharge par variable d'environnement
 * passe par la ligne réelle de application-dev.properties. Logs capturés par un ListAppender.
 */
@DisplayName("DevCorsStartupLogger — log CORS actif au boot dev")
class DevCorsStartupLoggerTest {

    private ListAppender<ILoggingEvent> appender;
    private ch.qos.logback.classic.Logger logbackLogger;

    @BeforeEach
    void setUp() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        logbackLogger = context.getLogger(DevCorsStartupLogger.class);
        appender = new ListAppender<>();
        appender.start();
        logbackLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logbackLogger.detachAppender(appender);
    }

    @Test
    @DisplayName("T1 profil dev, deux origines configurées → un INFO liste les deux origines")
    void logsResolvedAllowedOriginsAtInfo() {
        bootWith(List.of("dev"),
                "app.cors.allowed-origins=http://localhost:3000,http://localhost:3100");

        ILoggingEvent info = firstEventAt(Level.INFO);
        assertThat(info).as("un message INFO CORS est émis en profil dev").isNotNull();
        assertThat(info.getFormattedMessage())
                .contains("http://localhost:3000")
                .contains("http://localhost:3100");
    }

    @Test
    @DisplayName("T2 profil dev, variable de surcharge sur le port 3100 → origine surchargée annoncée")
    void logsOriginsOverriddenByEnvironmentVariable() {
        bootWith(List.of("dev"), "APP_CORS_ALLOWED_ORIGINS=http://localhost:3100");

        ILoggingEvent info = firstEventAt(Level.INFO);
        assertThat(info).as("un message INFO CORS est émis en profil dev").isNotNull();
        assertThat(info.getFormattedMessage())
                .contains("http://localhost:3100")
                .doesNotContain("http://localhost:3000");
    }

    @Test
    @DisplayName("T3 le message nomme la configuration CORS active, la propriété et les origines")
    void messageNamesActiveCorsConfiguration() {
        bootWith(List.of("dev"));

        ILoggingEvent info = firstEventAt(Level.INFO);
        assertThat(info).as("un message INFO CORS est émis en profil dev").isNotNull();
        assertThat(info.getFormattedMessage())
                .contains("[BOOT dev]")
                .contains("Configuration CORS active")
                .contains("app.cors.allowed-origins=")
                .contains("http://localhost:3000");
    }

    @Test
    @DisplayName("T5 profil prod → aucun message CORS de développement")
    void doesNotLogInProdProfile() {
        bootWith(List.of("prod"));

        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("T6 seul le profil test → aucun message CORS")
    void doesNotLogWithoutDevProfile() {
        bootWith(List.of("test"));

        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("T7 profils dev et e2e ensemble → aucun message CORS")
    void doesNotLogWhenDevAndE2eProfilesAreActive() {
        bootWith(List.of("dev", "e2e"));

        assertThat(appender.list).isEmpty();
    }

    /** Démarre un contexte avec le logger, puis publie ApplicationReadyEvent comme au boot. */
    private void bootWith(List<String> profiles, String... properties) {
        new ApplicationContextRunner()
                .withInitializer(ctx -> ctx.getEnvironment().setActiveProfiles(profiles.toArray(String[]::new)))
                // charge les vrais application*.properties du profil (dont application-dev.properties)
                .withInitializer(new ConfigDataApplicationContextInitializer())
                // comme SpringApplication : sans lui, "a,b" ne serait pas découpé en List<String>
                .withInitializer(ctx -> ctx.getBeanFactory()
                        .setConversionService(ApplicationConversionService.getSharedInstance()))
                .withPropertyValues(properties)
                .withUserConfiguration(DevCorsStartupLogger.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    ConfigurableApplicationContext ctx = context.getSourceApplicationContext();
                    ctx.publishEvent(new ApplicationReadyEvent(
                            new SpringApplication(), new String[0], ctx, Duration.ZERO));
                });
    }

    private ILoggingEvent firstEventAt(Level level) {
        return appender.list.stream()
                .filter(e -> e.getLevel() == level)
                .findFirst()
                .orElse(null);
    }
}
