# Issue #78 — Backend suppression de compte (DELETE /api/me) — DONE

RETOUR :
- commits: [1 commit unique sur sprint/13, :sparkles: #78 — DELETE /api/me. Voir git log HEAD.]
- resume:
  - Objectif: DELETE /api/me (RGPD droit à l'effacement). Confirmation re-saisie username, purge cascade transactionnelle, révocation sessions, cookie effacé, 204.
  - BR touchées: BR-AUT-001 (variante ownership : identité du JWT, username = double-sécurité UX, mismatch->400), BR-AUT-010 (cookie MaxAge=0), BR-AUT-011 (2e appel -> 401 user purgé).
  - Fichiers clés:
    - application/dtos/DeleteAccountRequest.java (NEW, @NotBlank username)
    - domain/exceptions/AccountDeletionMismatchException.java (NEW, ->400)
    - domain/ports/services/UserService.java (+deleteAccount(caller, confirmUsername))
    - application/services/UserServiceImpl.java (impl @Transactional : revokeAllSessions -> events -> products -> categories(owner) -> user ; +4 deps port injectées ; commentaire politique rétention logs/analytics)
    - domain/ports/repositories/{Event,Product,Category,User}Repository.java (+ purge par user/owner)
    - infrastructure/.../jpa/{Event,Product,Category,User}RepositoryJpaImpl.java (SQL NATIF bindé)
    - infrastructure/.../controllers/UserController.java (+@DeleteMapping racine, +@Value app.cookie.*, buildExpiredJwtCookie)
    - infrastructure/.../controllers/GlobalExceptionHandler.java (+handler mismatch ->400)
  - Pitfalls maîtrisés:
    - @SQLRestriction(archived=false) sur ProductEntity masque les produits archivés des lectures/bulk HQL -> purge products ET events via SQL NATIF (contourne le filtre), sinon FK user_id résiduelle bloque DELETE users. (PIT-S10-004)
    - events n'a PAS de colonne user_id (schéma réel V1) : appartenance TRANSITIVE via product_id -> products.user_id. Purge events = DELETE ... WHERE product_id IN (SELECT id FROM products WHERE user_id=:uid). Le briefing "events(user_id)->users" est inexact ; corrigé.
    - Ordre imposé (FK non-cascade V1/V8 anonymes) : events -> products -> categories(owner=user) -> user. categories système (owner_id NULL) PRÉSERVÉES (WHERE owner_id=:uid les exclut).
    - Cookie clear : attributs IDENTIQUES à la pose (AuthController) sinon le navigateur ne matche pas. UserController ne portait pas la config cookie -> ajout @Value app.cookie.{secure,domain} + helper.
  - Tests: 9 nouveaux (14 total dans UserControllerTest, +1 classe AccountDeletionIntegrationTest 3 tests @SpringBootTest+Testcontainers). Couvre 401 sans token, 400 body absent/vide/mismatch, 204 + cookie MaxAge=0 + purge cascade (produit ARCHIVÉ inclus + event + catégorie possédée purgés, catégorie système intacte), 2e appel->401. Suite complète: 218 tests, 0 échec (./scripts/test-quiet.sh backend).
  - Migration: AUCUNE (suppression applicative ordonnée, conforme contrainte briefing). Pas de V11.

- [MEMORY:*] signaux:
  - [MEMORY:pitfall] Context: purge multi-tables d'un user avec @SQLRestriction(archived=false) sur ProductEntity. Solution: SQL NATIF bindé (createNativeQuery) pour products ET events (via sous-select product_id), sinon les lignes archivées invisibles gardent leur FK et bloquent DELETE users. Prevention: toute purge transverse d'une entité soft-delete -> natif, jamais HQL/JPA.
  - [MEMORY:business-rule] Description: table events sans colonne user_id ; appartenance user via product_id -> products.user_id (schéma V1 réel). Constraints: toute opération "par utilisateur" sur events doit joindre products.
  - [MEMORY:decision] Context: cookie clear sur DELETE /api/me. Decision: dupliquer les attributs cookie (@Value app.cookie.*) dans UserController plutôt que factoriser un CookieFactory partagé. Why: scope #78 minimal ; factorisation cross-controller = refacto hors périmètre (candidate tâche suivante).

- recommandations suite:
  - RECOMMAND_SECURITY : feature touche auth + suppression PII/RGPD (droit à l'effacement) — revue sécurité recommandée (surface: identité dérivée JWT ok, message neutre anti-énumération ok, politique rétention documentée en commentaire).
  - Pitfall subtil / dette: buildJwtCookie est désormais dupliqué entre AuthController et UserController (attributs cookie). Divergence future possible (ex. SameSite/Secure). Candidate: extraire un JwtCookieFactory partagé (infra/security). Hors scope #78.

STATUS: COMPLETED
