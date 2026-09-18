package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.tngtech.archunit.core.domain.JavaAnnotation;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
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

    /** Préfixe d'URL réservé au canal test-only ({@code E2eTestSupportSecurityConfig} y pose permitAll). */
    private static final String TEST_SUPPORT_PATH = "/api/test-support";

    /** Annotations de mapping Spring MVC dont on inspecte les chemins. */
    private static final Set<String> MAPPING_ANNOTATIONS = Set.of(
            RequestMapping.class.getName(),
            GetMapping.class.getName(),
            PostMapping.class.getName(),
            PutMapping.class.getName(),
            PatchMapping.class.getName(),
            DeleteMapping.class.getName());

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

    /**
     * Troisième invariant (audit sécurité S45) : le préfixe {@code /api/test-support} est
     * RÉSERVÉ à ce package. {@code E2eTestSupportSecurityConfig} pose un {@code permitAll}
     * sur {@code /api/test-support/**} ; un controller déclaré HORS du package mais mappé
     * sous ce préfixe hériterait de cet accès anonyme SANS être conditionné au profil
     * {@code e2e} — donc exposé en production. Nul aujourd'hui (un seul mapping), latent
     * demain : ce test le rend impossible.
     */
    @Test
    void noProductionMappingOutsideTestSupportPackage_usesTestSupportPathPrefix() {
        JavaClasses classes = importProduction(ROOT);

        int inspected = 0;
        for (JavaClass javaClass : classes) {
            if (javaClass.getPackageName().startsWith(TEST_SUPPORT_PACKAGE)) {
                continue; // Le package légitime : c'est justement lui qui détient le préfixe.
            }

            for (String path : mappingPaths(javaClass)) {
                assertThat(path)
                        .as("%s mappe '%s' : le préfixe %s est réservé au package %s "
                                + "(permitAll anonyme, conditionné au profil e2e)",
                                javaClass.getSimpleName(), path, TEST_SUPPORT_PATH,
                                TEST_SUPPORT_PACKAGE)
                        .doesNotStartWith(TEST_SUPPORT_PATH);
                inspected++;
            }
        }

        // Borne basse : sans elle, une extraction de chemins cassée rendrait ce test
        // vert à tort (0 chemin inspecté = 0 assertion).
        assertThat(inspected)
                .as("l'extraction des chemins de mapping doit trouver les controllers de production")
                .isGreaterThan(0);
    }

    /** Chemins déclarés par les annotations de mapping d'une classe et de ses méthodes. */
    private static List<String> mappingPaths(JavaClass javaClass) {
        List<JavaAnnotation<?>> annotations = new ArrayList<>(javaClass.getAnnotations());
        for (JavaMethod method : javaClass.getMethods()) {
            annotations.addAll(method.getAnnotations());
        }

        List<String> paths = new ArrayList<>();
        for (JavaAnnotation<?> annotation : annotations) {
            if (!MAPPING_ANNOTATIONS.contains(annotation.getRawType().getName())) {
                continue;
            }
            collectAttributeValues(annotation, "value", paths);
            collectAttributeValues(annotation, "path", paths);
        }
        return paths;
    }

    /** Ajoute à {@code target} les valeurs d'un attribut {@code String[]} (no-op si absent). */
    private static void collectAttributeValues(
            JavaAnnotation<?> annotation, String attribute, List<String> target) {
        Object value = annotation.get(attribute).orElse(null);
        if (value instanceof Object[] values) {
            for (Object element : values) {
                target.add(String.valueOf(element));
            }
        }
    }
}
