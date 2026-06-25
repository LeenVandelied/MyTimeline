[BRIEFING ISSUE #38]

## Issue #38
[CHORE] CI GitHub Actions

### Contexte
Le dépôt n'a aucune CI. Chaque PR est mergée sans vérif build/test/deps. Tu poses la CI qui consomme les scripts livrés par #29 (déjà mergés sur cette branche).

### À faire
- **`.github/workflows/ci.yml`** déclenché sur chaque pull request et push :
  - Job **backend** : `./mvnw verify` (compile + tests unitaires/intégration).
  - Job **frontend** : `npm ci` → `npm run build` → `npm run test` (Vitest) → `npm run typecheck` → `npm run lint`.
- **`.github/dependabot.yml`** : updates auto Maven + npm (+ github-actions tant qu'à faire).
- **`.github/CODEOWNERS`** : relecteurs obligatoires par zone.
- **Branch protection** : à DOCUMENTER, **NE PAS l'activer maintenant** (cf. contrainte ci-dessous).

### Critères d'acceptation
- [ ] Chaque PR déclenche le workflow automatiquement
- [ ] Un build cassé bloque le merge (statut requis) — *via branch protection, étape manuelle post-vert*
- [ ] Les tests Vitest s'exécutent dans la CI
- [ ] Dependabot configuré pour Maven et npm
- [ ] `CODEOWNERS` présent (racine ou `.github/`)
- [ ] La CI complète tourne en < 10 min

### Faits techniques repo (vérifiés par le lead — utilise-les, ne devine pas)
- **Backend** : `backend/` — **Java 21**, Spring Boot (`spring-boot-starter-parent`), **Maven wrapper `backend/mvnw`** (PAS de `mvn` global ; utilise `./mvnw`). Tests = **Testcontainers Postgres → Docker REQUIS** (ubuntu-latest l'a nativement). `actions/setup-java` v4, `temurin`, java-version `21`, `cache: maven`.
  - ⚠ Le projet a un hook local qui bloque `mvn test` nu (neutralisé par `SKIP_DELEGATION=1` en local). En CI il n'y a PAS ce hook → `./mvnw verify` direct fonctionne. Si jamais un échec « delegation » apparaît, passe `SKIP_DELEGATION=1` en env du job.
- **Frontend** : `frontend/` — **Next.js 15.2.4**, pas de champ `engines` ni `.nvmrc` → **Node 20 LTS** (`actions/setup-node` v4, `node-version: 20`, `cache: npm`, `cache-dependency-path: frontend/package-lock.json`). Scripts dispo (livrés #29) : `build`, `test` (vitest run), `typecheck` (tsc --noEmit), `lint` (next lint), `format:check`. **Pas de script `prepare`** → `npm ci` ne déclenche pas husky (safe en CI).
  - `test:e2e` = Playwright avec `--pass-with-no-tests` ; **AUCUNE spec E2E n'existe** → **NE PAS** mettre Playwright dans la CI obligatoire de ce sprint (éviter `npx playwright install` lent pour 0 test). E2E viendra à S8.
  - Storybook = builder Vite (`build-storybook`) — hors CI obligatoire (optionnel).
- **Branche d'intégration réelle = `dev`** (les PR de sprint ciblent `dev`, pas `main` ; `main` est la branche stable). Le libellé #38 dit « push sur main » mais le flux réel est PR→`dev`.
  - → Déclenche la CI sur : `pull_request` ciblant **`dev` ET `main`**, + `push` sur `dev` et `main`. Comme ça la PR de CE sprint (sprint/6→dev) est couverte.
- **Pas de `.github/` existant** (tu crées tout).
- **Repo** : `LeenVandelied/MyTimeline`. Owner GitHub : `@LeenVandelied` (à utiliser dans CODEOWNERS).

### Risques / contraintes (résoudre, pas ignorer)
- **Branch protection = étape manuelle, NE PAS l'activer dans ce sprint.** L'activer avant un premier run vert bloquerait immédiatement TOUS les merges — y compris la PR de ce sprint. Documente la procédure (`gh api` ou UI) dans un commentaire du `ci.yml` OU un court `.github/CONTRIBUTING.md` / section README : « activer après le 1er run vert, exiger CI + 1 review sur `dev` et `main` ». Le lead/dev l'activera après merge.
- **< 10 min** : caches `.m2` (setup-java `cache: maven`) + npm (setup-node `cache: npm`) OBLIGATOIRES. Jobs backend/frontend en parallèle (pas de `needs` entre eux).
- **Testcontainers** : nécessite Docker (présent sur ubuntu-latest). Si le `verify` est trop lent/flaky, tu peux scinder un job `mvnw -q verify` mais garde-le obligatoire (le backend a une vraie suite).
- Concurrency : ajoute un `concurrency:` group (annule les runs obsolètes sur une même PR) pour rester < 10 min et économiser.

## Plan d'implémentation (architect, /sprint plan — amendé lead)

```yaml
issue_38:
  fichiers_cles:
    - ".github/workflows/ci.yml"      # jobs backend (mvnw verify, java21, cache maven) + frontend (npm ci/build/test/typecheck/lint, node20, cache npm)
    - ".github/dependabot.yml"        # maven (backend/) + npm (frontend/) + github-actions
    - ".github/CODEOWNERS"            # @LeenVandelied par zone
  couches_touchees: ["devops-ci"]
  strategie_test: "Le push de la branche déclenche la CI → vérifier verte < 10 min. Backend mvnw verify (Testcontainers/Docker), frontend npm ci/build/test/typecheck/lint."
  risque_regression: "FAIBLE — branch protection APRÈS 1er vert (NE PAS activer maintenant). Dépend des scripts #29 (livrés). Java 21 + Node 20 + caches."
  ordre_ecriture: "ci.yml (jobs parallèles backend+front + caches + concurrency) → dependabot → CODEOWNERS → documenter branch protection (pas d'activation)"
  zod_dto_sync: "NON"
  possibly_done: false
```

## Triage
Taille: M
Modèle: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-hexagonal.md ===== -->
# Context-pack : Architecture hexagonale

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules/hexagonal.md`
> A charger pour TOUTE tache backend touchant `{{JAVA_PACKAGE}}.*`

## Structure obligatoire

```
{{JAVA_PACKAGE}}/
├── domain/            # Couche metier pure (Java pur, 0 framework)
├── application/       # Ports (interfaces) et use cases
└── infrastructure/    # Adapters techniques (JPA, REST, Quarkus)
```

## Imports interdits — AUDIT AUTOMATIQUE par hook `check-hexagonal.sh`

### `domain/` NE DOIT JAMAIS importer :
- `jakarta.*` (sauf annotations validation : `@NotNull`, `@Valid`, `@Size`)
- `io.quarkus.*`
- `javax.*`
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `{{JAVA_PACKAGE}}.application.*` (sauf interfaces de ports)

### `application/` NE DOIT JAMAIS importer :
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `io.quarkus.*` (sauf annotations CDI basiques : `@ApplicationScoped`, `@Inject`)

### `infrastructure/` peut importer tout :
- `{{JAVA_PACKAGE}}.domain.*`
- `{{JAVA_PACKAGE}}.application.*`
- Tous les frameworks necessaires

## DEC-009 — Ports obligatoires

- `application/` ne touche JAMAIS `infrastructure/` directement
- Les ports (interfaces) sont definis dans `application/`
- Les implementations (adapters) sont dans `infrastructure/`

## Anti-patterns a proscrire

- Entite JPA dans `domain/` → deplacer vers `infrastructure/persistence/`
- `@Path`, `@GET`, `@POST` dans `domain/` ou `application/`
- `l'ORMRepository` dans `application/` → port + adapter infra
- Static method call vers `application` depuis `domain`

## Checklist implementation

- [ ] La logique metier est dans `domain/` (pure)
- [ ] Les use cases sont dans `application/` via ports
- [ ] Les adapters (REST, JPA, HTTP client) sont dans `infrastructure/`
- [ ] Le hook `check-hexagonal.sh` passe sans erreur

## Reference pour approfondir

`.claude/rules/hexagonal.md` (rule versionnee)
`docs/memory/decisions.md#DEC-009`

<!-- ===== cp-backend.md ===== -->
# Context-pack : Backend le langage backend / Quarkus

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules-jit/backend.md`
> A charger pour TOUTE tache backend

## Stack

le langage backend + le framework backend + l'ORM + l'outil de migration + le provider d'identité + la base de données

## Conventions le langage backend

- **Records** pour DTOs (request/response immuables)
- **Sealed Classes** pour etats metier
- **Pattern Matching**, Streams
- **Validation** : `@Valid` + Bean Validation sur tous les `@RequestBody`
- **Reponses** : `Response.ok(dto).build()` ou `Response.created(uri).build()`
- **Erreurs** : le format d'erreur
- **Logging** : le logger injecte — jamais `System.out`
- **Config** : `@ConfigProperty` pour valeurs externalisees
- **JPA constructeurs** : `public Entity() {}` (pas protected)

## Regles transversales entites

- **Soft delete** (règle métier suppression) : champ `deleted_at` obligatoire, JAMAIS de DELETE physique
- **UUID v7** (règle métier clés primaires) sur toutes les cles primaires
- **Ownership** (règle métier ownership) : verifier l'identifiant propriétaire sur chaque endpoint GET/PUT/DELETE securise, admins bypassent via `isAdmin`

## Securite

- `@RolesAllowed` sur chaque endpoint protege
- Aucune donnee sensible dans les logs
- Aucune concatenation SQL
- `l'identité de sécurité` (pas `JsonWebToken`) avec le provider d'identite

## Migrations l'outil de migration

- `db/migration/V{n}__{description}.sql`
- Rollback commente dans chaque fichier
- JAMAIS modifier une migration deja appliquee
- Derniere migration : `ls {{MIGRATIONS_DIR}}/V*.sql | sort -V | tail -1` (hook `check-stack-drift.sh` avertit en cas de drift)

## l'ORM

- `persist()` = INSERT only. Pour upsert → `getEntityManager().merge()`
- `TranslationRepository` implemente directement par `l'ORMRepository`

## Null safety

- `orElseThrow()` quand l'entite DOIT exister — jamais `orElse(null)` + null checks downstream
- Fallback explicite obligatoire pour les valeurs nullable externes (locale, enum)

## Tests `@QuarkusTest`

- **`@TestTransaction`** (pas `@Transactional`) pour rollback automatique — `@Transactional` commit et pollue les tests suivants. **PIT recurrent**.
- Test data : valeurs uniques par test (generateur AtomicInteger ou UUID), jamais de constantes partagees entre tests

## Qualite du code

- Methodes > 20 lignes → decomposer
- Complexite cyclomatique > 5 → refactorer
- Pas de magic numbers/strings
- Nommage explicite
- **Risque N+1** : `fetch join` ou `@BatchSize`
- Toute liste paginee
- Index DB prevus pour colonnes filtrees/triees

## Pitfalls backend frequents

- `@Transactional` dans tests → pollue tests suivants. Toujours `@TestTransaction`.
- `orElse(null)` + null check downstream → NPE cache. `orElseThrow()`.
- `persist()` pour update → INSERT duplique. `getEntityManager().merge()`.
- Concatenation SQL → injection. Query params obligatoires.
- Migration modifiee apres deploiement → cluster inconsistant. Creer V{n+1}.

## Reference pour approfondir

`.claude/rules-jit/backend.md` (rule versionnee)
`docs/memory/pitfalls.md` (filtre par PIT-XX backend)

<!-- ===== cp-frontend.md ===== -->
# Context-pack : Frontend Next.js 16 / TypeScript

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules-jit/frontend.md`
> A charger pour TOUTE tache frontend

## Stack

le framework frontend + TypeScript strict + le framework CSS + la gestion d'état

## Conventions TypeScript

- **TypeScript strict** : zero `any`, zero `as` cast non justifie
- **Server Components** par defaut, `"use client"` uniquement si necessaire
- `"use client"` inutile sur fichiers type-only (pas de hooks React)
- **TanStack Query** cote client, `fetch` natif dans Server Components
- **Forms** : React Hook Form + Zod
- **Style** : Tailwind CSS + shadcn/ui UNIQUEMENT

## i18n (règle métier i18n) — langues configurées du projet

- TOUJOURS `useTranslations("namespace")` — jamais de strings FR hardcodees
- `useTranslations("ns")` separe par namespace (next-intl ne supporte pas `t("key", { ns })`)
- Zod schemas : factory function `createSchema(messages)` avec `useMemo`
- Module-level i18n : separer styles statiques + `buildConfig(t)` function

## Formatage locale (règle métier locale/devise)

- TOUJOURS `{{LOCALE_CONSTANT}}` de `@/lib/utils` — jamais `"{{LOCALE_CODE}}"` hardcode
- SSR : utiliser le helper de formatage locale du projet (deterministe) — jamais `Intl.NumberFormat` inline (hydration mismatch)
- `Intl.DateTimeFormat({{LOCALE_CONSTANT}}, ...)` pour dates

## Montants (règle métier devise)

- Tout montant avec code devise ISO 4217
- Utiliser `currency` du type response, JAMAIS hardcoder la devise du projet

## Accessibilite

- **Spinners** : `role="status"` + `aria-label` + `<span class="sr-only">`
- **Tables** : `aria-label` sur `<table>`, `scope="col"` sur `<th>`
- **Barres progression** : `role="progressbar"` + `aria-valuenow/min/max`
- **Boutons** : `focus:ring-2 focus:ring-accent`
- **Elements interactifs custom** : `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) + `focus:ring-2`

## Charts Recharts

- TOUJOURS `useChartTheme()` — JAMAIS de hex inline
- Importer couleurs depuis `tokens.ts` ou `useChartTheme()`
- `Number(value)` pour Tooltip formatter

## Zod / DTO Synchronisation

Voir `.claude/rules-jit/zod-dto-sync.md` (ou Phase 2 : `cp-zod-dto-sync.md`).
Resume :
- `.nullable()` pour nullable backend
- `.optional()` pour absent
- JAMAIS `.nullish()` en code manuel (accepte dans code genere)
- Endpoint pagine : TOUJOURS `paginatedSchema(itemSchema)`, jamais `schema.array()`

## Design

- Consulter `la charte de design` et `les design tokens`
- **Theme-aware** : chaque composant fonctionne en clair ET sombre
- Mock data : format machine-readable, jamais strings FR hardcodees
- Animations : `duration-300` standard

## Tests — zero warning stderr (MEMO-007)

Tout test livre doit produire un run vitest sans aucune ligne stderr.
- **MockImage** : exclure `priority`, `fill`, `quality`, `placeholder`, `blurDataURL`, `loader`, `unoptimized` du spread `...rest` vers `<img>`
- **`act()` warning** : render avec effets async → test `async` + `await waitFor(() => stableCondition)`
- **Logs d'erreur intentionnels** : `vi.spyOn(console, "error").mockImplementation(() => {})` + `mockRestore()`

## Pitfalls frontend frequents

- `.nullish()` dans schema manuel → ZodError runtime (PIT-174)
- `validated()` avec schema genere sans overlay nullable → strip silencieusement (PIT-180)
- `Intl.NumberFormat('{{LOCALE_CODE}}')` inline → hydration mismatch SSR vs client (PIT-185)
- `validated()` en `select:` sur fallback non-conforme (PIT-186)
- `schema.array()` au lieu de `paginatedSchema()` → `.filter()` crash sur `{items, total, page, size}`

## Reference pour approfondir

`.claude/rules-jit/frontend.md` (rule versionnee)
`.claude/rules-jit/zod-dto-sync.md` (checklist DTO/Zod)
`docs/memory/pitfalls.md` (filtre par PIT-XX frontend)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dépendances intra-sprint
- **Vague 3 (dernière)** : #45 et #29 sont DÉJÀ livrés/committés sur cette branche. Les scripts npm que la CI appelle (`build`/`test`/`typecheck`/`lint`) existent (#29).
- Ne touche PAS : `frontend/**` (sauf lecture pour connaître les scripts), `backend/**` (sauf lecture pom/version), tokens/configs des autres issues. Tu écris UNIQUEMENT dans `.github/` (+ éventuellement un court paragraphe README/CONTRIBUTING pour la procédure branch protection).

## Designer
Non applicable (CI/YAML).

## Contraintes
- Branche cible : `sprint/6` (déjà checkout, worktree courant `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/nice-goldberg-86ef14`).
- Commit : 1 commit gitmoji français (ex : `:construction_worker: #38 — CI GitHub Actions (backend mvnw verify + frontend) + dependabot + CODEOWNERS`). ⚠ Le commit-msg doit passer le commitlint gitmoji installé par #29 (format `:emoji: #NN — texte`).
- **Validation YAML OBLIGATOIRE avant de finir** : vérifie la syntaxe du workflow (ex : `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` pour chaque YAML ; et relis les `uses:` versions d'actions). Tu ne peux pas exécuter la CI GitHub localement — la rigueur sur la syntaxe et les chemins (`backend/`, `frontend/`, `working-directory`) est critique.
- NE PAS activer la branch protection (étape manuelle post-vert du dev — l'activer bloquerait la PR de ce sprint).

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1]
- resume: <jobs CI (backend mvnw verify java21 / frontend npm node20 + caches + concurrency) + triggers (PR dev+main) + dependabot (maven+npm+actions) + CODEOWNERS + procédure branch-protection documentée non-activée + validation YAML>
- [MEMORY:*] signaux: <pattern CI monorepo backend/frontend, pitfall Testcontainers/Docker CI ou branch-protection-before-green>
- recommandations suite: <RECOMMAND_FOLLOWUP : activer branch protection après 1er vert ; ajouter Playwright à la CI quand specs E2E existent (S8) ; sinon "pas de RECOMMAND_X car ...">
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
