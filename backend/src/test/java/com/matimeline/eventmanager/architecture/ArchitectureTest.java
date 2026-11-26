package com.matimeline.eventmanager.architecture;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.matimeline.archfixtures.FakeMisplacedAdvice;
import com.matimeline.eventmanager.application.services.fixtures.FakeConcreteServiceImpl;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.freeze.FreezingArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ControllerAdvice;

/**
 * Verrou d'architecture hexagonale (#166).
 *
 * <p>Analyse bytecode PURE : aucun conteneur, aucun contexte Spring — ce test reste rapide en CI.
 *
 * <p>Les règles 1, 2 et 4 sont enveloppées dans {@link FreezingArchRule} : les violations
 * HISTORIQUES sont gelées dans une baseline (src/test/resources/archunit_store/, versionnée). Le
 * build ne casse que sur une NOUVELLE violation ; corriger une violation existante la retire
 * automatiquement du store (dégel progressif au fil de l'hygiène hexagonale — cf.
 * RECOMMAND_FOLLOWUP). Les règles 3, 5 et 6 sont strictes : aucune baseline, toute violation casse.
 *
 * <p>Violations connues actuellement gelées :
 * <ul>
 *   <li>Ports {@code domain.ports.services.*Service} important des DTOs {@code application.dtos}.
 *   <li>Mappers {@code application.mappers} dépendant des entités {@code infrastructure.entities}.
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
     * (toléré sur les DTOs/commandes du domaine). Plus aucune violation gelée : l'ancien
     * {@code @Repository} de {@code ProductRepository} est retiré (#718).
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
     * Règle 3 — Les points d'entrée du serveur (classes portant, directement ou par méta-annotation,
     * {@code @Controller} ou {@code @ControllerAdvice}, donc aussi {@code @RestController} et
     * {@code @RestControllerAdvice}, ET toute classe du dossier des contrôleurs) dépendent des
     * PORTS (interfaces), jamais des {@code *ServiceImpl} concrets.
     *
     * <p>Stricte, non gelée : toute violation fait échouer le test, sans baseline. Le gestionnaire
     * global d'erreurs est inclus explicitement et le contrôleur de support E2E n'est pas exempté
     * (#321). Le bon exemple reste {@code CategoryController} (dépend des ports).
     */
    @Test
    void controllersShouldNotDependOnConcreteServiceImplementations() {
        controllersShouldNotDependOnServiceImplRule().check(classesUnderTest);
    }

    /**
     * Périmètre de la règle 3 (#321) : le gestionnaire global d'erreurs porte une annotation
     * d'advice, pas celle de contrôleur, et reste soumis à la règle (décision du plan). Une
     * fixture advice rangée hors du dossier des contrôleurs doit donc être détectée.
     */
    @Test
    void controllersShouldNotDependOnConcreteServiceImplementations_scopeIsExplicit() {
        JavaClasses fixtures =
                new ClassFileImporter()
                        .importClasses(FakeMisplacedAdvice.class, FakeConcreteServiceImpl.class);

        assertThatThrownBy(() -> controllersShouldNotDependOnServiceImplRule().check(fixtures))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("FakeMisplacedAdvice");
    }

    /**
     * Règle 3, exposée pour ControllerRuleStrictnessTest.
     *
     * <p>Vise les points d'entrée du serveur par leur rôle où qu'ils soient rangés : classes
     * méta-annotées {@code @Controller} ou {@code @ControllerAdvice} (couvre {@code @RestController},
     * {@code @RestControllerAdvice} et les annotations composées), ET toute classe du dossier des
     * contrôleurs, annotée ou non. Le
     * périmètre est l'union rôle + dossier, plus large que le seul dossier d'avant : le dossier est
     * conservé parce que les fixtures non annotées de ControllerRuleStrictnessTest (verrouillé) y
     * sont rangées. Le gestionnaire global d'erreurs est donc soumis explicitement, et le
     * contrôleur de support E2E n'est pas exempté (#321).
     */
    static ArchRule controllersShouldNotDependOnServiceImplRule() {
        return noClasses()
                .that()
                .areMetaAnnotatedWith(Controller.class)
                .or()
                .areMetaAnnotatedWith(ControllerAdvice.class)
                .or()
                // Le dossier reste couvert : les fixtures de ControllerRuleStrictnessTest (verrouillé)
                // y sont rangées sans stéréotype Spring pour ne pas être scannées.
                .resideInAPackage(ROOT + ".infrastructure.adapters.controllers..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(ROOT + ".application.services..")
                .because(
                        "un point d'entrée du serveur (rôle contrôleur ou advice, où qu'il soit rangé, ou"
                                + " classe du dossier des contrôleurs) doit dépendre des ports domaine"
                                + " (interfaces), pas des *ServiceImpl concrets");
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

    /**
     * Règle 5 — Garde-fou CVE-2026-40973 (session hijacking) : aucune classe de production
     * n'utilise {@code jakarta.servlet.http.HttpSession}.
     *
     * <p>L'acceptation de CVE-2026-40973 (docs/security/cve-acceptance.md) repose sur la posture
     * STATELESS de l'application (cookie JWT HttpOnly, {@code SessionCreationPolicy.STATELESS}) :
     * aucune {@code HttpSession} serveur n'est créée. Réintroduire une {@code HttpSession}
     * invaliderait silencieusement cette acceptation — ce test échoue alors AVANT le merge.
     *
     * <p>Complément comportemental : {@code StatelessSessionGuardTest} (aucune session/JSESSIONID
     * matérialisée à l'exécution, ce qui couvre aussi un changement de {@code SessionCreationPolicy}
     * vers ALWAYS).
     */
    @Test
    void productionCodeShouldNotUseHttpSession() {
        ArchRule rule =
                noClasses()
                        .that()
                        .resideInAPackage(ROOT + "..")
                        .should()
                        .dependOnClassesThat()
                        .haveFullyQualifiedName("jakarta.servlet.http.HttpSession")
                        .because(
                                "l'application est STATELESS (cookie JWT) ; introduire une HttpSession"
                                        + " invaliderait l'acceptation de CVE-2026-40973 (session"
                                        + " hijacking) — cf. docs/security/cve-acceptance.md");

        rule.check(classesUnderTest);
    }

    /**
     * Règle 6 (#185) — Le coeur métier ne dépend pas de la couche applicative. Stricte, non gelée :
     * les ports de service prennent des commandes du domaine, jamais des DTO HTTP.
     */
    @Test
    void domainShouldNotDependOnApplicationLayer() {
        ArchRule rule =
                noClasses()
                        .that()
                        .resideInAPackage(DOMAIN)
                        .should()
                        .dependOnClassesThat()
                        .resideInAPackage(APPLICATION)
                        .because(
                                "le domaine ne connaît pas les DTO d'échange de la couche application");

        rule.check(classesUnderTest);
    }
}
