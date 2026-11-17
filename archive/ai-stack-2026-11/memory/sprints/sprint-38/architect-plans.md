# Mini-plans architect — Sprint 38

> Généré par /sprint plan (architect, 2026-07-12). Lu par /sprint start Phase 4.1.
> Thème : Auth error contract — cohésion 0.78 | Migrations : aucune | Dépend de : aucune (ordonné dernier)

```yaml
issue_0125:
  fichiers_cles: ["backend/.../adapters/controllers/AuthController.java", "backend/.../adapters/controllers/GlobalExceptionHandler.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (Content-Type: application/json + structure {error:...} sur /me, /register, /logout)"
  risque_regression: "le frontend peut parser en dur des chaînes texte (ex. 'User already exists') → auditer frontend/src/lib avant merge."
  ordre_ecriture: "après #127 : router les erreurs Auth via codes stables → remplacer ResponseEntity.body(texte) par Map.of(error,...) → tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "AuthController renvoie encore du texte brut sur /me,/register,/logout ; /login déjà JSON (#116)."
issue_0127:
  fichiers_cles: ["backend/.../adapters/controllers/GlobalExceptionHandler.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (codes snake_case stables not_found/validation_failed dans body)"
  risque_regression: "assertions tests existantes sur reasonPhrase à mettre à jour."
  ordre_ecriture: "enum ErrorCode → buildBody utilise code stable au lieu de getReasonPhrase() → maj tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "handler status-based confirmé (22 statuts, reason-phrase utilisé)."
issue_0126:
  fichiers_cles: ["backend/.../infrastructure/security/SecurityConfig.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (writeJsonError avec caractères ' et backslash produit un JSON valide)"
  risque_regression: "défensif, réversible ; remplacer concat manuelle par Jackson/Map.of."
  ordre_ecriture: "writeJsonError → Map.of(error,error) via ObjectMapper → test échappement"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "concat JSON manuelle confirmée dans writeJsonError."
```

> Vagues : V1 = #127 ∥ #126 | V2 = #125 (route via codes stables de #127).
> Sous-capacité 4 pts assumée (reliquat P2/P3). Option non retenue : ajouter #134.
