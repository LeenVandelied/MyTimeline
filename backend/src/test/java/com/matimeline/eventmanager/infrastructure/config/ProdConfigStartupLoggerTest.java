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
import org.springframework.context.annotation.Profile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test LÉGER (#130) : invoque directement la méthode {@code @EventListener} avec des
 * valeurs injectées et capture les logs via un {@link ListAppender} logback. Pas de
 * {@code @SpringBootTest} (éviterait Testcontainers + env prod). Aucune valeur secrète
 * n'est manipulée ni assertée.
 */
@DisplayName("ProdConfigStartupLogger — log config cookie/CORS effective au boot prod")
class ProdConfigStartupLoggerTest {

    private ListAppender<ILoggingEvent> appender;
    private ch.qos.logback.classic.Logger logbackLogger;

    @BeforeEach
    void setUp() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        logbackLogger = context.getLogger(ProdConfigStartupLogger.class);
        appender = new ListAppender<>();
        appender.start();
        logbackLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logbackLogger.detachAppender(appender);
    }

    @Test
    @DisplayName("le bean est strictement profilé prod")
    void beanIsProdProfiled() {
        Profile profile = ProdConfigStartupLogger.class.getAnnotation(Profile.class);
        assertThat(profile).isNotNull();
        assertThat(profile.value()).containsExactly("prod");
    }

    @Test
    @DisplayName("logge un INFO avec les noms de variables et valeurs résolues")
    void logsEffectiveConfigAtInfo() {
        new ProdConfigStartupLogger(
                List.of("https://app.example.com"), "example.com", true)
                .logEffectiveConfig();

        ILoggingEvent info = firstEventAt(Level.INFO);
        assertThat(info).isNotNull();
        String message = info.getFormattedMessage();
        assertThat(message)
                .contains("app.cookie.secure=true")
                .contains("app.cookie.domain='example.com'")
                .contains("app.cors.allowed-origins=")
                .contains("https://app.example.com");
    }

    // Les tests des WARN COOKIE_DOMAIN / CORS_ALLOWED_ORIGINS vides ont été RETIRÉS (#253) :
    // ces WARN ont disparu de ProdConfigStartupLogger, remplacés par un fail-fast au boot dans
    // ProfileSafetyGuard (cf. ProfileSafetyGuardTest, checks #253). Ce logger ne conserve que
    // le log INFO de la config effective.

    @Test
    @DisplayName("ne logge aucune valeur secrète")
    void logsNoSecret() {
        new ProdConfigStartupLogger(
                List.of("https://app.example.com"), "example.com", true)
                .logEffectiveConfig();

        assertThat(appender.list).allSatisfy(event -> {
            String m = event.getFormattedMessage();
            assertThat(m)
                    .doesNotContain("JWT_PRIVATE_KEY")
                    .doesNotContain("EXPORT_TOKEN_SECRET")
                    .doesNotContain("DB_PASSWORD")
                    .doesNotContain("BREVO_API_KEY");
        });
    }

    private ILoggingEvent firstEventAt(Level level) {
        return appender.list.stream()
                .filter(e -> e.getLevel() == level)
                .findFirst()
                .orElse(null);
    }
}
