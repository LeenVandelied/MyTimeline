# Issue #567 — Le 429 du rate-limit annonce quand retenter (Retry-After)

commits: [7dc4242b]

## Résumé

- Chacun des 12 points de rejet pose `Retry-After` : les 10 slots par IP de `RateLimitingFilter` (`doFilterInternal`), le seau par jeton de `reset-password` (`handleResetPasswordTokenThrottle`) et le seau par utilisateur de `PUT /api/me/preferences` (`UserRateLimitingFilter`).
- Valeur : `bucket.tryConsumeAndReturnRemaining(1)` → `ConsumptionProbe.getNanosToWaitForRefill()` (Bucket4j 8.10.1), convertie en secondes ENTIÈRES arrondies au supérieur, plancher 1, par `RateLimitingFilter.retryAfterSeconds(probe)` (statique, package-private, partagée avec `UserRateLimitingFilter`). Aucun calcul manuel de fenêtre.
- Nouvelle signature `writeTooManyRequests(response, retryAfterSeconds)` ; `tryConsumeToken` renvoie désormais le `ConsumptionProbe` (au lieu d'un `boolean`), le 429 par jeton annonce donc le délai du seau QUI A REFUSÉ.
- Aucun `X-RateLimit-*`. Corps `{"error":"too_many_requests"}` inchangé.
- CORS : `Retry-After` ajouté à `setExposedHeaders` (`SecurityConfig.corsConfigurationSource`).
- ADR-010 § 7 amendé (« Amendement S116 », 1 phrase). Commentaire périmé corrigé dans `AuthControllerLegacyPasswordLoginTest` (javadoc de `diagnostic`, qui affirmait « ni Retry-After ni X-RateLimit-* »).

## Décisions

- **Retry-After seul, pas de X-RateLimit-*** (arbitrage du dev, 2026-10-25) : `X-RateLimit-Limit/Remaining/Reset` publieraient le plafond de chaque slot et le budget restant à un attaquant qui sonde le limiteur ; `Retry-After` suffit à un backoff informé.
- **Arrondi supérieur** : 39,5 s restantes sont annoncées 40. Avec 39, un client qui attend exactement le délai annoncé serait encore refusé.
- **Plancher 1** : la RFC 9110 permet `0`, mais un « retente tout de suite » sur un 429 provoquerait un nouvel essai refusé (reste < 1 s arrondi).
- **CORS — conclusion** : un chemin cross-origin EXISTE. En dev (`docker-compose.yml:70`, `.env.example:77`), le navigateur sur `http://localhost:3000` appelle `NEXT_PUBLIC_API_URL=http://localhost:8080/api` directement (le proxy même-origine `next.config.mjs` `rewrites()` n'est actif que si `E2E_API_PROXY_TARGET` est défini, soit l'E2E seulement). En prod, `docker-compose.prod.yml:81` documente une topologie même-origine (le commentaire de `SecurityConfig` envisage encore une origine séparée). `Retry-After` n'est pas un en-tête de réponse CORS-safelisted (Fetch) : sans exposition, le JS cross-origin lirait `null`. Exposé, et testé sur le 429 lui-même. Pas de divulgation : la valeur est le délai déjà communiqué au client refusé, pas le plafond.
- **Le seau par jeton annonce son propre délai** (et non celui du seau par IP) : le jeton n'a toujours pas d'état distinct « jeton inconnu / trop d'essais » (même 429, même corps), donc le critère anti-énumération de #141 tient. Le délai révèle l'âge du seau du jeton, que l'attaquant a lui-même créé par ses essais. Point soumis au security-expert (voir Recommandations).

## Fichiers

- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` : `retryAfterSeconds`, `NANOS_PER_SECOND`, signature de `writeTooManyRequests`, 2 points de rejet, `tryConsumeToken` → `ConsumptionProbe`, javadoc de classe (§ « When to retry »).
- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` : point de rejet par utilisateur.
- `backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` : `setExposedHeaders(List.of("Set-Cookie", HttpHeaders.RETRY_AFTER))`.
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` : helper `assertRetryAfterContract` (statique, réutilisé) + 3 tests.
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` : 1 test (rejet par jeton).
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` : `ManualTimeMeter` + 1 test.
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java` : javadoc seule.
- `docs/adr/ADR-010-preference-de-theme-du-compte.md` : § 7, amendement S116.

## Tests

Nouveaux tests :
- `login429_retryAfter_isTheBucketRefillDelay_roundedUp_andDecreases` (slot login, 10/min) : 60 avec le temps figé → +20,5 s : 40 → +39 s : 1 → +1 s : plus de 429. Couvre l'entier, [1, 60], l'arrondi supérieur, le plancher, la décroissance et le fait que le délai annoncé suffit.
- `exportSubmission429_carriesRetryAfter_noXRateLimit` (2e slot, `POST /api/export`, 5/min) : 60, corps inchangé.
- `crossOrigin429_exposesRetryAfter` : `Origin: http://localhost:3000` → `Access-Control-Allow-Origin` posé et `Retry-After` ∈ `Access-Control-Expose-Headers` sur le 429.
- `sameToken_429_retryAfterIsTheTokenBucketDelay` : seau du jeton créé à t0, 6e essai à t0+30 s depuis une IP neuve (son seau IP annoncerait 60) → 30. Seul le seau par jeton peut produire cette valeur.
- `UserRateLimitingFilterTest.overTheCeiling_429_carriesRetryAfter_roundedUp_andDecreasing` : 60 → +45,2 s : 15 → +14,7 s : 1 → +0,1 s : passe.
- Chaque assertion de 429 vérifie aussi l'absence de tout en-tête commençant par `x-ratelimit` (insensible à la casse).

Commandes et résultats :
- Ciblé : `cd backend && ./mvnw -q test -Dtest='RateLimitingAndHeadersIntegrationTest,UserRateLimitingFilterTest,ResetPasswordTokenRateLimitIntegrationTest,PreferencesUserRateLimit*,CorsAllowedOriginsConfigIntegrationTest'` → vert. Rapports surefire : RateLimitingAndHeaders 25/25, UserRateLimitingFilterTest 8/8, ResetPasswordToken 5/5, PreferencesUserRateLimit 3/3, PathVariants 5/5, CorsAllowedOrigins 7/7.
- Suite backend complète : `cd backend && ./mvnw -q test` → EXIT=0 ; rapports surefire frais : **85 suites (= 85 fichiers `*Test.java`), 687 tests, 0 échec, 0 erreur, 0 ignoré**.

Contrôle négatif (PAT-S81-002), source muté puis restauré depuis une copie, restauration prouvée par `cmp` et `grep -c MUTATION` = 0 :
- **Armement A** : ligne `response.setHeader(HttpHeaders.RETRY_AFTER, …)` retirée → `Tests run: 38, Failures: 5`. Les 5 nouveaux tests sont rouges pour la bonne raison (« un 429 doit porter Retry-After — en-têtes reçus : [Vary, Content-Type, …] »). Les 33 autres restent verts.
- **Armement B** : arrondi inférieur (`nanos / NANOS_PER_SECOND`) + `Retry-After` retiré des en-têtes CORS exposés + délai constant `60L` sur le rejet par jeton → `Tests run: 38, Failures: 4` : login `expected <40> but was <39>`, unitaire `expected <15> but was <14>`, CORS `reçu : Set-Cookie`, jeton `expected <30> but was <60>`. Le test export reste vert, c'est attendu (60 s pile, insensible à l'arrondi).

Non vérifié :
- L'assertion « aucun X-RateLimit-* » n'a pas été armée (aucune mutation n'a ajouté d'en-tête de ce type) : son pouvoir discriminant n'est établi que par lecture du code.
- Pas d'E2E ni de vérification navigateur : la lecture de `Retry-After` par un vrai `fetch` cross-origin n'est prouvée que par l'en-tête `Access-Control-Expose-Headers` sous MockMvc.
- Le frontend NE LIT PAS `Retry-After` (0 occurrence dans `frontend/src`) : la valeur n'est consommée par aucun client à ce jour.
- Mesure en conditions réelles (Tomcat + `TimeMeter.SYSTEM_NANOTIME`) non faite : les valeurs non entières ne sont observées que via le TimeMeter piloté.
- Les 8 autres slots par IP (register, refresh, forgot, reset par IP, GET export, change-password, PATCH me, avatar) ne sont pas testés un par un : ils passent par la même ligne `doFilterInternal`, prouvée sur 2 slots de plafonds différents.

## Signaux mémoire

- [MEMORY:decision] Contexte : #567, un 429 sans indication de délai empêche tout backoff informé. Décision : `Retry-After` seul sur les 12 points de rejet (secondes entières, arrondi supérieur, ≥ 1, lu dans `ConsumptionProbe.getNanosToWaitForRefill()`), exposé au CORS ; aucun `X-RateLimit-*`. Why : `X-RateLimit-*` publieraient le plafond et le budget restant de chaque slot à un attaquant qui sonde ; `Retry-After` suffit au client et ne révèle que le délai déjà subi. Tracé : ADR-010 § 7, amendement S116.
- [MEMORY:pattern] Problème : prouver qu'un `Retry-After` vient du BON seau quand deux seaux peuvent refuser la même requête (IP + jeton). Solution : décaler leurs âges avec le TimeMeter piloté (seau du jeton créé à t0, requête à t0+30 s depuis une IP neuve, dont le seau annoncerait 60) et asserter la valeur exacte (30). Anti-pattern : asserter seulement « présent et dans [1, 60] », vert quel que soit le seau. Armement vérifié : délai constant → `expected <30> but was <60>`.
- [MEMORY:pattern] Problème : un test d'arrondi de délai est vert par construction si le seau vient d'être créé (60 s pile, insensible à l'arrondi : le test export reste vert sous mutation « arrondi inférieur »). Solution : avancer le TimeMeter d'une durée FRACTIONNAIRE (20,5 s) et asserter la valeur arrondie (40), puis le plancher (0,5 s → 1).
- [MEMORY:pitfall] Contexte : `Retry-After` n'est pas un en-tête de réponse CORS-safelisted (seuls Cache-Control, Content-Language, Content-Length, Content-Type, Expires, Last-Modified, Pragma le sont) ; le front dev appelle `:8080` depuis `:3000`. Solution : l'ajouter à `setExposedHeaders` et l'asserter SUR le 429 (le `CorsFilter` passe avant le limiteur, donc les en-têtes CORS y sont). Prévention : tout nouvel en-tête de réponse destiné au JS doit passer par `setExposedHeaders`.

## Recommandations suite

- RECOMMAND_SECURITY: revue de `SecurityConfig.corsConfigurationSource` (ajout de `Retry-After` aux en-têtes exposés) et du `Retry-After` du rejet par jeton de `reset-password`, qui annonce le délai du seau du jeton (différent de celui du seau IP) : confirmer que cela ne rouvre pas d'oracle au sens de #141.
- RECOMMAND_FOLLOWUP: le frontend ignore `Retry-After` (`apiClient`/gestion d'erreur inline n'affichent pas « réessayez dans N s ») ; exploiter la valeur dans le message du 429 [S | frontend/auth]
- Pas de RECOMMAND_DB_EXPERT : aucun schéma, aucune requête, aucune migration touchés.
- Pas de RECOMMAND_TEST_RUNNER : suite backend complète déjà jouée (85 suites, 687 tests, 0 échec) ; aucun E2E impacté (corps et statut du 429 inchangés).
- Pas de RECOMMAND_UI_DESIGN : aucun changement d'interface.

fichiers de contexte lus: docs/memory/sprints/sprint-116/briefing-567.md (intégral, l.1-106) ; .ai-env/context-packs/br-auth.md (l.35 et l.135, BR-AUT-013 rate-limit #831 ; aucune occurrence de « 429 » hors de ces lignes) ; docs/memory/patterns.md (PAT-S81-002, l.759) ; .ai-env/context-packs/pit-backend.md (l.958 `new SecurityConfig(` #831, l.966 RTK/mesures — PAT-S81-002 absent du pack, lu dans patterns.md) ; docs/memory/sprints/sprint-81/issue-500-done.md (l.9 et l.26, dump d'en-têtes du 429) ; docs/adr/ADR-010-preference-de-theme-du-compte.md (§ 7, l.131-176)

STATUS: COMPLETED
