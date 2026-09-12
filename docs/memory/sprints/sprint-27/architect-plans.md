# Mini-plans architect — Sprint 27

> Généré par /sprint plan 5 (architect). Lu par /sprint start 27 Phase 4.1.
> Thème : Refactor identité auth + sécurité contrôleurs. Cohésion 0.85.
> Migrations : **V12** (users.role NOT NULL + CHECK) — SEULE migration du plan S24-S28.
> #94 retiré du plan (déjà fait via #123/46f2adf), issue fermée au plan.

```yaml
issue_0093:
  fichiers_cles: ["backend/.../infrastructure/adapters/controllers/EventController.java", "CategoryController.java", "UserController.java", "SessionController.java", "ProductController.java", "backend/.../infrastructure/security/ (helper CallerResolver a creer)"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit + integration (chaque contrôleur résout l'identité via le helper ; 401 sans fuite conservé)"
  risque_regression: "5 resolveCaller dupliqués -> 1 helper : risque de changer le comportement 401/403 par contrôleur (BR-AUT-005 401 sans fuite, BR-EVT-001 ownership 403)"
  ordre_ecriture: "infrastructure (helper CallerResolver / SecurityContextHolder -> rebrancher chaque contrôleur)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    PARTIAL/DUP. 4-5 méthodes privées resolveCaller identiques (EventController:170-177,
    CategoryController:172-182, UserController:270-280, SessionController). Aucune extraction identité
    via SecurityContextHolder.getAuthentication() côté contrôleur (AuthController l'utilise seulement
    pour SET le contexte au login).

issue_0122:
  fichiers_cles: ["backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql (a creer)", "backend/.../domain/... User entity"]
  couches_touchees: ["infrastructure (migration)","domain"]
  strategie_test: "integration (boot Flyway V12 ; insert role=null rejeté ; role invalide rejeté)"
  risque_regression: "UPDATE des lignes role NULL existantes AVANT ALTER NOT NULL, sinon la migration échoue sur base réelle (cf #181 valider V11 prod). ALTER TABLE = opération sensible -> confirmation requise avant exec prod."
  ordre_ecriture: "migration (UPDATE nulls -> SET NOT NULL -> ADD CHECK role IN (...)) -> entité"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    V1__baseline.sql:30 = 'role varchar(255)' NULLABLE, aucun CHECK, aucune migration ultérieure ne le durcit. Réel.

issue_0154:
  fichiers_cles: ["backend/.../infrastructure/adapters/controllers/ProductController.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit (ProductController résout l'identité via le helper commun de #93)"
  risque_regression: "ProductController est le seul contrôleur SANS resolveCaller (auth inline) -> adopter le CallerResolver de #93 sans changer le contrat 401"
  ordre_ecriture: "infrastructure (après #93, adopter helper)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    ProductController gère l'auth inline (pas de resolveCaller). #154 = adopter le CallerResolver
    de #93. Séquentiel après #93. Même fichier que #92 -> #154 puis #92.

issue_0092:
  fichiers_cles: ["backend/.../infrastructure/adapters/controllers/ProductController.java"]
  couches_touchees: ["infrastructure"]
  strategie_test: "unit (JwtException -> 401 sans fuite ; autres exceptions non avalées)"
  risque_regression: "narrow catch(Exception)->catch(JwtException) ne doit pas laisser filer des exceptions jusqu'ici avalées silencieusement (vérifier ce qui remontait)"
  ordre_ecriture: "infrastructure (après #154, même fichier)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    ProductController.java:105 catch(Exception e) -> catch(JwtException e) (aligne sur les 5 autres
    méthodes du même fichier). Séquentiel après #154 (même fichier).
```

> **Vagues** : V1 = #93 ∥ #122 (migration DB disjointe). V2 = #154 puis #92 (même ProductController.java).
