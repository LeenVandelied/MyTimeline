# Audit tests — Sprint 116

> Généré en fin de Phase 6 (lead, 2026-10-25). Base `431a73fb`, HEAD `23ebe9ce`.

## Couverture par règle / issue

| Règle | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-013 / #831 (#567) | 429 par utilisateur `PUT /api/me/preferences` annonce `Retry-After` | NON | ✅ `UserRateLimitingFilterTest` | ✅ | N/A | N/A | N/A |
| Rate-limit IP + jeton reset (#567) | 429 des 11 slots IP + seau par jeton annoncent `Retry-After`, aucun `X-RateLimit-*`, exposé en CORS | NON | ✅ | ✅ `RateLimitingAndHeadersIntegrationTest` (TimeMeter, arrondi, décroissance, contrôle négatif PAT-S81-002) | N/A | N/A | N/A |
| BR-AUT-013 (#838) | 500 inline de la sauvegarde du thème n'allume plus la bannière serveur ; 429 inchangé | NON (frontend seul) | N/A | N/A | ✅ `apiClient.test.ts`, `AuthContext.themeSaveToast.test.tsx` | ✅ `sprint-116-theme-save-no-banner.spec.ts` (3 tests, armé par mutation) | ✅ même spec (témoin 500 sur un autre GET) |
| Harnais E2E (#839) | passe 2 CI ne provisionne que SHARED ; budget login 11/23, register 10/20 | NON | N/A | N/A | ✅ `e2e-rate-limit-budget.test.ts` 51/51 (5 mutations armées) | ⚠ run CI de la PR (Running T = passed + skipped) | N/A |
| CI (#406) | poll `/actuator/health` du job e2e | NON | N/A | N/A | N/A | ⚠ run CI de la PR | N/A |

Aucune case bloquante : les deux ⚠ sont des vérifications CI réelles faites sur la PR (non jouables en local).

## Tests créés / modifiés
- `backend/src/test/.../security/RateLimitingAndHeadersIntegrationTest.java`, `UserRateLimitingFilterTest.java` (#567)
- `frontend/src/services/apiClient.test.ts`, `frontend/src/contexts/AuthContext.themeSaveToast.test.tsx` (#838)
- `frontend/e2e/sprint-116-theme-save-no-banner.spec.ts` (#838)
- `frontend/src/__tests__/e2e-rate-limit-budget.test.ts` (#839)

## Résultats runs
- Backend : 85 suites, 687 tests, 0 échec (agent #567, sur 7dc4242b ; aucun fichier backend modifié depuis). Audit sécurité : tests ciblés rejoués verts. `CorsAllowedOriginsConfigIntegrationTest` : 7 testcases `@Nested` verts (le `.txt` surefire affiche 0, faux positif).
- Frontend (lead, HEAD 23ebe9ce) : Vitest 177 fichiers / 2341 tests verts ; `tsc` 0 ; `next build` exit 0 ; prettier OK sur les 9 fichiers frontend du diff.
- E2E (agent #838, `next build`+`next start`, chromium) : nouvelle spec 3/3 ×3 ; 8 specs de la surface 74/75 — le rouge `sprint-77:620` est une référence de capture darwin absente (attendu sur macOS, tranché par la CI Linux).
- Non joué en local : suite E2E complète, firefox, CI Linux (job e2e passes 1 et 2).

## Conclusion
Prêt pour PR. Validation restante portée par la CI de la PR : passe 2 `Running 10 tests` = passés + ignorés, et attente backend sur `/actuator/health`. Fusion soumise à la confirmation explicite du dev (modification de `ci.yml`).
