# Issue #45 (+ absorption #35) — done

**Commits :** `1012034` (:wastebasket: #35 dead code + rename config + deps mortes) · `4f5da4a` (:lipstick: #45 tokens Graphite @theme + thème clair/sombre + next/font)

## Résumé
- **#35 absorbé** : retrait deps mortes `next-auth`, `@formatjs/intl-localematcher`, `negotiator`, `@types/negotiator`, `date-fns`, `react-day-picker` (verdict grep : i18n via `next-intl/middleware`, pas negotiator/localematcher ; `calendar.tsx` seul consommateur de react-day-picker/date-fns, mort → supprimé). Fichiers morts supprimés : `ui/calendar.tsx`, `client-only.tsx`, `client-wrapper.tsx`, `calendar.css` (+ import). Rename `tailwing.config.ts`→`tailwind.config.ts` (TW4 CSS-first, globs corrigés).
  - **ÉCART briefing assumé** : `FullCalendarEvent` GARDÉ (vivant : dashboard/TimelineCalendar/EventContent — pas un vestige). Décision documentée, trancher par grep.
- **#45** : tokens via `@import ds/tokens/*.css` (source unique) + `@theme inline` (self-ref vars → suivent `.dark` sans duplication) ; `@custom-variant dark`. shadcn vars réassignées aux tokens Graphite (un seul système couleur). next-themes `attribute="class"` defaultTheme=system, wrapper `"use client"`, ordre providers Theme>Auth>Query préparé. next/font Archivo + IBM Plex Mono (vars `--font-display/-ui/-mono`). **15 fichiers / ~180 occurrences hardcodées → 0 restante** (vérifié : `grep bg-gray/bg-purple/text-purple src` = 0). AA 12 couleurs event cité depuis `ds/a11y-audit.md`.
- **Build** : `npm run build` OK, `tsc --noEmit` OK.
- **Source DS** : `frontend/src/styles/ds/**` + `docs/design/graphite-handoff.md` récupérés du handoff Claude Design par le lead, committés.

## Vérifs lead
- 2 commits présents origin/dev..HEAD ✓ · next-themes@0.4.6 présent ✓ · deps mortes absentes ✓ · tailwind.config.ts (rename) ✓ · 0 résidu gray/purple src ✓

## [MEMORY:*] signaux
- [MEMORY:pattern] tokens DS→TW4 : `@import` DS (:root/.dark) + `@theme inline { --color-x: var(--color-x) }` (self-ref OK car inline n'émet pas en :root) + `@custom-variant dark`. Anti-pattern : @theme non-inline écrase les vars DS.
- [MEMORY:pattern] polices DS sans réseau : next/font/google expose `--font-*`, retirer `@import url(fonts.css)` ET font-family de typography.css (next/font = source unique).
- [MEMORY:decision] dead code : trancher chaque dep/fichier par grep avant suppression (FullCalendarEvent gardé car vivant).
- [MEMORY:pitfall] boucle bash `for f in $FILES` casse sur chemins `app/[locale]/...` (glob brackets) → `while IFS= read -r` ou perl.

## Recommandations suite (→ triage Phase 4 /sprint end)
- RECOMMAND_FOLLOWUP : `frontend/src/styles/{landing,animations}.css` hex de marque hardcodés (`#8B5CF6`/`#4F46E5`/gradients) hors scope #45 (CSS brut) → porter sur tokens Graphite. [triage S | frontend]
- RECOMMAND_FOLLOWUP : composants DS `ds/components/{core,timeline,i18n}.css` déposés mais non consommés → intégration écrans (timeline/dashboard) sprints suivants. [triage L | frontend]
- RECOMMAND_FOLLOWUP : `TestimonialCard` colormap garde `blue/cyan/pink` (hors AC strict gray/purple) → mapper palette event si refonte landing. [triage XS | frontend]

STATUS: COMPLETED
