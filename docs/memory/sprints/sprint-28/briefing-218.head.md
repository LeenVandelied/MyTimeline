[BRIEFING ISSUE #218 — Couverture E2E des parcours Produits & Catégories (Playwright)]

## Contexte worktree (garde-fou HEAD — LIRE EN PREMIER)
- Le repo de travail est `/Users/herrh/VSProjects/MyTimeline` (PAS le cwd par défaut si tu es lancé ailleurs).
- **PREMIÈRE ACTION** : `cd /Users/herrh/VSProjects/MyTimeline` puis `git branch --show-current` → DOIT afficher `sprint/28`. Sinon STOP et signale-le.
- Vague 2 : les Vagues 1 sont déjà mergées sur cette branche. En particulier :
  - #207 corrigé → `./scripts/test-quiet.sh e2e` lance désormais un VRAI run Playwright (`npm run test:e2e`).
  - #41 corrigé → un produit SANS événement est maintenant VISIBLE dans le listing (`events: []`). C'est exactement le cas à couvrir en E2E ci-dessous.

## Issue #218 — À faire
Le Sprint 22 (PR #217) a livré la page Produits (liste, détail, catégories) + le Drawer de gestion des catégories. Aucun test E2E ne couvre ces parcours. 46 `data-testid` ont été posés pour ça mais les specs n'existent pas.

Ajouter des specs Playwright dans `frontend/e2e/` couvrant :
- CRUD catégorie via le CategoryDrawer : création, édition, suppression — Y COMPRIS le cas de réassignation quand la catégorie supprimée a des produits liés.
- Navigation liste des produits ↔ vue détail d'un produit.
- Création et édition d'un produit via le ProductDrawer depuis la page Produits.

Réutiliser les `data-testid` DÉJÀ présents (préfixes `products-*`, `product-detail-*`, `categories-*`, `category-*`) — n'en introduis pas de nouveaux.

## Critères d'acceptation (7 scénarios)
- [ ] Création d'une catégorie via le drawer → apparition dans la liste.
- [ ] Édition d'une catégorie existante via le drawer.
- [ ] Suppression d'une catégorie SANS produits liés.
- [ ] Suppression d'une catégorie AVEC produits liés, incluant le flux de réassignation.
- [ ] Navigation liste → détail produit et retour.
- [ ] Création d'un produit via le ProductDrawer depuis la page Produits.
- [ ] Édition d'un produit existant via le ProductDrawer.
- [ ] (transverse) Les nouveaux tests passent via `./scripts/test-quiet.sh e2e`.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0218:
  fichiers_cles:
    - "frontend/e2e/products.spec.ts (à créer)"
    - "frontend/e2e/categories.spec.ts (à créer)"
    - "frontend/e2e/support/"
  couches_touchees: ["frontend"]
  strategie_test: "E2E (Playwright: CRUD produit, CRUD catégorie, assignation produit->catégorie, produit sans event visible)"
  risque_regression: |
    dépend de auth.setup.ts + seeding catégorie déjà établi (golden-path.spec.ts:99).
    Réutiliser le pattern seed via page.request.post.
  ordre_ecriture: "frontend (specs Playwright APRÈS #207 corrigé — c'est fait)"
  etat_reel_du_code: |
    MISSING. frontend/e2e/ a golden-path + settings-*. golden-path couvre création produit+event
    mais PAS le CRUD produit/catégorie complet. Aucun products.spec.ts / categories.spec.ts.
```

## Points d'appui concrets (À LIRE avant d'écrire les specs)
- `frontend/e2e/golden-path.spec.ts` — pattern de référence : auth via `auth.setup.ts`, seed via `page.request.post`, structure d'un parcours produit+event. Copie le style.
- `frontend/e2e/support/` et `frontend/e2e/auth.setup.ts` — helpers d'authentification et fixtures à réutiliser (NE réinvente pas l'auth).
- `frontend/e2e/global-setup.ts` — setup global.
- `docs/memory/audits/sprint-22-test-coverage.md` §"Suivi E2E" — périmètre non couvert détaillé (référence issue).
- Composants concernés : `frontend/src/components/products/ProductsListView.tsx`, page détail produit, `CategoryDrawer`, `ProductDrawer`. Grep les `data-testid` réels dans ces fichiers AVANT d'écrire les sélecteurs (ne devine pas les noms).

## Triage
Taille: M
Modèle: opus
Effort: high
