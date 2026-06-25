# Issue #105 — Valider l'expiration du token avant ré-émission dans /auth/refresh

**Commit :** 4b6a85d
**Modèle :** opus-high | **Vague :** 2 (2/3 chaîne AuthController)

## Résumé
- Objectif : BR-AUT-009 / anti-pattern A5 — `/api/auth/refresh` ré-émettait un JWT sans valider le token entrant ; token expiré renouvelable indéfiniment.
- Fix : `AuthController.refreshToken` — appel `jwtService.validateToken(token, userDetails)` AVANT `generateToken` ; si false → 401 `{"error":"token expiré ou invalide"}`. Catch élargi `ExpiredJwtException` → `JwtException` (parent : Expired + Signature + Malformed levés par `extractUsername`) → 401 même body, plus de 500. Import `io.jsonwebtoken.JwtException` ajouté.
- Tests : `AuthControllerSecurityTest` — 3 cas (valide=200+cookie httpOnly, expiré=401, signature invalide=401) + `verify(never()).generateToken`. Suite 7/7 PASS.
- Scope : modif localisée à refreshToken + import ; cookie Secure/Domain, login (#104), SecurityConfig, EventController NON touchés.

## [MEMORY] signaux
- [MEMORY:pitfall] Subagent en worktree partagé avec le lead : `git add -A` capture les fichiers scratch d'orchestration non suivis (docs/memory/sprints/sprint-4/*). Solution : staging explicite par chemin (`git add <paths>`), jamais `git add -A`/`.` en worktree sprint.
- [MEMORY:business-rule] BR-AUT-009 — `/auth/refresh` exige token courant valide (expiration + signature) avant ré-émission. Échec → 401 `{"error":"token expiré ou invalide"}`, aucune ré-émission ; jamais de 500 sur token malformé.

## Recommandations suite
- RECOMMAND_REVIEWER : modif sécurité auth, revue ciblée (traitée en Phase 7 batch).
- Note #99 (même fichier) : refreshToken modifié, login/buildJwtCookie intacts — pas de conflit attendu.
- Pas de RECOMMAND_TEST_RUNNER (7 tests). Pas de RECOMMAND_DB_EXPERT.

STATUS: COMPLETED
