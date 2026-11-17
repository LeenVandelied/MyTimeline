# ISSUE #216 DONE

commits: 2433738 (:lock: #216 fail-fast rate-limit off en prod)

## resume
- Objectif: durcir boot — refuse démarrage si `app.rate-limit.enabled=false` en prod effectif (fail-fast, comme #111/JWT_SECRET).
- Prédicat "prod effectif" retenu: marqueur `ENVIRONMENT`/`APP_ENV`==prod/production OU profil Spring `prod` actif. DISJOINT du critère #111 (profil dev) → zéro collision logique.
- Property absente → défaut fail-safe `true` → non bloqué. Seul `false` explicite bloque.
- Refactor: `onApplicationEvent` = 2 checks privés (`checkDevProfileInProduction` #111 inchangé+prioritaire, `checkRateLimitDisabledInProduction` #216). Généralisé `isDevProfileActive` → `isProfileActive(env,name)` réutilisé par prod. Nouvelle const `RATE_LIMIT_ENABLED_KEY`.

## fichiers modifiés (2, git add ciblé)
- backend/.../infrastructure/config/ProfileSafetyGuard.java
- backend/.../test/.../config/ProfileSafetyGuardTest.java

## cas de test ajoutés (7, tous verts)
- prod profil + rate-limit false → throw #216
- marqueur+profil prod + false → throw
- prod + true → ok ; prod + absent → ok (défaut true)
- dev + false → ok (CI e2e) ; test + false → ok (CI e2e)
- marqueur APP_ENV=prod + false → throw
- Suite complète: 318 tests, 0 failure (`./scripts/test-quiet.sh backend`).

## [MEMORY:pattern]
Problème: multi-invariant fail-fast au boot. Solution: 1 seul ApplicationListener (ProfileSafetyGuard), N checks privés indépendants dans onApplicationEvent, prédicats disjoints par check (dev vs prod effectif). Anti-pattern: créer un 2e listener concurrent (perte du point unique fail-fast).

## recommandations
- Pas de RECOMMAND_SECURITY: durcissement isolé, pas d'autre surface adjacente touchée.
- RECOMMAND_FOLLOWUP (hors-scope): idem fail-fast possible sur `app.cookie.secure=false` en prod effectif (même famille de fuite config) — non demandé ici.

STATUS: COMPLETED
