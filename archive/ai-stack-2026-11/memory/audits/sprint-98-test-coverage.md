# Audit tests — Sprint 98

> Généré en fin de Phase 6 par le lead (runs rejoués par le lead depuis le worktree, pas repris des agents).

## Couverture par BR / comportement

Aucune règle métier `BR-*` touchée : géométrie d'affichage de la frise (frontend seul, aucun fichier backend modifié).

| Comportement | Issue | Cross-system flow | Unit | E2E | Contrôle négatif |
|---|---|:---:|:---:|:---:|:---:|
| Cas limites `layoutLane` (largeur nulle, départ négatif, identiques) | #748 | NON | ✅ `lane-layout.test.ts` | N/A (fonction pure) | N/A — aucun correctif requis |
| Zoom mobile : la date au centre de la piste reste visible (portrait + paysage, zoom avant et arrière) | #747 | NON | ✅ `mobile-zoom-anchor.test.ts` | ✅ `sprint-98-mobile-zoom-anchor` | ✅ 2/2 rouges re-projection neutralisée (agent) |
| Libellés de pin longs et libellé extérieur réservés dans l'empilage, sans collision | #746 | NON | ✅ `label-reserve.test.ts`, `lane-layout.test.ts`, `EventPill.test.tsx` | ✅ `sprint-98-label-collision` (desktop, portrait, paysage) | ✅ 3/3 rouges ancien comportement ; desktop rouge libellé extérieur seul ; 3/3 rouges troncature (agent) |

## Tests créés
- `frontend/src/components/timeline/lane-layout.test.ts` (describe « cas limites (#748) » + emprise `labelTrailPx`)
- `frontend/src/components/timeline/mobile-zoom-anchor.test.ts`
- `frontend/src/components/timeline/label-reserve.test.ts`
- `frontend/src/components/timeline/EventPill.test.tsx` (libellé extérieur tronqué + `title`)
- `frontend/e2e/sprint-98-mobile-zoom-anchor.spec.ts`
- `frontend/e2e/sprint-98-label-collision.spec.ts`

## Résultats runs (lead, HEAD 47484557)
- Vitest : 152 fichiers, **1953/1953** verts
- `tsc --noEmit` : 0 erreur ; `format:check` : OK ; `next build` (variables proxy E2E au build) : OK
- Backend : non rejoué — 0 fichier `backend/` modifié depuis `origin/dev`
- E2E suite complète contre `next build` + `next start` (base e2e recréée) : **478 passed / 1 failed / 8 skipped / 1 did not run** en 3,0 min. Échec = `sprint-77-theme-visual.spec.ts:620` (armement de la comparaison de captures, qui ne peut pas rougir sous `--ignore-snapshots` sur darwin — mécanique, identique au S97). Le « did not run » suit ce test dans son bloc série.
- Coverage-E2E (testids ajoutés dans les `.tsx`) : 0 nouveau testid.

## Non vérifié
- Pinch réel à 2 pointeurs en E2E (#747) ; dates proches des bornes de la frise.
- #746 : thème sombre, 4 locales réelles, largeur réelle du glyphe ↻, titres en capitales, zooms autres que Mois.
- Comparaisons de captures : CI Linux uniquement.

## Conclusion
Prêt pour PR, sous réserve de la review batch (Phase 7).
