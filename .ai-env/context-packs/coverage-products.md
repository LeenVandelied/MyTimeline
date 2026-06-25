# Coverage : `products`

> État de couverture du domaine `products` au 2026-06-25.

---

## 1. Matrice de couverture par action

| Action | `user` | `admin` | Notes |
|---|---|---|---|
| Créer un produit | ⚠️ | n/a | Backend implémenté, pas de test |
| Lister les produits | ⚠️ | n/a | Backend implémenté, pas de test |
| Modifier un produit | ⚠️ | n/a | Backend implémenté, pas de test |
| Supprimer un produit | ⚠️ | n/a | Backend implémenté, pas de test |

---

## 2. Gaps prioritisés

### P0 — Zéro test backend products
- **BR concernée** : BR-PROD-001, BR-PROD-002
- **Action** : `ProductServiceImplTest`

### P2 — Pas d'E2E produits
- **Action** : `e2e/products/create.spec.ts`

---

## 3. Coverage E2E

| Scénario | Fichier test | Statut |
|---|---|---|
| Créer un produit, voir dans la liste | `e2e/products/create.spec.ts` | ❌ non créé |

---

## Référence

- Pack métier stable : `br-products.md`
