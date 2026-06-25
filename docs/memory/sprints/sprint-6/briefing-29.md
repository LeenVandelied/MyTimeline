[BRIEFING ISSUE #29]

## Issue #29
[CHORE] Infra test frontend (Vitest + RTL + Playwright + Storybook + Prettier + Husky)

### Contexte
Le frontend n'a aucun test automatisé (unitaire, composant, E2E), pas de formatage ni de vérification pré-commit. Cela bloque une CI fiable (#38 qui suit dans ce sprint consomme les scripts que tu livres).

### À faire
- **Vitest** runner de tests unitaires (config Next 15 + React 18 + Tailwind 4 ; jsdom).
- **React Testing Library** pour tests de composants (+ `@testing-library/jest-dom`, `@testing-library/user-event`).
- **Playwright** config E2E (la config DOIT exister même avec zéro test E2E au départ).
- **Storybook** exploration visuelle des composants (`@storybook/nextjs` — App Router).
- **Prettier** formatage auto (`.prettierrc`).
- **Husky v9** + **lint-staged** : vérifs avant commit (`husky init`, PAS l'ancien mode v8).
- **commitlint** avec convention **gitmoji** (le projet commit en gitmoji : `:lipstick:`, `:wastebasket:`, `:white_check_mark:`…). Un message non conforme doit être rejeté.
- **Scripts `package.json` manquants** : `test` (vitest), `test:e2e` (playwright), `typecheck` (`tsc --noEmit`), `format` (prettier), `storybook`. (`lint` et `build` existent déjà.)

### Critères d'acceptation
- [ ] `npm run test` exécute Vitest sans erreur (0 test = OK, mais le runner tourne)
- [ ] `npm run test:e2e` lance Playwright (config existe même sans test)
- [ ] `npm run typecheck` lance `tsc --noEmit` sans erreur
- [ ] `npm run format` formate avec Prettier
- [ ] Un commit au message non-gitmoji est rejeté par commitlint
- [ ] Un commit déclenche lint-staged sur les fichiers modifiés
- [ ] `npm run storybook` démarre sans erreur

### Piste technique
- `frontend/package.json` — devDeps + scripts (tu écris APRÈS #45 qui a déjà nettoyé les deps/ajouté next-themes ; ne casse pas son travail, ajoute par-dessus).
- Nouveaux : `frontend/vitest.config.ts`, `frontend/playwright.config.ts`, `frontend/.storybook/main.ts` + `preview.ts`, `frontend/.prettierrc`, `frontend/.husky/pre-commit`, `frontend/commitlint.config.js` (ou `.cjs`).
- Un fichier setup Vitest (`frontend/vitest.setup.ts`) important `@testing-library/jest-dom`.

### Risques techniques (à résoudre, pas à ignorer)
- **Storybook + Next.js 15 App Router** : `@storybook/nextjs` — attention compat versions (Storybook 8.x). Vérifie que `npm run storybook` démarre réellement (pas juste installé).
- **Husky v9 en sous-dossier** : le frontend est dans `frontend/`, le `.git` est à la racine du repo (et on est dans un WORKTREE git — `git rev-parse --git-dir` pointe vers `.git/worktrees/...`). `husky init` lancé depuis `frontend/` configure `core.hooksPath`. ⚠ Assure-toi que le hook se déclenche réellement pour des commits faits depuis la racine OU documente la contrainte (commit depuis frontend/). Ne laisse pas un hook silencieusement inactif. Teste un faux commit invalide pour prouver le rejet.
- **Vitest + Tailwind 4 / next/font** : next/font peut casser en environnement jsdom — mock si besoin (`vi.mock('next/font/google')`). Vise un `npm run test` vert avec au moins un test smoke trivial (ou 0 test propre).
- **Conflit `package.json` avec #45** : #45 a déjà committé package.json + lock. Pull l'état courant (tu es sur la même branche/worktree), ajoute tes devDeps, relance `npm install` pour régénérer le lock proprement.

## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_29:
  fichiers_cles:
    - "frontend/vitest.config.ts"
    - "frontend/vitest.setup.ts"
    - "frontend/playwright.config.ts"
    - "frontend/.storybook/main.ts"
    - "frontend/.storybook/preview.ts"
    - "frontend/.prettierrc"
    - "frontend/.husky/pre-commit"
    - "frontend/commitlint.config.js"
    - "frontend/package.json"   # scripts test/test:e2e/typecheck/format/storybook + devDeps
  couches_touchees: ["frontend-config"]
  strategie_test: "Auto-méta : npm run test (0 test OK), test:e2e config existe, storybook démarre, commit gitmoji-invalide rejeté, typecheck vert, format tourne."
  risque_regression: "MOYEN — Storybook @storybook/nextjs compat ; Husky v9 en sous-dossier/worktree ; package.json partagé avec #45 (écrit APRÈS, merge des blocs deps)."
  ordre_ecriture: "vitest+setup → RTL → playwright config → storybook → prettier → husky+lint-staged+commitlint → scripts package.json"
  zod_dto_sync: "NON"
  possibly_done: false
```

## Triage
Taille: L
Modèle: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

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
- **Vague 2** : #45 (tokens + cleanup #35) est DÉJÀ livré et committé sur cette branche. `package.json` est dans son état post-#45 (deps mortes retirées, next-themes ajouté, scripts `dev/build/start/lint` présents). Tu AJOUTES devDeps + scripts par-dessus — ne retire/réécris pas son travail.
- **Tu débloques #38 (CI, vague 3)** : la CI appellera `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`. Ces scripts DOIVENT exister et passer après ton commit.
- Ne touche PAS : tokens/globals.css/layout.tsx/tailwind.config.ts (#45), `.github/` (#38), backend.

## Designer
Non applicable (config outillage, zéro UI).

## Contraintes
- Branche cible : `sprint/6` (déjà checkout — worktree courant `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/nice-goldberg-86ef14`).
- Commit : 1 commit logique gitmoji français (ex : `:white_check_mark: #29 — infra test frontend (Vitest+RTL+Playwright+Storybook+Prettier+Husky+commitlint)`). ⚠ Ton propre commit doit passer le commitlint gitmoji que tu viens d'installer — utilise un message conforme.
- **Preuves de fonctionnement OBLIGATOIRES** (ne te contente pas d'installer) : lance et rapporte le résultat de `npm run test`, `npm run typecheck`, `npm run test:e2e` (config OK), `npm run format`, démarrage `npm run storybook`, et un test de rejet commitlint (faux message → rejeté).
- `npm install` après modif package.json pour régénérer le lock proprement.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1]
- resume: <outils configurés + versions clés (Vitest/Playwright/Storybook/Husky) + preuves run (test/typecheck/storybook/commitlint reject) + résolution husky-worktree>
- [MEMORY:*] signaux: <pattern config Vitest/Storybook Next15, pitfall husky worktree/sous-dossier, decision commitlint gitmoji>
- recommandations suite: <RECOMMAND_FOLLOWUP si stories/tests à écrire plus tard ; sinon "pas de RECOMMAND_X car ...">
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
