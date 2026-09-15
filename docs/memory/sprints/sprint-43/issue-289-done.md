# Issue #289 — Anti-énumération sur /me (404 vs 401)

commits: [cde2d76]

resume:
- ANALYSE exploitabilité: `JwtService.extractUsername` parse via `parseSignedClaims(verifyWith clé)`
  → token non signé/altéré/signé autre clé lève Signature/MalformedJwtException AVANT la branche 404.
  VERDICT: distinction 404/401 NON atteignable sans le secret (forger un username exige le secret).
  Vecteur théorique → correctif défensif par cohérence avec /refresh (#113).
- CORRECTIF: branche `user.isEmpty()` de `/me` : 404 "User not found" → 401 générique
  `{"error":"token expiré ou invalide"}` (aligné /refresh). Reste de /me intact (validateToken,
  isSessionActive #73, cookie).
- FRONTEND vérifié: `/auth/me` whitelisté `INLINE_AUTH_ENDPOINTS` (apiClient.ts) → pas de redirect
  global; `AuthContext.fetchUser` traite toute erreur /me comme anonyme. AUCUNE dépendance à un 404.
- TESTS: NEW `me_withUnknownUserInValidToken_returns401Generic_notFound` (AuthControllerSecurityTest,
  assert 401 + body sans "User not found"); adapté `me_unknownUser` 404→401 (AuthControllerErrorContractTest).
  Run ciblé: SecurityTest 11/0, ErrorContractTest 5/0.
- BR touchées: BR-AUT anti-énumération (étendue à /me).

[MEMORY:business-rule] BR-AUT anti-énumération étendue à GET /me : user.isEmpty() sur token signé
valide DOIT renvoyer 401 générique "token expiré ou invalide" (idem /refresh #113), jamais 404.

recommandations suite:
- RECOMMAND_FOLLOWUP: `SignatureException` sur `/me` tombe dans le catch générique → 500 (pas 401
  comme /refresh). Hors scope #289 (ne pas empiéter sur #288). Ajouter un `catch (JwtException)` avant
  le catch générique. [triage XS | domaine auth]
- Note: `coverage-auth.md` périmé ("Refresh token non implémenté") — à réviser.

STATUS: COMPLETED
