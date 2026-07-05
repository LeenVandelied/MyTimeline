# Review batch — Sprint 20 (reviewer, Phase 7)

**Diff :** `git diff origin/dev...HEAD` (baafb27 #80, 943b0ce #83, abdce23 #85)
**Synthèse : 0 CRITIQUE / 1 MAJEUR / 4 MINEUR** — aucun blocage code. PR autorisée.

## [MAJEUR] — NON bloquant (dette infra pré-existante → follow-up)
- **`frontend/e2e/` : zéro spec E2E dashboard** (#80/#83/#85 : switch breakpoint, drawer focus-trap, rail paysage). Seul jsdom (Vitest) couvre. Le reviewer confirme : condition pré-existante hors périmètre (frontend/e2e n'avait que golden-path desktop, aucune infra E2E dashboard). Résolution = `/create-e2e <PR>` post-merge (review-protocol A.4, invocation manuelle). → **RECOMMAND_FOLLOWUP** (déjà tracké par les 3 fullstack-dev + audit Phase 6/8).

## [MINEUR] — routés vers triage /sprint end Phase 4
1. `page.tsx:152-156` — `handleProducts` utilise `document.querySelector('[data-testid=…]')` (DOM impératif hors React) pour scroller vers la colonne produits paysage. Fix : passer un `ref` du conteneur produits depuis le parent. [triage XS | frontend]
2. `MobileDrawer.tsx` (Escape listener) — écoute Escape au `document` + `stopPropagation()` sans coordination avec d'autres dialogs Radix ouverts. Fix : vérifier `event.defaultPrevented` ou restreindre l'écoute au panel focus-trappé. [triage XS | frontend]
3. `CompactRail.tsx` + `MobileDrawer.tsx` — `focus-visible:ring-focus outline-none` désactive l'anneau global `:focus-visible` de base.css au profit d'un ring Tailwind isolé (divergence pattern DS). Vérifier rendu clair/sombre cohérent. [triage XS | frontend]
4. `ProductCarousel.tsx` + `ProductList.tsx` — fonction `nextEvent` dupliquée à l'identique (dette assumée en commentaire). Fix : extraire vers `lib.ts` dès ce sprint plutôt que différer au 3e usage. [triage XS | frontend]

## [OK] Points validés (aucun CRITIQUE)
- `useDashboardData` seule source data (aucun appel API direct dans les composants dashboard).
- Tokens Graphite respectés (pas de hex en dur, filets `border-rule`, pas de `<Card>` shadcn).
- i18n 4 locales parité exacte (79 clés identiques fr/en/es/de, vérifié programmatiquement).
- TypeScript strict (tsc dashboard clean, zéro `any`/`as` suspect).
- a11y : MobileDrawer (role dialog + focus trap + Escape + restauration focus via `useFocusTrap`), CompactRail (aria-label+title sur boutons icône-seule, vrais `<button>`).
- Sécurité logout (redirection localisée, pas de PII loggée, DEC-S9-002 respecté).
- Non-régression desktop #80 (switch ternaire + tests), réutilisation #83/#85 des composants #80.
- Tests 33/33 verts zéro stderr (MEMO-007), ESLint clean.

## Signal outillage (reviewer)
- **[MEMORY:pitfall]** `git diff` via wrapper `rtk` retourne silencieusement vide (3-dots cassé) → utiliser `/usr/bin/git` direct pour les diffs de revue.
