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

## DEC-S4-001 — Cookies JWT : attributs externalisés par profil + defaults de base fail-safe
`app.cookie.secure` / `app.cookie.domain` lus en `@Value`, appliqués via un helper unique `buildJwtCookie` (login/refresh/logout → attributs cohérents, BR-AUT-010). Defaults : `application-dev` = `false`/`localhost`, `application-prod` = `true`/host-only (`${COOKIE_DOMAIN:}`). Le default de base `application.properties` est **fail-safe** (`${COOKIE_SECURE:true}`, `${COOKIE_DOMAIN:}`) → un boot sans profil ni env var ne dégrade jamais en clair. Garde `if domain non blank` pour éviter `setDomain("")`. (Sprint 4 #99 + fix review)

## DEC-S4-002 — CSP backend stricte par directives explicites
Remplacer `default-src 'self'` permissif par directives explicites : `script-src 'self'`, `style-src 'self'` (sans `unsafe-inline`/`unsafe-eval`, cf. PIT-S4-003), `connect-src 'self'` (CORS n'autorise que localhost:3000, aucune origine API cross-origin), `img-src 'self' data:`, `font-src 'self'`, `base-uri 'self'` (NON hérité de default-src en CSP3), `object-src 'none'`, `frame-ancestors 'none'`. Assertion exacte de la chaîne CSP en test d'intégration (anti-régression). Externaliser connect-src par profil si SSR cross-origin un jour. (Sprint 4 #101 + fix review #113)

## DEC-S5-001 — Drift de contraintes corrigé par migration séparée
Réconciliation des CHECK/NOT NULL absents de la baseline via une migration V4 dédiée — jamais éditer V1/V2/V3 déjà appliquées (checksum mismatch Flyway → boot KO). V5 réservé aux index FK (#110). (Sprint 5 #108)

## DEC-S5-002 — SPRING_PROFILES_ACTIVE : default dev + garde-fou fail-fast (pas suppression)
Garder `${SPRING_PROFILES_ACTIVE:dev}` (confort dev local) + `ProfileSafetyGuard` (ApplicationListener) qui refuse le boot si profil `dev` actif ET marqueur `ENVIRONMENT/APP_ENV=production|prod`. Double signal prod requis. Choisi plutôt que suppression sèche du default (casserait mvn/IDE/tests) ou doc-only (défense passive). (Sprint 5 #111)

## DEC-S5-003 — SameSite cookie JWT maintenu Lax (pas Strict)
Front Next.js sur origine séparée (localhost:3000 dev, distinct prod) → `Strict` casserait les requêtes auth cross-site et navigations entrantes (lien/email). CSRF déjà couvert (API JSON + cookie HttpOnly + CORS allowCredentials). Reconsidérer si front+API passent sur le même eTLD+1 en prod. `COOKIE_SAME_SITE` vit dans AuthController (helper cookie #99). (Sprint 5 #120)

## DEC-S5-004 — Runbook de déploiement consolidé en hub unique
`docs/runbook/deploiement-profils.md` = source unique listant les env prod obligatoires (SPRING_PROFILES_ACTIVE=prod, ENVIRONMENT=production, CORS_ALLOWED_ORIGINS, COOKIE_DOMAIN, secrets DB/JWT) ; `cors-cookie-samesite.md` référence le hub. Évite la dérive doc (variable « optionnelle » ici, absente là). (Sprint 5 #118)

## DEC-S5-005 — Test 403 d'ownership : @WithMockUser(authorities=ROLE_USER)
Requis pour franchir `hasAuthority("ROLE_USER")` et atteindre le contrôleur où se lève le 403 d'ownership (sans, on teste un 403 d'autorité, pas d'ownership). `JwtFilter` ne réécrit pas un contexte d'authentification déjà posé. (Sprint 5 #119)

## DEC-S7-001 — change-password derrière le port UserService (correction A8)
La logique change-password (vérif BCrypt + re-hash) violait A8 en vivant dans le contrôleur (infra). Décision : `UserService.changePassword` (port domain) + logique dans `UserServiceImpl`, `InvalidCredentialsException`/`SamePasswordException` → 400. Pas de port d'encodage créé (scope min : `PasswordEncoder` = interface légère déjà tolérée en application). (Sprint 7 #70)

## DEC-S7-002 — Coexistence axios brut / TanStack Query (migration progressive)
Le transport reste axios (le `queryFn` appelle le service axios existant) ; TanStack n'ajoute que cache/dédup/refetch. Migration progressive, 2 hooks pilotes seulement (`useCurrentUser`, `useProductsWithEvents`), le reste des appels reste axios brut documenté. (Sprint 7 #48)

## DEC-S8-001 — `BrevoEmailService` no-op + swallow si `BREVO_API_KEY` absente
Sans clé : `log.warn` + no-op ; `RestClientException` avalée (log sans token/clé). Raison : (1) forgot-password ne doit pas leaker l'existence d'un compte via timing/erreur (BR-AUT-005) ; (2) dev/test bootent sans le secret. Corollaire (follow-up ouvert) : en prod ce no-op silencieux = emails jamais envoyés sans alerte → fail-fast prod / health indicator à ajouter. (Sprint 8 #49)

## DEC-S8-002 — Token reset : validité 15 min, usage unique
Durée de validité du token de reset = **15 minutes** (override dev, pas 2h) ; usage unique via `used_at` ; token invalide/expiré/consommé/non-UUID → 400 générique unique (anti-énum). Configurable `app.password-reset.token-validity-minutes`. #103 fermée comme doublon, ses éléments (BR-AUT-011 + tests intégration) absorbés dans #49. (Sprint 8 #49)
