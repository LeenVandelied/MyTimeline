<!-- PROVENANCE : copie Layer B de rules-jit/frontend.md du plugin ai-env 0.3.1 (Layer A).
     Source : ~/.claude/plugins/cache/edel-projects/ai-env/0.3.1/rules-jit/frontend.md
     Copie volontaire (et non symlink) : le cache plugin est hors dépôt et versionné 0.3.1.
     À re-differ contre la source à chaque bump du plugin. -->

---
globs: **/*.{ts,tsx}
---

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

# Regles frontend Next.js / TypeScript

## Conventions TypeScript
- TypeScript strict : zero `any`, zero `as` cast non justifie
- Server Components par defaut, `use client` uniquement si necessaire
- `"use client"` inutile sur fichiers type-only (pas de hooks React)
- TanStack Query cote client, fetch natif dans Server Components
- Forms : React Hook Form + Zod
- Style : Tailwind CSS + shadcn/ui UNIQUEMENT

## i18n (BR-17)
- TOUJOURS `useTranslations("namespace")` — jamais de strings FR hardcodees
- `useTranslations("ns")` separe par namespace (next-intl ne supporte pas `t("key", { ns })`)
- Zod schemas : factory function `createSchema(messages)` avec useMemo
- Module-level i18n : separer styles statiques + `buildConfig(t)` function

## Formatage suisse (BR-20)
- TOUJOURS `<locale-constant>` de `@/lib/utils` — jamais `"<locale-code>"` hardcode
- SSR : utiliser `formatSwissNumber()` (deterministe) — jamais `Intl.NumberFormat` inline (hydration mismatch)
- `Intl.DateTimeFormat(<locale-constant>, ...)` pour dates

## Montants (BR-23)
- Tout montant avec code devise ISO 4217
- Utiliser `currency` du type response, jamais hardcoder "CHF"

## Accessibilite
- Spinners : `role="status"` + `aria-label` + `<span class="sr-only">`
- Tables : `aria-label` sur `<table>`, `scope="col"` sur `<th>`
- Barres progression : `role="progressbar"` + `aria-valuenow/min/max`
- Boutons : `focus:ring-2 focus:ring-gold-primary`
- Elements interactifs custom (cards, tiles) : `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) + `focus:ring-2`

## Charts Recharts
- TOUJOURS `useChartTheme()` — JAMAIS de hex inline
- Importer couleurs depuis `tokens.ts` ou `useChartTheme()`
- `Number(value)` pour Tooltip formatter

## Zod / DTO Synchronisation
Voir `.claude/rules-jit/zod-dto-sync.md` pour convention nullable/optional, overlays generes, et checklist obligatoire.
Resume : `.nullable()` pour nullable backend, `.optional()` pour absent, jamais `.nullish()` en code manuel.
- Endpoint pagine : TOUJOURS `paginatedSchema(itemSchema)`, jamais `schema.array()` — sinon `.filter()` crash sur l'objet `{items, total, page, size}`

## Design
- Consulter `la charte de design` et `les design tokens`
- Theme-aware : chaque composant fonctionne en clair ET sombre
- Mock data : format machine-readable, jamais strings FR hardcodees
- Animations : `duration-300` standard

## Tests — zéro warning stderr (MEMO-007)
Tout test livré doit produire un run vitest sans aucune ligne stderr.

- **MockImage** : exclure `priority`, `fill`, `quality`, `placeholder`, `blurDataURL`, `loader`, `unoptimized` du spread `...rest` vers `<img>`
- **`act()` warning** : render avec effets async → test `async` + `await waitFor(() => stableCondition)`
- **Logs d'erreur intentionnels** : `vi.spyOn(console, "error").mockImplementation(() => {})` + `mockRestore()` dans le test qui déclenche volontairement l'erreur (Zod fallback, validation failure, etc.)

## Schemas Zod — source de verite (DEC-029)
- Les schemas generes (`zod.gen.ts`) sont post-traites par `postprocess-zod.mjs` (bigint→number, nullable/optional fix)
- `.nullish()` est ACCEPTE dans le code genere (equivalent a `.nullable().optional()` en Zod 4)
- Tout nouveau schema DOIT re-exporter le genere sauf justification documentee (JSDoc `/** MANUAL — Reason: ... */`)
- Apres `npm run generate:api`, toujours verifier : `npx tsc --noEmit` + `npx vitest run`
- Version @hey-api/openapi-ts pinee (pas de ^) — tester avant chaque upgrade


## Execution tests — wrapper silencieux (optim tokens)

Ne JAMAIS lancer `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` directement dans le contexte agent. L'output (le framework de test frontend verbose + TS errors + Playwright traces) = 20-60 KB par run, multiplies par les iterations de debug.

**Usage obligatoire** :
```bash
./scripts/test-quiet.sh frontend   # le framework de test frontend + tsc --noEmit
./scripts/test-quiet.sh e2e        # Playwright (reset DB inclus)
./scripts/test-quiet.sh unit       # Backend + Frontend
```

wrapper capture tout dans `/tmp/<project-lower>-tests-<timestamp>.log` et renvoie :
- Recap le framework de test frontend (`Test Files N failed | N passed`, `Tests N passed`)
- Top 10 fichiers `FAIL src/...`
- Compte d'erreurs TS + 5 premieres
- Playwright : `N passed / N failed / N flaky` + top 10 echecs

Pour debug precis d'un test frontend, lire le log `/tmp/<project-lower>-tests-*.log` cible (Read avec `offset`/`limit`), ne JAMAIS re-run `npx vitest run <fichier>` dans le contexte.

**Pour suites lourdes (Playwright full + vitest + tsc)** : deleguer a l'agent `test-runner` (Haiku) via Agent tool — il isole l'output et retourne <=500 tokens au lead.

Reference : audit tokens 2026-04-24 — verbosite tests = cause #2 saturation contexte apres reviews multi-agent.
