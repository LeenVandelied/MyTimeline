# Issue #126 — done

## Commits
- 5cf7b2a

## Résumé
Durci `writeJsonError` (`SecurityConfig.java`, infra/security) — concat manuelle `"{\"error\":\""+error+"\"}"` remplacée par `ERROR_RESPONSE_MAPPER.writeValue(response.getWriter(), Map.of("error", error))` (ObjectMapper Jackson dédié, static field). BR-AUT-005/009 (payloads 401/403) inchangées : `{"error":"unauthorized"}` / `{"error":"forbidden"}` toujours produits identiques pour les appelants constants.

Fichiers : `backend/.../infrastructure/security/SecurityConfig.java`, nouveau test `backend/.../infrastructure/security/SecurityConfigWriteJsonErrorTest.java` (réflexion sur méthode private static, cas guillemets+backslash → JSON valide, cas constantes forbidden/unauthorized).

Pitfall : méthode reste `private static` (pas de changement de visibilité — hors scope), test contourne via réflexion plutôt que d'élargir l'accès.

Tests : **393 tests backend, 0 échec**. `GlobalExceptionHandler.java` et `AuthController.java` non touchés (contrainte matrice respectée).

## Signaux mémoire
Aucun (changement défensif isolé, pas de bug/pitfall/decision nouveau à consigner).

## Recommandations suite
Aucune.

STATUS: COMPLETED
