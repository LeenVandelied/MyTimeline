package com.matimeline.eventmanager.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.Test;

/**
 * Garde du store de gel (#221) : la règle 3 (controllers sans *ServiceImpl) doit rester stricte.
 *
 * <p>ControllerRuleStrictnessTest ne surveille que la fabrique de la règle. Un freeze posé dans le
 * @Test d'ArchitectureTest passerait, et allowStoreCreation créerait alors une baseline sans
 * bruit. On lit donc le store versionné (classpath, comme ArchUnit) : toute entrée dont la
 * description vise la règle des controllers fait échouer ce test.
 */
class FreezeStoreGuardTest {

    private static final String STORE_RESOURCE = "/archunit_store/stored.rules";

    // Description exacte de la règle 3, plus le package visé au cas où le libellé évolue.
    private static final String CONTROLLERS_PACKAGE = "infrastructure.adapters.controllers";

    @Test
    void controllerRule_isNeverFrozenInStore() throws IOException {
        String ruleDescription =
                ArchitectureTest.controllersShouldNotDependOnServiceImplRule().getDescription();

        List<String> frozenControllerRules =
                loadStoredRuleDescriptions().stream()
                        .filter(
                                d ->
                                        d.contains(ruleDescription)
                                                || d.contains(CONTROLLERS_PACKAGE))
                        .toList();

        assertThat(frozenControllerRules)
                .as(
                        "La règle 3 (controllers sans *ServiceImpl) doit rester stricte : elle ne"
                                + " doit jamais figurer dans archunit_store/stored.rules. Retirer"
                                + " FreezingArchRule.freeze(...) autour de cette règle et supprimer"
                                + " l'entrée du store.")
                .isEmpty();
    }

    private static List<String> loadStoredRuleDescriptions() throws IOException {
        try (InputStream in = FreezeStoreGuardTest.class.getResourceAsStream(STORE_RESOURCE)) {
            if (in == null) {
                return List.of();
            }
            Properties stored = new Properties();
            stored.load(new InputStreamReader(in, StandardCharsets.ISO_8859_1));
            return stored.stringPropertyNames().stream().toList();
        }
    }
}
