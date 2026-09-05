<!-- PROVENANCE : copie Layer B de rules-jit/backend.md du plugin ai-env 0.3.1 (Layer A).
     Source : ~/.claude/plugins/cache/edel-projects/ai-env/0.3.1/rules-jit/backend.md
     Copie volontaire (et non symlink) : le cache plugin est hors dépôt et versionné 0.3.1.
     À re-differ contre la source à chaque bump du plugin. -->

---
globs: **/*.java
---

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

# Regles backend Java/Quarkus

## Architecture hexagonale
Voir `.claude/rules/hexagonal.md` pour structure et imports interdits par couche.

## Conventions le langage backend
- Records pour DTOs (request/response immuables)
- Sealed Classes pour etats metier
- Pattern Matching, Streams
- Validation : @Valid + Bean Validation sur tous les @RequestBody
- Reponses : Response.ok(dto).build() ou Response.created(uri).build()
- Erreurs : le format d'erreur
- Logging : Jboss Logger injecte — jamais System.out
- Config : @ConfigProperty pour valeurs externalisees
- JPA constructeurs : `public Entity() {}` (pas protected)

## Regles transversales entites
- Soft delete : champ `deleted_at` obligatoire, jamais de DELETE physique (BR-18)
- UUID v7 sur toutes les cles primaires (BR-19)
- Ownership : verifier `keycloakId` sur chaque endpoint GET/PUT/DELETE securise, admins bypassent via isAdmin (BR-31)

## Securite
- @RolesAllowed sur chaque endpoint protege
- Aucune donnee sensible dans les logs
- Aucune concatenation SQL
- l'identité de sécurité (pas JsonWebToken) avec quarkus-oidc

### Logs avec exception cause — PII leak prevention (S190 #1554)

**Anti-pattern (interdit)** dans les `ExceptionMapper`, adapters HTTP externes (Keycloak, Stripe, SendGrid),
schedulers, et toute couche `infrastructure/` :

```java
LOG.warn("...", ex);              // Jboss Logger expose le message + stacktrace
LOG.error("...", ex);             // idem
LOG.warnv("...: {0}", ex.getMessage());  // expose message brut
```

**Risque** : `ex.getMessage()` peut contenir
- l'input utilisateur (validation : "email john@x.com is invalid")
- des fragments de payload externe (Keycloak/Stripe API error)
- des fragments SQL (SQLException reflete les valeurs colonnes)
- le keycloakId clair en cause de cache miss

**Pattern correct** :

```java
// 1. Log type d'exception au niveau warn/error (pas le message)
LOG.warnv("Operation failed: {0}", ex.getClass().getSimpleName());

// 2. Stacktrace en debug uniquement (masque en prod)
LOG.debug("Operation stacktrace", ex);
```

**Exceptions tolerees** (LOW risk) :
- Couche application/service interne ou les exceptions sont controlees (messages metier sans input user) — documenter `// LOW : message safe (no user input)`
- Tests `@QuarkusTest` (logs locaux, pas de prod)

**Reference** : Sprint 190 #1554 (audit), #1556 (LogPiiHelper.kcPrefix pour keycloakId).

## Migrations l'outil de migration
Runbook grandes tables (> 1M rows) : voir docs/devops/migrations-runbook.md
- `db/migration/V{n}__{description}.sql`
- Rollback commente dans chaque fichier
- Jamais modifier une migration deja appliquee
- Derniere migration : `ls <migrations-dir>/V*.sql | sort -V | tail -1` (ne pas hardcoder — hook `check-stack-drift.sh` avertit en cas de drift)

## l'ORM
- `persist()` = INSERT only. Pour upsert -> `getEntityManager().merge()`
- TranslationRepository implemente directement par l'ORMRepository

## Null safety
- `orElseThrow()` quand l'entite DOIT exister — jamais `orElse(null)` + null checks downstream
- Fallback explicite obligatoire pour les valeurs nullable externes (locale, enum)

## Tests @QuarkusTest
- `@TestTransaction` (pas `@Transactional`) pour rollback automatique — `@Transactional` commit et pollue les tests suivants
- Test data : valeurs uniques par test (generateur AtomicInteger ou UUID), jamais de constantes partagees entre tests

## Qualite du code
- Methodes > 20 lignes : decomposer
- Complexite cyclomatique > 5 : refactorer
- Pas de magic numbers/strings
- Nommage explicite
- Risque N+1 : fetch join ou @BatchSize
- Toute liste paginee
- Index DB prevus pour les colonnes filtrees/triees


## Execution tests — wrapper silencieux (optim tokens)

Ne JAMAIS lancer `mvn test`, `mvn verify` ou `mvn test -Dtest=...` directement dans le contexte d'un agent IA. L'output Quarkus bootstrap + logs par test + stack traces = 30-80 KB absorbes dans le contexte, multiplies par chaque iteration.

**Usage obligatoire** :
```bash
./scripts/test-quiet.sh backend    # Unit backend — resume <= 1KB
./scripts/test-quiet.sh unit       # Backend + Frontend
```

wrapper redirige le log complet dans `/tmp/<project-lower>-tests-<timestamp>.log` et retourne uniquement :
- Ligne de totalisation Surefire (`Tests run: N, Failures: F, Errors: E, Skipped: S`)
- Top 10 des tests en echec avec classe/methode
- Code de sortie (0 = OK)

Pour analyser une stack trace specifique, lire le log `/tmp/<project-lower>-tests-*.log` cible (Read avec `offset`/`limit`), jamais `cat` complet.

**Pour tests massifs (>500 tests, CI-like)** : deleguer a l'agent `test-runner` (Haiku) via Agent tool — il execute, parse, renvoie un resume <=500 tokens au lead sans polluer le contexte principal.

Reference : audit tokens 2026-04-24 — `mvn test` + `vitest run` repetes = cause #2 de saturation apres multi-agent reviews.
