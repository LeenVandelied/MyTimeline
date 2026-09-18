# Issue #92 — getProducts : retirer catch(Exception)→401 (masquait NPE/DB)

**Vague :** V2 (après #154, dernière issue) · **Taille :** S · **Modèle :** opus/high
**Commit :** 548169c — `:lock: #92 getProducts : retire catch(Exception)->401 (masquait NPE/DB)`

## Résumé
Supprimé le `catch(Exception e) -> 401` dans `getProducts`. **Choix = option 1 (retrait total du
try/catch)**. Justification : post-#154, l'auth est résolue AVANT le try via `callerResolver.currentUser()` ;
le try n'enveloppait plus que `getProductsWithEvents(...)` qui ne lève AUCUNE `JwtException` → un
`catch(JwtException)` aurait été du code mort. Le retrait atteint exactement le but sécurité de l'issue.

## Comportement
- AVANT : NPE (BR-PRO-005 events null) / erreur DB → **401 trompeur** (masqué).
- APRÈS : NPE/DB → **propagé au GlobalExceptionHandler** (500 runtime, BR-AUT-005 respectée).
- 401 auth (currentUser vide, hors try) inchangé et testé.

## Fichiers
- `ProductController.java` (getProducts, -8/+15 net avec imports nettoyés)
- `ProductControllerOwnershipTest.java` : +2 tests
  - `getProducts_unauthenticated_returns401` (contrat 401 auth préservé)
  - `getProducts_serviceThrows_propagates_notMaskedAs401` (RuntimeException service propagée, pas 401)

## Tests
**15/15 verts** (13 existants #154 + 2 ajoutés).

## [MEMORY] signaux
- [MEMORY:pattern] `catch(Exception)->401` dans un contrôleur après externalisation de l'auth
  (CallerResolver #93/#154) : retirer le try/catch, laisser propager au GlobalExceptionHandler.
  Anti-pattern : transformer une erreur serveur en code d'auth (masque bugs, viole BR-AUT-005). Résout A4.

## Recommandations suite
RAS. Dernière issue d'implémentation du sprint.

STATUS: COMPLETED
