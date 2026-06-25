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
