# Mini-plans architect — Sprint 8

> Généré par /sprint plan 3 (architect, 2026-06-25). Lu par /sprint start 8 Phase 4.1.
> Thème : Premier vertical Auth bout-en-bout (forgot/reset password). Cohésion 0.70.
> Vagues : V1 (∥) = #49 (backend) + #53 (frontend) | V2 = câblage #53→#49 | V3 = 1ʳᵉ E2E Playwright métier.
> Dépend de S6 (#45 tokens, #29 Playwright) + S7 (#40 AuthContext, #48 TanStack, #70 DTO/contrat).
> DÉCISION DEV : #103 fermée comme doublon ; #49 porte le flux ; durée token = 15 min ; éléments #103 (BR-AUT-011, tests intégration) absorbés dans #49.
> ⚠ Migration RENUMÉROTÉE V4→V6 (V4/V5 déjà pris). UNE plage migration sur S8.

```yaml
issue_49:
  fichiers_cles:
    - "backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql"  # RENUMÉROTÉ (V4 périmé)
    - "backend/.../domain/services/PasswordResetService.java"   # interface domaine
    - "backend/.../infrastructure/adapters/email/BrevoEmailService.java"
    - "backend/.../infrastructure/adapters/controllers/AuthController.java"  # forgot/reset endpoints
    - "backend/.../resources/application*.properties"           # brevo.api.key=${BREVO_API_KEY}
  couches_touchees: ["backend-domain", "backend-infrastructure", "db-migration"]
  strategie_test: "JUnit unit PasswordResetService : token inexistant/expiré(15min)/déjà consommé → 400 ; forgot-password TOUJOURS 200 (anti-énumération BR-AUT-005) ; rate-limit slot #33. E2E métier en V3."
  risque_regression: "MOYEN — email sans contrainte unique DB → lookup ambigu (documenter). BREVO_API_KEY jamais en dur (règle secrets, DEC-S3-001). V6 = UNE plage migration S8."
  ordre_ecriture: "V6 migration → PasswordResetService port+impl → BrevoEmailService → endpoints AuthController → config env → tests"
  zod_dto_sync: "OUI — ForgotPasswordRequest{email}, ResetPasswordRequest{token,newPassword} ↔ Zod #53 ; complexité pwd alignée register (BR-AUT-003)"
  possibly_done: false
  etat_reel_du_code: "aucune evidence — pas de password_reset_tokens (migrations s'arrêtent à V5). AuthController existe, à étendre. Domaine hexagonal présent (domain/services à créer). Absorbe BR-AUT-011 + tests intégration de #103 (fermée)."

issue_53:
  fichiers_cles:
    - "frontend/src/app/[locale]/(auth)/login"    # écrans existants à migrer sur DS
    - "frontend/src/app/[locale]/(auth)/register"
    - "frontend/src/app/[locale]/(auth)/reset"
    - "frontend/src/lib/schemas/auth.ts"   # RHF+Zod factorisés (RegisterSchema BR-AUT-003)
  couches_touchees: ["frontend-auth"]
  strategie_test: "RTL états loading/erreur(409 username pris)/succès ; Storybook variantes ; E2E Playwright reset (V3)."
  risque_regression: "MOYEN — s'appuie sur #40 (fix register name, redirects locale) ET #45 (tokens). Brancher reset sur le contrat #49 (V2)."
  ordre_ecriture: "migrer 3 écrans sur tokens @theme #45 → états loading/erreur/succès → factoriser Zod → brancher reset → #49"
  zod_dto_sync: "OUI — RegisterSchema/ResetSchema ↔ DTOs #49+#70 ; corriger A12 (RegisterData sans Zod)"
  possibly_done: false
  etat_reel_du_code: "écrans Login/Register/Reset existent (reset partiellement câblé sans backend). Dépend de #40 (register signature) + #45 (tokens)."
```
