# Audit tests — Sprint 9

> Généré en fin de Phase 6. Aucune couverture manquante bloquante → Phase 9 PR débloquée.

## Périmètre
- **#44** — Alignement modèle métier design v3 (backend : enum RecurrenceUnit, consolidation couleurs, `archived`/`recurrenceEndDate`/`avatar`, migration Flyway V7 IRRÉVERSIBLE).
- **#135** — Sortir user PII du localStorage (frontend : re-fetch /me au mount, Option 1).

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration (Flyway) | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVT-001 | Événement appartient à un user — `archived` ne contourne pas l'ownership | NON | ✅ | ✅ | — | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-CAT-001 | Nom catégorie unique/user — `color`/`description` neutres | NON | ✅ | ✅ | — | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-EVE-006 | Enum `RecurrenceUnit{WEEK,MONTH,YEAR}` (+`fromString` tolérant) | NON | ✅ | ✅ | — | ⚠ N/A¹ | ⚠ N/A¹ |
| BR-EVE-011 | `archived` = base "actif = non archivé" (backfill false) | NON | ✅ | ✅ | — | ⚠ N/A¹ | ⚠ N/A¹ |
| A17 (#135) | Aucune PII (email/name) persistée localStorage post-login | NON² | — | — | ✅ | ⚠ N/A¹ | ⚠ N/A¹ |

¹ **E2E N/A** : (a) aucune spec e2e modifiée ce sprint ; (b) aucun runner Playwright n'est configuré dans le `package.json` du projet (E2E structurellement indisponible — dette infra, hors scope S9) ; (c) aucune BR de ce sprint n'introduit un NOUVEAU flux métier cross-system 2+ systèmes/rôles — #44 est un refactor de modèle/schéma (endpoints existants inchangés, validés par l'intégration Flyway), #135 est un comportement de session frontend (re-fetch /me, mocké en unit).
² #135 appelle `GET /api/auth/me` (frontend↔backend) mais c'est une restauration de session, pas un flux métier transactionnel — couvert par unit tests mockant /me + audit security-expert (A17 clos).

## Tests créés / étendus
- Backend : `application/services/EventServiceImplTest.java` (mise à jour partielle color/recurrence/archived), couverture mappers + enum via suite existante.
- Frontend : `contexts/AuthContext.test.tsx` (restauration /me, anonyme si /me KO, propagation login, **absence PII localStorage post-login** + dump storage vide, logout, guard provider), `hooks/useCurrentUser.test.tsx` (pas de double-fetch), `services/apiClient.test.ts` (intercepteur ne touche plus localStorage).

## Résultats runs (`./scripts/test-quiet.sh`, wrapper silencieux)
- Backend : **84 tests, 84 passed, 0 failed** (inclut intégration Flyway V1→V7 + `validate` sur Postgres Testcontainers).
- Frontend : **23 tests, 23 passed, 0 failed** (Vitest).
- E2E : non exécutable (runner Playwright absent du `package.json`) — aucune régression testable, aucune spec modifiée.

## Revues (Phase 5 + 7)
- **db-expert** (migration V7) : aucun CRITIQUE/MAJEUR. 2 MINEUR différés (index partiel `archived` → sprint enforcement #88 ; CHECK format hex `color` → réalignement Zod S10/S11).
- **security-expert** (#135 PII) : A17 clos, aucune PII persistée (localStorage/sessionStorage/QueryClient in-memory), cookie JWT HttpOnly intact.
- **reviewer batch** : PRÊT POUR PR, aucun CRITIQUE/MAJEUR. 3 MINEUR ; 2 corrigés (commentaires obsolètes, commit `751d265`), 1 différé (`User.avatar` absent du type frontend → follow-up sync S10/S11/S13).

## Conclusion
**Prêt pour PR.** Suite verte (backend + frontend), migration V7 auditée et sûre, A17 clos, aucune couverture manquante bloquante. Dette E2E infra (runner Playwright absent) tracée hors scope S9.
