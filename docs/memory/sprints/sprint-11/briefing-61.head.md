[BRIEFING ISSUE #61]

## Issue
[FEATURE] Frontend : Drawer Produit (desktop + mobile)

## Contexte
`AddProducts.tsx` (418 lignes) est le seul point d'entrée pour créer un produit. Il est monolithique, contient 4 UUID de catégories hardcodés (il ne consomme jamais `GET /api/categories`), et ne gère pas l'édition. Le drawer produit est la pièce centrale de la Wave 3 : il remplace `AddProducts.tsx` et sert à la fois pour la création et l'édition.

## À faire
- Créer le composant `ProductDrawer` (ou `ProductSheet` sur mobile) avec 3 modes :
  - **Création simple** : nom + catégorie + couleur optionnelle
  - **Création couplée** : nom + catégorie + premier événement (date, description)
  - **Édition** : pré-remplissage des champs, appel `PATCH /users/{userId}/products/{productId}` (#50)
- Câbler enfin `GET /api/categories` via TanStack Query pour alimenter la combobox catégorie (fin des UUID hardcodés — BR-CAT-007)
- Couleur héritée de la catégorie par défaut, surchargeable au niveau du produit
- Aperçu live : mini sparkline du produit pendant la saisie (limiter aux 90 derniers jours pour le coût)
- Gérer les états async : `submitting`, `error`, `conflict` (409 si catégorie supprimée entre temps)
- Desktop : drawer latéral 452px
- Mobile : bottom sheet plein écran avec swipe-down pour fermer
- Remplacer `AddProducts.tsx` par ce nouveau composant

## BR impactées
- BR-PRO-001 — Nom de produit obligatoire et borné (validation Zod, sync avec backend : `min(1)` pas `min(3)`)
- BR-PRO-002 — Catégorie obligatoire et existante (combobox câblée sur API)
- BR-CAT-007 — Chargement dynamique des catégories côté UI (fin des UUID hardcodés)

## Critères d'acceptation
- [ ] Le drawer s'ouvre en mode création et crée un produit via `POST /users/{userId}/products`
- [ ] Le drawer s'ouvre en mode édition, pré-remplit les champs et met à jour via `PATCH /users/{userId}/products/{productId}`
- [ ] La combobox catégorie charge les catégories depuis `GET /api/categories` (aucun UUID hardcodé)
- [ ] La validation Zod rejette un nom vide (alignée sur `min(1)` backend — correction de la désync BR-PRO-001)
- [ ] Les états `submitting` (bouton désactivé + spinner) et `error` (message inline) sont visibles
- [ ] Le layout desktop est un drawer latéral de 452px
- [ ] Le layout mobile est un bottom sheet plein écran avec swipe-down
- [ ] `AddProducts.tsx` est remplacé / supprimé

## Piste technique
- Nouveau fichier : `frontend/src/components/products/ProductDrawer.tsx`
- Supprimer ou vider `frontend/src/components/products/AddProducts.tsx`
- Hook TanStack Query : `useCreateProduct()` → `POST`, `useUpdateProduct()` → `PATCH /users/{userId}/products/{productId}` (#50)
- Schéma Zod : corriger `productCreateSchema.name` de `z.string().min(3)` → `z.string().min(1).max(100)` (`frontend/src/types/product.ts`)
- Tokens Graphite pour la palette couleur et les états

## Risques techniques
- Le câblage `GET /api/categories` est une dépendance silencieuse : si l'issue #52 n'est pas déployée, la combobox sera vide ou en erreur. Prévoir un état de fallback (message "Aucune catégorie disponible, créez-en une d'abord").
- La désync Zod/backend sur `name` (`min(3)` vs `min(1)`) doit être corrigée ici.
- L'aperçu live sparkline peut être coûteux sur de grandes listes d'événements : limiter aux 90 derniers jours.

## Plan d'implementation (architect, /sprint plan)
```yaml
issue_0061:
  fichiers_cles:
    - "frontend/src/components/products/ProductDrawer.tsx  # nouveau (remplace AddProducts.tsx)"
    - "frontend/src/components/products/AddProducts.tsx  # supprime/vide"
    - "frontend/src/types/product.ts  # Zod name min(3)->min(1).max(100) — FIX DESYNC confirme"
    - "frontend/src/hooks/useCreateProduct.ts, useUpdateProduct.ts  # nouveaux (POST / PATCH #50)"
    - "frontend/src/services/productService.ts  # etendre (PATCH)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Zod, hooks mock axios) + composant ProductDrawer (creation/edition, combobox categories)"
  risque_regression: "Suppression AddProducts.tsx casse tout appelant non migre ; combobox vide si #52 non deploye (fallback requis)."
  ordre_ecriture: "hooks create/update -> ProductDrawer -> fix Zod -> integration DeleteConfirmDialog -> suppression AddProducts + migration appelants"
  zod_dto_sync: "OUI (aligner productCreateSchema sur DTO backend #50 : min(1) max(100), forme couleur)"
```

## Triage
Taille: L
Modele: opus
Effort: xhigh
