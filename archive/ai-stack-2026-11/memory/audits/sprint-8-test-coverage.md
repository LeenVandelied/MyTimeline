# Audit tests — Sprint 8

> Généré en fin de Phase 6. Flux « mot de passe oublié » bout-en-bout (#49 backend + #53 frontend).
> Résultats vérifiés directement par le lead (le test-runner Haiku ayant fourni 2 rapports non fiables : mauvais checkout, puis échec halluciné).

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Intégration | RTL frontend | E2E parcours |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-001 | Unicité username (409 inline) | NON | ✅ (existant) | ✅ | ✅ register 409 | ⏳ post-merge |
| BR-AUT-002 | Hash BCrypt (re-hash au reset) | NON | ✅ PasswordResetServiceImplTest | ✅ | N/A | ⏳ post-merge |
| BR-AUT-003 | Validation champs (Zod ↔ @Valid) | NON | ✅ | ✅ | ✅ register/reset zod | ⏳ post-merge |
| BR-AUT-005 | **Anti-énumération forgot (200 + timing)** | **OUI** | ✅ ForgotPasswordAsyncTest (retour immédiat, email inconnu sans effet) | ✅ PasswordResetEndpointsIntegrationTest | ✅ forgot message neutre | **⏳ PLANIFIÉ post-merge (V3)** |
| BR-AUT-011 | `/api/auth/**` sans token (absorbée #103) | NON | — | ✅ endpoints accessibles sans token | N/A | ⏳ post-merge |

Légende E2E : ⏳ = data-testid posés, spec Playwright à créer via `/create-e2e` post-merge (invocation manuelle — bug nested skills, cf. Phase 8).

## Tests créés (S8)
- Backend : `PasswordResetServiceImplTest` (9), `PasswordResetEndpointsIntegrationTest` (5), `ForgotPasswordAsyncTest` (2), +3 `AuthController*Test` adaptés au nouveau constructeur.
- Frontend : `login/forgot-password/reset-password/register` page tests (11) + `apiClient.test.ts` (3).

## Résultats runs (vérifiés lead, HEAD 23c9938, worktree sprint/8)
- Backend : **84 tests, 84 passed, 0 failed** (`./scripts/test-quiet.sh backend` → `Tests run: 84, Failures: 0, Errors: 0`).
- Frontend : **23 tests, 23 passed, 0 failed** (`./scripts/test-quiet.sh frontend` → `10 files, 23 passed`).
- E2E : 0 (aucune E2E métier à ce jour — V3 planifié post-merge).

## E2E métier — cross-system flow BR-AUT-005 (décision)
Le flux forgot→reset est cross-system (frontend + backend + email Brevo). C'est le **1ᵉʳ flux justifiant une E2E métier** du projet (V3 du plan S8). Les 27 `data-testid` des 4 écrans sont posés. La création de la spec Playwright (parcours forgot → lien tokenisé → reset → login) est **planifiée post-merge via `/create-e2e`** (invocation manuelle, le nesting de skills étant buggé). Plan inclus dans le body PR.

## Conclusion
Couverture unit + intégration + RTL complète et verte sur les BR du sprint. Le seul élément différé est l'E2E métier (V3), planifié post-merge conformément à la Phase 8. **Prêt pour PR.**
