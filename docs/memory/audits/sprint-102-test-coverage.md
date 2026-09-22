# Audit tests — Sprint 102

> Généré en fin de Phase 6 par le lead (2026-09-22). Aucun `[MISSING]`.

## Couverture par règle / issue

| Issue / BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| #761 (DEC-S101-001) | 403 inline dans ProductDrawer/CategoryDrawer → aucun toast global ; autres écrans : toast conservé ; 401 jamais neutralisé | NON (frontend seul, aucun changement serveur) | N/A | N/A | ✅ `apiClient.test.ts` (+3), `inlineErrorHandling.test.ts` (4), hooks (+2), `ProductDrawer.test.tsx` (+1), `CategoryDrawer.forbidden.test.tsx` (3), `ProductDrawer.forbidden.test.tsx` (3) — chaîne réelle drawer → hook → service → intercepteur, adaptateur HTTP seul simulé, contrôle par mutation | ✅ drawers produits/catégories rejoués (suite complète) | N/A — aucune spec ne simule un 403 ; la chaîne réelle est prouvée en Vitest |
| #762 (BR-AUT-003, invariant #508) | `scorePassword` en classes Unicode ; refusé serveur ⇒ `weak` | NON | N/A | N/A | ✅ `PasswordStrength.test.tsx` 14 → 20 (4 rougissent avec les anciennes regex ASCII) | ✅ `settings-security` (suite complète) | N/A |
| #763 | sélecteur `sprint-99-touch-targets` voit `[role=switch]`, `[role=checkbox]`, `label.mt-switch` | NON | N/A | N/A | N/A | ✅ 14/14 + sonde permanente 38×22 (contrôle négatif : ancien sélecteur ⇒ rouge) | N/A |
| #764 | mesure 375 px : `TimelineBottomSheet` (croix 44×44), feuille d'actions (3 × 351×48), CTA état vide carrousel (143,4×44) et agenda compact (174×44) ; absence assertée de WeekAgenda/ProductList à 375 px | NON | N/A | N/A | N/A | ✅ `sprint-102-touch-targets` 8/8 puis 14/14 `--repeat-each=3` | N/A |

## Tests créés
- `frontend/src/services/inlineErrorHandling.test.ts`
- `frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx`
- `frontend/src/components/products/ProductDrawer.forbidden.test.tsx`
- `frontend/e2e/sprint-102-touch-targets.spec.ts`
- ajouts : `apiClient.test.ts`, `useCreateProduct.test.tsx`, `useUpdateProduct.test.tsx`, `ProductDrawer.test.tsx`, `PasswordStrength.test.tsx`, `e2e/sprint-99-touch-targets.spec.ts`

## Résultats runs (lead)
- Vitest : 157 fichiers, 1997 tests verts (après les correctifs de review).
- `format:check` vert, `lint` vert, `next build` vert.
- E2E suite complète chromium contre `next build` + `next start` (backend e2e dédié `:8087`), `--ignore-snapshots` : **499 verts, 8 sautés, 2 rouges**, tous deux hors sprint :
  - `sprint-77-theme-visual:620` — rouge attendu en local (référence `*-darwin.png` absente, armement visuel).
  - `sprint-101-fab-landscape:271` (profil 667×375) — **préexistant, prouvé par A/B** : même rouge sur `origin/dev` (build `origin/dev` dans un worktree jetable, 2/4 rouges). Aucun fichier du tableau de bord n'est touché par le sprint. Cause probable : l'assertion `hitAtCenter` s'applique dès `cy >= 0`, or le centre de la dernière ligne d'agenda (y ≈ 8 px) est sous l'en-tête collant ; la hauteur de l'agenda dépend du jour des données semées, et le run a eu lieu entre 00 h et 02 h (Paris), quand jour local ≠ jour UTC. → suite proposée.
- Les 2 commits de review (`80aa644e` Vitest, `1c3bc02f` spec sprint-99) sont postérieurs à la suite complète : rejoués ciblés (Vitest complet ; sprint-99 14/14).

## Conclusion
Prêt pour PR. Aucune règle métier cross-system touchée.
