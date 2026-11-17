# Audit tests — Sprint 14

> Généré en fin de Phase 6. Aucun `[MISSING]` → Phase 9 PR débloquée.

## Couverture par BR / thème

| Réf | Description | Cross-system flow | Unit backend | Integration | Frontend | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-004 | NPE calculateEndDate durationUnit null (#164) | NON | ✅ (déjà, `UtilsTest`) | — | — | ⚠ N/A (déjà livré #54) |
| BR-EVE-006 | recurrenceUnit requis si isRecurring (#168) | NON | ✅ (déjà) | ✅ (déjà) | ⚠ différé #150 | — |
| BR-EVE-012 | recurrenceEndDate < startDate rejeté (#168) | NON | ✅ `EventServiceImplTest` (isBefore/equals/after) | ✅ via service | ⚠ différé #150 | — |
| BR-EVE-014 | color au create (#168) | NON | ✅ `EventCreationRequestContractTest` | ✅ create+color | ⚠ différé #150 | — |
| #128 | CHECK conditionnels DB duration_unit/recurrence_unit | NON | — | ✅ `EventConditionalCheckConstraintIntegrationTest` (2 rejets + 4 non-régr.) | — | — |
| #162 | Upgrade Boot 3.4.4 / jjwt 0.13 / Flyway 10 (CVE) | OUI (auth JWT) | ✅ suite existante | ✅ Testcontainers (JWT, sessions, migrations) | — | ✅ AuthControllerSecurityTest 10/10 + SessionRevocation 8/8 |
| #161 | Bumps CVE frontend (axios/next/form-data) | NON | — | — | ✅ Vitest 70/70 + build | — |

Note : "⚠ différé #150" = répercussion frontend (Zod/eventService) planifiée S15 (RECOMMAND_FOLLOWUP), hors périmètre S14 backend. Pas de `[MISSING]` bloquant : aucun flux cross-system nouveau sans couverture (le seul cross-system = JWT/#162, couvert par les tests de sécurité auth existants + Testcontainers).

## Tests créés ce sprint
- `backend/.../application/dtos/EventCreationRequestContractTest.java` (+2 — color exposé/absent, #168)
- `backend/.../application/services/EventServiceImplTest.java` (+5 — color create, recurrenceEndDate </==/> startDate, #168)
- `backend/.../infrastructure/adapters/repositories/EventConditionalCheckConstraintIntegrationTest.java` (+6 — rejets DB + non-régression, #128)
- (#164 / #162 : aucun test ajouté — #164 déjà couvert `UtilsTest`, #162 couvert par la suite Testcontainers existante)

## Résultats runs (test-runner final, tip sprint/14)
- **Backend : 237/237 OK** — 0 failed, 0 error, 0 skip (Testcontainers, Flyway 10, migration V11 appliquée).
- **Frontend : 70/70 OK** — 0 failed, 0 TS error (Vitest).
- E2E Playwright : `frontend/e2e/` vide (aucun spec réel dans le projet — état préexistant, pas de régression).

## Revues spécialistes
- **security-expert (JWT #162)** : verdict OUI, sûr à merger. Aucune correction requise (HS256 figé, alg:none rejeté, jti intact, exceptions→401).
- **reviewer (batch diff)** : verdict OUI, prêt à merger. 0 CRITIQUE / 0 MAJEUR / 3 MINEUR non bloquants.
- **db-expert (V11 + Flyway)** : verdict OUI (merge). 1 MAJEUR + 2 MINEUR = actions AVANT PROD (pas avant merge) — cf. section Déploiement du body PR.

## Conclusion
**Prêt pour PR.** Suite verte backend + frontend, revues sécurité/code/DB favorables. Réserves DB = pré-déploiement prod (checksum Flyway 10 sur base réelle + comptage lignes non conformes avant migration), pas des blocages de merge.
