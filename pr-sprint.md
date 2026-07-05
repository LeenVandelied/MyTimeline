# Sprint 19 — Timeline mobile + finitions desktop

Vues Timeline mobiles (portrait #63, paysage #64) + finalisation des sous-composants desktop (extraction EventPill #192). Cohésion 0.71, epic `events`, aucune migration.

## Issues livrées

| # | Titre | Size | Commit |
|---|-------|------|--------|
| #192 | Timeline desktop — extraction EventPill | S (M→S) | `5fd7fcd` (+ fix `a0a94f1`) |
| #63 | Vue Timeline mobile portrait | M | `962e6b7` |
| #64 | Vue Timeline mobile paysage | M | `ac935f8` |

## Vagues d'exécution
- **V1 (parallèle)** : #192 (extraction EventPill) ∥ #63 (conteneur mobile portrait) — fichiers disjoints.
- **V2** : #64 (paysage) dérivé de la base mobile #63.
- Pré-implémentation : `ui-design` a validé l'approche layout mobile (APPROUVE avec réserves — tokens, a11y, 3 gaps tranchés).

## Changements clés

### #192 — EventPill (desktop)
- Extraction du rendu compact d'event en composant dédié `EventPill.tsx` (décision : composant dédié, PAS réutilisation d'`EventContent`). Branché dans `TimelineView`, stories + tests.
- **BR-EVE-009** : encre de texte calculée par contraste WCAG (`contrastInk` → `--mt-evt-ink`) — fin du `#fff` hardcodé illisible sur fonds clairs.

### #63 — Mobile portrait
- `TimelineResponsive` (switch desktop/mobile via `useMediaQuery`, breakpoint `max-width:640px`, SSR-safe), `TimelineMobilePortrait`, `TimelineBottomSheet` (`.mt-sheet`), `TimelineActionSheet` (long-press + `⋯`).
- Règle sticky + scroll horizontal, minimap compacte, pinch-zoom (réutilise `zoom.ts`), hooks `useTimelineMobileState`/`useFocusTrap`.

### #64 — Mobile paysage
- `TimelineMobileLandscape` + `TimelineLandscapeDrawer` (drawer latéral droit au lieu du bottom sheet), lanes denses, minimap masquable (forcée si `max-height<400px` + toggle).
- Breakpoint `orientation:landscape AND max-height:600px` (distingue mobile retourné d'un iPad Pro).
- **Transition portrait↔paysage sans perte d'état** : état hissé dans `TimelineResponsive` (`useTimelineMobileState`/`Selection`/`Gestures`), non reset au resize.

## BR impactées
- **BR-EVE-001** (event↔user) : présentation seule, ownership enforced backend (inchangé) + parcours golden-path E2E.
- **BR-EVE-009** (couleur/encre event) : appliquée dans EventPill + rendus mobiles via `lib/color.ts`.

## ⚠ Incident merge résolu
Le commit #63 (`962e6b7`) avait réécrit `TimelineView.tsx` depuis un état pré-#192 (pitfall worktree : écriture dans le repo principal puis recopie), clobbant l'intégration `<EventPill>`. **Détecté et corrigé par le lead** (`a0a94f1`) : réintégration `<EventPill>`, conservation du move `buildEventAriaLabel`→`zoom.ts`, rétablissement de l'export barrel. Ancestry #64 vérifiée propre.

## Audit tests
- **Frontend Vitest : 153/153 verts, 0 failed, 0 erreur TS** (timeline dir 64/64). tsc + eslint OK.
- Backend non modifié.
- `data-testid=timeline-event`/`data-event-title` préservés (golden-path E2E #163 intact, ligne 152).
- Détail : `docs/memory/audits/sprint-19-test-coverage.md`.

## Coverage E2E (Phase 8) — MAJEUR non bloquant
Les nouveaux testids **mobiles** (`timeline-mobile-portrait/landscape`, `timeline-sheet*`, `timeline-actionsheet*`, `timeline-landscape-drawer*`, `timeline-minimap-toggle`) n'ont pas de spec E2E (dossier e2e minimal, gestes pinch/pointer peu fiables headless).
→ **Plan : `/create-e2e` post-merge** (parcours mobile portrait/paysage).

## Review batch
Reviewer sur diff frontend complet — **VERDICT : 0 CRITIQUE / 0 MAJEUR / 3 MINEUR**.
- 8 checks `[OK]` : EventPill câblé sans régression, testids préservés, a11y dialogs (role/aria/Escape/focus-trap/close 44px), tokens design (pas de hex inline, `prefers-reduced-motion`), React 18 (cleanup listeners, pas de `React.use()`), état hissé sans ré-instanciation, i18n 4 locales, build/tests verts.
- MINEUR 1 (cast `as TimelineMobileState` redondant) → **corrigé** (`03dde79`).
- MINEUR 2 (`onEditEvent`/`onDeleteEvent` non câblés au dashboard) → follow-up (parité desktop, tracké).
- MINEUR 3 (pinch sans `setPointerCapture`, edge case rare) → follow-up.

## Follow-ups détectés (triage en /sprint end)
- `EventBar.tsx` + `Lane.tsx` désormais orphelins (briques #47 sans consommateur runtime) — statuer retrait/déprécation. [S]
- Stories Storybook paysage + spec E2E rotation. [S]
- `test-quiet.sh` alias `e2e` exécute vitest au lieu de playwright (limitation lib plugin). [tooling]
- Câblage service `onEdit`/`onDelete` action sheet (parité desktop). [S]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
