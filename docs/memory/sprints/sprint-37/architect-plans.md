# Mini-plans architect — Sprint 37

> Généré par /sprint plan (architect, 2026-07-12). Lu par /sprint start Phase 4.1.
> Thème : Reset-password hardening — cohésion 0.80 | Migrations : V15 (colonne version password_reset_tokens) | Dépend de : S36 (soft — @EnableScheduling bootstrappé par #267, réutilisé par #139)

```yaml
issue_0145:
  fichiers_cles: ["frontend/e2e/forgot-password.spec.ts (nouveau)", "frontend/e2e/support/*", "frontend/e2e/global-setup.ts"]
  couches_touchees: ["frontend/e2e"]
  strategie_test: "E2E (forgot → lien tokenisé → reset → login, sur les 27 data-testid #53 déjà posés)"
  risque_regression: "PREMIER E2E cross-system : nécessite interception email (BrevoEmailService) — mock/MailHog ou endpoint test-only exposant le token ; peut révéler une lacune de l'env E2E."
  ordre_ecriture: "définir le canal de capture du token → spec Playwright → intégrer la suite"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "frontend/e2e/ existe (auth.setup, golden-path...) mais AUCUN spec forgot/reset ; flux backend #138 déjà mergé."
issue_0141:
  fichiers_cles: ["backend/.../infrastructure/security/RateLimitingFilter.java", "backend/.../adapters/controllers/AuthController.java (endpoint reset-password)"]
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (N échecs sur un token → tentatives suivantes bloquées/ralenties)"
  risque_regression: "message d'erreur doit rester générique (pas d'info exploitable) ; ne pas throttler les demandes légitimes."
  ordre_ecriture: "étendre RateLimitingFilter (POST-only) au cas per-token → test échecs répétés"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "RateLimitingFilter limite forgot-password par IP ; aucune limite sur les tentatives de validation d'un token."
issue_0143:
  fichiers_cles: ["backend/.../PasswordResetTokenEntity.java", "backend/src/main/resources/db/migration/V15__password_reset_tokens_version.sql", "backend/.../PasswordResetServiceImpl.java"]
  couches_touchees: ["domain","infrastructure"]
  strategie_test: "integration (2 requêtes concurrentes de consommation → une seule réussit via OptimisticLockException)"
  risque_regression: "ddl-auto=validate impose la migration V15 exacte ; gérer OptimisticLockException dans consume."
  ordre_ecriture: "V15 ADD COLUMN version → @Version entité → catch OptimisticLock dans consume → test concurrence"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "V6/entité sans version confirmé ; commentaire 'versionné requis' présent mais champ absent."
issue_0139:
  fichiers_cles: ["backend/.../application/services/PasswordResetServiceImpl.java (ou scheduler dédié)", "backend/.../infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java", "réutilise SchedulingConfig (S36)"]
  couches_touchees: ["application","infrastructure"]
  strategie_test: "integration (job supprime used_at IS NOT NULL OR expires_at < now()-interval ; ne touche pas un token valide)"
  risque_regression: "borner la fenêtre de rétention pour ne pas supprimer un token encore valide en cours d'usage ; PAS de migration (DELETE simple)."
  ordre_ecriture: "requête cleanup au repo → @Scheduled réutilisant @EnableScheduling de S36 → test bornes"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "aucun @Scheduled dans le repo ; table password_reset_tokens jamais purgée (sauf suppression compte)."
```

> Vagues : V1 = #145 ∥ #141 ∥ #143 (V15) | V2 = #139 (même service que #143 ; réutilise @EnableScheduling de S36).
> Note capacité : 4 issues (dépasse règle ≤3) mais 9 pts, #143 = XS. Validé tel quel par le dev (2026-07-12).
