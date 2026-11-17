# Issue #309 — Câbler la suppression d'event sur la frise mobile

**Sprint :** 46 | **Vague :** 2 | **Taille :** XS | **Domaine :** timeline / events
**Commits :** `2d5f808`

## Résumé

Suppression d'événement câblée depuis la frise mobile. **BR touchées : aucune.**

- `frontend/src/components/timeline/TimelineEditHost.tsx` — `onDelete` accepte désormais un
  `target?: PositionedEvent` optionnel, et sert **desktop ET mobile**.
- `frontend/src/components/timeline/TimelineEditHost.test.tsx` — +1 cas.
- `TimelineResponsive` / `TimelineMobilePortrait` / `TimelineMobileLandscape` / `TimelineActionSheet` :
  **rien à toucher**, la propagation `onDeleteEvent` était déjà en place en amont. Seul le dernier maillon
  manquait.

**Callback réutilisé : oui** — `TimelineEditHost.onDelete` (celui branché sur `EventDrawer` / `EventEditForm`
avant le patch). Signature étendue `(target?: PositionedEvent)` : `target` fourni par le mobile (suppression
directe sans ouvrir le dialog), absent → fallback sur `editing` (desktop). Pas de second callback créé →
pas de divergence d'invalidation entre les deux chemins.

**Pitfall `BUG-S44-001` non impacté** : `TimelineActionSheet` appelle `useFocusTrap(ref, bool)` sans
`onEscape` en dépendance. `onDelete` a tout de même été stabilisé en `useCallback` par convention.

## Tests

590 vitest verts | `tsc` clean | eslint clean sur les fichiers touchés | ~11 s.
Pas de `RECOMMAND_TEST_RUNNER`.

## testid suppression mobile (requis par #205 en S47)

`timeline-actionsheet-delete` — **déjà existant** (`TimelineActionSheet.tsx:93`, posé Sprint 42/#63).
Pas nouveau : il devient simplement atteignable en production.

## Signaux mémoire

- `[MEMORY:pitfall]` — `TimelineEditHost.onDelete` (desktop **et** mobile depuis #309) n'invalide
  **aucune query TanStack** après `deleteEvent` (seulement `conflict.reset()` + `closeEditor()`).
  Gap **préexistant** — déjà vrai côté desktop seul, non introduit par #309, non corrigé (hors scope XS,
  callback réutilisé tel quel sur consigne du plan architect).
  Solution : ajouter `invalidateQueries(queryKeys.products.withEvents(userId))` dans `onDelete`.
  Prévention : inscrire ce gap dans `coverage-events` avant tout nouveau consommateur de `deleteEvent`.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — **gap d'invalidation de cache sur `deleteEvent`** : sans refetch, l'événement
  supprimé peut persister visuellement jusqu'à navigation ou refetch. À rattacher à #205 (S47) ou à un
  ticket dédié. [triage S | domaine events]
- Pas de spec E2E écrite ici (consigne du briefing — parcours mobile ramassé par #205 en S47).

STATUS: COMPLETED
