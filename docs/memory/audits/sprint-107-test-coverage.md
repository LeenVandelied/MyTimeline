# Audit tests — Sprint 107

> Généré en fin de Phase 6. Sprint 100 % frontend (aucune BR métier touchée), 3 issues : #524, #609, #608.

## Couverture par issue

| Issue | Objet | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| #524 | Contour de focus `.mt-tab` (mesure, pas de code) | NON | N/A | N/A | N/A | ✅ `sprint-107-tab-focus-outline` (4 cas + auto-contrôle par mutation) | N/A |
| #609 | En-têtes de la liste produits au motif `.mt-table th` | NON | N/A | N/A | ✅ `ProductsListView.test.tsx` | ✅ `sprint-107-products-list-mobile` (casse + police des `th`) | N/A |
| #608 | Mini-frise 90 j conservée sous `md` (compacte 64×24) | NON | N/A | N/A | ✅ `ProductSparkline.test.tsx`, `ProductsListView.test.tsx` | ✅ `sprint-107-products-list-mobile` (390 px, pas de défilement horizontal, sonde armée) | N/A |

Aucun flux inter-systèmes : pas d'E2E métier requis.

## Tests créés / modifiés
- `frontend/e2e/sprint-107-tab-focus-outline.spec.ts` (nouveau, #524)
- `frontend/e2e/sprint-107-products-list-mobile.spec.ts` (nouveau, #608 + #609)
- `frontend/e2e/sprint-92-products-next-event.spec.ts` : à 390 px, la frise attendue passe de 0 à 1 (changement de comportement voulu par #608)
- `frontend/src/components/products/ProductSparkline.test.tsx`, `ProductsListView.test.tsx` (+3 tests)

## Résultats des runs (lead, sur `aa12e4c0`)
- Backend : non concerné (0 fichier `backend/` modifié)
- Vitest : 161 fichiers, 2060/2060 ; `tsc`, `lint` et `format:check` verts
- E2E suite complète (`next build` + `next start` :3107, backend :8086 via relais :8187) : 573 passés, 9 sautés, 11 rouges hors sprint. Ce sont les mêmes qu'au S105 et au S106 : 10 captures `sprint-77-theme-visual` absentes sur darwin, et `sprint-101-fab-landscape:271` (dashboard, déjà rouge sur la base, #769). Les PNG darwin générés ont été supprimés.
- Nouvelles specs : `sprint-107-tab-focus-outline` 20/20 en `--repeat-each=3` ; `sprint-107-products-list-mobile` 9/9 en `--repeat-each=3`.

## Non vérifié
- Thème sombre dans les gardes committées (mesuré une fois par la sonde #524, pas pour #608)
- Firefox / WebKit, dpr fractionnaire
- Épaisseur du filet d'en-tête (1,5 px), arrondie à 1 px par Chrome à dpr 1

## Conclusion
Prêt pour PR.
