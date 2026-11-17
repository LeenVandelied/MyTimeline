# Audit tests — Sprint 94

> Généré en fin de Phase 6. Aucune couverture manquante : condition d ouverture de la PR.
> HEAD de l'audit automatisé : `36931a46`. Le commit `7efca10e` (correction MINEUR de review,
> test seul) a été vérifié séparément : `vitest` exit 0 (18/18), `prettier --check` exit 0.

## Couverture par comportement

Le sprint corrige **3 bugs d'interaction**. Aucune règle métier `BR-*` n'est touchée : pas de
changement de schéma, d'endpoint, d'auth ni de calcul de dates. La colonne « BR » est donc sans objet,
et la couverture est exprimée par comportement observable.

| Comportement | Cross-system flow | Unit frontend | E2E | Contrôle négatif |
|---|:---:|:---:|:---:|:---:|
| #672 — les raccourcis de la frise sont neutralisés sous une couche modale hors `rootRef` | NON | OK `TimelineView.modal-shortcuts.test.tsx` (7 cas) | OK `e2e/sprint-94-modal-shortcuts.spec.ts` | OK garde neutralisée -> rouge sur « la fenêtre temporelle ne doit pas bouger » |
| #672 — les raccourcis fonctionnent normalement panneau fermé | NON | OK | OK (contrepartie dans la même spec) | OK |
| #706 — aucun événement sous la colonne sticky (portrait 390x844) | NON | OK `TimelineMobilePortrait.test.tsx` (dérive token CSS/TS + 7 familles de sélecteurs) | OK `e2e/sprint-94-mobile-lane-gutter.spec.ts` | OK gouttière neutralisée par `addStyleTag` -> `eventLeft=86` vs `labelRight=145` |
| #706 — idem paysage (844x520) | NON | OK `TimelineResponsive.rotation.test.tsx` | OK | OK `150` vs `209` |
| #706 — non-régression desktop (#392) | NON | OK | OK (20 specs de la liste grep) | n/a |
| #712 — le drawer d'édition s'ouvre hors plein écran | NON | OK `TimelineView.fullscreen-overlays.test.tsx` | OK `e2e/sprint-94-fullscreen-overlays.spec.ts` | OK 3 gardes neutralisées + rebuild -> 3 failed |
| #712 — le toast de confirmation est visible | NON | OK | OK | OK |
| #712 — le focus n'est plus piégé | NON | OK (mock `exitFullscreen` différé) | OK (`data-testid` de l'ancêtre de `document.activeElement`) | OK mock synchrone -> test vert à tort, donc mock rendu fidèle |

Aucun flux 2+ systèmes/rôles dans ce sprint -> aucun E2E métier requis.

## Tests créés

- `frontend/src/components/timeline/TimelineView.modal-shortcuts.test.tsx` (+223)
- `frontend/src/components/timeline/TimelineView.fullscreen-overlays.test.tsx` (+198)
- `frontend/src/components/timeline/TimelineMobilePortrait.test.tsx` (+53, puis +5 review)
- `frontend/src/components/timeline/TimelineResponsive.rotation.test.tsx` (+26/-...)
- `frontend/e2e/sprint-94-mobile-lane-gutter.spec.ts` (+277)
- `frontend/e2e/sprint-94-fullscreen-overlays.spec.ts` (+189)
- `frontend/e2e/sprint-94-modal-shortcuts.spec.ts` (+132)

## Résultats des runs (codes de sortie réels, commandes passées par `rtk proxy`)

| Suite | Commande | Résultat | Exit |
|---|---|---|:---:|
| Backend unitaire | `./scripts/test-quiet.sh unit` | 632 passed / 0 failed | 0 |
| Frontend build+unit+typecheck+lint | `./scripts/test-quiet.sh frontend` | 145 fichiers / 1839 passed | 0 |
| Format (exigé par la CI, absent de `test-quiet.sh`) | `prettier --check .` | conforme | 0 |
| E2E — liste grep complète des surfaces touchées (22 specs) | `playwright test <liste>` | **133 passed / 0 failed / 0 skipped / 0 flaky** | 0 |

## ATTENTION — ce qui n'a PAS été vérifié en local, à trancher par la CI

- **La suite E2E complète n'a pas été rejouée au HEAD final.** Elle l'a été au commit `0ec6114d`
  (#706) : 404 expected / 9 skipped / **10 unexpected**, les 10 étant `sprint-77-theme-visual` avec
  « A snapshot doesn't exist ... `-chromium-darwin.png` » — références absentes sur macOS, **pas** des
  rendus divergents (`doesn't exist` != `did not match`, `PIT-S77-019`). Les 10 PNG générés ont été
  supprimés et **non commités** : la CI Linux est la seule juge. Aux commits suivants, seules les
  22 specs de la liste grep ont été rejouées (133/133).
- `sprint-62-select-focus-indicator` (projet firefox) n'a pas été joué en local.
- Flake préexistant connu et non imputable au sprint : `sprint-84-palette.spec.ts:128`
  (~2/5 sur `dev` comme sur branche, `PIT-S90-010`).

## Conclusion

Prêt pour la PR. Les 4 checks requis de la CI (backend, frontend, e2e, ai-env-packs) sont
attendus verts ; le job `e2e` est le seul qui apporte une information que le local ne donne pas
(références visuelles Linux).
