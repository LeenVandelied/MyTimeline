# Issue #712 — Modifier un événement depuis la frise en plein écran : drawer et confirmation invisibles

**Vague :** 2 | **Taille :** S | **Agent :** fullstack-dev (opus/high)
**Commits :** `9fbbbe2d` (#712) — `:bug: fix(timeline): quitter le plein ecran avant d'ouvrir le drawer d'edition`
et `36931a46` (E2E de #672) — `:white_check_mark: test(timeline): E2E des raccourcis neutralises sous le panneau de creation`

## Fichiers

- `frontend/src/components/timeline/TimelineView.tsx` (+50/-7)
- `frontend/src/components/timeline/TimelineView.fullscreen-overlays.test.tsx` (+198, nouveau)
- `frontend/e2e/sprint-94-fullscreen-overlays.spec.ts` (+189, nouveau)
- `frontend/e2e/sprint-94-modal-shortcuts.spec.ts` (+132, nouveau — E2E de l'issue #672)

## Résumé

Helper `runOutsideFullscreen(action)` dans `TimelineView` : quitte le plein écran et **attend la promesse**
avant de monter une couche du shell. Branché sur « Éditer » (`onEdit` d'`EventDrawer`, qui n'était pas
gardé) **et** sur `onNewEvent` (#602, qui était gardé mais **sans attente**). Le chemin hors plein écran
reste synchrone. Stratégie (a) ; la (b) est écartée (toaster global au layout).

## Deux hypothèses du briefing, tranchées par la mesure

- **`requestFullscreen` sous Chromium headless : SUPPORTÉ.** Sonde jetable Playwright — `requestFullscreen`
  et `exitFullscreen` fonctionnent avec et sans geste utilisateur, `fullscreenElement` est fidèle.
  → La prémisse de `timeline.spec.ts` (#330, « aucune garantie de support ») est **périmée**. L'E2E exerce
  l'API réelle : un stub `Promise.resolve()` aurait supprimé la course à prouver.
- **Course `exitFullscreen` : CONSTATÉE**, et `onNewEvent` en souffrait bien. **Corrigé, pas seulement
  signalé.** Preuve par contrôle négatif E2E : sans l'attente, le panneau s'ouvre avec le focus resté sur
  `timeline-new-event` (la sortie de plein écran le reprend) au lieu de `shell-new-event-drawer-close`.

## Preuve

- `vitest run` → 145 fichiers, **1839 passed / 0 failed**, exit 0.
- `tsc --noEmit` exit 0 ; `next build` exit 0 ; `prettier --check` exit 0.
- **E2E ciblés** : `sprint-94-fullscreen-overlays` + `sprint-94-modal-shortcuts` → **8 passed / 0 failed**
  (5 setup + 3).
- **Liste grep complète du briefing rejouée** (20 fichiers) + `sprint-94-mobile-lane-gutter` + la nouvelle :
  `Running 133 tests` → **133 passed / 0 failed / 0 skipped / 0 flaky**, exit 0, un seul bloc `Running`.
- **Contrôles négatifs** :
  - E2E : 3 gardes neutralisées + rebuild + rejeu → **3 failed / 5 passed**, chacun sur son assertion propre.
  - Unitaire : mock `exitFullscreen` rendu fidèle (sortie différée) → 2 failed (`<section>` au lieu de `null`).
    Avec un mock **synchrone**, le test de création restait VERT — `PIT-S85-005` évité de justesse.

### Specs non rejouées (déclarées)

- `sprint-77-theme-visual` — hors liste grep ; 10 faux rouges macOS connus (`doesn't exist`, pas `did not match`).
- `sprint-62-select-focus-indicator` — projet firefox, hors liste grep.
- Le reste de la suite — hors liste grep.

## Pitfalls rencontrés

- `PIT-S75-002` — **RTK a rendu `BUILD_EXIT=0` sur un `next build` réellement ROUGE** (ESLint `no-this-alias`
  dans le test neuf). Détecté en relisant le vrai code de sortie.
- `PIT-S85-005` — 1er jet du test unitaire non discriminant (mock synchrone).
- `PIT-S83-005` — `prettier --check` rouge après coup (non couvert par `test-quiet.sh`).
- `PIT-S87-005` — image `s94e2e-backend-e2e` réutilisée ; 2 commits `backend/` antérieurs de 5 min à sa
  création, vérifié par dates.

## Signaux mémoire

- `[MEMORY:pitfall]` Un mock `exitFullscreen` en `async () => { el = null }` s'exécute SYNCHRONEMENT jusqu'au premier `await` : il efface la course qu'on prétend tester et rend VERT le code non corrigé — différer la mutation par `setTimeout` dans un `new Promise`.
- `[MEMORY:pattern]` Prouver « une couche du shell s'ouvre hors plein écran » en E2E : l'oracle n'est ni `toBeVisible` (Playwright ne mesure pas la peinture) ni « exitFullscreen appelé », mais `document.fullscreenElement === null` pendant que la couche est ouverte, doublé du `data-testid` de l'ancêtre de `document.activeElement`.
- `[MEMORY:decision]` `requestFullscreen` EST supporté en Chromium headless (mesuré) : les nouvelles specs exercent l'API réelle plutôt que le stub de `timeline.spec.ts` (#330), dont la prémisse « aucune garantie de support » est périmée — un stub résolvant immédiatement masquerait l'asynchronie d'`exitFullscreen`.

## Recommandations suite

RECOMMAND_FOLLOWUP: retirer le stub Fullscreen de `timeline.spec.ts` (#330) au profit de l'API réelle, sa prémisse « aucune garantie de support en Chromium headless » étant infirmée par mesure [triage XS | domaine events] — pas de RECOMMAND_SECURITY ni RECOMMAND_DB_EXPERT ni RECOMMAND_UI_DESIGN car aucun changement d'auth, de schéma ni de rendu visuel, et pas de RECOMMAND_TEST_RUNNER car la suite ciblée a été jouée ici.

STATUS: COMPLETED
