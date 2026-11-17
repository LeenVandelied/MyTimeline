# Issue #886 — Spring Boot 3.5.16 → 4.1.2

## Résumé

Fait par le lead (montée de plateforme, boucle compilation/tests itérative ; pas de fullstack-dev).
Commits `5d740f26` (montée) et `c2ab5f42` (sondes health, commentaires de versions). Remplace Dependabot #878.

Versions effectives : Spring Framework 7.0.10, Spring Security 7.1.2, Hibernate 7.4.13, Jackson 3.1.7
(+ Jackson 2.21.7 au runtime pour jjwt-jackson), Tomcat 11.0.27, Flyway 12.4.0, Testcontainers 2.0.5,
JUnit 6.0.3, PostgreSQL JDBC 42.7.14. Java 21 conservé.

**Ruptures du guide officiel** (wiki « Spring Boot 4.0 Migration Guide », éd. 2026-06-28) :
| Rupture | Traitement |
|---|---|
| Testcontainers 2 : artefacts renommés | `testcontainers-postgresql`, `testcontainers-junit-jupiter` (cause de l'échec de #878) |
| Modularisation : Flyway exige un starter | `spring-boot-starter-flyway` (sans lui, plus de migration au démarrage) |
| `spring-boot-starter-web` déprécié | `spring-boot-starter-webmvc` |
| RestClient sorti du starter web | `spring-boot-starter-restclient` (`RestClient.Builder` du client Brevo ; 18 contextes en échec sans lui) |
| Starters de test par techno | `webmvc-test`, `security-test` (remplace `spring-security-test`), `data-jpa-test`, `flyway-test` |
| `@MockBean`/`@SpyBean` retirés | `@MockitoBean` (10 usages, 2 fichiers) |
| `@AutoConfigureMockMvc` déplacé | `org.springframework.boot.webmvc.test.autoconfigure` (20 fichiers) |
| Jackson 3 (`tools.jackson`) | code : `JsonExportRenderer` (JsonMapper.builder, `DateTimeFeature`), `RateLimitingFilter` (`asString`, `JacksonException`), `SecurityConfig` ; tests : 5 fichiers (`asString`, `propertyNames`). Annotations `com.fasterxml.jackson.annotation` inchangées |
| Actuator : packages health | `org.springframework.boot.health.contributor` |
| Sondes liveness/readiness activées par défaut | désactivées (`management.endpoint.health.probes.enabled=false`) pour garder `{"status":"UP"}` |
| Spring Security 7 | `new DaoAuthenticationProvider(userDetailsService)` (setter retiré) |
| Propriétés renommées (`spring.jackson.*`, `spring.dao.*`, Mongo, session…) | sans objet : aucune utilisée |
| `@EntityScan`, `HttpMessageConverters`, `PropertyMapper`, `TestRestTemplate`, Undertow, Batch, Kafka, Jersey… | sans objet |

**Rupture hors guide, trouvée au boot réel** : sous Spring 7, `jpaSharedEM_entityManagerFactory` (Spring Data)
a `autowireCandidate=false` (mesuré par sonde) ; l'`EntityManager` injecté vient du FactoryBean
`entityManagerFactory` (primaire), reconnu seulement une fois instancié. Tomcat crée les filtres
(`JwtFilter` → `UserDetailsService` → adaptateurs JPA) AVANT la fabrique → « No qualifying bean of type
EntityManager » : boot réel et tests `RANDOM_PORT` cassés, MockMvc vert. Correctif : bean `EntityManager`
partagé `@Fallback` (`infrastructure/config/JpaSharedEntityManagerConfig`). Les tests `RANDOM_PORT`
(`PreferencesUserRateLimitPathVariantsIntegrationTest`…) rougissent sans lui : ils gardent la régression.

## Tests
- `mvnw verify` 688/688 (dont ArchUnit 5, BomDriftTest 7 avec nouvelle garde Jackson 3).
- Boot réel (`java -jar`, profils dev,e2e) sur base vierge : Flyway V1→V16, `ddl-auto=validate` OK, health UP.
- Navigateur intégré (`next build`+`next start` :3100, backend :8086) : inscription 201, connexion 200,
  catégorie 201, produit + 1er événement 201, événement 201, frise « Contrôle technique » 12→24 nov ;
  console : seul le 401 attendu avant connexion.
- CI : voir audit.

## Recommandations suite
- RECOMMAND_FOLLOWUP: test d'or du fichier d'export RGPD JSON (format non comparé octet à octet Jackson 2 vs 3) [XS | export]
- RECOMMAND_FOLLOWUP: retirer `spring.jpa.database-platform` (HHH90000025, 12 avertissements par run) [XS | transversal]
- RECOMMAND_FOLLOWUP: avertissement « Found 2 UserDetailsService beans » (customUserDetailsService + userDetailsService), non comparé à dev [XS | auth]
- Pas de RECOMMAND_DB_EXPERT : aucune migration. Pas de RECOMMAND_SECURITY : chaîne de filtres et CORS inchangés, seul le constructeur du provider change ; couvert par les tests d'auth et de rate-limit.

STATUS: COMPLETED
