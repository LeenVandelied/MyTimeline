# Mini-plans architect — Sprint 46

> Généré par /sprint plan 5 (architect, 2026-07-16). Lu par /sprint start Phase 4.1.
> ⚠ App router = `frontend/app/`, PAS `frontend/src/app/`.

```yaml
issue_315:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx"                   # vérifié : bloc aperçu L496-506, data-testid="event-form-preview", previewInk/previewDuration/previewRecurrence débouncés L186-211
    - "frontend/src/components/events/NewEventDrawer.tsx"           # vérifié (247 lignes, hôte de l'aperçu)
    - "frontend/src/components/timeline/index.ts"                   # vérifié : exporte Ruler (L8), EventBar (L12), Cursor (L14) → réutilisables
    - "frontend/src/components/timeline/Ruler.tsx"                  # vérifié
    - "frontend/src/components/timeline/Cursor.tsx"                 # vérifié
    - "frontend/src/components/timeline/EventBar.tsx"               # vérifié
    - "docs/design/graphite-handoff.md"                             # vérifié (15.9K, §6 = spec de la mini-frise)
  couches_touchees: ["frontend"]
  strategie_test: "unit"                                            # RTL ; l'E2E de l'aperçu arrive en S47 via #314
  risque_regression: "L'aperçu est alimenté par des valeurs débouncées à 150 ms (BR-EVE-009, EventEditForm.tsx:126) — une mini-frise qui recalcule des positions à chaque frappe non débouncée dégraderait la saisie ; conserver le passage par useDebounced."
  ordre_ecriture: "ui-design (valider handoff §6) → composants DS réutilisés (Ruler/Cursor/EventBar) → EventEditForm → NewEventDrawer → RTL"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — l'aperçu actuel est un bloc coloré simple, aucun Ruler/Cursor importé dans EventEditForm.tsx)"

issue_316:
  fichiers_cles:
    - "frontend/src/components/timeline/EventDrawer.tsx"            # vérifié : trap inline L32 previousFocus, L36-38 focus initial, L56-58 listener keydown, L60 restauration — aucun import useFocusTrap
    - "frontend/src/components/timeline/useFocusTrap.ts"            # vérifié (64 lignes)
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "BUG-S44-001 (vérifié dans le corps de l'issue) : useFocusTrap a onEscape en dépendance d'effet → le callback DOIT être stabilisé en useCallback chez l'appelant, sinon vol de focus pendant la saisie."
  ordre_ecriture: "stabiliser onEscape (useCallback) → remplacer le trap inline → RTL"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — 12 fichiers consomment useFocusTrap, EventDrawer.tsx n'en fait pas partie)"

issue_309:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineEditHost.tsx"       # vérifié L30 : "`onDeleteEvent` reste non câblé (hors périmètre A/B/C)" ; L92 : <TimelineResponsive {...props} onEditEvent={setEditing} /> — pas de onDeleteEvent
    - "frontend/src/components/timeline/TimelineResponsive.tsx"     # vérifié L45 prop onDeleteEvent déclarée, L77/L90 propagée aux vues mobiles
    - "frontend/src/components/timeline/TimelineActionSheet.tsx"    # vérifié L25 onDelete?, L57 onDelete?.(event)
    - "frontend/src/services/eventService.ts"                       # vérifié : deleteEvent importé par TimelineEditHost.tsx:10
  couches_touchees: ["frontend"]
  strategie_test: "unit"                                            # E2E du parcours mobile ramassée par #205 en S47
  risque_regression: "TimelineEditHost.tsx:71 possède déjà un onDelete pour le chemin desktop (EventDrawer, L125) — RÉUTILISER ce callback plutôt que d'en créer un second, sinon divergence d'invalidation de cache entre desktop et mobile."
  ordre_ecriture: "réutiliser le onDelete desktop existant → câbler onDeleteEvent sur TimelineResponsive → RTL"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — la prop existe de bout en bout SAUF le dernier maillon TimelineEditHost → TimelineResponsive, explicitement documenté comme non câblé)"
```

## Vagues
- **V1 (parallélisable — fichiers disjoints)** : #315 (`EventEditForm.tsx` + `NewEventDrawer.tsx`) ∥ #316 (`timeline/EventDrawer.tsx`)
- **V2 (après #316 — `TimelineEditHost.tsx` monte `EventDrawer` et y câble déjà `onDelete` L125 ; toucher les deux en parallèle = conflit)** : #309

## Ordonnancement critique
**#315 DOIT précéder #314 (S47)** : #314 asserte `event-form-preview-recurrence`, que #315 réécrit. E2E d'abord = spec réécrite aussitôt.

## Zone chaude
`AppShell.tsx` consomme `useAuthGuard` ET `useFocusTrap`. #302 (S45) et #316 (S46) le frôlent chacun → jamais dans le même sprint. C'est respecté.
