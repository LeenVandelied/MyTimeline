# Mini-plans architect — Sprint 43 (Auth cleanup léger)

> Généré par /ai-env:sprint plan 5 (2026-07-13). Lu par /sprint start Phase 4.1.
> Cohésion 0.70 | epic dominant: auth | migrations: aucune.
> Vagues : V1 = #286 ∥ #285 ∥ #289 | V2 = #288 → #290 (enum ErrorCode + buildBody partagés).
> GARDE-FOU : ne PAS re-toucher SecurityConfig `/error` ni la validation event type (corrigés par PR #291, mergée dans dev le 2026-07-13).
> Dépend de S42 : #290 touche GlobalExceptionHandler.java, doit rebaser sur le 409 enrichi de #231 sans le régresser.

```yaml
issue_0288:
  fichiers_cles: [".../infrastructure/adapters/controllers/AuthController.java", "enum ErrorCode (localiser)"]
  couches_touchees: [infrastructure]
  strategie_test: "réponses erreur AuthController portent code ErrorCode homogène; tests contrat S38 existants verts"
  risque_regression: FAIBLE — touche contrat erreur post-S38; ne pas casser le format uniforme livré S38
  possibly_done: false

issue_0290:
  fichiers_cles: [".../infrastructure/adapters/controllers/GlobalExceptionHandler.java (7 handlers restants)", "buildBody", "ErrorCode"]
  couches_touchees: [infrastructure]
  strategie_test: "chaque handler renvoie corps via buildBody+ErrorCode; couverture des 7 cas"
  risque_regression: MOYEN — fichier partagé; CONFLIT #231 (S42) : ne pas régresser le 409 enrichi
  possibly_done: false

issue_0289:
  fichiers_cles: ["endpoint /api/me controller", "politique 404 vs 401"]
  couches_touchees: [infrastructure]
  strategie_test: "anti-énumération: /me réponse cohérente (statuer 404 vs 401), pas de leak existence compte"
  risque_regression: FAIBLE
  possibly_done: false

issue_0286:
  fichiers_cles: [".../infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java save()"]
  couches_touchees: [infrastructure]
  strategie_test: "save() sans SELECT superflu (log SQL / assert 1 requête); non-régression flux reset"
  risque_regression: FAIBLE
  possibly_done: false

# issue_0285 (XS) : capper spring.datasource.hikari.maximum-pool-size dans le profil test — aucun mini-plan (XS).
```
