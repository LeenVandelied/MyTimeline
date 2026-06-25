# Audit tests — Sprint 1

> Généré en fin de Phase 6. Aucun `[MISSING]` → Phase 9 PR débloquée.
> Sprint backend sécurité P0 (IDOR, validation, DTO). Aucun changement frontend.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Intégration | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-001 | Titre événement requis (validation) | NON | ✅ | ✅ (`@Valid`) | ⚠ N/A backend-only | ⚠ N/A |
| BR-EVE-008 | Ownership PATCH/DELETE/CREATE event (IDOR) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A |
| BR-PRO-004 | Ownership produit↔user (IDOR) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A |
| BR-PROD-001 | Nom produit requis (`@Valid` createProduct) | NON | ⚠ annot. seule | ✅ (`@Valid`) | ⚠ N/A | ⚠ N/A |
| Auth validation | login payload vide → 400 (`@NotBlank`) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A |
| Sécurité config | STATELESS + @EnableMethodSecurity (pas de JSESSIONID) | NON | — | ✅ (boot contexte) | ⚠ N/A | ⚠ N/A |

> Cross-system flow = NON pour tout le sprint : contrôle d'accès backend mono-système (REST + JWT), pas de flux multi-services/rôles. → Pas d'E2E métier obligatoire. Aucun `[MISSING]`.

## Tests créés / modifiés
- `EventServiceImplTest` (#28, créé — 5 tests : PATCH partiel, all-fields, lien produit, color-only, not-found)
- `EventControllerOwnershipTest` (#30 + correction — DELETE cross-user 403, PATCH cross-user 403, owner 200)
- `ProductControllerOwnershipTest` (#30 — GET/DELETE cross-user 403, owner 200)
- `AuthControllerValidationTest` (#31 + correction — email invalide 400, password vide 400, login blank 400)
- `EventControllerValidationTest` (#31 — champ requis vide 400, service jamais appelé)

## Résultats runs
- Backend (suite complète) : **16 tests, 16 passed, 0 failed, 0 errors** — BUILD SUCCESS (`mvn -DskipTests=false test`).
- Frontend : aucun changement → pas de run.
- E2E : aucun (sprint backend).

## Conclusion
Prêt pour PR. Couverture sécurité : IDOR events (PATCH/DELETE/CREATE) + IDOR products + validation 400 + JwtException→401 testés. Pas de blocage.

### Follow-ups identifiés (review) — à arbitrer en /sprint end Phase 4
- Cookie `Secure=false` (conditionner à l'env)
- `GET /auth/me` expose l'objet User complet → **déjà couvert par Sprint 2 #32 (fuite /me)**
- ProductController injecte les `*Impl` au lieu des ports (violation hexagonale, refactor)
- `EventServiceImpl.findEventById` double-hit DB + `printStackTrace` (pré-existant)
- `getEventsByProductId` renvoie 404 sur liste vide (sémantique)
- `hasAuthority("ROLE_USER")` → `hasRole("USER")` (lisibilité)
- Identité via `SecurityContextHolder` plutôt que cookie brut (cohérence cookie/Bearer)
