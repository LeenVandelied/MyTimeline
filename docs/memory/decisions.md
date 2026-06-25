# Décisions — MyTimeline

> Décisions d'architecture/implémentation consolidées en fin de sprint.

## DEC-S1-001 — Logique de mise à jour event déplacée controller → service
`EventController.updateEvent` contenait la boucle de mapping champ-par-champ (`containsKey`/`instanceof`/casts) sur un `Map<String,Object>`. Remplacée par un DTO typé `EventUpdateRequest` (`@Valid`) ; le mapping vit désormais dans `EventServiceImpl.updateEvent(UUID, EventUpdateRequest)`. Motif : respect hexagonal (controller mince), surface minimale avant les retouches #30/#31. (Sprint 1 #28)

## DEC-S1-002 — @Size(min=1) plutôt que @NotBlank sur EventUpdateRequest.title
Pour préserver la sémantique PATCH partielle (le front a un endpoint « couleurs seules » sans title). `@Size(min=1)` rejette "" (→400 « titre vide ») mais tolère l'absence (null). Voir [[pitfalls]] PIT-S1-001. (Sprint 1 #28)

## DEC-S1-003 — Identité d'ownership via cookie JWT (pattern existant ProductController)
Sprint 1 a réutilisé le pattern existant `@CookieValue("jwt")` + `jwtService` pour l'ownership, plutôt que `SecurityContextHolder`. Cohérence avec le code existant. Migration vers `SecurityContextHolder` (cohérence cookie/Bearer) actée en follow-up #93. (Sprint 1 #30)

## DEC-S2-001 — Rate limiting auth via Bucket4j in-memory mono-instance (pas Redis)
Bucket4j 8.10.1 in-memory (`io.github.bucket4j`), buckets `ConcurrentHashMap<(IP,path),Bucket>`. Motif : déploiement single-instance actuel, zéro infra ajoutée. Dette documentée : derrière un load-balancer à N replicas le plafond effectif = N × seuil → passer à `bucket4j-redis` au scale-out. (Sprint 2 #33)

## DEC-S2-002 — Contraintes d'unicité username/email au niveau JPA seulement (migration Flyway reportée S3)
`@Column(unique=true)` posé sur `UserEntity` (DB recréée en dev) sans migration Flyway ce sprint — la migration des contraintes DB est coordonnée avec Sprint 3 / #42. Le 409 sur doublon repose sur le catch `DataIntegrityViolationException` (username garde aussi un pré-check applicatif). (Sprint 2 #32)

## DEC-S3-001 — Spring Boot 3.2.2 = Flyway 9.22.3 (pas 10), `flyway-core` seul
Le BOM Boot 3.2.2 gère Flyway 9.22.3. En 9.x le support Postgres est dans `flyway-core` ; le module `flyway-database-postgresql` n'existe qu'à partir de Flyway 10 → l'ajouter sous Boot 3.2.x casse (`version is missing`). Ne l'ajouter que lors d'un upgrade Boot 3.3+/Flyway 10+. (Sprint 3 #42)

## DEC-S3-002 — Baseline Flyway : Option A (V1 sans uniques inline, V2 contraintes nommées)
`@Column(unique=true)` (#32) aurait fait générer des uniques auto-nommées dans la baseline → redondance avec les contraintes attendues. Choix : V1 omet les uniques inline, V2 pose `uq_users_username`/`uq_users_email` nommées, `@Column(unique=true)` conservé sur l'entité (`validate` n'audite pas les uniques → 0 conflit). DB = source unique des noms stables. (Sprint 3 #42)

## DEC-S3-003 — `application.properties` reste tracké mais secret-free + profils dev/prod
Plutôt que `git rm --cached`, le fichier commun garde `${VAR}` (non disruptif, approche Spring). Profils séparés : `-dev` (defaults locaux jetables), `-prod` (fail-fast sans default). `ddl-auto=validate` dans les deux (Flyway pilote le schéma). (Sprint 3 #34/#42)

## DEC-S3-004 — Audit JPA : `@Version Integer` + colonnes `NOT NULL DEFAULT`
Sous `ddl-auto=validate` + tables peuplées : `@Version` = `Integer` mappé `version integer NOT NULL DEFAULT 0` ; `createdAt`/`updatedAt` (LocalDateTime) mappés `timestamp NOT NULL DEFAULT now()`. Les DEFAULT backfillent les lignes existantes ; type/nullability identiques entité↔colonne sinon `validate` casse. `@EnableJpaAuditing` sur `EventmanagerApplication`. (Sprint 3 #43)
