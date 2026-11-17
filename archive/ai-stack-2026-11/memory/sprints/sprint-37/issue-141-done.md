# RETOUR #141 — rate-limit/lockout par token reset-password

commits: [ee69c11]

## resume
- Objectif: bloquer/ralentir tentatives répétées de validation d'UN token reset (défense en profondeur, en plus du throttle par IP existant).
- Fichiers clés:
  - `infrastructure/security/RateLimitingFilter.java` (étendu, PAS réécrit)
  - `test/.../security/ResetPasswordTokenRateLimitIntegrationTest.java` (nouveau)
- Stratégie clé rate-limit: SECOND bucket keyé PAR TOKEN (valeur du champ `token`), indépendant de l'IP. `POST /api/auth/reset-password` seul déclenche la branche. Corps lu dans le filtre (Jackson `readTree().path("token")`) puis re-servi au controller via `CachedBodyHttpServletRequest` (InputStream consommable 1×). Limite 5/token/min (réutilise `WINDOW`+`newBucket`+TimeMeter). Map `tokenBuckets` bornée `MAX_TRACKED_TOKENS=100_000` (token value-space attacker-influencé → sinon DoS mémoire ; overflow = fallback per-IP, compteurs existants préservés).
- 429 générique `{"error":"too_many_requests"}` inchangé → aucune distinction "token inconnu"/"trop de tentatives" (anti-énumération, critère #141).
- Aucune migration, aucun changement schéma. #143/#145 fichiers NON touchés.
- Tests (verify worktree HEAD isolé, cf. race ci-dessous): 22 verts.
  - Nouveaux (4): 6e tentative même token IP tournante → 429 ; sous seuil OK ; tokens distincts jamais throttlés (prouve per-token≠global) ; reset fenêtre.
  - Non-régression: RateLimitingAndHeadersIntegrationTest 13 verts + PasswordResetEndpoints 5 verts.

## [MEMORY:pitfall]
Context: worktree sprint PARTAGÉ, #143 (PasswordResetServiceImpl) mid-edit → erreur compile transitoire (imports OptimisticLock manquants) bloque tout le module → impossible de lancer mvn test dans le tree. Solution: `git worktree add --detach <scratch> HEAD` + copier UNIQUEMENT mes 2 fichiers dedans + tests là → vérif isolée sans toucher fichiers d'autrui, puis `git worktree remove`. Prevention: en fan-out worktree partagé, verify via worktree HEAD jetable quand un pair a un état non-compilable.

## [MEMORY:pattern]
Problem: rate-limit sur une valeur du BODY (token) dans un servlet filter. Solution: lire body en byte[] (StreamUtils), extraire via ObjectMapper, wrapper `HttpServletRequestWrapper` re-servant le body caché au converter. Anti-pattern: lire getInputStream() sans wrapper → body vide côté controller.

## recommandations suite
- RECOMMAND_SECURITY (revue légère): valider borne mémoire `tokenBuckets` (100k) + résidu overflow=fallback per-IP acceptables ; confirmer que 429-générique satisfait l'anti-énumération.
- Filtre lit désormais le body de reset-password → si un pair ajoute un endpoint body-heavy, revérifier l'idempotence du wrapper.
- Pas de merge de ma part ; le lead consolide (dev protégée, CI requise). #143 doit corriger sa compile avant build global.

STATUS: COMPLETED
