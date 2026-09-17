# Audit sécurité — Sprint 93, issue #711 (restauration d'un produit archivé)

> Spawné par le lead sur le signal du fullstack-dev (l'ownership passe désormais par la clause WHERE d'un UPDATE natif, type de contrôle nouveau au dépôt). Diff audité : `4ddedfe3..HEAD` (`6c7f4480`, `54bd2ef7`).

**VERDICT : RAS** — aucun défaut critique, majeur, ni mineur exploitable.

## Points vérifiés (OK)
- `ProductRepositoryJpaImpl.java:170-187` — UPDATE natif à paramètres liés (`:id`, `:uid`), aucune concaténation : pas d'injection SQL.
- `ProductRepositoryJpaImpl.java:184` — `WHERE id=:id AND user_id=:uid AND archived=true` dans la même clause : l'IDOR est bloqué au niveau SQL, pas seulement applicatif.
- `ProductController.java:88-136` — les 2 routes comparent l'identifiant du path au sujet du JWT avant tout appel de service (403 sinon), couvert par `*_pathUserDiffersFromCaller_returns403`.
- `ProductServiceImpl.java:190-200` — 0 ligne affectée ⇒ `ProductNotFoundException` : 404 uniforme (inconnu / non archivé / d'autrui), conforme à l'anti-énumération de BR-PRO-010.
- `ProductRestoreIntegrationTest.java:230-250` — cas cross-tenant testé bout en bout sur un vrai Postgres : le produit d'un autre utilisateur reste archivé.
- Collision de routage `/products/archived` vs `/products/{productId}` testée : le motif littéral gagne (200, pas 400).
- `SecurityConfig.java:167` — `/api/users/{userId}/products/**` couvre bien les 2 routes en `ROLE_USER`.
- `ArchivedProductResponse.java:28-38` — n'expose ni `user`/ownerId ni `archived` ; absence testée.
- `version` / `updated_at` tenus à la main dans l'UPDATE natif (contournement assumé de `@Version`), vérifié par test.
- Front (`productService.ts:87-108`, `useRestoreProduct.ts`) — identifiants en segments de chemin (jamais en query string), erreurs passées par `safeErrorMessage`, aucun identifiant en dur.

## Réserve consignée (non exploitable aujourd'hui)
- `ProductRepositoryJpaImpl.java:170-176` — `findArchivedByUserId` fait un `SELECT *` natif mappé sur `ProductEntity`. Aucune fuite : la projection DTO filtre ensuite. À garder en tête si le schéma évolue (le mapping Hibernate doit rester aligné).
