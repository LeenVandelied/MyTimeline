# Issue #621 — Un seul mécanisme de toast, rendu DS, confirmations sur les surfaces métier

**Vague :** 1 (en parallèle de #603) · **Agent :** fullstack-dev (opus, high) · **Spawn ref :** `449a7f2`

## Commit (vérifié par le lead)
- `2739675` — :sparkles: feat(toast): rendu DS unique et confirmations sur les surfaces métier (#621)
- `git show --stat` : 20 fichiers, +751/−10 — `ui/toaster.tsx` (+97) et son test (+123), `ui/toast.tsx`, `app/[locale]/layout.tsx`, `NewEventDrawer`, `TimelineEditHost`, `hooks/useEventEditConflict`, `ProductDrawer`, `CategoryDrawer` (+ tests), `common.json` ×4, `ds/tokens/spacing.css`, `e2e/sprint-92-business-toasts.spec.ts` (+192). Aucun fichier de #603.
- `git branch --contains 2739675` = `sprint/92`, posé après `f1bf100` (#603).

## Résumé
- **Arbitrage (dev) appliqué : brancher.** `AppToaster` (`ui/toaster.tsx`, client) utilise la render-prop `children` de `<Toaster>` : conteneur `#_rht_toaster` conservé (masque de `sprint-77-theme-visual`), 15 appels existants inchangés. Écartés : `toast.custom` (réécrire chaque appel), `useToaster` (perdre le conteneur).
- Variantes : success→success, error→danger, autres→info ; le message devient le titre.
- Surfaces câblées : création d'événement `NewEventDrawer.tsx:108` ; modification / archivage / désarchivage `TimelineEditHost.tsx:75-94` via `onDone(saved)` (`useEventEditConflict.ts:137`) ; création produit `ProductDrawer.tsx:224` ; création catégorie `CategoryDrawer.tsx:210`.
- Position `top-right` desktop et mobile, décalage 16 px + safe-area iOS ; le FAB est en bas à droite → jamais masqué. Toast en `pointer-events:none` : aucun clic bloqué (E2E compris), mais plus de pause au survol.
- **Jeton DS modifié** : `--z-toast` 60→78 (`spacing.css:99`), consommé par le conteneur — à 60, une erreur `apiClient` passait sous un drawer ouvert. **À valider par le Designer.**
- Clés `common.toast.{eventCreated,eventUpdated,eventArchived,eventUnarchived,productCreated,categoryCreated}` ×4 locales.
- Écarts signalés : `.mt-toast__title` n'a pas de `font-display` explicite (hérite `--font-ui` = Archivo, `fonts.ts:40` — rendu identique, DS non modifié) ; libellés fr impersonnels car `common.json` vouvoie et `products.json` tutoie.

## Tests (déclarés par l'agent)
- Vitest 1747/1747 (138 fichiers), dont 25 pour #621 ; test du host rejoué 3×, stable.
- tsc OK · `format:check` OK · `npx eslint` cassé (config ESLint 9) → `next lint --file` sur ses fichiers : 0 erreur.
- `--list` : 3 tests (`SKIP_DELEGATION=1` requis, le hook bloque même `--list`).
- Armement : appel toast retiré → rouge (0 appel) → restauré.
- **E2E NON exécuté par l'agent — à jouer par le lead** : `sprint-92-business-toasts`, `settings-profile`, `settings-security`, `categories`, `timeline`, `sprint-91-edit-bounded-series-end-date`.

## Fichiers de contexte lus (déclaration de l'agent)
- cp-frontend.md (§i18n, §Tests) ; pit-frontend.md grep PIT-S86-002 l.1268 ; handoff l.207, l.259.
- br-events.md NON LU (BR-EVE-013 lu dans `EventEditForm.tsx:76`) ; `.claude/rules/*.md` NON LU.

## Non vérifié
- E2E ; annonce réelle par lecteur d'écran ; rendu clair/sombre.
- Édition depuis la frise en plein écran : `EventDrawer` appelle `onEditEvent` sans quitter le plein écran (`TimelineView.tsx:1756`) → drawer et toast probablement invisibles (PIT-S85-003).
- Premier `npx vitest` en erreur `eachMapping`, disparue au 2e run : cause = symlink `node_modules/node_modules` posé par le lead (voir `issue-603-done.md`), retiré en cours de vague par l'agent de #603.

## Signaux mémoire
- [MEMORY:pitfall] Le hook `warn-test-delegation` bloque aussi `npx playwright test --list` → `SKIP_DELEGATION=1` ; à inscrire dans le gabarit de briefing.
- [MEMORY:decision] Toasts : react-hot-toast = moteur, `ui/toast.tsx` = rendu unique via render-prop `children` de `<Toaster>` ; `--z-toast` 78 (au-dessus des drawers) — à consigner en DEC-S92 et à reporter dans ADR-008.

## Recommandations suite
- RECOMMAND_FOLLOWUP : ADR-008 (l.17, l.126) décrit encore `--z-toast` 60 sans consommateur [XS | docs design].
- RECOMMAND_FOLLOWUP : `apiClient.ts:169,173,192,199` messages français en dur, et un 400 cumule toast + erreur inline [S | frontend i18n].
- RECOMMAND_FOLLOWUP : édition depuis la frise en plein écran → drawer et toast invisibles [S | frontend timeline].
- RECOMMAND_UI_DESIGN : valider `--z-toast` 78, la position top-right mobile et `pointer-events:none` (revue Designer batch du lead).
- Pas de RECOMMAND_TEST_RUNNER car le lead joue l'E2E après la vague.
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma.
- Pas de RECOMMAND_SECURITY car aucune surface auth ni donnée personnelle touchée.

STATUS: COMPLETED
