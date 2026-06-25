# Coverage : `categories`

> État de couverture du domaine `categories` au 2026-06-25.

---

## 1. Matrice de couverture par action

| Action | `user` | `admin` | Notes |
|---|---|---|---|
| Créer une catégorie | ⚠️ | n/a | Backend implémenté, pas de test |
| Lister les catégories | ⚠️ | n/a | Backend implémenté, pas de test |
| Modifier une catégorie | ⚠️ | n/a | Backend implémenté, pas de test |
| Supprimer une catégorie | ⚠️ | n/a | Backend implémenté, pas de test |

---

## 2. Gaps prioritisés

### P0 — Zéro test backend categories
- **BR concernée** : BR-CAT-001, BR-CAT-002
- **Action** : `CategoryServiceImplTest`

### P1 — Contrainte suppression non vérifiée
- **BR concernée** : BR-CAT-002
- **Action** : Vérifier que `CategoryServiceImpl.delete()` rejette si catégorie utilisée

---

## 3. Coverage E2E

| Scénario | Fichier test | Statut |
|---|---|---|
| Créer une catégorie, l'assigner à un événement | `e2e/categories/assign.spec.ts` | ❌ non créé |

---

## Référence

- Pack métier stable : `br-categories.md`
