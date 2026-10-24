# Issue #831 — [SECURITY] Plafond de débit par utilisateur sur PUT /api/me/preferences

## Commits
- `fb09570a` :lock: feat(security): plafond de débit par utilisateur sur PUT /api/me/preferences (#831) — auteur/message vérifiés via `git log --oneline -3` (voisins : `1b604fa5` #833, `00da5ecf` #768) ; `git show --stat` = 8 fichiers, tous du périmètre #831.

## Résumé
- Objectif : plafonner `PUT /api/me/preferences` PAR UTILISATEUR authentifié, pas par IP.
- Décision d'emplacement : nouveau filtre `UserRateLimitingFilter` (`infrastructure/security`), monté APRÈS l'authentification via `addFilterBefore(userRateLimitingFilter, AuthorizationFilter.class)`.
  - Pas un créneau de `RateLimitingFilter` : il s'exécute avant `JwtFilter` (SecurityConfig), `SecurityContext` vide, seule l'IP disponible.
  - Pas `addFilterAfter(…, JwtFilter.class)` : `jwtFilter` est injecté `@Lazy` (proxy), ordre enregistré sous la classe du proxy — ancrage sur un filtre intégré plus sûr. (Hypothèse sur le proxy NON vérifiée par un essai ; l'ancrage retenu est, lui, prouvé par le test.)
  - Pas une garde applicative via port : le débit est du transport (429, table de routes, bucket4j) ; domaine/application intacts, 429 identique garanti par méthode partagée.
- Clé : id UUID de l'utilisateur (`CustomUserDetails.getUser().getId()`), repli sur le nom du principal ; renommage via `PATCH /api/me` ne remet pas le compteur à zéro. Anonyme : non compté, `AuthorizationFilter` → 401.
- Plafond : 30/min/utilisateur (`DEFAULT_PREFERENCES_PER_MINUTE`), non réglable par profil (aucune propriété → pas de garde prod à ajouter, PIT-S88-014).
- Mémoire : LRU synchronisée bornée `MAX_TRACKED_USERS = 100_000` (motif `tokenBuckets`). Respecte `app.rate-limit.enabled`.
- 429 : `RateLimitingFilter.writeTooManyRequests` et `newMinuteBucket` rendus `static` package-private et partagés → même statut, même Content-Type, même corps `{"error":"too_many_requests"}`, même sémantique de fenêtre `intervally`. Pas d'en-tête `Retry-After` (les 429 existants n'en ont pas non plus).
- MESURÉ (budget E2E) : `grep` des specs `frontend/e2e` → seules `sprint-111-theme-account-preference.spec.ts` émet des `PUT` qui atteignent le backend : 1 par compte NEUF (arbitrage à la connexion). Les specs du compte partagé (`settings-preferences`, `sprint-111-theme-toggle-unified`) répondent au `PUT` dans le navigateur (`keepThemeOffSharedAccount`) → 0 PUT backend. `sprint-99-touch-targets` ouvre le select `pref-theme` puis `Escape` sans sélectionner → 0. `AuthContext.persistThemeChoice` n'écrit pas une valeur déjà portée par le compte, ni sans choix local. Budget par compte : 1 nominal, ≤ 3 pire cas (retries) ≪ 30. Aucune propriété e2e nécessaire, lignes `BUDGET` intactes.
- Docs : ADR-010 § 7 (décision S111 conservée, amendement S112 daté ajouté), `decisions.md` DEC-S111-005 (renvoi daté S112), JavaDoc de `RateLimitingFilter` réécrite (route retirée de la liste « out of scope », paragraphe dédié), JavaDoc de `UserController.updatePreferences` mise à jour.
- Fichiers clés : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java`, `.../security/SecurityConfig.java`, `.../security/RateLimitingFilter.java`, `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java`, `CorsAllowedOriginsConfigIntegrationTest.java` (appel direct du constructeur `SecurityConfig` adapté : 1 argument `null` de plus).
- Pas de migration Flyway.
- fichiers de contexte lus: docs/memory/sprints/sprint-112/briefing-831.md, backend/.../security/RateLimitingFilter.java, SecurityConfig.java, JwtFilter.java, RateLimitConfig.java, CallerResolver.java, CustomUserDetails.java, CustomUserDetailsService.java, adapters/controllers/UserController.java, test/.../ThemePreferenceIntegrationTest.java, ResetPasswordTokenRateLimitIntegrationTest.java, RateLimitingDisabledIntegrationTest.java, support/AbstractPostgresIntegrationTest.java, architecture/ArchitectureTest.java (grep), frontend/src/__tests__/e2e-rate-limit-budget.test.ts (partiel), frontend/e2e/support/theme-preference.ts, frontend/src/contexts/AuthContext.tsx (l.135-205), specs e2e citant preferences/theme (grep), docs/adr/ADR-010-preference-de-theme-du-compte.md § 7, docs/memory/decisions.md DEC-S111-005

## Tests
- `./mvnw -q test -Dtest='PreferencesUserRateLimitIntegrationTest,ThemePreferenceIntegrationTest'` → 3/3 + 6/6 verts.
- Mutation d'armement : filtre remonté AVANT l'authentification (`addFilterBefore(…, HeaderWriterFilter.class)`) → `PreferencesUserRateLimitIntegrationTest` 3/3 ROUGES (`expected 429 but was 200`) ; source restaurée, re-vert ensuite dans la suite complète.
- Classes rate-limit / sécurité / archi : `RateLimitTunableCeilingTest` 10, `RateLimitDefaultCeilingsIntegrationTest` 3, `RateLimitE2eProfileIntegrationTest` 4, `RateLimitingAndHeadersIntegrationTest` 22, `RateLimitingDisabledIntegrationTest` 1, `ResetPasswordTokenRateLimitIntegrationTest` 4, `CorsAllowedOriginsConfigIntegrationTest` 7, `ArchitectureTest` 5, `StatelessSessionGuardTest` 2, `UserControllerTest` 36, `JwtFilterTest` 1, `ProfileSafetyGuardTest` 56, `CallerResolverTest` 4, `SecurityConfigWriteJsonErrorTest` 2, `AuthErrorContractIntegrationTest` 3 → 160/160, 0 échec.
- Suite backend complète `./mvnw -q test` → 83 classes, 670 tests, 0 failure, 0 error (comptes lus dans les rapports surefire produits par ce run).
- `cd frontend && npx vitest run src/__tests__/e2e-rate-limit-budget.test.ts` → 37/37 (aucune modification nécessaire : le test lit les constantes `DEFAULT_*_PER_MINUTE` et les `Map.entry("POST …")`, inchangés).
- NON vérifié : suite E2E Playwright (interdite dans cette vague ; rejouée par le lead) ; éviction LRU réelle au-delà de 100 000 seaux (non exercée) ; recharge de la fenêtre du seau par utilisateur (pas de meter contrôlable dans ce test ; même `newMinuteBucket` que le limiteur par IP, dont la recharge est testée) ; contournement par chemin ré-encodé (`/api/me/%70references`) non testé (même `UrlPathHelper.getPathWithinApplication` que #265) ; comportement multi-instance (par JVM, comme l'existant).

## Critères d'acceptation
- [x] Test backend : utilisateur authentifié au-delà du plafond → 429 — `PreferencesUserRateLimitIntegrationTest.userOverCeiling_gets429_withTheSameShapeAsTheIpLimiter` (31e PUT → 429, JSON `{"error":"too_many_requests"}` strict).
- [x] Plafond par utilisateur, pas par IP — `ceilingIsPerUser_notPerIp` : B depuis la même IP → 200 ; A depuis une autre IP → 429. Mutation « avant auth » → rouge.
- [ ] (non vérifié ici) Suite E2E complète inchangée et sans régression — aucune spec modifiée ; budget mesuré par grep (≤ 1 PUT backend par compte nominal) ; exécution Playwright laissée au lead (RECOMMAND_TEST_RUNNER).
- [x] ADR-010 § 7 et DEC-S111-005 mis à jour (amendements datés S112, historique conservé).

## Signaux mémoire
- [MEMORY:decision] Context: #831, plafond par utilisateur sur une route authentifiée alors que `RateLimitingFilter` tourne avant `JwtFilter`. Decision: filtre dédié `UserRateLimitingFilter` ancré `addFilterBefore(…, AuthorizationFilter.class)`, clé = id utilisateur, 30/min, non réglable, 429 partagé. Why: seul point de la chaîne où le principal existe sans toucher domaine/application ; seau par utilisateur insensible à l'IP E2E partagée.
- [MEMORY:pattern] Problem: throttler « par utilisateur » dans Spring Security. Solution: filtre après authentification, avant `AuthorizationFilter`, anonyme laissé passer (401 en aval) ; prouver l'ordre par une mutation (filtre remonté avant l'auth → tests rouges). Anti-pattern: lire le `SecurityContext` dans un filtre monté avant `JwtFilter` (toujours vide → jamais de 429, test vert si on n'assertait que le cas « sous le plafond »).
- [MEMORY:pitfall] Context: ajout d'un paramètre au constructeur de `SecurityConfig`. Solution: `CorsAllowedOriginsConfigIntegrationTest` l'instancie directement (`new SecurityConfig(null, null, …)`) → erreur de compilation de TOUTE la suite de tests. Prevention: `grep -rn "new SecurityConfig(" backend/src/test` avant de toucher la signature.
- [MEMORY:business-rule] Description: `PUT /api/me/preferences` plafonné à 30/min par utilisateur authentifié (429 générique). Constraints: le pack `br-auth` (table Actions × Acteurs, ligne `PUT /api/me/preferences` : « hors rate-limit délibérément ») est désormais faux — à corriger par le lead.

## Recommandations suite
- RECOMMAND_SECURITY: auditer `UserRateLimitingFilter` (clé par id + ordre dans la chaîne, choix 30/min, absence de `Retry-After`, LRU 100 000, pas de garde prod puisque non réglable).
- RECOMMAND_TEST_RUNNER: suite E2E complète contre un backend reconstruit (critère 3), en particulier `sprint-111-theme-account-preference`, `sprint-111-theme-toggle-unified`, `settings-preferences`.
- Pas de RECOMMAND_DB_EXPERT : aucun changement de schéma ni de requête.
- Pas de RECOMMAND_UI_DESIGN : aucun changement front.
- RECOMMAND_FOLLOWUP: corriger la ligne `PUT /api/me/preferences` de `.ai-env/context-packs/br-auth.md` (« hors rate-limit délibérément » → plafond 30/min/utilisateur, #831) et BR-AUT-013 si elle mentionne le rate-limit [XS | auth]

STATUS: COMPLETED
