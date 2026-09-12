# Mini-plans architect — Sprint 2

issue_32:
  fichiers_cles:
    - "backend/.../infrastructure/adapters/controllers/AuthController.java"
    - "backend/.../application/dtos/UserResponse.java (nouveau, sans password)"
    - "backend/.../infrastructure/security/SecurityConfig.java (cookie login/logout cohérent)"
    - "backend/.../infrastructure/entities/UserEntity.java (unique username/email — niveau JPA en attendant Flyway S3)"
  couches_touchees: ["application", "infrastructure"]
  strategie_test: "unit + integration (/me sans password)"
  risque_regression: "BR-AUT-008 — /me ne doit jamais fuiter le hash ; cohérence Secure/SameSite/Domain login vs logout"
  ordre_ecriture: "UserResponse DTO -> /me -> cookie -> contrainte unique (coordonnée avec #42)"
  zod_dto_sync: "OUI (consumer /me front)"
  possibly_done: false

issue_33:
  fichiers_cles:
    - "backend/.../infrastructure/security/SecurityConfig.java (headers)"
    - "backend/pom.xml (Bucket4j)"
    - "backend/.../infrastructure/security/RateLimitFilter.java (nouveau)"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (429 après N tentatives)"
  risque_regression: "rate-limit sur /auth/* ; CSP/HSTS peuvent casser le front Next.js si trop stricts"
  ordre_ecriture: "dep Bucket4j -> filtre rate-limit -> headers SecurityConfig"
  zod_dto_sync: "NON"
  possibly_done: false
  depend_intra: "V2 après #32 (SecurityConfig partagé)"

issue_51:
  fichiers_cles:
    - "backend/.../infrastructure/.../GlobalExceptionHandler.java (issu de #30)"
    - "backend/.../infrastructure/security/JwtFilter.java"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (401 non-authentifié vs 403 non-autorisé)"
  risque_regression: "les exceptions levées dans JwtFilter ne traversent PAS le ControllerAdvice -> écriture directe dans HttpServletResponse"
  ordre_ecriture: "mapping 401 vs 403 dans ControllerAdvice + handler JwtFilter"
  zod_dto_sync: "NON"
  possibly_done: false
  depend_inter: "requiert le ControllerAdvice de #30 (Sprint 1)"
