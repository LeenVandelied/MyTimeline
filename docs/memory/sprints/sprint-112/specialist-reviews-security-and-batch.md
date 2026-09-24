# Revues spécialistes — Sprint 112

## security-expert — #831 (commit `fb09570a`), 2026-09-24

Verdict : 0 CRITIQUE / 0 MAJEUR / 4 MINEURS. Lecture du code + test ciblé `PreferencesUserRateLimitIntegrationTest` rejoué (3/3).

Vérifié OK :
- clé `id:<UUID>` stable (survit à un renommage) ; `UserRateLimitingFilter` avant `AuthorizationFilter`, donc après `JwtFilter` : principal posé avant lecture ;
- JWT expiré / invalide / révoqué → contexte anonyme → non compté, 401 en aval ;
- map LRU `synchronizedMap` : `computeIfAbsent` et éviction sous le même verrou (motif de `RateLimitingFilter.tokenBuckets`) ;
- 429 identique aux autres (méthode partagée) ; changement 100 % `infrastructure/` + tests.

MINEURS :
1. Contournement de chemin (`%70references`, `//preferences`, `/preferences/`, `;jsessionid=x`) non testé. `UrlPathHelper` décode déjà (audit #265) et `PathPatternParser` route littéralement, donc un chemin qui échappe au filtre devrait échapper aussi au routage — cohérence NON prouvée. Correctif proposé : test d'intégration attendant 404 (ou compteur appliqué) sur ces variantes.
2. Éviction LRU à 100 000 seaux jamais exercée — non exploitable par un seul compte ; motif préexistant.
3. Pas de `Retry-After` sur le 429 — dette préexistante commune à tous les 429 du projet.
4. Pas d'annotation de méthode sur `UserController` : protection portée par `SecurityConfig` (`hasAuthority("ROLE_USER")` sur `/api/me/**`) — cohérent avec l'existant.

Non vérifié par l'auditeur : E2E complet, recharge du seau au-delà de la minute, multi-instance (par JVM, comme l'existant).

Arbitrage lead : MINEUR 1 → à traiter dans le cycle de correction post-review batch (test de contournement de chemin, peu coûteux) ; 2-4 → documentés, pas d'action.

## reviewer backend — revue batch (diff `origin/dev..b5e717c1`, backend + ADR + decisions)

0 CRITIQUE / 0 MAJEUR / 2 MINEURS.
1. `UserRateLimitingFilter` : repli de clé `"name:" + authentication.getName()` jamais couvert (JavaDoc : « jamais le cas ») → tester avec un principal non `CustomUserDetails`, ou supprimer la branche morte.
2. `doFilterInternal` : ~4 sorties anticipées, lisibilité limite si une 2e route est ajoutée → extraire un helper le jour venu. Pas d'action.
OK vérifiés : ordre des filtres ancré sur `AuthorizationFilter`, hexagonal, clé UUID, 429 partagé, interrupteur `app.rate-limit.enabled` commun (garde prod `ProfileSafetyGuard` couvre le nouveau filtre), `UrlPathHelper` identique aux deux filtres, LRU bornée atomique, test « par utilisateur, pas par IP » dans les deux sens, cohérence ADR-010 § 7 / DEC-S111-005.

## reviewer frontend + e2e — revue batch (diff `origin/dev..b5e717c1`, `frontend/`)

0 CRITIQUE / 0 MAJEUR / 2 MINEURS, sans action :
1. `e2e/support/session.ts` : vérifie présence/expiration du cookie `jwt`, pas sa signature — seul le backend le peut (commenté).
2. `TOUCH_TARGET_BUTTON` sur les CTA d'état vide sans test Vitest dédié — couvert par l'E2E `sprint-112-touch-targets`, comme aux S101/S102.
OK vérifiés : retour du focus #700 dans les 3 chemins, mocks Vitest resynchronisés avec Radix réel ; équivalence champ par champ des profils de #768 ; `registerAndLogin` sans appelant ; opt-out 500 par requête (#833) avec test sur chaîne réelle et témoins ; `elementFromPoint` pour les cibles ; seeds E2E suivis et nettoyés ; i18n / TS strict.

## Arbitrage lead du cycle de correction
- Correctif demandé (un agent backend) : test d'intégration du contournement de chemin (MINEUR 1 security-expert) + sort du repli `name:` (MINEUR 1 reviewer backend).
- Tous les autres MINEURS : documentés, sans action.
