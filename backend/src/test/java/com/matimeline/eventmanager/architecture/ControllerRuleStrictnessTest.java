package com.matimeline.eventmanager.architecture;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.matimeline.eventmanager.application.services.fixtures.FakeConcreteServiceImpl;
import com.matimeline.eventmanager.infrastructure.adapters.controllers.fixtures.FakeControllerUsingServiceImpl;
import com.tngtech.archunit.ArchConfiguration;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import java.nio.file.Path;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Test du test (#221) : la règle « controllers sans *ServiceImpl » de {@link ArchitectureTest}
 * doit échouer tout de suite sur une violation, sans qu'une baseline gelée l'absorbe.
 *
 * <p>Le store de gel est isolé dans un dossier temporaire avec création autorisée : une règle gelée
 * y crée sa baseline et absorbe la violation (le test est alors rouge), une règle stricte échoue.
 * Le store versionné n'est jamais touché.
 *
 * <p>Les classes fictives reprennent les packages visés par la règle (controllers.. et
 * application.services..). ArchitectureTest exclut les tests de son import, elles ne polluent
 * donc aucune autre règle.
 */
class ControllerRuleStrictnessTest {

    @AfterEach
    void restoreArchConfiguration() {
        ArchConfiguration.get().reset();
    }

    @Test
    void controllerDependingOnServiceImpl_failsImmediately_withoutFreezeStore(@TempDir Path tempStore) {
        ArchConfiguration.get().setProperty("freeze.store.default.path", tempStore.toString());
        ArchConfiguration.get()
                .setProperty("freeze.store.default.allowStoreCreation", "true");

        JavaClasses fixtures =
                new ClassFileImporter()
                        .importClasses(
                                FakeControllerUsingServiceImpl.class, FakeConcreteServiceImpl.class);

        assertThatThrownBy(
                        () ->
                                ArchitectureTest.controllersShouldNotDependOnServiceImplRule()
                                        .check(fixtures))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("FakeConcreteServiceImpl");
    }
}
