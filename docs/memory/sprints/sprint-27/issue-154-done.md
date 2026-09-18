# Issue #154 — ProductController adopte le CallerResolver (dédup boilerplate JWT)

**Vague :** V2 (après #93, avant #92) · **Taille :** S · **Modèle :** opus/high
**Commit :** 4286670 — `:recycle: #154 ProductController adopte CallerResolver (dédup extraction JWT inline)`

## Résumé
ProductController adopte le `CallerResolver.currentUser()` de #93 (aligné sur CategoryController).
6 extractions JWT inline supprimées (createProduct, getProducts, getProductById, updateProduct,
deleteProduct, getEventsByProductId). Chaque `@CookieValue jwt` + `jwtService.extractUsername` +
`userService.findDomainUserByUsername` → `callerResolver.currentUser()`. Header `Authorization`
manuel de `getProducts` retiré (CallerResolver gère cookie ET Bearer via SecurityContext). Injections
`JwtService`/`UserService` retirées du contrôleur.

`catch(Exception)` de `getProducts` (ligne 82) laissé **INTACT** pour #92 (try wrap uniquement l'appel service).

## BR touchées
BR-PRO-004 (ownership path {userId} vs caller), BR-PRO-010 (source `user` = CallerResolver, comparaisons
inchangées), BR-AUT-005 (401 sans fuite).

## ⚠ Changement de contrat subtil (intentionnel, à signaler au reviewer)
Sur les 5 endpoints hors getProducts, l'ancien code renvoyait **403** quand token présent mais user inconnu ;
désormais **401** (`currentUser().isEmpty()`). Conforme à la consigne briefing (BR-PRO-004) et au pattern
CategoryController. `caller.id != {userId}` → 403 inchangé ; produit d'autrui/absent → 403/404 inchangé.

## Fichiers
- `ProductController.java` (137 lignes touchées, -147/+66 net : forte dédup)
- `ProductControllerOwnershipTest.java` : mock `CallerResolver.currentUser()` au lieu de JwtService/UserService,
  `.cookie(jwt)` retiré (standaloneSetup bypasse Security, identité mockée)

## Tests
13/13 ProductControllerOwnershipTest verts + ArchitectureTest 4/4 + test-compile clean.

## [MEMORY] signaux
RAS (pattern CallerResolver déjà capturé par #93).

## Recommandations suite
- #92 peut démarrer (bloc catch(Exception) getProducts intact, ligne 82).
- Reviewer : valider le changement 403→401 (token/user inconnu) comme intentionnel.

STATUS: COMPLETED
