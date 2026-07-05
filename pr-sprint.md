## Sprint 22 — Page Produits + Drawer Catégorie + fix NPE backend

Cohésion 0.67 · Milestone #22 · base `dev`

### Objectif
Livrer la surface de gestion produits/catégories (Wave 3 frontend) et corriger un bug serveur découvert par l'E2E golden path.

### Issues livrées
| # | Titre | Type | Commits |
|---|-------|------|---------|
| #186 | NPE `ProductServiceImpl.createProduct` si liste d'événements nulle | bug backend | `fb12091` |
| #62 | Drawer Catégorie (desktop + mobile, create/edit + réassignation) | feature frontend | `3e15440` |
| #68 | Page Produits (liste + détail + catégories) | feature frontend | `fb329dd` `0f50719` `0058e85` `e6bd60f` `66173b9` |

**Vagues** : V1 = #62 ∥ #186 (fichiers disjoints) · V2 = #68 (embarque le CategoryDrawer de #62).

### Changements clés
- **#186** : `Optional.ofNullable(request.getEvents()).orElseGet(List::of).forEach(...)` — garde localisée, convention create id=null intacte, cascade events inchangée. Vérifié : aucun autre service ne présente le même défaut (`updateProduct` n'a pas de champ events).
- **#62** : `CategoryDrawer.tsx` (pattern copié de `ProductDrawer` #61 — Dialog Radix + classes responsives), `categoryService` (+create/update/delete), hooks `useCreateCategory`/`useUpdateCategory` (TanStack Query v5), schémas Zod `types/category.ts`, namespace i18n `categories` (fr/en/es/de). Réutilise `PopoverPicker`, `DeleteConfirmDialog variant="category"` (réassignation), `useCategories` — **aucune primitive dupliquée**.
- **#68** : routes `app/[locale]/products/page.tsx` + `[productId]/page.tsx`, vues `ProductsListView` / `ProductDetailView` / `CategoriesView`. Recherche/tri locaux, sparkline 90j réutilisée, sous-frise détail par **filtrage amont** des events/resources (TimelineView non forké). Embarque ProductDrawer, CategoryDrawer (#62), DeleteConfirmDialog.

### BR impactées
BR-PRO-005 (produit sans événement), BR-PRO-001/006, BR-CAT-001/002/004/007, ADR-002 (catégorie système = lecture seule).

### Anti-duplication
Carte de réutilisation produite en pré-vague par **component-guardian** : dirige #62/#68 vers les composants existants (ProductDrawer, DeleteConfirmDialog, PopoverPicker, ProductSparkline). Seuls manques réels créés : hooks/service catégorie (calqués sur le pattern produit) et les routes produits.

### Tests
- **Backend** : 270/270 verts (`./scripts/test-quiet.sh backend`).
- **Frontend** : 305/305 verts (`./scripts/test-quiet.sh frontend`) — dont 34 nouveaux tests (8 CategoryDrawer + 26 vues produits).
- **Build** : `next build` OK (le commit `e6bd60f` débloque un lint hérité de #62 : `nameConflict` consommé en `aria-invalid`).
- Audit complet : `docs/memory/audits/sprint-22-test-coverage.md`.

### Review
Reviewer batch : **0 CRITIQUE / 0 MAJEUR**, 4 MINEURs non bloquants (arg par défaut redondant `useCategories(true)`, `console.error` dans les catch service, absence de test unitaire dédié des clés d'invalidation, divergence documentée color=String libre côté catégorie). Aucun cycle de correction requis.

### Suivi post-merge (non bloquant)
- **E2E** : 46 nouveaux `data-testid` produits/catégories sans spec Playwright → planifier `/create-e2e <PR>` après merge (parcours CRUD catégorie, navigation liste↔détail, création/édition produit). Invocation manuelle (bug nested-skills).
- MINEURs reviewer à absorber au fil de l'eau si souhaité.
- #187 (UI création catégorie) recoupe #62 → à fermer/fusionner.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
