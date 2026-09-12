# Issue #350 — Supprimer TimelineCalendar.tsx, code mort depuis le Sprint 42

**Sprint :** 51 · **Vague :** 2 (parallèle avec #351, absorbée en marge) · **Taille :** XS · **Modèle :** sonnet/medium
**Commit :** `72e74e7` — `:fire: chore(timeline): supprime TimelineCalendar.tsx, code mort depuis le S42`
**Pack lu :** OUI — `cp-frontend` §Structure frontend/ (calendar/, timeline/, styles/ds/)

## Ce qui a changé

`frontend/src/components/calendar/TimelineCalendar.tsx` (114 lignes) **supprimé**. Les 4 références
résiduelles réécrites **sans nommer le fichier disparu**, en **conservant la trace de la régression
du S17** (c'est ce que demandait le critère d'acceptation) :

- `frontend/src/components/timeline/TimelineEditHost.tsx` (ligne ~21)
- `frontend/src/components/timeline/index.ts` (ligne ~3)
- `frontend/src/components/timeline/lib.ts` (ligne ~6)
- `frontend/src/styles/ds/readme.md` (ligne ~35)

Le dossier `frontend/src/components/calendar/` **a disparu automatiquement** — git ne trackait que
ce fichier. Aucune suppression manuelle de dossier.

**Archives préservées :** aucun fichier sous `docs/memory/**` ni `docs/adr/**` n'a été touché. Le
garde-fou du briefing a tenu — l'historique qui documente le piège ayant failli coûter 8 points au
S49 reste intact.

## Vérifications

| Critère | Résultat |
|---|---|
| `git grep -n TimelineCalendar -- frontend` | **vide** (exit 1, 0 match) |
| Suite unitaire | **814/814 verts** — identique avant/après |
| `tsc --noEmit` | 0 erreur *(le vrai détecteur d'import résiduel)* |
| `next build` | succès — seul warning = lockfile multiple, **préexistant, hors périmètre** |
| Aucun test modifié | ✅ respecté (critère d'acceptation explicite) |

## ⚠ Correction d'une note d'archive : les composants d'édition ne sont PAS orphelins

L'archive `docs/memory/sprints/sprint-42/issue-232-done.md` affirme que `EventContent`,
`EventEditForm` et `ConflictDialog` seraient orphelins, leur seul point de montage étant
`TimelineCalendar` (non routé).

**Vérification de l'agent : c'est faux aujourd'hui.** `Lane` / `EventBar` / `EventContent` sont
montés via `TimelineEditHost` → `dashboard/page.tsx` **et** `timeline/page.tsx` (imports confirmés).
La suppression de `TimelineCalendar.tsx` ne les a donc pas laissés sans consommateur — ce que
confirment les 814 tests verts et le build.

> Note du lead : cette contradiction porte sur une **archive du S42**, pas sur l'issue #350. Elle est
> consignée ici sans réécrire l'archive. À arbitrer en consolidation mémoire (`/sprint end`).

## Recommandations suite
Aucune remontée par l'agent.

## non_verifie (déclaré par l'agent, conservé tel quel)

- **E2E Playwright non relancés.** L'issue #350 les listait pourtant dans ses critères d'acceptation
  (« suite E2E au vert ») ; l'agent s'est tenu à l'ordre de travail du briefing, qui n'imposait que
  build + typecheck + vitest. **Écart assumé — couvert par l'audit E2E global du sprint (Phase 6).**
- Dossier `frontend/src/components/calendar/` disparu automatiquement, non vérifié manuellement.

## Périmètre respecté
`git show --stat 72e74e7` → 5 fichiers, tous dans la matrice autorisée. Aucune contamination du
périmètre de #351 (`TimelineView.tsx`, `useTimelineViewport.ts` intacts dans ce commit), aucun
fichier d'archive touché.

STATUS: COMPLETED
