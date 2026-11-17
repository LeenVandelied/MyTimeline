# Issue #283 — Découpler le canal de capture du token de reset en E2E du schéma DB — DONE

**Sprint :** 45 · **Vague :** 1 · **Taille :** M · **Modèle :** opus/high · **Domaine :** auth
**Commits :** `f391c65` (+ `dcf9536` renumérotation ADR par le lead)

## Objectif

Le canal de capture du token de reset en E2E passait par une lecture DB directe (`pg`, poll de
`password_reset_tokens`, couplé à la migration V6). Remplacé par un **contrat HTTP test-only**.

## Décision appliquée (tranchée par le lead avant spawn)

**Profils Spring ADDITIFS.** Le job CI e2e tournait en `SPRING_PROFILES_ACTIVE: dev` (vérifié L156) :
un `@Profile("e2e")` nu n'aurait **jamais** été actif en CI (vert en local, rouge en CI).
→ le job e2e passe à `dev,e2e` : toute la config `dev` reste active, `e2e` ne fait qu'ajouter le bean.
Alternatives rejetées : mock `EmailService` in-memory (processus séparé → nécessiterait quand même un
canal HTTP), endpoint `@Profile("dev")` (exposition inutile en dev local).
→ **`docs/adr/ADR-005-canal-token-reset-e2e.md`**

## Fichiers clés

**Backend** — nouveau package `infrastructure/adapters/testsupport/`, les 4 classes en `@Profile("e2e")` :
- `E2eResetTokenController` — `GET /api/test-support/password-reset-token?email=`
- `E2eResetTokenFinder` + `E2eResetTokenFinderJpaAdapter` — JPQL sur `PasswordResetTokenEntity` (pas de SQL brut)
- `E2eTestSupportSecurityConfig` — `SecurityFilterChain` `@Order(1)` sur `/api/test-support/**` **seul**

**Prod intacte** : `SecurityConfig` NON modifiée, aucun port domaine étendu, pas d'`application-e2e.properties`.
Hors profil `e2e` : le chemin retombe sur la chaîne principale → 401.

**CI** — `.github/workflows/ci.yml`, job e2e **seul** : `SPRING_PROFILES_ACTIVE: dev,e2e` + retrait des
`E2E_DB_*` morts du step Playwright. Aucun autre job touché.

**Frontend** — `frontend/e2e/support/db.ts` **supprimé**, `pg` + `@types/pg` désinstallés (lockfile : 0 réf `pg`),
`forgot-password.spec.ts` migrée.

## API livrée pour #284 (vague 2)

```ts
// frontend/e2e/support/reset-token.ts
export async function waitForResetToken(
  request: APIRequestContext,
  email: string,
  timeoutMs = 10_000
): Promise<string>
```
Appel type : `await waitForResetToken(page.request, email)` (same-origin via le proxy Next).
Poll 250 ms ; 404 = token `@Async` pas encore écrit ; throw explicite sur 401 (profil e2e absent).
Documentée en tête de fichier.

## Tests

- **14/14 verts en local** :
  - `E2eTestSupportProfileTest` — bean absent en `prod`/`dev`/`test`/`dev,prod`/sans profil ; présent en `e2e` ET `dev,e2e`
  - `E2eTestSupportPackageGuardTest` — ArchUnit : tout le package est `@Profile("e2e")` + aucune classe prod n'en dépend
  - `E2eResetTokenEndpointIntegrationTest` — Testcontainers : 200 dernier token / 404 inconnu-consommé-expiré / 400 sans param, **sans cookie JWT**
- `ArchitectureTest` 5/5 (aucune nouvelle violation gelée) ; `tsc --noEmit` + eslint OK
- ⚠ **NON VÉRIFIÉ** : spec Playwright non jouée en local (stack down) → gate = job CI e2e.
  **Suite backend complète NON lancée** (67 classes, hors budget) → à couvrir en Phase 6.

## [MEMORY:*] signaux

- `[MEMORY:decision]` ADR-005 : profils Spring additifs (`dev,e2e`) pour endpoint test-only ; alternatives rejetées documentées.
- `[MEMORY:pattern]` Canal test-only = 1 package dédié 100 % `@Profile` + chaîne Security **séparée** `@Order(1)` (jamais de `permitAll` dans le `SecurityConfig` prod) + garde ArchUnit « toute classe du package est gatée ».
- `[MEMORY:pitfall]` Vérifier `SPRING_PROFILES_ACTIVE` du job CI **avant** de choisir un `@Profile` : sinon local vert / CI rouge.

## Recommandations suite

**RECOMMAND_SECURITY** — auditer :
1. Exposition du profil `e2e` — que se passe-t-il si `e2e` fuit dans un env non-CI ?
2. Le 404 uniforme compte-inconnu / pas-de-token — oracle d'existence ?
3. Endpoint **anonyme** rendant un token de reset : faut-il un secret partagé en plus du profil ?
4. Chaîne `@Order(1)` : vérifier qu'elle n'ombrage rien d'autre que `/api/test-support/**`

**RECOMMAND_FOLLOWUP** — le job CI e2e démarre toujours le backend avec `RATE_LIMIT_ENABLED=false` (hors scope #283).

## Traité par le lead

- **Collision ADR-004** (les 2 subagents ont pris « le prochain numéro libre » en parallèle) → renumérotée en ADR-005 (`dcf9536`).
- `frontend/.eslintcache` signalé supprimé par les deux agents, revendiqué par aucun → restauré par le lead.

STATUS: COMPLETED
