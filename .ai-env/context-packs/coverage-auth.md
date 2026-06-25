# Coverage : `auth`

> État de couverture du domaine `auth` au 2026-06-25.

---

## 1. Matrice de couverture par action

| Action | `user` | `system` | Notes |
|---|---|---|---|
| S'inscrire | ⚠️ | n/a | Controller implémenté, pas de test dédié |
| Se connecter | ⚠️ | n/a | Controller implémenté, pas de test dédié |
| Valider token JWT | n/a | ⚠️ | JwtFilter implémenté, pas de test d'intégration |
| Rafraîchir token | ❌ | n/a | Non implémenté |

---

## 2. Gaps prioritisés

### P0 — Aucun test auth
- **Symptôme** : Zéro test sur la chaîne register/login/JWT
- **Cause** : Tests non écrits en phase initiale
- **BR concernée** : BR-AUTH-001, BR-AUTH-002, BR-AUTH-003
- **Action** : Écrire `AuthControllerTest` + `JwtServiceTest`

### P1 — Pas de refresh token
- **Symptôme** : Token expiré = reconnexion manuelle
- **Action** : Implémenter endpoint `/auth/refresh`

---

## 3. Coverage E2E

| Scénario | Fichier test | Statut |
|---|---|---|
| Inscription → connexion → accès protégé | `e2e/auth/login.spec.ts` | ❌ non créé |

---

## Référence

- Pack métier stable : `br-auth.md`
