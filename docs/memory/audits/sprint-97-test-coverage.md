# Audit tests — Sprint 97

> Généré en fin de Phase 6 par le lead, à partir des done.md et de ses propres runs.
> Aucune BR métier touchée (a11y / géométrie de frise / i18n) : la grille BR est remplacée par une grille par critère d'acceptation.

## Couverture par critère d'acceptation

| Issue | Critère | Cross-system | Unit (Vitest) | E2E | Preuve négative |
|---|---|:---:|:---:|:---:|:---:|
| #670 | Consommateurs textuels recensés | NON | ✅ garde statique `src/styles/__tests__/ink-faint-non-text.test.ts` (tsx + css) | — | ✅ motifs fautifs détectés |
| #670 | Ratio ≥ 4,5:1 clair ET sombre | NON | — | ✅ `e2e/sprint-97-ink-faint-contrast.spec.ts` 13/13 (5,85–6,26:1) | ✅ 7/8 rouges avant migration (8e = icône à 3,20 > 3:1, attendu) |
| #670 | Non-régression usages non textuels | NON | ✅ (hover borders DEC-S97-006) | ⚠ références `-linux` : aucune impactée a priori, **tranché par la CI Linux** | ✅ garde hover rougit si `ink-faint` réinjecté |
| #716 | Clés mortes supprimées, recherche tracée | NON | ✅ `i18n-namespaces` + products/events 260 tests | N/A | — |
| #709 | 2 occurrences chevauchantes visibles + cliquables × 3 frises | NON | ✅ `lane-layout.test.ts` (rangées, gap px→jours, zoom) | ✅ `e2e/sprint-97-lane-stacking.spec.ts` 3/3, `--repeat-each=3` 38 passed | ✅ 3/3 rouges empilage neutralisé (hit-test A→B) |
| #709 | Pas de régression virtualisation / clavier | NON | ✅ `virtualization.test.ts` (sommes préfixées, bornes), tests clavier inter-rangées | ✅ suite complète | — |

Cross-system flow = NON partout → pas d'E2E métier requis.

## Tests créés
- `frontend/src/styles/__tests__/ink-faint-non-text.test.ts` (#670 + DEC-S97-006)
- `frontend/e2e/sprint-97-ink-faint-contrast.spec.ts` (#670)
- `frontend/src/components/timeline/lane-layout.test.ts` (#709)
- `frontend/e2e/sprint-97-lane-stacking.spec.ts` (#709)

## Résultats runs
- Vitest frontend (lead, après correction de review `e665d82c`) : 150 fichiers, **1918/1918**
- Backend : 632 OK (agent #670 ; aucun fichier backend modifié par le sprint)
- E2E suite complète (agent #709, `next build`+`next start`, `--ignore-snapshots`) : **473 passed / 1 failed / 8 skipped** — l'échec = armement de `sprint-77-theme-visual` qui échoue mécaniquement sous `--ignore-snapshots` (constaté aussi par l'agent #670) ; références visuelles non jouables sur macOS → **CI Linux = juge**.
- `e665d82c` (bordures au survol) : non rejoué en E2E local (pile arrêtée) — couvert par garde statique ; CI.

## Non vérifié
- Virtualisation verticale (≥ 60 lanes) avec lanes empilées, en navigateur.
- Rendu visuel à 3+ rangées ; recouvrement des bords des zones de frappe entre rangées (ui-design : acceptable, mesure humaine recommandée).
- Mesure E2E de contraste pour settings/avatar, 404 et footer (garde statique seulement).

## Conclusion
Prêt pour PR — sous réserve de la CI Linux (e2e + références visuelles).
