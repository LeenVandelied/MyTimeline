# Audit tests — Sprint 105

> Frise : gouttière 176 px, zébrures de lanes, touche F qui recadre. Généré en fin de Phase 6
> (lead). Aucune règle métier touchée (rendu et navigation de la frise, frontend seul) : la
> grille porte sur les critères d'acceptation des issues.

## Couverture par issue

| Issue | Critère | Cross-system flow | Vitest | E2E parcours | Contrôle négatif |
|-------|---------|:---:|:---:|:---:|:---:|
| #674 | Gouttière à 176 px, token et constante JS jumeaux, alignement en-têtes / règle / pastilles / minimap | NON | ✅ dérive `LANE_TRACK_OFFSET_PX` ↔ `--lane-header-w` (`TimelineView.test.tsx`) | ✅ specs de géométrie lisant le token (`e2e/support/timeline-lanes.ts`) : `timeline`, `sprint-85-timeline-group-head`, `sprint-91-recurrence-marks` | ✅ agent (voir `issue-674-done.md`) |
| #429 | Fallback `var(--lane-header-w, 160px)` retiré | NON | ✅ verrou « aucun fallback du token » | N/A (CSS, rendu couvert par #674) | ✅ fallback remis → rouge |
| #596 | Zébrure bureau + mobile (portrait, paysage), clair + sombre, parité stable sous virtualisation, grille verticale retirée | NON | ✅ classe `--alt` par rang (`TimelineView`, `TimelineMobilePortrait`, `TimelineMobileLandscape`) | ✅ `sprint-105-lane-zebra` (7 tests : 3 vues × 2 thèmes + 70 lanes virtualisées) ; `sprint-91-more-contrast` adapté au vrai fond | ✅ `:nth-child` → test de virtualisation rouge ; règle retirée → 7/7 rouges ; Vitest 4/4 rouges |
| #597 | F recadre sur les événements affichés (catégorie masquée exclue, repliée incluse, produit replié exclu), no-op si rien, plein écran au bouton seul, aide et sidebar à jour (4 locales) | NON | ✅ `computeFit` (`zoom.test.ts`), `TimelineView.fit-shortcut.test.tsx`, sidebar, raccourcis sous modale | ✅ `sprint-105-fit-shortcut` (pastilles extrêmes mesurées dans le viewport après F) ; `sprint-94-modal-shortcuts` passe par le bouton | ✅ 5 Vitest + 3 E2E rouges puis restaurés |

Aucun flux multi-systèmes : pas d'E2E métier requis.

## Tests créés

- `frontend/e2e/sprint-105-lane-zebra.spec.ts` (#596)
- `frontend/e2e/sprint-105-fit-shortcut.spec.ts` (#597)
- `frontend/src/components/timeline/TimelineView.fit-shortcut.test.tsx` (#597)
- `frontend/e2e/support/timeline-lanes.ts` : `LANE_GUTTER_PX` lu dans `spacing.css` (#674)
- Cas ajoutés : `zoom.test.ts`, `TimelineView.test.tsx`, `TimelineMobilePortrait.test.tsx`,
  `TimelineMobileLandscape.test.tsx`, `TimelineSidebar.test.tsx`, `TimelineView.modal-shortcuts.test.tsx`

## Résultats des runs (lead, HEAD `7f4ac55c`)

- Vitest : 2029/2029 verts.
- `next build` (lint bloquant compris) : vert.
- E2E, suite complète contre `next build` + `next start` (:3100, backend HEAD :8086) :
  **555 verts, 8 sautés, 1 non exécuté, 11 rouges hors sprint** :
  - `sprint-77-theme-visual:580` × 10 : captures `-darwin` absentes (références suivies en `-linux`
    seulement) — pages auth et landing non touchées ; les 10 PNG générés ont été supprimés ; la CI
    Linux tranche.
  - `sprint-101-fab-landscape:271` : rouge aussi sur la base `afa08f81` (A/B lead, worktree jetable,
    2/2) — déjà suivi par #769 (dépend de l'heure, agenda du dashboard, surface non touchée).
- Baseline des 10 specs frise sur `ade5dba6` avant le sprint : 87 verts / 1 rouge
  (`sprint-63-de-overflow-audit:571` es) — non reproduit ensuite (instable).

## Review batch (Phase 7)

Reviewer : 0 CRITIQUE, 1 MAJEUR, 2 MINEURS.
- MAJEUR « F silencieux quand rien n'est affiché » : écarté du sprint — no-op décidé au briefing,
  cohérent avec les autres raccourcis en butée (`+` au niveau le plus fin, `-` au plus large) ; versé
  en follow-up (annonce `aria-live`).
- MINEURS (double écriture de `scrollLeft` ordre-dépendante entre deux `useLayoutEffect` ; mention
  historique de 168 dans un commentaire de `timeline.spec.ts`) : documentaires, non bloquants.

## Coverage E2E (Phase 8)

Seul testid apparaissant dans le diff `.tsx` : `timeline-lane-list` / `timeline-resource-row`,
cités dans des lignes de tests Vitest ajoutées — tous deux pré-existants (#69), le second cité par
9 specs. Aucun testid nouveau sans spec.

## Conclusion

Prêt pour PR.
