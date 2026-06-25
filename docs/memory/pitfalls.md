# Pitfalls — MyTimeline

> Pièges récurrents consolidés en fin de sprint. 4 lignes max par entrée.

## PIT-S1-001 — @NotBlank sur un DTO de PATCH casse les updates partiels
Un PATCH partiel légitime peut omettre un champ (ex: endpoint « couleurs seules »). `@NotBlank` rejette null ET "" → casse l'omission. Utiliser `@Size(min=1)` (rejette "" mais tolère null) + application conditionnelle `if(!=null)` côté service. Vérifier TOUS les call-sites front avant de poser une contrainte de présence. (Sprint 1 #28)

## PIT-S1-002 — @Valid inerte si le DTO ne porte aucune contrainte
`@Valid` sur un `@RequestBody` ne fait rien si le DTO n'a aucune annotation Bean Validation (`AuthRequest` sans `@NotBlank` → login acceptait un payload vide). Toujours vérifier que le DTO porte des contraintes, sinon `@Valid` est cosmétique. (Sprint 1 #31)

## PIT-S1-003 — jwtService.extractUsername non catché dans un controller → 500
`extractUsername` lève `JwtException` (token malformé/expiré/signature) ; sans try/catch dans le controller → 500 + fuite stacktrace. Centraliser dans un helper `resolveCaller(token)` avec `try/catch (JwtException) → null` mappé en 401. (Sprint 1 #30/#91)

## PIT-S1-004 — `git add -A` dans un worktree sprint capture les artefacts d'orchestration
Le worktree sprint contient des fichiers untracked d'orchestration (`docs/memory/sprints/sprint-N/*` briefings/done.md). `git add -A` les capture par erreur. Stager explicitement les fichiers source/test (`git add <paths>` ciblés). (Sprint 1 correction post-review)

## PIT-S2-001 — Build backend = `cd backend && mvn`, pas de `./mvnw` ni `scripts/test-quiet.sh`
Le `mvnw` racine est cassé (`.mvn/wrapper` manquant) et le `pom.xml` vit dans `backend/`. Toujours `cd backend && mvn ...` (mvn système). Un hook PreToolUse bloque `mvn test` nu → préfixer `SKIP_DELEGATION=1 mvn test` pour les petites suites. Les tests d'intégration tapent une vraie Postgres (HikariPool au boot du contexte). (Sprint 2 #32/#33)

## PIT-S2-002 — Tester un contrat 401/403 Spring Security exige le full filter chain
`MockMvcBuilders.standaloneSetup` (utilisé par des tests existants) bypasse Spring Security → 401/403 jamais déclenchés = faux verts. Pour valider entryPoint/accessDeniedHandler et l'ownership, utiliser `@SpringBootTest` + `@AutoConfigureMockMvc`. Corollaire : les exceptions levées DANS un filtre ne traversent pas le `@RestControllerAdvice` (hors DispatcherServlet). (Sprint 2 #51)

## PIT-S2-003 — `@Bean` injecté par un filtre lui-même injecté dans la `@Configuration` qui le déclare → cycle
`TimeMeter @Bean` dans `SecurityConfig` → `SecurityConfig` dépend de `RateLimitingFilter` qui dépend du `TimeMeter` produit par `SecurityConfig` en cours de création → `UnsatisfiedDependency "currently in creation"`. Fix : extraire le `@Bean` dans une `@Configuration` dédiée (`RateLimitConfig`). (Sprint 2 #33)

## PIT-S2-004 — `getServletPath()` vide en MockHttpServletRequest → matcher de Filter cassé
Dans un `Filter` testé via MockMvc, `request.getServletPath()` retourne `""` → le path-matching échoue silencieusement. Utiliser `getRequestURI()` (rempli en test ET prod, context path vide ici). (Sprint 2 #33)

## PIT-S2-005 — Ne jamais faire confiance à `X-Forwarded-For` par défaut pour une clé de sécurité
Rate-limit keyé sur `X-Forwarded-For` sur endpoint `permitAll` non authentifié → l'attaquant fait tourner le header à chaque requête → bucket neuf à chaque appel → contournement trivial. Keyer sur `getRemoteAddr()`, confiance XFF opt-in par config (`app.rate-limit.trust-forwarded-header`, défaut false, n'honorer que derrière reverse proxy de confiance). Vaut pour toute IP-allowlist/rate-limit. (Sprint 2 #33 fix review)

## PIT-S3-001 — `ddl-auto=update` ne fiabilise PAS les contraintes UNIQUE
Malgré `@Column(unique=true)` (posé #32), le dump live de la base dev générée en `update` ne contenait AUCUNE contrainte unique. `update` est best-effort et silencieux. Toujours poser les contraintes (unique, check, FK nommées) explicitement en migration, jamais compter sur `update`. (Sprint 3 #42)

## PIT-S3-002 — Corriger `.gitignore` ne dé-tracke pas un fichier déjà suivi
Un secret committé dans un fichier déjà tracké (`application.properties`) reste suivi même après ajout d'une règle `.gitignore` correcte. Soit neutraliser le fichier (secrets → `${VAR}`, le garder tracké mais sûr — approche Spring retenue), soit `git rm --cached`. La simple correction du chemin dans `.gitignore` est cosmétique. (Sprint 3 #34)

## PIT-S3-003 — `validate` actif : toute colonne entité doit matcher EXACTEMENT la colonne SQL
Avec `ddl-auto=validate` (Flyway source de vérité), un `@Column(nullable=false)` qui ne matche pas un `NOT NULL` côté migration (type/nullability) fait échouer le boot → TOUS les `@SpringBootTest` cassent. Croiser type + nullability entité↔migration avant run. Colonne ajoutée à une table peuplée = `DEFAULT` obligatoire (backfill). (Sprint 3 #43)

## PIT-S3-004 — Baseline Flyway depuis métadonnées Hibernate omet les contraintes legacy hors-Hibernate
V1 baseline généré via export `schema-generation` Hibernate reflète ce qu'Hibernate CROIT, pas la base dev réelle. Les contraintes ajoutées hors Hibernate (CHECK `events_type_check`, NOT NULL, types serrés) sont absentes de V1 → un déploiement frais (CI/prod) diverge de dev. `validate` ne détecte ni CHECK ni NOT NULL → drift invisible. Préférer `pg_dump --schema-only` pour la baseline, ou auditer pg_dump vs V1. (Sprint 3 #42, suivi #108)

## PIT-S3-005 — Subagent fullstack-dev lancé depuis un worktree `/sprint` commite sur `dev` du checkout principal
Le subagent travaille par défaut dans `/Users/herrh/VSProjects/MyTimeline` (branche `dev`), PAS dans le worktree sprint → le commit atterrit sur `dev`. Épingler le chemin absolu du worktree dans CHAQUE briefing + « vérifie `git branch --show-current`==sprint/N avant commit ». Après chaque spawn : vérifier `git log -1` sprint/N ET que `dev` n'a pas bougé. Recovery : cherry-pick sur sprint/N + reset dev (stash le WIP du checkout principal d'abord). (Sprint 3 #34)

## PIT-S4-001 — MockMvc `standaloneSetup` n'enregistre PAS le `@RestControllerAdvice`
Un test `standaloneSetup(controller)` sur un endpoint qui `throw` une exception interceptée par un `@RestControllerAdvice` (ex `AccessDeniedException` → `GlobalExceptionHandler`) laisse l'exception se propager → le test casse. Ajouter `.setControllerAdvice(new GlobalExceptionHandler())` au builder. `@WebMvcTest` chargerait l'advice automatiquement. ⚠️ corollaire : ce test valide alors le chemin advice, PAS le chemin réel prod où le filtre Security intercepte `AccessDeniedException` AVANT le DispatcherServlet (voir PAT-S2-002). (Sprint 4 #100)

## PIT-S4-002 — MockMvc `standaloneSetup` ne résout pas les champs `@Value`
Les `@Value("${...}")` d'un controller ne sont jamais injectés hors contexte Spring complet → restent à `null`/`false` en `standaloneSetup`. Les fixer via `ReflectionTestUtils.setField(controller, "champ", valeur)` dans `@BeforeEach`. (Sprint 4 #99)

## PIT-S4-003 — Le header CSP backend ne régit QUE les réponses de l'origine backend
Avant de relâcher `'unsafe-inline'` sur `style-src`/`script-src` « à cause de Tailwind/Next.js » : le CSP émis par l'API backend ne s'applique qu'aux réponses servies par le backend (JSON). Le front Next.js tourne sur sa propre origine sous sa propre CSP → le CSS inline Tailwind n'est jamais concerné par ce header. `style-src 'self'` strict est donc possible côté backend. Toujours identifier QUI émet le header avant d'assouplir. (Sprint 4 #101)

## PIT-S4-004 — Matcher Mockito ambigu sur méthode surchargée
`JwtService.generateToken(String)` ET `generateToken(Authentication)` : un `when(...generateToken(any()))` est ambigu et peut câbler le mauvais overload. Typer le matcher : `any(Authentication.class)`. Vaut pour toute méthode surchargée mockée. (Sprint 4 #104)

## PIT-S4-005 — `git add -A` dans un worktree `/sprint` aspire les artefacts d'orchestration du lead
Un subagent qui fait `git add -A`/`git add .` capture les fichiers scratch non suivis du lead (`docs/memory/sprints/sprint-N/*`, `sprint-history.md` modifié) → commit pollué. Staging explicite par chemin OBLIGATOIRE (`git add <paths>`). Récurrent S4 (#105, #99, fix review). Corollaire rtk : `git add file1 \<newline> file2` casse (pathspec) → commande mono-ligne. (Sprint 4)
