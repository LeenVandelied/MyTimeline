# Audit tests — Sprint 13

> Généré en fin de Phase 6. `[MISSING]` bloque la Phase 9 PR.
> Sprint backend pur (Auth/Sessions & Compte). Frontend Réglages (#86/#87) reporté hors sprint.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-002/011 | Révocation jti stateless, JwtFilter vérifie à chaque requête | NON (backend seul) | ✅ | ✅ | ⚠ N/A (front #86/#87 reporté) | ⚠ N/A | ⚠ N/A |
| BR-AUT-009 | Refresh rejette un jti révoqué | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-AUT-010 | Logout révoque le jti courant | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-AUT-011 (/me) | `/api/auth/me` rejette un token révoqué (fix review S13) | NON | — | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| Sessions CRUD | GET /sessions (caller only), DELETE /{id} (ownership 404), DELETE /others | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-AUT-001 (delete) | DELETE /me : ownership JWT, confirmation username, cascade RGPD | NON (backend seul) | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |

Cross-system flow=NON pour toutes : endpoints backend consommés par un frontend Réglages livré ultérieurement (#86/#87, hors des 5 sprints planifiés). Aucun flux 2+ rôles → **E2E métier non obligatoire ce sprint**. À rattacher au sprint frontend Réglages qui consommera ces contrats.

## Tests créés
- `application/services/SessionServiceImplTest.java` (10 @Test) — logique révocation, ownership, isSessionActive.
- `infrastructure/security/ClientIpAnonymizerTest.java` (~5 @Test) — troncature IPv4 RGPD, IPv6 → null.
- `infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` (7 + 1 review = 8 @Test) — jti dans JWT, révocation → 401 requête suivante, /others, logout révoque, **/me après révocation → 401** (fix review S13).
- `infrastructure/adapters/controllers/UserControllerTest.java` (14 @Test) — DELETE /me : 204, 400 mismatch/absent username, ownership.
- `infrastructure/adapters/controllers/AccountDeletionIntegrationTest.java` (3 @Test) — cascade products/events/categories, catégorie système préservée, 2e appel → 401.
- Ajustements : `AuthControllerSecurityTest`, `AuthControllerValidationTest`, `AuthControllerDevProfileCookieTest` (stub `isSessionActive` sur chemins /me nominaux).

## Résultats runs
- Backend : **220 tests, 220 passed, 0 failed, 0 skipped** (`./scripts/test-quiet.sh backend`, Testcontainers Postgres 16). Chiffre agrégé sur tous les modules surefire (le compteur "219" du wrapper = dernier module isolé, non agrégé).
- Frontend : inchangé ce sprint (aucun `.tsx`/`.ts` modifié).
- E2E : aucun nouveau testid (`git diff` frontend vide) → Phase 8 coverage E2E = OK.

## Spécialistes
- **db-expert** : migration V10 APPROUVÉE (index UNIQUE jti, FK CASCADE, mapping validate OK). Dette : purge sessions expirées non implémentée (non bloquant, à ticketer).
- **security-expert** : 1 MAJEUR (`/me` ignorait la révocation) → **CORRIGÉ** (fd91d9f). Reste OK/anti-énumération/PII tronquée validés.
- **reviewer** : 0 CRITIQUE. 2 MAJEUR (logs JwtFilter cas nominal, MEMO-007) → **CORRIGÉS** (fd91d9f). MINEURs : NPE guard SessionResponse → CORRIGÉ ; A8/CookieFactory/isSessionActive(null) → dette tracée hors scope.

## Conclusion
**Prêt pour PR.** Suite verte 220/220. Tous les MAJEUR de review résolus. Aucun `[MISSING]`. E2E métier non requis (backend pur, pas de flux multi-rôles ; front consommateur reporté).
