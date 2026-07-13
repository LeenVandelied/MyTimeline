# Audit tests — Sprint 40 (Shell applicatif)

> Généré en fin de Phase 6. Aucun marqueur bloquant de couverture manquante.
> Sprint 100 % frontend — aucun code backend/migration/auth touché.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest/RTL frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| (aucune) | #245 = bug fix invalidation cache, `BR impactées: Aucune` | NON | ⚠ N/A | ⚠ N/A | ✅ | ✅ (categories.spec) | ⚠ N/A |
| (aucune) | #210 = shell/layout, pas de règle métier | NON | ⚠ N/A | ⚠ N/A | ✅ | ⚠ planifié (voir §Coverage-E2E) | ⚠ N/A |

Aucune BR avec cross-system flow=OUI → aucun E2E métier obligatoire. Aucune couverture obligatoire manquante.

## Tests créés / modifiés
- `frontend/src/hooks/useDeleteCategory.test.tsx` (nouveau — #245 : appel service + invalidation `categories.all` + `products.all` onSuccess)
- `frontend/src/components/products/CategoriesView.test.tsx` (adapté — mock hook)
- `frontend/src/components/categories/CategoryDrawer.test.tsx` (adapté — mock hook)
- `frontend/e2e/categories.spec.ts` (modifié — `reload()` workaround retiré, disparition observée en place)
- `frontend/src/components/layout/AppShell.test.tsx` (nouveau — #210 : nav persistante, lien actif `aria-current`, sous-route, sélecteurs langue/thème, avatar carré, logout+redirect, overlay, délégation mobile)

## Résultats runs
- **Frontend (Vitest)** : **446 passed / 0 failed** (après review-fix `27193ed` : +3 cas AppShell garde auth). `tsc --noEmit` 0 erreur. `next build` 0 erreur (2 warnings workspace-root pré-existants). eslint 0.
  - Note infra : le worktree avait un `node_modules` périmé (manquait `eslint-plugin-storybook`, déclaré dans `package.json`) → `console-error-guard.test.ts` bloqué. Résolu par `npm install` (dep déjà dans `package-lock.json`). CI (`npm ci`) n'est pas affectée.
- **Backend** : non exécuté — aucun fichier backend touché ce sprint (suite inchangée depuis dev).
- **E2E (Playwright)** : NON exécuté localement (requiert stack complète backend :8080 + Postgres → job CI `e2e`). `categories.spec.ts` mis à jour, à valider en CI.

## Coverage-E2E (Phase 8 — heuristique bash)
[COVERAGE-E2E] MAJEUR (non bloquant) : 13 nouveaux `data-testid` du shell/timeline sans spec E2E :
`app-shell, child-content, shell-main, shell-sidebar, shell-sidebar-nav, shell-sidebar-avatar, shell-sidebar-logout, shell-sidebar-new-event-button, shell-sidebar-settings-link, shell-sidebar-theme-toggle, shell-new-event-dialog, timeline-loading, timeline-placeholder`.
- Couverts en unit RTL (`AppShell.test.tsx`) mais pas en parcours E2E.
- **Plan** : `/create-e2e <PR>` après merge (parcours : navigation inter-écrans via sidebar, overlay Nouvel événement, délégation mobile). Invocation manuelle post-merge (bug nested skills).

## Review /review-pr #297 (2 tours)
- **Tour 1 (sprint start Phase 7)** : MAJEUR nav Produits hors-shell → corrigé `c3b1b9f`.
- **Tour 2 (/review-pr, reviewer indépendant)** : MAJEUR flash de chrome authentifiée pour anonyme (AppShell sans garde `loading`/`user`, `middleware.ts` = next-intl seul) + 2 MINEUR (cibles tactiles 36px, garde auth dupliquée ×3) → corrigés `27193ed` : hook partagé `useAuthGuard` (garde au niveau du shell, spinner+redirect), cibles `h-11 w-11`, 3 pages `(app)` refactorées. Tous RESOLU, aucun NOUVEAU.
- RECOMMAND_FOLLOWUP : garde serveur dans `middleware.ts` (vérif cookie JWT avant rendu des routes `(app)`) — seule défense actuelle = client-side. Issue dédiée.

## Conclusion
Prêt pour PR. Suite frontend verte (446/446), tsc/build/eslint 0. Reviews (2 tours) : MAJEUR produits-hors-shell (`c3b1b9f`) + MAJEUR flash-anonyme (`27193ed`) corrigés, MINEURs résolus. Gaps non bloquants tracés : E2E shell (→ /create-e2e post-merge), settings hors-shell + garde serveur middleware (→ follow-ups), `.eslintcache` tracké (→ follow-up hygiène). E2E `categories` à valider en CI.
