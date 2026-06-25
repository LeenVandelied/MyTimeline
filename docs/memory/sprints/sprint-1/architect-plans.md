# Mini-plans architect — Sprint 1

issue_28:
  fichiers_cles:
    - "backend/.../infrastructure/adapters/controllers/EventController.java"
    - "backend/.../application/dtos/EventUpdateRequest.java (nouveau)"
    - "frontend/src/services/eventService.ts (sync contrat)"
  couches_touchees: ["application", "infrastructure", "frontend"]
  strategie_test: "unit + integration"
  risque_regression: "BR-EVE-003/008 — le contrat API updateEvent change (Map -> DTO), eventService front doit suivre"
  ordre_ecriture: "dto -> controller -> front eventService/types"
  zod_dto_sync: "OUI"
  possibly_done: false

issue_30:
  fichiers_cles:
    - "backend/.../infrastructure/adapters/controllers/EventController.java"
    - "backend/.../infrastructure/adapters/controllers/ProductController.java"
    - "backend/.../infrastructure/.../GlobalExceptionHandler.java (nouveau, @RestControllerAdvice)"
  couches_touchees: ["infrastructure", "application"]
  strategie_test: "unit + integration (cas 403 cross-user)"
  risque_regression: "BR-EVE-008 / BR-PRO-004 ownership ; retirer @CrossOrigin(*) peut casser le CORS front si SecurityConfig pas aligné"
  ordre_ecriture: "ControllerAdvice global -> ownership checks events -> ownership checks products"
  zod_dto_sync: "NON"
  possibly_done: false

issue_31:
  fichiers_cles:
    - "backend/.../infrastructure/security/SecurityConfig.java"
    - "tous les @RequestBody des controllers (@Valid)"
  couches_touchees: ["infrastructure"]
  strategie_test: "unit (400 validation) + integration"
  risque_regression: "BR-EVE-001/007 — @Valid déclenche des validations jamais actives ; STATELESS peut casser des tests d'intégration session"
  ordre_ecriture: "@EnableMethodSecurity + sessionCreationPolicy STATELESS -> @Valid sur les @RequestBody"
  zod_dto_sync: "NON"
  possibly_done: false
  depend_intra: "requiert #28 (DTO updateEvent) pour pouvoir annoter @Valid"
