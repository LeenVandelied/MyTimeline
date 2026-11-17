# Audit sécurité — Sprint 38 (contrat d'erreur auth)

> security-expert, 2026-07-13, périmètre : c8fc800 (#127), 5cf7b2a (#126), 8e9e0fd (#125).

## Verdict global : RAS

- [OK] `AuthController` : tous les `catch(Exception)` 500 renvoient des strings statiques (`authentication_failed`, `An error occurred`) — jamais `e.getMessage()`/stack. Pas de fuite interne post-#125. Logs : stacktrace loggée mais pas de password/token, pas de PII nouvelle.
- [OK] `SecurityConfig.writeJsonError` (l.212-218) : Jackson `writeValue`, Content-Type `application/json` + UTF-8 explicites. Plus de concat manuelle.
- [OK] `GlobalExceptionHandler.buildBody` : seul point remplaçant `getReasonPhrase()` par `ErrorCode` ; pas de concat JSON ailleurs dans le diff.
- [OK] 401/403 chaîne Security (`{"error":"unauthorized"}`/`{"error":"forbidden"}`) inchangés — cohérence contrat préservée.
- [OK] Fixtures de test sans secrets réels.

## Points relevés (non bloquants)

- [MINEUR — assumé] `AuthController` renvoie des phrases humaines dans `error` (ex. `"Unauthorized: Invalid token"`) au lieu de codes `ErrorCode` snake_case — choix documenté dans `ErrorCode.java:12-14`, incohérence connue, pas une faille.
- [PRÉ-EXISTANT — hors scope sprint 38] `/me` distingue 404 "User not found" vs 401 (token invalide) : surface d'énumération potentielle si un attaquant peut forger un JWT avec username arbitraire (dépend de `JwtService.extractUsername`, non touché par ce sprint). Diff confirmé : seuls les corps texte→JSON ont changé, branches/status identiques. → candidat RECOMMAND_FOLLOWUP (triage /sprint end).

## Signal mémoire
- [MEMORY:pitfall] `git diff origin/dev..HEAD` sous rtk retourne stat-only ; `git show <sha>` par commit fonctionne — confirme rtk-git-diff-empty-output.md (déjà en mémoire, pas de nouvelle entrée nécessaire).

RECOMMAND_FOLLOWUP: vérifier l'énumération /me 404 vs 401 (JwtService/AuthController, triage S, domaine auth)
