# Sprint 88 — corrections post-revue (cycle 1, arbitrage intégré)

## Résumé

Commits sur `sprint/88`, non poussés :
- `e940ac8` :white_check_mark: test(e2e) — points 3 et 4
- `d7b2328` :memo: docs(readme) — point 7
- `dcb222d` :lock: fix(rate-limit) — points 5 et 6
- `46afa05` :bug: fix(e2e) — point 1 (arbitrage)
- `cae1f77` :white_check_mark: test(e2e) — point 2, intègre `6e2de32`

Branche locale `wip/s88-budget-loops` : intégrée par `cherry-pick -n` (pas de merge), puis supprimée (`git branch -D`, rien de distant).

1. **FAIT** — `frontend/e2e/auth.setup.ts` et `frontend/e2e/support/register-retry.ts` (nouveau).
   - `submitRegister` : un clic et le statut de SA réponse (`waitForResponse` 10 s ; `null` si aucune réponse).
   - `classifyRegisterResponse` : 2xx → `created`, 409 → `exists` (succès idempotent), 429 → `throttled`, autre 4xx → `refused`, 5xx ou `null` → `retry`.
   - La boucle (3 soumissions au plus) ne ré-émet QUE sur `retry`, après un backoff de 5 s et `ensureRegisterForm(recover)`.
   - 429 et 4xx : échec immédiat, avec la grille 429/403/400/409 et les statuts instrumentés (`watchRegisterResponses`).
   - Page lente : `reachLoginForm` attend le formulaire de login 20 s, puis navigue vers `/fr/login`. Jamais de ré-inscription.
   - `setup.describe.configure({ retries: 0 })` : voir `## Arbitrage` (condition du budget).
   - `PROVISION_TIMEOUT_MS` passe de 180 à 210 s, pire cas recalculé ~183 s (commentaire).
   - Commentaires faux corrigés : `application-e2e.properties:36-43` (« 1 register par compte… prouvé »), en-tête d'`auth.setup.ts`, en-tête du Vitest.
   - Inchangés car toujours vrais avec les chiffres finaux (12/20, marge 10) : `application-e2e.properties` l.47 et 56-59, `playwright.config.ts:173`.
2. **FAIT** — `frontend/src/__tests__/e2e-rate-limit-budget.test.ts` (`cae1f77`).
   - Règle générale de `6e2de32` : émission dans une boucle = × borne lisible (littéral ou `const` de module, `for…of` sur tableau littéral, boucles imbriquées multipliées) ; borne illisible = échec explicite `fichier:ligne`.
   - Seule exception : une boucle annotée `// rate-limit-budget: retry-on-request-failure` compte 1, **sous contrat vérifié** : `for` à borne lisible ; condition `<issue> === 'retry'` ; `<issue>` assignée une seule fois, et uniquement par `classifyRegisterResponse` ; aucun try/catch dans la boucle.
   - Le dépôt ne contient qu'une boucle annotée (`auth.setup.ts`, ancré) ; la table de statuts est testée.
   - Le setup est multiplié par (1 + ses retries Playwright), lus dans `auth.setup.ts`.
   - 8 cas synthétiques de plus : boucles ×borne, borne illisible, boucle muette, boucle annotée conforme = 1 et la même non annotée = 3, rejet d'une page lente en try/catch, rejet d'une issue non classifiée, rejet d'une boucle annotée sans borne.
3. **FAIT** — `readRunCommands`/`readCiPasses` lisent `run: |` et `run: >`, avec un cas synthétique (`e940ac8`).
4. **FAIT** — `rate-limit-armed.proof.ts` : `test.describe.configure({ retries: 0 })` avec le pourquoi, et l'assertion « 429 à la 21e » devient inconditionnelle (`e940ac8`).
5. **FAIT** — `ProfileSafetyGuard.checkRateLimitCeilingRaisedInProduction` : en prod effective, un plafond au-dessus de son défaut refuse le boot (propriété, valeur, défaut dans le message). Vide = défaut ; hors prod inchangé. Défauts et noms de propriétés publics dans `RateLimitingFilter` (`dcb222d`).
6. **FAIT** — `RateLimitTunableCeilingTest`, unitaire, sans contexte Spring : 0 et négatif refusés, 1 = plancher, absent = 5/10/5, 30/30/15 hors prod appliqués. S'y ajoutent 8 cas #547 dans `ProfileSafetyGuardTest` (`dcb222d`).
7. **FAIT** — README `:260-265` : `down -v` supprime tous les volumes nommés du projet Compose (base, avatars, volumes e2e), jamais une base du PostgreSQL de la machine. Les exports ne sont pas cités : ils ne sont dans aucun volume (`d7b2328`).

## Arbitrage

Rendu le 2026-09-14 : **retry seulement sur échec**, aucun plafond relevé.

- Forme retenue pour le compteur : **annotation explicite sous contrat**, plutôt qu'un retry encapsulé dans un helper.
  - Un helper qui reçoit l'émission en callback (`withRetry(() => click())`) serait compté 1 par un angle mort du compteur, pour n'importe quelle raison de retenter, et en silence.
  - L'annotation rend l'exception visible. Le contrat interdit la seule forme qui réintroduirait le défaut (un try/catch autour d'une attente de page), et l'ancrage « une seule boucle annotée » fait rougir toute nouvelle exception.
- Condition ajoutée, nécessaire pour tenir ≤ 30 : **projet `setup` à `retries: 0`**.
  - Depuis que 409 vaut succès, un `provision` retenté par Playwright irait jusqu'au login : jusqu'à 3 register et 3 login par compte par passe.
  - Mesuré par le contrôle négatif : register et login passent à nominal 28 / pire cas 36, contre un plafond de 30.
  - Coût : un échec de setup non rattrapé par Playwright devient un rouge. Ce que ce retry rattrapait est déjà couvert dans l'essai (500 de rendu : 3 tentatives ; échec de requête register : 3 soumissions). Et avant l'arbitrage, un essai retenté après un 201 échouait de toute façon (409 → exception).
  - **À valider par le lead/dev** : cette condition dépasse la lettre du brief, sans toucher `playwright.config.ts`.

## Budget register/login recompté

Règle du Vitest, chiffres finaux lus sur le dépôt réel :

| Créneau | Passe 1 nominal (setup + specs) | Passe 2 | Nominal CI | Pire cas CI | Plafond e2e | Marge pire cas / nominal |
|---|---|---|---|---|---|---|
| register | 4 + 4 = 8 (pire 4 + 12 = 16) | 4 | 12 | **20** | 30 | **10** / 18 |
| login | 4 + 4 = 8 (pire 16) | 4 | 12 | **20** | 30 | **10** / 18 |

- Pire cas CI register = passe 1 [setup 4 + specs 4 × 3] + passe 2 [setup 4] = 20. Critère « une émission de plus » : 20 + 3 = 23 ≤ 30.
- Exclu par l'arbitrage : les ré-émissions sur échec de requête (5xx, aucune réponse), jusqu'à +2 par compte par passe.
- Lignes BUDGET inchangées (12/20/30), vérifiées vertes par le Vitest.

## Preuves

- Frontend, sur HEAD `cae1f77` :
  - `npx vitest run` : **1552 verts / 0 échec** ; budget : 26/26 ;
  - `npx tsc --noEmit` : 0 erreur ;
  - `npm run lint` : « No ESLint warnings or errors » ;
  - `npm run format:check` : « All matched files use Prettier code style! ».
- Backend : `./scripts/test-quiet.sh backend` : **597 tests, 0 échec**, sur `dcb222d`. Les commits suivants ne touchent que des commentaires de `application-e2e.properties` côté backend.
- Contrôles négatifs locaux (restaurés par `git checkout --` ; `git status` propre ensuite) :
  - ré-émission sur page lente remise dans la boucle d'`auth.setup.ts` (try/catch `login-form` 8 s → `classifyRegisterResponse(null)`) ⇒ Vitest ROUGE : « auth.setup.ts:175 — boucle annotée … HORS CONTRAT : try/catch interdit dans la boucle » ;
  - `setup.describe.configure({ retries: 0 })` retiré ⇒ ROUGE : « Créneau register : nominal CI 28, pire cas CI 36, plafond e2e 30 », idem login (4 échecs) ;
  - cycle précédent : `< 1` → `< 0` (1 rouge), check du guard retiré (3 rouges), détection boucles/blocs `run:` désactivée (3 rouges).
- E2E sur pile locale jetable, filtre ARMÉ :
  - Postgres `s88-rf-e2e-db` :5436 ; jar HEAD `-DskipTests` ; `env -u RATE_LIMIT_ENABLED SPRING_PROFILES_ACTIVE=dev,e2e APP_CORS_ALLOWED_ORIGINS=http://localhost:3100` sur :8086.
  - Log backend : 3 × `OVERRIDDEN` (30/30/15), 0 × `DISABLED`.
  - Proxy de comptage :8087 ; `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8087 next build` puis `next start -p 3100`.
  - Oracles : `/api/auth/me` 401, `/fr/login` 200, test-support 404.
  - Premier essai raté par ma recette (`NEXT_PUBLIC_API_URL` absent au build ⇒ aucun POST parti) : la version d'avant correction d'`auth.setup.ts` échoue à l'identique, 0 POST ⇒ environnement, pas code. Rebuild correct ensuite.
  - `playwright test --ignore-snapshots --project=setup` ⇒ **5 passed** : register 4 × 201, login 4 × 200, 0 ré-émission.
  - `--project=chromium golden-path forgot-password reset-password-failures auth-guard` (setup inclus) ⇒ **29 passed / 0 failed / 0 flaky (6,0 s)**, un seul bloc « Running 29 tests using 2 workers ».
  - Proxy, cumul des 2 runs : register **12 × 201** (0 × 409, 0 × 429, 0 × 5xx) ; login 11 × 200 + 1 × 401 attendu ; forgot 3 × 200 ; reset 3 × 200 + 1 × 400 attendu ; **0 × 429**.
  - Mesuré = statique : register 12, login 12 pour deux passes setup.
  - Chemin 409 non exercé en E2E (le global-setup régénère les identités) ; couvert par la table unitaire seulement.
- Démontage : `next start`, backend, proxy arrêtés ; `docker rm -f s88-rf-e2e-db` ; ports 3100/8086/8087/5436 libres.
- `bash .ai-env/tools/gen-pit-packs.sh --check` : « OK : packs à jour ».
- Staging par chemins littéraux. Aucun PNG, `e2e/.auth`, `test-results/` commité.

## Signaux mémoire

[MEMORY:pitfall] Context: S88, budget rate-limit E2E : la boucle de soumission d'`auth.setup.ts` ré-inscrivait sur page lente (pire cas register 36 > plafond 30) et le compteur AST comptait 1 une émission en boucle. Solution: compteur × borne (borne illisible = échec) ; setup ré-émis seulement sur échec de requête (classifyRegisterResponse), boucle annotée sous contrat vérifié. Prevention: un retry de fixture qui émet vers un créneau throttlé ne retente que sur échec de la REQUÊTE, jamais sur une attente d'UI.
[MEMORY:pitfall] Context: rendre un 409 « succès idempotent » dans un provisioning rend les retries du runner productifs, et ils ré-émettent register ET login. Solution: `setup.describe.configure({ retries: 0 })`, lu par le Vitest (sans lui : 28/36 contre 30). Prevention: toute modification d'idempotence d'un setup reste liée au recompte des retries du projet.
[MEMORY:pattern] Problem: exempter une boucle de ré-émission légitime d'un compteur statique sans ouvrir un angle mort. Solution: annotation explicite + contrat vérifié par AST (borne lisible, condition `=== 'retry'`, issue assignée uniquement par un classificateur testé, aucun try/catch) + ancrage « une seule boucle annotée dans le dépôt ». Anti-pattern: retry encapsulé dans un helper à callback, compté 1 par l'angle mort.
[MEMORY:pitfall] Context: pile E2E locale `next build` + `next start` : sans `NEXT_PUBLIC_API_URL=/api` AU BUILD, aucun POST ne part (le client appelle une base indéfinie) alors que les oracles répondent 401/200 ; le setup affiche « AUCUNE réponse POST observée ». Solution: rebuild avec la variable. Prevention: A/B avec la version précédente de la fixture avant d'accuser le code ; la variable est dans la recette S87, elle manquait au briefing.
[MEMORY:pitfall] Context: le hook `block-destructive` inspecte toute la ligne Bash, y compris un message de commit en heredoc qui cite la commande Compose de suppression de volumes. Solution: `git commit -F <fichier>`. Prevention: message qui cite une commande destructive ⇒ `-F`.
[MEMORY:pitfall] Context: RTK réécrit `npx next start` par son filtre de build (log « Errors: 1 », exit 1, vraie erreur invisible). Solution: `./node_modules/.bin/next start` ou `rtk proxy`. Prevention: tout serveur long sous RTK passe par `rtk proxy` ou le binaire direct.
[MEMORY:decision] Context: revue S88, plafonds rate-limit réglables sans borne haute en prod. Decision: `ProfileSafetyGuard` refuse le boot en prod effective si une valeur dépasse son défaut ; vide = défaut ; hors prod inchangé. Why: même modèle que #216 ; un plafond relevé en prod coupe le throttle sans échec visible.
[MEMORY:decision] Context: arbitrage dev 2026-09-14, budget register E2E. Decision: register du setup ré-émis seulement sur 5xx ou absence de réponse ; 201/409 = succès, 429/4xx = échec immédiat ; boucle annotée exemptée sous contrat ; projet `setup` sans retry Playwright. Why: le pire cas register revient à 20 ≤ 30 sans relever de plafond, et un 429 n'est plus jamais masqué par un retry.

## Recommandations suite

RECOMMAND_LEAD_VALIDATION: oui — faire valider par le dev la condition `retries: 0` du projet `setup`, ajoutée pour tenir ≤ 30 (voir `## Arbitrage`).
RECOMMAND_REVIEWER: oui — cycle 2 sur `e940ac8`, `d7b2328`, `dcb222d`, `46afa05`, `cae1f77` ; rappel RTK : `rtk proxy git diff`.
RECOMMAND_LEAD_CI: oui — 3 runs sur la PR de sprint : 0 × 429 dans `backend.log`, `[rate-limit-armed]` passé, aucun « did not run », `[setup]` sans « nouvelle soumission ».
RECOMMAND_SECURITY_EXPERT: non — le point 5 applique sa mitigation, contrôle négatif rouge.
RECOMMAND_TEST_RUNNER: non — suites backend/frontend et E2E ciblée jouées ici.
RECOMMAND_DB_EXPERT: non — aucune donnée ni migration.
RECOMMAND_DOCS: oui — la recette de pile locale du briefing doit citer `NEXT_PUBLIC_API_URL=/api` au build.

## Cycle 2

Revue cycle 2 : 0 CRITIQUE / 0 MAJEUR / 5 MINEUR. Arbitrage : seuls les n°1, 3 et 4 sont corrigés.

Commits, non poussés :
- `e5c2f4b` :bug: fix(e2e) — n°1 et n°3
- `30ecdc8` :lock: fix(rate-limit) — n°4

### n°1 — 201 tardif (`frontend/e2e/auth.setup.ts`, `frontend/e2e/support/register-retry.ts`)
- `register-retry.ts:45` `acceptedRegisterStatus(observed, url, postSent)` (fonction pure). Renvoie le dernier 2xx/409 observé ; sinon `201` si la page est sur `/login` après un POST parti ; sinon `null`.
  - Pourquoi une fonction pure : testable par le Vitest sans Playwright.
- `auth.setup.ts:114` `submitRegister(page, observed)` : faute de réponse dans le délai, relit ce qui a été observé avant de conclure `null`. Pourquoi : un 201 arrivé après les 10 s est enregistré par l'écouteur de la page.
- `auth.setup.ts:131` `attemptRegister` : une ré-émission relit l'acquis AVANT et APRÈS le backoff. Si 201/409 est vu, ou si la page est déjà sur le login, la fonction renvoie ce statut, sans ré-émettre et sans `ensureRegisterForm`.
  - Pourquoi : c'est exactement le scénario de la revue (setup rouge au mauvais motif, jeton gaspillé).
- `auth.setup.ts:64` `REGISTER_CLICK_TIMEOUT_MS = 5_000`, passé au `click` (l.119). Pourquoi 5 s < 10 s (délai de réponse) : quand `Promise.all` rend la main, le clic est résolu ou abandonné, donc aucun POST ne part après coup.
- Boucle (l.222) : le corps n'a plus qu'un `console.warn` et `outcome = classifyRegisterResponse(await attemptRegister(...))`. Le contrat de la boucle annotée tient : borne lisible, `=== 'retry'`, une seule assignation par le classificateur, aucun try/catch (les try/catch vivent dans les fonctions appelées).
  - `setupEmissionsPerAccount('register')` reste 1 : `attemptRegister` émet via `submitRegister`.
- Test ajouté : `e2e-rate-limit-budget.test.ts:702`.
  - 201 ou 409 déjà vu sans réponse observée → `created`/`exists` ;
  - page sur le login après un POST → `created` ;
  - rien d'acquis, ou 5xx seulement → `null` ;
  - login sans POST → `null` ;
  - 429/403 jamais succès.
- Contrôle négatif local : `acceptedRegisterStatus` neutralisé (toujours `null`) ⇒ ce test ROUGE (1 échec / 26 verts). Fichier restauré depuis une copie, `cmp` identique.

### n°3 — pire cas honnête (commentaires seulement)
- `backend/src/main/resources/application-e2e.properties:58-66`, sous les lignes BUDGET :
  - `pire-cas-ci=20` exclut les ré-émissions sur 5xx ou absence de réponse, qui consomment un jeton ;
  - borne en les comptant : 3 soumissions × 4 comptes × 2 passes = 24, + 12 des specs = **36 > 30** ;
  - un backend instable en 5xx fait rougir le job, et un 429 register y est un symptôme : ne pas relever le plafond ;
  - login non concerné (hors boucle), borne 20.
- Jumeaux : `frontend/playwright.config.ts:175-177` et l'en-tête de `frontend/e2e/auth.setup.ts:26-29`.
- Le Vitest n'écrit pas le 20 en dur (il lit les lignes BUDGET) : ni compteur ni plafond modifié. Lignes BUDGET inchangées.

### n°4 — parser comme Spring (`backend/.../config/ProfileSafetyGuard.java`)
- `:304-317` `readIntegerOrNull` : `NumberUtils.parseNumber(raw, Integer.class)`, même chemin que le binding `@Value Integer`, qui décode `0x` et `#`.
  - Blanche ou irrésoluble → `null` = défaut.
  - Illisible → `IllegalStateException` « ARRÊT FAIL-FAST (#547) : 'prop=valeur' n'est pas un entier lisible… ». Le message contient propriété et valeur (un plafond, rien de sensible).
  - Appelée seulement en prod effective : hors prod, aucun changement.
- Javadoc du check (`:268-278`) et de la méthode corrigées. La phrase fausse « non numérique refusé plus tard par le filtre » est retirée.
- `ProfileSafetyGuardTest.java:389+`, 6 cas :
  - `login=0x3E8` → refus, message `=1000` ;
  - `register=#6` → refus, `=6`, défaut 5 ;
  - `reset-password=#A` → refus, `=10`, défaut 5 ;
  - `login=douze` → refus (« n'est pas un entier lisible ») ;
  - `login=0xA` (= 10, défaut) → accepté ;
  - profil `test` + `douze` → accepté.
  - Pour `#A`, le brief rappelait que 10 = défaut login : je l'ai donc testé sur reset-password (défaut 5), comme demandé.
- Contrôle négatif local : `Integer.valueOf(raw)` remis ⇒ **4 échecs**, les 4 cas hexa (`0x3E8`, `#6`, `#A` refus attendus ; `0xA` accepté attendu). Restauré ensuite.

### n°2 et n°5
- n°2 (contrat de boucle aveugle aux fonctions appelées, `annotatedFiles` compte des fichiers) : **différé, follow-up**. Non touché.
- n°5 (« vide = défaut » non testé via la conversion réelle `@Value`) : **différé, follow-up**. Non touché.

### Preuves cycle 2
- `./scripts/test-quiet.sh backend` : **603 tests, 0 échec, BUILD SUCCESS**. `ProfileSafetyGuardTest` 56/56.
- Frontend : `npx vitest run` **1553 verts / 0 échec** (budget 27/27) ; `npx tsc --noEmit` 0 erreur ; `npm run lint` OK ; `npm run format:check` OK.
- `bash .ai-env/tools/gen-pit-packs.sh --check` : OK.
- E2E, pile jetable, filtre ARMÉ :
  - Postgres `s88-c2-e2e-db` :5436 ; jar de HEAD ; backend `dev,e2e` sans `RATE_LIMIT_ENABLED` sur :8086 ;
  - log backend : 3 × OVERRIDDEN, 0 × DISABLED ;
  - proxy de comptage :8087 ; `NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8087 next build` puis `next start -p 3100` ;
  - oracles : `/api/auth/me` 401, `/fr/login` 200, test-support 404.
  - `--project=setup` ⇒ **5 passed**. Register **4 × 201**, login 4 × 200, aucune « tentative 2/3 ».
  - `--project=chromium golden-path.spec.ts` (setup inclus) ⇒ **6 passed** (1 bloc, 2 workers). Register **5 × 201** (4 setup + 1 golden-path), login 5 × 200 ; 0 × 409, 0 × 429, 0 × 5xx.
  - Le chemin « 201 tardif » n'est pas provoqué en E2E (aucune latence injectée) : il est couvert par le test unitaire et son contrôle négatif.
- Démontage : `next start`, backend, proxy arrêtés ; conteneur supprimé ; ports 3100/8086/8087/5436 libres. `git status` : seuls les fichiers `docs/memory` du lead.

[MEMORY:pitfall] Context: S88 cycle 2 — un garde de config qui parse avec `Integer.valueOf` alors que le binding Spring (`NumberUtils.parseNumber`) décode `0x`/`#` laisse passer `0x3E8` (= 1000) en prod. Solution: même chemin de conversion que le binding, illisible = refus en prod. Prevention: un garde qui valide une property la convertit exactement comme son consommateur.
[MEMORY:pitfall] Context: S88 cycle 2 — « aucune réponse dans le délai » traité comme échec de requête ré-émettait après un 201 tardif, et un `click` sans timeout pouvait émettre après la fin de `Promise.all`. Solution: relire les statuts observés et l'URL avant toute ré-émission ; timeout du clic < délai de réponse. Prevention: un retry sur timeout vérifie d'abord l'effet déjà produit.

STATUS: COMPLETED
