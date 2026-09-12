package com.matimeline.eventmanager.infrastructure.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.PropertyPlaceholderAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import com.matimeline.eventmanager.domain.ports.services.StoragePort;

/**
 * Issue #264 — chemin de stockage DÉDIÉ aux exports RGPD. Vérifie que {@code StorageConfig}
 * câble deux beans {@link StoragePort} DISTINCTS, chacun sur SON répertoire, et que la clé
 * {@code app.storage.export-path} suit la convention #34 (fail-fast : aucun default en prod).
 *
 * <p>Test de tranche léger ({@link ApplicationContextRunner}) : ni Postgres ni contexte web,
 * on n'exerce que le câblage de stockage.
 */
class StorageConfigTest {

    // PropertyPlaceholderAutoConfiguration -> PropertySourcesPlaceholderConfigurer avec
    // ignoreUnresolvablePlaceholders=false (comme un vrai boot Spring Boot). Sans lui, le
    // resolver par défaut du contexte IGNORE les placeholders non résolus (ne reproduit pas
    // le fail-fast prod). Avec lui, un ${app.storage.export-path} absent fait échouer le boot.
    private final ApplicationContextRunner runner =
            new ApplicationContextRunner()
                    .withConfiguration(AutoConfigurations.of(PropertyPlaceholderAutoConfiguration.class))
                    .withUserConfiguration(StorageConfig.class);

    @Test
    void exportAndAvatarStorage_useDistinctDirectories(@TempDir Path avatarDir,
                                                       @TempDir Path exportDir) {
        runner.withPropertyValues(
                        "app.storage.avatar-path=" + avatarDir,
                        "app.storage.export-path=" + exportDir)
                .run(context -> {
                    StoragePort avatarStorage = context.getBean("avatarStorage", StoragePort.class);
                    StoragePort exportStorage = context.getBean("exportStorage", StoragePort.class);
                    assertNotSame(avatarStorage, exportStorage, "deux beans de stockage distincts");

                    // L'export écrit dans SON base-path dédié, JAMAIS dans le répertoire avatar.
                    String ref = exportStorage.store(new byte[] {1, 2, 3}, "zip");
                    assertTrue(Files.exists(exportDir.resolve(ref)),
                            "le fichier d'export est écrit sous export-path");
                    assertTrue(isEmpty(avatarDir),
                            "aucun fichier d'export ne fuit dans le répertoire avatar");
                });
    }

    @Test
    void missingExportPath_failsFast_perConvention34() {
        // Aucun default en prod : sans app.storage.export-path, le placeholder ne se résout pas
        // et le contexte échoue au démarrage (fail-fast, cohérent avatar-path/jwt.private-key).
        runner.withPropertyValues("app.storage.avatar-path=/tmp/mytimeline-avatars-test")
                .run(context -> assertTrue(context.getStartupFailure() != null,
                        "le boot doit échouer si app.storage.export-path est absent"));
    }

    private static boolean isEmpty(Path dir) {
        try (Stream<Path> entries = Files.list(dir)) {
            return entries.findAny().isEmpty();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
