package com.matimeline.eventmanager.support;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Socle des tests {@code @SpringBootTest} : démarre UN conteneur Postgres
 * jetable, partagé entre toutes les classes de test, à la place de la base dev
 * partagée {@code localhost:5432/eventmanager}.
 *
 * <p>Motivation (incident 2026-06-25) : faire tourner les @SpringBootTest contre
 * la base dev réelle les rendait non déterministes (mutations concurrentes entre
 * worktrees) et cassait toute la suite quand la base dev était dans un état
 * incohérent (doublons d'email faisant échouer la migration V2 {@code uq_users_email}).
 *
 * <p>Pattern <em>singleton container</em> : le conteneur est démarré une seule
 * fois dans un bloc statique et JAMAIS arrêté explicitement — il est réutilisé
 * par toutes les classes filles (rapidité) puis réclamé par le sidecar Ryuk de
 * Testcontainers à l'arrêt de la JVM. On évite ainsi {@code @Testcontainers} +
 * {@code @Container} qui, combinés à l'héritage, redémarreraient/arrêteraient le
 * conteneur par classe.
 *
 * <p>Postgres officiel (même dialecte que la prod) : Flyway rejoue V1 (baseline)
 * puis V2 (contraintes uniques) sur un schéma vierge, et Hibernate valide
 * (profil {@code test}, {@code ddl-auto=validate}). Pas de H2 : son dialecte
 * divergent produirait des faux positifs sur les contraintes / types uuid.
 */
@ActiveProfiles("test")
public abstract class AbstractPostgresIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    /**
     * Injecte les coordonnées du conteneur (port aléatoire) dans l'environnement
     * Spring AVANT le démarrage du contexte, écrasant les defaults
     * {@code localhost:5432/eventmanager} de application.properties.
     */
    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
