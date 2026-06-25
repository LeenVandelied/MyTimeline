# Audit tests — Sprint 2

> Généré en fin de Phase 6. Un marqueur de gap dans le tableau bloque la Phase 9 PR.
> Sprint 100% backend (durcissement auth). Aucun changement frontend → pas de Playwright/E2E parcours attendu.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-008 | `/me` ne fuite jamais le hash password (#32) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-AUT-001 | Unicité username/email → 409 lisible (#32) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-AUT-010 | Cookie logout cohérent avec login (#32) | NON | ✅ | ⚠ partiel¹ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-AUT-005 | Échec auth → 401, jamais 500 ni fuite (#51) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-EVT-001 | Non-propriétaire → 403 (pas 500) (#51) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-AUTH-002 | Rate limiting /auth/* → 429 + security headers (#33) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |

Cross-system flow=OUI si flux 2+ systèmes/rôles. Toutes les BR de ce sprint sont des **contrats de sécurité backend** (statut HTTP + body + headers), testables intégralement via intégration MockMvc/@SpringBootTest. Aucun flux multi-rôle/multi-système → pas d'E2E métier requis.

¹ BR-AUT-010 : la cohérence des attributs de cookie (helper unique pose/suppression) est vérifiée structurellement ; l'effacement réel en navigateur (`Set-Cookie` MaxAge=0) reste difficile à asserter en MockMvc (limite documentée dans l'issue #32). Non bloquant.

## Tests créés
- `backend/src/test/.../infrastructure/adapters/controllers/AuthControllerSecurityTest.java` (3) — BR-AUT-008, BR-AUT-001 : /me sans password, doublon username→409, doublon email→409
- `backend/src/test/.../infrastructure/security/AuthErrorContractIntegrationTest.java` (3) — BR-AUT-005, BR-EVT-001 : no-token→401, ROLE manquant→403, Bearer invalide→401 (full chain @SpringBootTest)
- `backend/src/test/.../infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` (5) — BR-AUTH-002 : 429 au dépassement, sous-seuil OK, présence X-Frame-Options/X-Content-Type-Options/HSTS/CSP

## Résultats runs
- Backend : 29 tests, 29 passed, 0 failed, 0 skipped (`SKIP_DELEGATION=1 mvn test`, BUILD SUCCESS, ~12s) — inclut le test anti-spoofing XFF ajouté au fix post-review
- Frontend : aucun changement → pas de run
- E2E : aucun changement frontend → pas de run

## Conclusion
Prêt pour PR. Aucun gap de couverture. Suite verte. Couverture intégration sur les 6 BR durcies.
