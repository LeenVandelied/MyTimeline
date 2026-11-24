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

    // Entrée fautive : la description exacte de la règle 3, ou, si le libellé évolue, la cible
    // interdite (application.services) combinée à une source contrôleur (le mot Controller, qui
    // couvre les annotations, ou le dossier des contrôleurs, toujours couvert par la règle).
    // La cible seule ne suffit pas : une règle gelée voisine (domaine vers application.services)
    // reste tolérée.
    private static final String CONTROLLERS_PACKAGE = "infrastructure.adapters.controllers";
    private static final String CONTROLLER_MARKER = "Controller";
    private static final String FORBIDDEN_TARGET = "application.services";

    @Test
    void controllerRule_isNeverFrozenInStore() throws IOException {
        String ruleDescription =
                ArchitectureTest.controllersShouldNotDependOnServiceImplRule().getDescription();

        List<String> frozenControllerRules =
                loadStoredRuleDescriptions().stream()
                        .filter(d -> targetsControllerRule(d, ruleDescription))
                        .toList();

        assertThat(frozenControllerRules)
                .as(
                        "La règle 3 (controllers sans *ServiceImpl) doit rester stricte : elle ne"
                                + " doit jamais figurer dans archunit_store/stored.rules. Retirer"
                                + " FreezingArchRule.freeze(...) autour de cette règle et supprimer"
                                + " l'entrée du store.")
                .isEmpty();
    }

    @Test
    void filter_toleratesNeighbouringFrozenRule_butRejectsControllerRule() {
        String ruleDescription =
                ArchitectureTest.controllersShouldNotDependOnServiceImplRule().getDescription();
        String neighbour =
                "no classes that reside in a package 'com.matimeline.eventmanager.domain..'"
                        + " should depend on classes that reside in a package"
                        + " 'com.matimeline.eventmanager.application.services..'";
        String reworded =
                "no classes that are meta-annotated with @Controller should depend on classes"
                        + " that reside in a package 'com.matimeline.eventmanager.application.services..'";

        assertThat(targetsControllerRule(neighbour, ruleDescription)).isFalse();
        assertThat(targetsControllerRule(ruleDescription, ruleDescription)).isTrue();
        assertThat(targetsControllerRule(reworded, ruleDescription)).isTrue();
    }

    private static boolean targetsControllerRule(String storedDescription, String ruleDescription) {
        return storedDescription.contains(ruleDescription)
                || (storedDescription.contains(FORBIDDEN_TARGET)
                        && (storedDescription.contains(CONTROLLER_MARKER)
                                || storedDescription.contains(CONTROLLERS_PACKAGE)));
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
