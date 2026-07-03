package com.matimeline.eventmanager.architecture;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.freeze.FreezingArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Verrou d'architecture hexagonale (#166).
 *
 * <p>Analyse bytecode PURE : aucun conteneur, aucun contexte Spring — ce test reste rapide en CI.
 *
 * <p>Chaque règle est enveloppée dans {@link FreezingArchRule} : les violations HISTORIQUES sont
 * gelées dans une baseline (src/test/resources/archunit_store/, versionnée). Le build ne casse que
 * sur une NOUVELLE violation ; corriger une violation existante la retire automatiquement du store
 * (dégel progressif au fil de l'hygiène hexagonale — cf. RECOMMAND_FOLLOWUP).
 *
 * <p>Violations connues actuellement gelées :
 * <ul>
 *   <li>{@code Role} (domain) implémente {@code GrantedAuthority} (Spring Security).
 *   <li>{@code @Repository} (stéréotype Spring) posé sur les ports {@code domain.ports.repositories}.
 *   <li>Ports {@code domain.ports.services.*Service} important des DTOs {@code application.dtos}.
 *   <li>Mappers {@code application.mappers} dépendant des entités {@code infrastructure.entities}.
 *   <li>Controllers injectant les {@code *ServiceImpl} concrets au lieu des ports.
 * </ul>
 */
class ArchitectureTest {

    private static final String ROOT = "com.matimeline.eventmanager";

    private static final String DOMAIN = ROOT + ".domain..";
    private static final String APPLICATION = ROOT + ".application..";
    private static final String INFRASTRUCTURE = ROOT + ".infrastructure..";

    private static JavaClasses classesUnderTest;

    @BeforeAll
    static void importClasses() {
        // On n'analyse que le code de production (pas les tests) du package racine réel.
        classesUnderTest =
                new ClassFileImporter()
                        .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                        .importPackages(ROOT);
    }

    /**
     * Règle 1 — Le domaine ne dépend d'aucun framework technique.
     *
     * <p>Interdit {@code org.springframework..} et {@code jakarta..}, SAUF {@code jakarta.validation..}
     * (toléré sur les DTOs/commandes du domaine). Gèle {@code Role -> GrantedAuthority}.
     */
    @Test
    void domainShouldNotDependOnSpringOrJakarta() {
        // Prédicat UNIQUE et combiné : "réside dans (org.springframework OU jakarta) ET PAS dans
        // jakarta.validation". Deux `dependOnClassesThat` chaînés via `andShould` NE fonctionnent
        // PAS comme une exclusion croisée : `andShould(B)` avec B = "dépend d'au moins une classe
        // hors jakarta.validation" est trivialement vrai (toute classe dépend de java.lang/util),
        // ce qui neutralise l'exception. Cf. review #166.
        DescribedPredicate<JavaClass> frameworkExceptValidation =
                resideInAnyPackage("org.springframework..", "jakarta..")
                        .and(DescribedPredicate.not(resideInAPackage("jakarta.validation..")));

        ArchRule rule =
                noClasses()
                        .that()
                        .resideInAPackage(DOMAIN)
                        .should()
                        .dependOnClassesThat(frameworkExceptValidation)
                        .because(
                                "le domaine doit rester du Java pur (seul jakarta.validation est toléré)");

        FreezingArchRule.freeze(rule).check(classesUnderTest);
    }

    /**
     * Règle 2 — Ni le domaine ni l'application ne dépendent de l'infrastructure.
     *
     * <p>Gèle les mappers {@code application.mappers} qui référencent les entités JPA.
     */
    @Test
    void domainAndApplicationShouldNotDependOnInfrastructure() {
        ArchRule rule =
                noClasses()
                        .that()
                        .resideInAnyPackage(DOMAIN, APPLICATION)
                        .should()
                        .dependOnClassesThat()
                        .resideInAPackage(INFRASTRUCTURE)
                        .because(
                                "la règle de dépendance hexagonale interdit à domain/ et application/"
                                        + " de connaître l'adaptateur technique");

        FreezingArchRule.freeze(rule).check(classesUnderTest);
    }

    /**
     * Règle 3 — Les controllers dépendent des PORTS (interfaces), jamais des {@code *ServiceImpl}
     * concrets.
     *
     * <p>Gèle {@code ProductController}/{@code UserController}/{@code AuthController} qui injectent
     * les implémentations. Le bon exemple reste {@code CategoryController} (dépend des ports).
     */
    @Test
    void controllersShouldNotDependOnConcreteServiceImplementations() {
        ArchRule rule =
                noClasses()
                        .that()
                        .resideInAPackage(ROOT + ".infrastructure.adapters.controllers..")
                        .should()
                        .dependOnClassesThat()
                        .resideInAPackage(ROOT + ".application.services..")
                        .because(
                                "un controller doit dépendre des ports domaine (interfaces), pas des"
                                        + " *ServiceImpl concrets");

        FreezingArchRule.freeze(rule).check(classesUnderTest);
    }

    /**
     * Règle 4 — Les adaptateurs JPA dépendent des PORTS de persistance, jamais des implémentations
     * concrètes entre eux ({@code *RepositoryJpaImpl}).
     *
     * <p>Complète la règle 3 côté persistance : un adaptateur ne doit pas se coupler à un autre
     * adaptateur concret ; le point de contact est le port {@code domain.ports.repositories}.
     */
    @Test
    void jpaAdaptersShouldNotDependOnConcreteJpaAdapters() {
        // Un *RepositoryJpaImpl ne doit pas dépendre d'un AUTRE *RepositoryJpaImpl concret : le
        // point de contact entre adaptateurs est le port domaine. La dépendance d'une classe sur
        // elle-même est ignorée par ArchUnit, donc "target ends with JpaImpl" cible bien les pairs.
        ArchRule rule =
                noClasses()
                        .that()
                        .resideInAPackage(ROOT + ".infrastructure.adapters.repositories.jpa..")
                        .and()
                        .haveSimpleNameEndingWith("JpaImpl")
                        .should()
                        .dependOnClassesThat()
                        .haveSimpleNameEndingWith("JpaImpl")
                        .because(
                                "un adaptateur JPA se couple aux ports domaine, pas aux autres"
                                        + " *RepositoryJpaImpl concrets");

        FreezingArchRule.freeze(rule).check(classesUnderTest);
    }
}
