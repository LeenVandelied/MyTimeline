## Sprint 66 — création d'événement sur mobile

**Objectif :** rendre la création d'événement atteignable et utilisable sous 1024 px.
**Milestone :** Sprint 66 (#67) · **Cohésion :** 0.50 · **Dépend de :** Sprint 65 (PR #474)

### Issues traitées
- #455 — [BUG] Création d'événement injoignable sous 1024 px (M, P1). Refs #455
- #79 — [FEATURE] Mobile : évitement du clavier virtuel dans les bottom sheets (S, P2). Refs #79

### Changements clés
- **FAB mobile** (`AppShell.tsx`, `lg:hidden`, `<button>` natif 52×52, `shell-mobile-new-event-button`) câblé sur le MÊME état `showCreate` que le bouton desktop, qui reste inchangé. Placement tranché par ui-design : le shell est le seul point commun aux 4 écrans du groupe `(app)` (sous `lg`, seul le dashboard a une chrome mobile).
- **Hook `useMobileKeyboard`** (`visualViewport` resize/scroll, rAF, clavier > 120 px, mode réduit < 600 px, no-op sans API ou hors mobile).
- **`.mt-sheet__footer`** DS (68 px, token `--space-17`) hors du corps scrollable ; `EventEditForm` gagne des props OPT-IN `compact` (masque couleur + récurrence, défauts toujours soumis) et `footerPortalNode` (rangée d'actions portalisée DANS le panneau, `form={id}`) — desktop strictement inchangé.
- `NewEventDrawer` (variante sheet) et `settings/mobile/BottomSheet` : bornage `maxHeight`/`top` sur `visualViewport`, `onKeyboardShow`/`onKeyboardHide`, `data-keyboard`/`data-compact`, `transition-property: transform` (corrige une transition `all` armée par `duration-*`).

### BR impactées
Aucune modifiée. Exercées : BR-EVE-002, BR-EVE-005, BR-EVE-007, BR-EVE-009.

### Tests (runs réels sur `aaf85e2`)
- Vitest : **1030/1030** (102 fichiers, baseline 1004) · `tsc` : 0 erreur
- E2E complet : **246 tests — 238 passed / 0 failed / 8 skipped** (Next dev `:3100` → backend e2e `:8086`, `workers: 2`)
- Nouvelles specs : `sprint-66-mobile-create-event.spec.ts` (390/844/1280), `sprint-66-mobile-keyboard.spec.ts` (clavier simulé) ; contrôles négatifs joués (5 mutations, toutes rougissent)
- Audit : `docs/memory/audits/sprint-66-test-coverage.md`

### Non prouvé
- Clavier virtuel RÉEL iOS/Android (aucun moteur headless ne l'ouvre ; `visualViewport` stubbé) — limite assumée par le plan, follow-up device réel.
- `next build` non lancé en local (`.next` partagé avec le harnais) — la CI `frontend` est le premier vrai build.

### Review
Batch reviewer : PRET_POUR_MERGE — 0 CRITIQUE / 0 MAJEUR code / 2 MINEUR documentés (`docs/memory/sprints/sprint-66/review-batch.md`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
