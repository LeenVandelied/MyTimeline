# Issue #30 — DONE

**Titre :** [SECURITY] Ownership checks (IDOR) + ControllerAdvice global
**Vague :** V2 | **Modèle :** opus/high | **Commit :** b606af8

## Résumé
- Pattern identité : `@CookieValue("jwt")` → `jwtService.extractUsername` → `userService.findDomainUserByUsername` → `getId()` (identité authentifiée, jamais path param). EventController re-câblé sur les **ports domaine** (EventService/ProductService/UserService).
- **EventController** PATCH/DELETE `/api/events/{id}` : helper `checkEventOwnership` (event→productId→product.getUser().getId()==caller.id) → 403 sinon, 404 si absent, 401 si token absent/inconnu. `@CrossOrigin(origins="*")` retiré (CORS gérée par SecurityConfig, non modifié).
- **ProductController** : `productBelongsToUser` ajouté sur GET+DELETE `/products/{productId}` et GET `.../events` → ferme le trou IDOR product↔user (legacy `userId==jwt` conservé). Null-safe sur getUser().
- **GlobalExceptionHandler** `@RestControllerAdvice` (infra) : Event/Product/Category/UserNotFoundException → 404 JSON `{timestamp,status,error,message}`, message générique (PAS `ex.getMessage()`) → zéro fuite stacktrace/PII.
- Tests : EventControllerOwnershipTest + ProductControllerOwnershipTest (403 cross-user + 200 owner), MockMvc standalone + Mockito. **Suite complète 11 tests / 0 échec.** Compile OK.

## Signaux mémoire
- [MEMORY:business-rule] BR-EVE-008 : propriétaire event = event→productId→product.getUser().getId() (Event domaine ne porte que productId). Côté products, `userId==jwt` NE SUFFIT PAS — vérifier `product.getUser().getId()==userId`.
- [MEMORY:pattern] Ownership IDOR : helper privé renvoyant ResponseEntity d'erreur non-null (ou null si OK) pour factoriser 401/404/403.

## Recommandations suite
- **RECOMMAND_SECURITY_EXPERT** : un JWT malformé dans le helper d'ownership EventController lèverait une JwtException non mappée → 500 (ProductController GET wrappe en try/catch, pas le helper events). À traiter (mapper JwtException dans le handler, ou try/catch) — à cadrer avec #31.
- Pas de RECOMMAND_DB_EXPERT (aucun schéma/requête).

STATUS: COMPLETED
