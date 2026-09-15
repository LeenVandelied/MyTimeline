# Review PR #113 — Sprint 4 (Auth & CSP)

> Review explicite `/review-pr 113` (MODE=TEAM : 458 lignes, auth). Reviewers : reviewer (backend) + security-expert, spawnés via Agent() natif.

## Verdict
Pas de CRITIQUE. Code fonctionnellement correct (suite 41/41). Findings de cohérence + durcissement corrigés en 1 cycle.

## Commits de correction (post-review)
- `2e39e08` — défaut cookie fail-safe `application.properties` (`secure=${COOKIE_SECURE:true}`, `domain=${COOKIE_DOMAIN:}`) — finding CRITIQUE/MAJEUR convergent.
- `36772b4` — uniformisation contrat erreur AuthController (String→`Map.of("error",...)`), anti-énumération `/refresh` (404→401 body générique), CSP `base-uri 'self'` + `object-src 'none'`, `@Value` import. Tests 9/9 + 7/7 + 3/3.

## [MEMORY] signaux
- [MEMORY:pitfall] Worktree partagé lead/subagent : `git add -A`/`git add .` capture les fichiers d'orchestration non suivis (`docs/memory/sprints/sprint-4/*`, `sprint-history.md`). Staging explicite par chemin obligatoire. (Récurrent : #105, #99, fix review.) En plus, sous rtk, `git add file1 \<newline> file2` casse (pathspec) → commande mono-ligne.
- [MEMORY:decision] Anti-énumération `/refresh` : réutiliser le message existant `"token expiré ou invalide"` pour le cas `user.isEmpty()` → identité byte-à-byte des bodies 401, indistinguabilité compte-inexistant vs token-invalide.
- [MEMORY:bug] (RÉSOLU 36772b4) `/refresh` renvoyait 404 « User not found » → oracle d'énumération de compte (OWASP API3).

## Follow-ups (non bloquants, à trier en /sprint end)
- [MAJEUR architectural] Double handler `AccessDeniedException` : `GlobalExceptionHandler` (`{timestamp,status,error,message}`) vs `SecurityConfig.accessDeniedHandler` (`{error}`). Runtime correct (les 2 → `{"error":"forbidden"}`+403) mais `EventControllerOwnershipTest` (standalone, sans filtre Security) valide un chemin ≠ prod. Aligner sur un seul producteur + test d'intégration réel.
- login `catch(BadCredentialsException)` garde un body String (`"Invalid username or password"`) — reste 1 body non-JSON (message BR-AUT-005).
- `java.util.Map.of` en FQN inline (cohérence imports).
- CORS : `allowedOrigins` hardcodé `localhost:3000` (externaliser par profil) ; `exposedHeaders` expose `Authorization` (inutile en cookie-only) ; `SameSite=Lax`→`Strict` envisageable.
- Pas de test profil dev (`cookieSecure=false`).

STATUS: COMPLETED
