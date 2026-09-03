# Mini-plans architect — Sprint 71

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1.

#134 ∥ #148 parallélisables (fichiers disjoints).

```yaml
issue_0134:
  fichiers_cles: ["infrastructure/adapters/UserController (/api/me, /api/me/change-password)", "infrastructure/config (rate-limiting, aujourd'hui limité à /api/auth/*)"]
  couches_touchees: ["application","infrastructure"]
  strategie_test: "integration (409 anti-énumération, 429 rate-limit sur /api/me)"
  risque_regression: "BR-AUT : durcir /api/me sans casser le flux change-password existant ni bloquer un usage légitime"
  ordre_ecriture: "application (politique) → infra (adapter + config rate-limit)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — NO-OP vérifié réel : endpoint existe, aucun rate-limit dessus)"
```
```yaml
issue_0148:
  fichiers_cles: ["frontend/src/lib/schemas/auth.ts (createRegisterFormSchema, reset)", "application/dtos/RegisterRequest + ResetPasswordRequest"]
  couches_touchees: ["application","frontend"]
  strategie_test: "unit (schéma Zod == règles backend) + integration backend"
  risque_regression: "BR-AUT-003 : divergence front/back — mot de passe accepté par le form et refusé par le back (ou l'inverse)"
  ordre_ecriture: "définir la règle commune → backend (Register/ResetRequest) → frontend (auth.ts)"
  zod_dto_sync: "OUI (le schéma Zod doit refléter la contrainte backend)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — NO-OP vérifié réel : politiques divergentes)"
```
