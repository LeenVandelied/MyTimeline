# Audit tests — Sprint 7

> Généré en fin de Phase 6. Un marqueur « MISSING » dans la matrice bloque la Phase 9 PR.
> Thème : Socle frontend — état serveur + auth context (#40, #48, #70). Cohésion 0.45.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-001 | Unicité username — PATCH /me → 409 si pris par un autre compte | NON (check serveur) | ✅ | ✅ | ⚠ N/A | ⚠ reporté S8 | ⚠ N/A |
| BR-AUT-008 | Aucun password (même hashé) dans les réponses /me | NON (shape DTO) | ✅ | ✅ | ✅ (type User sans password) | ⚠ reporté S8 | ⚠ N/A |
| change-password | 400 ancien pwd faux (BCrypt) / 204 succès, ≥6 car. | NON | ✅ | ✅ | ⚠ N/A | ⚠ reporté S8 | ⚠ N/A |
| BR-AUTH-003 | ROLE_USER visible dans le contexte auth après login/register | OUI (front↔back auth) | ✅ (existant) | ✅ (existant) | ✅ (AuthContext propage) | ⚠ reporté S8 | ⚠ reporté S8 |

> **Cross-system flow** : seul le flux login/register (BR-AUTH-003) est 2+ systèmes. Son E2E métier (Playwright login) a été **explicitement reporté au Sprint 8** dès la planification (`/sprint plan`, mini-plan #40 : "E2E Playwright login reporté S8"). Les endpoints /me (#70) n'ont **pas encore d'UI consommatrice** (écran Réglages = Wave 3+), donc aucun parcours cross-system complet à couvrir ce sprint → `N/A` (pas un manque bloquant).

## Tests créés
- `backend/src/test/.../controllers/UserControllerTest.java` (BR-AUT-001 409, BR-AUT-008 absence hash, change-password 400/204)
- `frontend/src/contexts/AuthContext.test.tsx` (propagation login multi-consumers, réhydratation, throw hors provider)
- `frontend/src/services/apiClient.test.ts` (toast 401 + redirection locale-aware + toast 500)
- `frontend/src/services/authService.test.ts` (register envoie name ≠ username)
- `frontend/src/hooks/useCurrentUser.test.tsx` (pont AuthContext, ZÉRO double-fetch /me — `getUserProfile` jamais appelé)
- `frontend/src/hooks/useProductsWithEvents.test.tsx` (wrappe axios, pas de régression)

## Résultats runs
- **Backend** : 56 tests, 56 passed, 0 failed (test-runner isolé, `test-quiet.sh unit`).
- **Frontend** : 6 fichiers / 12 tests, 12 passed, 0 failed (`vitest run` direct — voir note tooling).
- **E2E** : aucun nouveau spec (Playwright login reporté S8 ; `frontend/e2e/` vide hors `.gitkeep`).

## Audit sécurité (security-expert)
- **Aucun CRITIQUE.** Pas de fuite de hash (BR-AUT-008 OK), pas d'IDOR (identité dérivée du cookie jwt seul, jamais d'userId param), change-password vérifie BCrypt avant re-hash, PATCH conserve le hash existant.
- **[MAJEUR] énumération username via 409 (PATCH /me)** — MAIS pattern identique au `register` existant (BR-AUT-001 déjà documenté), utilisateur déjà authentifié ici → pas un nouveau risque introduit. Candidat follow-up (politique anti-enum globale).
- **[MINEUR]** : unicité username applicative seule (race → couplée à #42 contrainte DB) ; pas de check newPassword≠oldPassword ; localStorage user (PII email) exposable XSS (A17 connu) ; `apiClient` console.error logge headers/response côté browser (devtools only).

## ⚠ Dette tooling détectée
- `scripts/test-quiet.sh frontend` est un **no-op documenté** (aucun runner vitest câblé) → le test-runner a vu "1 smoke test" à tort. La suite réelle (12 tests) ne passe que via `vitest run` direct. **Follow-up** : câbler vitest dans `test-quiet.sh frontend` + CI, sinon les tests frontend ne sont pas exécutés par l'outillage standard.

## Conclusion
**Prêt pour PR.** Suites backend (56/56) et frontend (12/12) vertes, zéro régression. Aucun manque bloquant : la seule absence E2E (login) est un report planifié S8, et les endpoints /me n'ont pas d'UI consommatrice ce sprint. Findings sécurité = aucun bloquant (le [MAJEUR] est un pattern pré-existant). 2 follow-ups identifiés (tooling vitest, anti-enum username) à arbitrer en Phase 4 de `/sprint end`.
