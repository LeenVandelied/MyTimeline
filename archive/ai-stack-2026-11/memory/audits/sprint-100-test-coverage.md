# Audit tests — Sprint 100

> Généré en fin de Phase 6 par le lead (E2E joué par le lead, pas délégué à un test-runner).
> Aucune BR métier impactée : frontend seul, géométrie et atteignabilité des contrôles.

## Couverture par issue

| Issue | Description | Cross-system flow | Unit (Vitest) | E2E parcours | Armement (rouge sans le correctif) |
|----|----|:---:|:---:|:---:|:---:|
| #732 | Croix des bottom sheets hors viewport après défilement | NON | ✅ consommateurs de `DialogContent` (334/334) | ✅ `sprint-100-dialog-close-reachable` (ProductDrawer + CategoryDrawer à 390×600) | ✅ y=-123 / y=-100 sur l'ancien code |
| #740 | Croix de `DialogContent` qui défile avec le contenu | NON | ✅ idem | ✅ même spec + contrôle desktop DeleteConfirmDialog (top-4/right-4) | ✅ idem |
| #480 | Réserve basse sous le FAB mobile | NON | ✅ `AppShell.test.tsx` (+1 test, 41/41) | ✅ `sprint-100-fab-clearance` (5 écrans à 390 px + 1280 px) | ✅ 5 rouges / 6 avec l'ancien `AppShell.tsx` (A/B du lead) |

Oracle existant modifié par arbitrage du dev : `sprint-95-toast-overlap` — régime TALL 390×844 attendu désormais en recouvrement TOTAL (décision B #714 étendue, 2026-09-21), `scrollLeft` neutralisé et garde « pas de débordement horizontal » ajoutée. Armement : l'ancien `dialog.tsx` fait rougir les 3 régimes (garde de largeur, scrollWidth 587-603 pour 388).

## Tests créés
- `frontend/e2e/sprint-100-dialog-close-reachable.spec.ts` (#732, #740)
- `frontend/e2e/sprint-100-fab-clearance.spec.ts` (#480)
- `frontend/src/components/layout/AppShell.test.tsx` (+1 cas)

## Résultats runs (lead, 2026-09-21)
- Vitest complet : 152 fichiers, 1957 passed, 0 failed
- `format:check` : exit 0 ; `next build` (lint bloquant inclus) : exit 0
- E2E ciblé (#480 + 9 specs mobiles citant `shell-main`/FAB) sous `next dev` : 69 passed, 0 failed
- E2E suite complète sous `next build` + `next start`, base e2e remise à zéro : 505 tests — 495 passed, 8 skipped, 1 did not run, 1 failed. L'échec est `sprint-77-theme-visual:620` (armement de la comparaison de captures) : échoue mécaniquement hors Linux, attendu sur darwin (`--ignore-snapshots`), tranché par la CI.
- Aucune référence `*-darwin.png` créée.

## Non vérifié
- Rendu Linux (CI) des specs géométriques : les métriques de police diffèrent de darwin.
- Thème sombre, Firefox/WebKit, `safe-area-inset-bottom` réel (vaut 0 sous Chromium).
- Défilement interne du dashboard en paysage mobile sous le FAB (follow-up signalé par #480).

## Conclusion
Prêt pour PR.
