# Audit tests — Sprint 30

> Généré en fin de Phase 6 (test-runner). `[MISSING]` bloquerait la Phase 9 PR. Aucun ici.
> Thème : Garde-fous de boot prod & fiabilité auth. Sprint 100 % backend (aucune modif frontend/E2E).

## Couverture par issue

| Issue | Objet | Cross-system flow | Unit backend | Integration | E2E métier |
|-------|-------|:---:|:---:|:---:|:---:|
| #140 | HealthIndicator Brevo prod (DOWN si clé absente) | NON | ✅ (BrevoHealthIndicatorTest, 4) | ⚠ N/A | ⚠ N/A |
| #129 | Filet régression cookie `Secure=true` fichier prod | NON | ✅ (AuthControllerProdProfileCookieTest, 1, contexte léger) | ✅ (charge application-prod.properties) | ⚠ N/A |
| #130 | Boot logger config cookie/CORS prod | NON | ✅ (ProdConfigStartupLoggerTest, 5, ListAppender) | ⚠ N/A | ⚠ N/A |
| #216 | Fail-fast rate-limit off en prod effectif | NON | ✅ (ProfileSafetyGuardTest, +7 → 13 total) | ⚠ N/A | ⚠ N/A |

Aucune issue n'est un cross-system flow (garde-fous de configuration/boot, pas de parcours multi-rôles).
Donc pas d'E2E métier obligatoire. Aucun `[MISSING]`.

## Tests créés
- backend/src/test/.../infrastructure/adapters/email/BrevoHealthIndicatorTest.java (#140)
- backend/src/test/.../infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java (#129)
- backend/src/test/.../infrastructure/config/ProdConfigStartupLoggerTest.java (#130)
- backend/src/test/.../infrastructure/config/ProfileSafetyGuardTest.java (#216 — +7 cas ajoutés)

## Résultats runs
- Backend : 318 tests, 318 passed, 0 failed, 0 error, 0 skipped (`./scripts/test-quiet.sh backend`, ~42s)
- Frontend : N/A (aucune modif frontend ce sprint)
- E2E : N/A (aucune modif frontend ; aucun nouveau data-testid ; check Phase 8 coverage-E2E = OK)

## Anti-fuite secret (transversal #160)
- #130 et #140 loggent/exposent uniquement des flags de config non-sensibles ; aucun secret
  (DB_PASSWORD/JWT_SECRET/BREVO_API_KEY) n'est loggé ni exposé. Tests dédiés de non-fuite (#140).

## Conclusion
Prêt pour PR. Suite backend verte, 4 issues couvertes par tests ciblés, aucun blocage.
