## Objectif

Trois bugs d'interaction de la frise : les raccourcis clavier n'agissent plus derrière un formulaire, l'édition fonctionne en plein écran, et aucun événement n'est plus caché sous la colonne sticky mobile.

Milestone : **Sprint 94** (#95). Cohésion 1.00, 3 issues, 6 points.

## Issues traitées

| Issue | Commits | Changement |
|---|---|---|
| #672 — Les raccourcis de la frise agissent derrière le formulaire de création | `1be053a9`, `36931a46` | Garde `isOverlayLayerOpen()` : toute couche `[role=dialog]`/`[role=alertdialog]` montée **hors** de `rootRef` suspend `F`/`T`/`+`/`-`/`[`/`]` et `Escape`. Les couches internes (EventDrawer de la frise) restent transparentes. |
| #706 — Frise mobile : événements sous la colonne sticky des lanes | `0ec6114d`, `7efca10e` | Gouttière de piste : token `--lane-header-w-m: 120px`, `.mt-tlm__lane-label` en largeur fixe, `margin-left` sur les familles d'éléments positionnés du rail, `MOBILE_LANE_TRACK_OFFSET_PX` côté état (rail, minimap, `scrollToToday`, restauration #328). |
| #712 — Modifier un événement en plein écran : drawer et toast invisibles | `9fbbbe2d` | Helper `runOutsideFullscreen(action)` : quitte le plein écran et **attend la promesse** avant de monter une couche du shell. Branché sur « Éditer » et sur `onNewEvent`. |

## Trois prémisses d'énoncé infirmées pendant le sprint

Elles changent la lecture des correctifs, donc elles sont listées ici plutôt qu'enfouies dans les artefacts.

1. **#672** — l'énoncé proposait de filtrer sur `[role="dialog"][aria-modal="true"]`. L'attribut existe bien (posé à la main par `EventFormDrawer.tsx:173-174`, Radix n'en pose aucun), mais il **ne distingue pas une couche superposée d'une couche interne** : il aurait coupé `T`/`[`/`]` sous le drawer de détail de la frise. Le discriminant retenu est la containment DOM.
2. **#706** — l'énoncé ciblait `ensureVisible` / le centrage « Aujourd'hui ». La frise mobile **n'a pas d'`ensureVisible`** et `scrollToToday` centre déjà. Le défaut est **structurel** : étiquette `sticky left:0` en flux, événements `absolute` sans décalage de piste. Un correctif limité au défilement aurait laissé le bug sur tout événement en début de plage.
3. **#712** — `requestFullscreen` **est** supporté en Chromium headless (mesuré par sonde). La prémisse inverse, inscrite dans `timeline.spec.ts` (#330), est périmée. Par ailleurs `onNewEvent` — cité comme le modèle à suivre — appelait `exitFullscreen()` **sans attendre** : la course était réelle, elle est corrigée elle aussi.

## Tests

| Suite | Résultat | Exit |
|---|---|:---:|
| Backend unitaire | 632 passed / 0 failed | 0 |
| Frontend build + unit + typecheck + lint | 145 fichiers, 1839 passed / 0 failed | 0 |
| `prettier --check` | conforme | 0 |
| E2E — liste grep complète des surfaces touchées (22 specs) | **133 passed / 0 failed / 0 skipped / 0 flaky** | 0 |

**Chaque spec neuve a un contrôle négatif documenté** : garde neutralisée puis rejeu, pour prouver qu'elle rougit. Le test unitaire de #712 a d'ailleurs été refait — avec un mock `exitFullscreen` synchrone il restait vert sur du code non corrigé.

Audit détaillé : `docs/memory/audits/sprint-94-test-coverage.md`.

## Ce qui n'a pas été vérifié en local

- **La suite E2E complète n'a pas été rejouée au HEAD final.** Au commit `0ec6114d` elle rendait 404 expected / 9 skipped / 10 unexpected, les 10 étant `sprint-77-theme-visual` avec « A snapshot doesn't exist … `-chromium-darwin.png` » : références absentes sur macOS, pas des rendus divergents. **Aucune référence visuelle n'a été régénérée** — le job `e2e` de cette CI est le seul arbitre.
- `sprint-62-select-focus-indicator` (projet firefox) n'a pas été joué en local.
- Flake préexistant, non imputable à ce sprint : `sprint-84-palette.spec.ts:128` (~2/5 sur `dev` comme sur branche).

## Review

Reviewer batch : **0 CRITIQUE / 0 MAJEUR / 2 MINEURS**, verdict `MERGEABLE`.

- MINEUR corrigé (`7efca10e`) : la boucle de dérive de `TimelineMobilePortrait.test.tsx` omettait `.mt-tlm__lane > .mt-tlm__ghost-pin` (le sélecteur de `__ghost` en est un préfixe, donc `toContain` seul ne le couvrait pas).
- MINEUR laissé, en risque documenté : `isOverlayLayerOpen()` ne couvre que `role=dialog`/`alertdialog` ; un futur Popover ou DropdownMenu Radix (`role=menu`/`listbox`) monté hors dialog échapperait à la garde. Aucun composant concerné aujourd'hui (grep vérifié).

## Suivi

Aucune migration Flyway. Aucun changement backend, d'auth ni de schéma.

Follow-ups signalés par les agents, à trier en `/sprint end 94` :
- garde symétrique pour les raccourcis globaux hors frise (aucun autre listener `window keydown` audité) — XS
- `scrollToToday` exposé par `useTimelineMobileState` mais câblé nulle part en mobile (aucun bouton « Aujourd'hui ») — S
- les lanes mobiles n'ont pas de trame de jours faute de `background-size`, contrairement au desktop — S
- retirer le stub Fullscreen de `timeline.spec.ts` (#330), sa prémisse étant infirmée par mesure — XS

Closes #672
Closes #706
Closes #712

🤖 Generated with [Claude Code](https://claude.com/claude-code)

