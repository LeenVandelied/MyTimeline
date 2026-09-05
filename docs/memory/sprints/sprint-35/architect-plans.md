# Mini-plans architect — Sprint 35

> Généré par /sprint plan (architect, 2026-07-12). Lu par /sprint start Phase 4.1.
> Thème : Prod boot safety & secrets — cohésion 0.45 | Migrations : aucune | Dépend de : aucune (ordonné après S34 par prudence release)

```yaml
issue_0253:
  fichiers_cles: ["backend/.../infrastructure/config/ProdConfigStartupLogger.java", "backend/.../infrastructure/config/ProfileSafetyGuard.java", "backend/src/main/resources/application-prod.properties"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (test boot : prod effective + var vide → échec explicite)"
  risque_regression: "détection d'env prod erronée (ENVIRONMENT/APP_ENV) peut bloquer un déploiement légitime ; réutiliser la logique existante de ProfileSafetyGuard."
  ordre_ecriture: "transformer WARN→exception dans le garde → message clair par variable → test boot bloquant"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "ProdConfigStartupLogger émet WARN seulement ; pas de fail-fast."
issue_0254:
  fichiers_cles: ["backend/.../infrastructure/config/ProfileSafetyGuard.java", "backend/src/main/resources/application-prod.properties"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (test boot : prod effective + app.cookie.secure=false → échec)"
  risque_regression: "même risque de détection d'env que #216/#111 ; cohérence avec le pattern ProfileSafetyGuard existant."
  ordre_ecriture: "étendre ProfileSafetyGuard (pattern #216) → message Secure obligatoire → test boot"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "ProfileSafetyGuard existe (rate-limit #216) ; aucun garde sur app.cookie.secure."
issue_0249:
  fichiers_cles: [".env.production / secrets manager provider (OPS, hors repo)", "backend/.../infrastructure/security/JwtService.java (vérif post-rotation)"]
  couches_touchees: ["ops"]
  strategie_test: "manuel (login, envoi email, connexion DB testés post-rotation)"
  risque_regression: "rotation JWT_SECRET = déconnexion globale de tous les utilisateurs actifs → fenêtre faible usage + comm préalable ; ne JAMAIS coller une valeur de secret."
  ordre_ecriture: "générer nouvelles valeurs DB_PASSWORD/JWT_SECRET → vérifier BREVO_API_KEY dans l'historique → redéployer tous envs → tests fonctionnels"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "action ops distincte de la purge d'historique (#112) ; à coordonner avec inventaire #250."
```
