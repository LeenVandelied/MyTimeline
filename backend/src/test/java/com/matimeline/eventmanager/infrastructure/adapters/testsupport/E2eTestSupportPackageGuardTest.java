package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Garde-fou structurel du canal de capture test-only (issue #283, ADR-005).
 *
 * <p>Analyse bytecode pure (pattern {@code ArchitectureTest}) : aucun contexte Spring.
 * Deux invariants, tous deux destinés à survivre aux évolutions FUTURES du package —
 * {@code E2eTestSupportProfileTest} teste les classes d'AUJOURD'HUI, ce test-ci contraint
 * celles de DEMAIN :
 *
 * <ol>
 *   <li>Toute classe de {@code infrastructure.adapters.testsupport} porte
 *       {@code @Profile("e2e")} — une classe test-only ajoutée sans annotation (ou avec un
 *       profil plus large, ex. {@code dev}) casse le build.</li>
 *   <li>Aucune classe de production HORS de ce package ne dépend de ce package — le canal
 *       reste strictement optionnel ; sa disparition (profil inactif) ne peut pas casser un
 *       chemin de production.</li>
 * </ol>
 */
class E2eTestSupportPackageGuardTest {

    private static final String ROOT = "com.matimeline.eventmanager";
    private static final String TEST_SUPPORT_PACKAGE = ROOT + ".infrastructure.adapters.testsupport";

    /** Classes de PRODUCTION uniquement (target/classes) : les tests de ce package sont exclus. */
    private static JavaClasses importProduction(String packageName) {
        return new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(packageName);
    }

    @Test
    void everyTestSupportClass_isGatedByE2eProfileOnly() {
        JavaClasses classes = importProduction(TEST_SUPPORT_PACKAGE);

        int checked = 0;
        for (JavaClass javaClass : classes) {
            // Interfaces (contrat, pas un bean) et classes imbriquées (record de réponse,
            // porté par sa classe englobante déjà annotée) hors périmètre.
            if (javaClass.isInterface() || javaClass.getName().contains("$")) {
                continue;
            }

            Profile profile = javaClass.reflect().getAnnotation(Profile.class);
            assertThat(profile)
                    .as("%s doit porter @Profile — toute classe de %s est test-only",
                            javaClass.getSimpleName(), TEST_SUPPORT_PACKAGE)
                    .isNotNull();
            assertThat(profile.value())
                    .as("%s doit être conditionnée au SEUL profil e2e (jamais dev/test/prod)",
                            javaClass.getSimpleName())
                    .containsExactly("e2e");
            checked++;
        }

        // Le canal compte 3 classes conditionnées (controller, adaptateur JPA, config sécurité).
        // Borne basse explicite : sans elle, une boucle vide rendrait ce test vert à tort.
        assertThat(checked)
                .as("le package test-only doit contenir au moins ses 3 classes conditionnées")
                .isGreaterThanOrEqualTo(3);
    }

    @Test
    void productionCode_shouldNotDependOnTestSupportPackage() {
        JavaClasses classes = importProduction(ROOT);

        ArchRule rule = noClasses()
                .that()
                .resideOutsideOfPackage(TEST_SUPPORT_PACKAGE + "..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(TEST_SUPPORT_PACKAGE + "..")
                .because("le canal de capture E2E est OPTIONNEL (profil e2e) : aucun chemin de "
                        + "production ne doit en dépendre, sinon son absence casserait l'application");

        rule.check(classes);
    }
}
