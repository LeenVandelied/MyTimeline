[BRIEFING ISSUE #45 + absorption #35]

## Issue #45
[FEATURE] Porter les tokens Graphite dans Tailwind 4 (@theme) + thème clair/sombre — **+ absorber INTÉGRALEMENT #35 (dead code + fix tailwind config), décision dev : #35 sera fermée à la clôture du sprint.**

### ⚠ Source des tokens — RÉSOLU (lead a récupéré le handoff officiel)
Les tokens Graphite N'EXISTAIENT PAS dans le repo. Le lead les a récupérés depuis le projet
Claude Design « Refonte graphique MyTimeline » (hand-off validé) et les a **déjà déposés dans le repo** :

- `frontend/src/styles/ds/styles.css` — entry point (@import des tokens + composants)
- `frontend/src/styles/ds/tokens/colors.css` — rampe graphite 12 paliers + accent bleu + 12 couleurs event + surfaces clair/sombre (`:root` + `.dark`/`[data-theme="dark"]`)
- `frontend/src/styles/ds/tokens/typography.css` — Archivo + IBM Plex Mono, échelle 13/15/17/21/27/35/45/57, poids, tracking
- `frontend/src/styles/ds/tokens/spacing.css` — base-4 (+ pas impairs), radius, shadow, motion, **tokens timeline** (`--lane-height:46px`, `--lane-header-w:168px`, `--ruler-height:44px`), z-layers
- `frontend/src/styles/ds/tokens/base.css` — resets + defaults élément (body bg/ink/font, focus-visible, scrollbars graphite, prefers-reduced-motion)
- `frontend/src/styles/ds/tokens/fonts.css` — @import Google Fonts (Archivo + IBM Plex Mono) — **NE PAS utiliser ce @import ; cf. contrainte next/font ci-dessous**
- `frontend/src/styles/ds/components/{core,timeline,i18n}.css` — styles composants (référence pour plus tard, hors scope strict #45)
- `docs/design/graphite-handoff.md` — doc de hand-off complète (modèle de données, helpers, casse/voix, fidélité)
- `frontend/src/styles/ds/{readme.md,a11y-audit.md}` — guide DS + audit a11y (ratios AA déjà vérifiés par le designer)

**LIS `frontend/src/styles/ds/tokens/*.css` + `docs/design/graphite-handoff.md` EN PREMIER.** C'est la source de vérité. Tu PORTES ces valeurs, tu n'en inventes aucune.

### À faire #45
1. **Exposer les tokens Graphite à Tailwind 4 via `@theme`** dans `frontend/src/styles/globals.css` :
   - Les variables sources (`--gray-*`, `--blue-*`, `--evt-*`, `--color-*`, `--font-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--lane-*`, `--ruler-*`) viennent de `ds/tokens/*.css`.
   - En Tailwind 4, `@theme` génère les utilitaires. Map au minimum : couleurs sémantiques (`bg`, `surface`, `surface-2`, `ink`, `ink-muted`, `rule`, `primary`, `accent`, `success/warning/danger/info`), les 12 `evt-*`, les polices (`--font-display`/`--font-ui`/`--font-mono`), l'échelle typo, le spacing, les radius. Objectif : `bg-bg`, `bg-surface`, `text-ink`, `bg-primary`, `bg-accent`, `bg-evt-red`, `font-display`, `font-mono`, `rounded-md`… fonctionnent.
   - Intègre les valeurs `:root` (clair) ET `.dark` (sombre) du DS. Décide : `@import` du DS dans globals.css OU inline des `:root`/`.dark` dans globals.css — choisis l'approche la plus propre pour Tailwind 4 + next-themes (l'important : un seul source de vérité, pas de valeurs dupliquées/divergentes).
2. **Thème clair/sombre via `next-themes`** :
   - Installer `next-themes`, `ThemeProvider` au layout root avec `attribute="class"` (le DS cible `.dark` ET `[data-theme="dark"]`, donc `class` marche). `defaultTheme="system"` + `enableSystem`.
   - `body` : retirer le `@apply text-gray-300 bg-gray-900` hardcodé (`frontend/src/styles/globals.css:116-117`) → le DS `base.css` gère déjà `body { background:var(--color-bg); color:var(--color-ink) }`. Bascule sans reload de page.
   - **Ordre providers imposé au layout** : Theme (ce sprint) > Auth (S7 #40) > Query (S7 #48). N'introduis QUE ThemeProvider ; laisse la place pour les deux autres.
3. **Polices via `next/font` (PAS le @import Google de fonts.css)** — l'AC #45 + le risque "dépendance réseau" l'imposent :
   - `next/font/google` pour `Archivo` (poids 400/500/600/700, italique 400) et `IBM_Plex_Mono` (400/500/600), exposées en CSS variables `--font-display`/`--font-ui` (Archivo) et `--font-mono` (IBM Plex Mono) sur `<html>`/`<body>`. Self-host automatique → zéro requête Google en prod. Ne pas charger fonts.css via le @import Google.
4. **Audit + remplacement des classes hardcodées** (11 fichiers détectés contenant `bg-gray-*`/`text-gray-*`/`bg-purple-*`/`text-purple-*`) :
   - `grep -rnE 'bg-gray-|text-gray-|bg-purple-|text-purple-|border-gray-' frontend/src` → remplacer par les tokens sémantiques Graphite (ex: `bg-gray-900`→fond surface/bg, `text-gray-300`→`text-ink`/`text-ink-muted`, `bg-purple-*`→`bg-accent` ou couleur event selon intention). Mappe par INTENTION, pas mécaniquement.
   - Zéro `bg-gray-*`/`bg-purple-*` générique restant dans les composants à la fin (critère d'acceptation strict).

### Absorption #35 (INTÉGRALE — décision dev)
- **Deps mortes à retirer de `frontend/package.json`** : `next-auth` (zéro import confirmé), `@formatjs/intl-localematcher`, `negotiator`. Pour `date-fns` : **VÉRIFIER d'abord** — `react-day-picker@8` (utilisé par `frontend/src/components/ui/calendar.tsx`) a `date-fns` en peer dependency. Si `calendar.tsx` est mort/non importé → supprime calendar.tsx + date-fns. Si vivant → GARDE date-fns (le #35 dit "dayjs remplace", mais react-day-picker en dépend). Tranche par `grep`, ne supprime pas à l'aveugle.
- **Fichiers morts à supprimer** : `frontend/src/styles/calendar.css` (464 lignes, retirer aussi son import dans `app/layout.tsx`), `frontend/components/client-only.tsx`, `frontend/components/client-wrapper.tsx`, le type `FullCalendarEvent` (vestige ancienne lib calendrier). Vérifier zéro import avant suppression (`tsc --noEmit` doit rester vert).
- **Config Tailwind** : renommer `frontend/tailwing.config.ts` → `frontend/tailwind.config.ts` (typo). Suivre les conventions Tailwind 4 (config CSS-first via `@theme` ; le `.ts` peut rester minimal pour `content`/plugins ou être supprimé si `@tailwindcss/postcss` suffit — le repo utilise `postcss.config.mjs`). Exposer dans `@theme` les vars shadcn déjà déclarées dans `:root` de globals.css (`--primary`, `--card`, `--popover`, `--muted`, `--accent`, `--border`, `--input`, `--ring`) si tu les conserves — actuellement `bg-primary`/`border-input`/`ring-ring` sont cassées car non mappées dans `@theme`.
  - ⚠ Arbitrage à faire : globals.css contient AUJOURD'HUI la palette shadcn neutre par défaut (HSL `--background/--foreground/--primary/...`). Tu la remplaces par le système Graphite. Évite de garder DEUX systèmes de couleur concurrents — migre les usages shadcn (`bg-primary`, `bg-card`, etc.) vers les tokens Graphite équivalents, ou réassigne les vars shadcn aux valeurs Graphite. Pas de divergence clair/sombre entre les deux.

### Critères d'acceptation (#45 + #35)
- [ ] Tokens Graphite (couleurs, typo, spacing, timeline) exposés via `@theme` Tailwind 4, utilitaires fonctionnels
- [ ] `Archivo` + `IBM Plex Mono` chargées via `next/font` (pas de @import Google réseau)
- [ ] `next-themes` installé, `ThemeProvider` au layout root, bascule clair/sombre sans reload
- [ ] `bg-gray-900` hardcodé sur `body` supprimé → variable de thème
- [ ] Les 12 couleurs event passent AA (déjà validé dans `ds/a11y-audit.md` — cite la source)
- [ ] Aucune classe `bg-gray-*`/`bg-purple-*` générique restante dans les composants
- [ ] `tailwing.config.ts` renommé `tailwind.config.ts` ; `bg-primary`/`border-input`/`ring-ring` s'appliquent
- [ ] deps mortes retirées (next-auth, @formatjs/intl-localematcher, negotiator ; date-fns selon vérif calendar.tsx)
- [ ] `calendar.css` + `client-only.tsx` + `client-wrapper.tsx` + type `FullCalendarEvent` supprimés (si confirmés morts)
- [ ] `npm run build` passe, `tsc --noEmit` vert

## Plan d'implémentation (architect, /sprint plan — amendé par le lead)

```yaml
issue_45:
  fichiers_cles:
    - "frontend/src/styles/ds/**"          # SOURCE tokens Graphite (déposée par le lead, à porter)
    - "frontend/src/styles/globals.css"    # @theme tokens + vars clair/sombre, retrait bg-gray-900 body
    - "frontend/src/app/layout.tsx"        # next/font Archivo+IBM Plex Mono, ThemeProvider next-themes, retrait import calendar.css
    - "frontend/tailwind.config.ts"        # renommé depuis tailwing.config.ts (#35)
    - "frontend/package.json"              # +next-themes ; -next-auth -@formatjs/intl-localematcher -negotiator (-date-fns si calendar mort)
  couches_touchees: ["frontend-tokens", "frontend-layout", "frontend-cleanup#35"]
  strategie_test: "npm run build + tsc --noEmit verts ; bascule thème manuelle ; audit grep classes hardcodées = 0 ; AA cité depuis ds/a11y-audit.md. Pas d'unit (tokens/CSS). Storybook visuel livré par #29 (vague suivante)."
  risque_regression: "ELEVE — audit exhaustif classes hardcodées (11 fichiers) ; double système couleur shadcn↔Graphite à réconcilier ; layout.tsx partagé (ordre providers Theme>Auth>Query). date-fns : NE PAS retirer sans vérifier react-day-picker/calendar.tsx."
  ordre_ecriture: "#35 (rename config + retrait deps/fichiers morts) → import/inline tokens DS → @theme mapping → next/font → next-themes ThemeProvider → audit/remplacement classes hardcodées → build+tsc"
  zod_dto_sync: "NON"
  possibly_done: false
```

## Triage
Taille: L (gonflée par absorption #35)
Modèle: opus
Effort: xhigh

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
- **Première vague** : aucune dépendance amont. Tu écris en premier.
- Tu modifies `frontend/package.json` (ajout `next-themes` ; retrait des deps mortes #35). L'issue #29 (infra test) modifiera CE MÊME `package.json` APRÈS toi (devDeps + scripts), dans la vague suivante. Laisse `package.json` + `package-lock.json` propres et committés (lance `npm install` pour régénérer le lock).
- Ne touche PAS aux fichiers de config de test (vitest/playwright/storybook/husky/commitlint/prettier) — ils appartiennent à #29.

## Designer
Le hand-off Graphite EST l'approbation design. Les ratios AA des 12 couleurs event sont **déjà vérifiés** dans `frontend/src/styles/ds/a11y-audit.md` — cite-le plutôt que de re-calculer. Respecte la casse/voix du handoff (sentence case labels/boutons ; MAJUSCULES+tracking mono réservé aux micro-labels).

## Contraintes
- Branche cible : `sprint/6` (déjà checkout — worktree courant).
- Commits : gitmoji français. Sépare proprement en 2 commits :
  1. `:wastebasket: #35 — dead code frontend + rename tailwind.config + @theme shadcn` (la tâche-zéro)
  2. `:lipstick: #45 — porter tokens Graphite (@theme) + thème clair/sombre (next-themes) + next/font`
- Build : `cd frontend && npm run build` DOIT passer ; `npx tsc --noEmit` vert.
- Audit hardcodé OBLIGATOIRE avant de déclarer fini : `grep -rnE 'bg-gray-|text-gray-|bg-purple-|text-purple-' frontend/src` → liste le compte traité dans ton retour.
- `frontend/src/styles/ds/**` est la SOURCE déposée par le lead : tu peux la garder telle quelle (et l'`@import`/la consommer) ou inliner ses tokens dans globals.css — mais NE RÉ-INVENTE PAS les valeurs.
- Ne PAS toucher : `.github/`, fichiers de config test (#29), backend.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <#35 fait (deps retirées + fichiers supprimés + date-fns verdict) | #45 fait (approche @theme, next-themes attribute, next/font, nb classes hardcodées auditées) | build+tsc statut>
- [MEMORY:*] signaux: <pattern next-themes/next/font Tailwind4, decision archi tokens (ds/ source unique), pitfall @theme>
- recommandations suite: <RECOMMAND_FOLLOWUP si classes hardcodées hors scope #45 ou composants ds/ à porter plus tard ; sinon "pas de RECOMMAND_X car ...">
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
