# Issue #547 — Ré-armer le filtre de rate-limit dans la stack E2E

## Résumé

Filtre de rate-limit **ré-armé** dans la stack E2E : `RATE_LIMIT_ENABLED=false` retiré du job CI `e2e`
et du service compose `backend-e2e`. Implémentation de l'**option D** arbitrée par le dev :
`login` et `reset-password` (seau par IP) deviennent réglables par profil sur le modèle de
`register` (#475). Valeurs e2e : login 30, reset-password 15, register 20 → 30. Défauts prod inchangés
(10 / 5 / 5), assertés par IT. forgot-password et change-password restent au défaut, avec leurs
chiffres documentés.

Budget recompté **versionné** : `frontend/src/__tests__/e2e-rate-limit-budget.test.ts` remplace
`e2e-register-budget.test.ts`. Il compte 5 créneaux sur les **deux passes CI** lues dans `ci.yml`,
avec les retries lus dans `playwright.config.ts`, et une détection par AST TypeScript (les helpers
locaux de spec sont comptés par appel). Il rougit si un plafond e2e passe sous le pire cas : muté
et constaté rouge.

Preuve d'armement **versionnée** : `frontend/e2e/rate-limit-armed.proof.ts`, dans un projet Playwright
dédié `rate-limit-armed` qui dépend de `chromium` et `firefox`. Sur `refresh`, créneau consommé par
0 spec : 20×401 puis 429 via le proxy Next, et un XFF forgé est ignoré.

Commits (`sprint/88`, non poussés) :
- `33ea579` :sparkles: feat(rate-limit): plafonds login et reset-password réglables par profil, register e2e à 30 (#547) — 9 fichiers backend.
- `396c372` :white_check_mark: test(e2e): budget rate-limit recompté sur les deux passes CI + preuve d'armement (#547) — 12 fichiers frontend.
- `9e49b8f` :lock: ci(e2e): ré-armer le filtre de rate-limit dans la stack E2E (#547) — `ci.yml`, `docker-compose.yml`.

## Arbitrage

**Option D** retenue par le dev le 2026-09-13, après un premier passage `STATUS: PARTIAL` (4 créneaux
non réglables au-dessus de leur défaut dans le pire cas CI, seuil « > 3 » du briefing).
- Réglables par profil : `app.rate-limit.login-per-minute` (e2e 30), `app.rate-limit.reset-password-per-minute` (e2e 15, seau PAR IP ; le throttle PAR TOKEN #141 est inchangé), `app.rate-limit.register-per-minute` (e2e 20 → 30).
- Au défaut, sans propriété : forgot-password (nominal CI 3/5, pire cas 9/5) et change-password (2/5, 6/5). Le dépassement exige un double retry dans la minute d'un test déjà en échec : il le fait rougir au lieu de le laisser « flaky ». Justification écrite dans `application-e2e.properties` et verrouillée par le Vitest (rouge si une propriété apparaît pour ces créneaux ou si leur nominal dépasse le défaut).
- Prémisse de DEC-S79-002 (« register est le seul créneau qu'une suite martèle ») corrigée dans la javadoc de `RateLimitingFilter#limits`. La DEC elle-même est à rédiger par le lead.

## Fichiers de contexte lus

- `backend/.../security/RateLimitingFilter.java` — `DEFAULT_LIMITS` l.125-172, ctor l.323-350, `clientIp()` l.527-535, refill `intervally` l.501-511 (avant modif).
- `backend/src/main/resources/application-e2e.properties` — l.1-52 (avant réécriture).
- `backend/src/main/resources/application.properties` — l.86-104.
- `backend/.../config/ProfileSafetyGuard.java` — l.20-45, l.210-240 : ne bloque `enabled=false` qu'en prod effectif, n'exige rien du profil e2e.
- `backend/.../security/RegisterRateLimitE2eProfileIntegrationTest.java` (l.1-139), `RegisterRateLimitDefaultIntegrationTest.java` (l.1-71), `RateLimitingDisabledIntegrationTest.java` (l.1-49), `ResetPasswordTokenRateLimitIntegrationTest.java` (l.1-60), `RateLimitingAndHeadersIntegrationTest.java` (grep l.86-134).
- `.github/workflows/ci.yml` — l.240-330 (backend e2e), l.380-600 (build, oracles, passe 1 l.531, passe 2 l.571, upload) ; grep des `run:` Playwright : seulement l.531 et l.571. Passes en série, pas d'`if: always()`.
- `docker-compose.yml` — l.110-200.
- `frontend/playwright.config.ts` — l.1-364.
- `frontend/src/__tests__/e2e-register-budget.test.ts` — l.1-398.
- `frontend/e2e/auth.setup.ts` l.1-185 ; `support/auth.ts` l.1-166 ; `support/accounts.ts` l.1-125 ; `golden-path.spec.ts` l.60-140 ; `forgot-password.spec.ts` l.1-82 ; `reset-password-failures.spec.ts` l.1-183 ; `settings-security.spec.ts` l.1-98 ; `settings-account.spec.ts`, `settings-preferences.spec.ts` (entiers) ; `auth-signature.spec.ts` l.60-95 + grep ; `auth-guard.spec.ts` grep ; `support/seed-cleanup.ts` l.25-60 ; `support/timeline-lanes.ts` l.30-60 ; `sprint-73-model-vs-rendered.spec.ts` l.205-230.
- `frontend/src/services/apiClient.ts` l.55-200 (refresh périodique 6 h seulement) ; `exportService.ts` l.40-80 ; `userService.ts` l.25-40 ; `AvatarUpload.tsx` grep l.49-69 ; `vitest.config.mts` l.30-50 ; `tsconfig.json`.
- `docs/memory/sprints/sprint-79/issue-475-done.md` l.1-120 ; `docs/memory/decisions.md` DEC-S79-002 l.708-709.
- `.ai-env/context-packs/pit-frontend.md` et `pit-backend.md` — grep (`rate-limit|429|auth.setup|workers`, `RateLimiting|Bucket4j|SpringBootTest(properties`).
- `gh issue view 547` (corps complet), `gh issue view 320` (OPEN).

## Budget recompté

Règle (écrite dans `application-e2e.properties`, appliquée par le Vitest) :
- nominal CI = Σ passes [setup + specs] ;
- pire cas CI = Σ passes [setup + specs × (1 + retries 2)] ;
- setup non multiplié (prouvé : un `provision` retenté prend 409 et lève avant le login) ;
- total de passe = majorant du pic par minute.

| Créneau | Sources comptées | Passe 1 | Passe 2 | Nominal CI | Pire cas CI | Défaut | Plafond e2e | Marge nominal / pire cas |
|---|---|---|---|---|---|---|---|---|
| login | setup 4 · golden 1 · forgot 1 · reset-failures `submitLogin` ×2 | 8 | 4 | 12 | 20 | 10 | **30** | 18 / 10 |
| register | setup 4 · golden 1 · `registerOnly` ×3 | 8 | 4 | 12 | 20 | 5 | **30** (était 20) | 18 / 10 |
| reset-password (IP) | forgot 1 · reset-failures `submitResetPassword` ×3 | 4 | 0 | 4 | 12 | 5 | **15** | 11 / 3 |
| forgot-password | forgot 1 · reset-failures `requestResetToken` ×2 | 3 | 0 | 3 | 9 | 5 | défaut | 2 / −4 (arbitré) |
| change-password | settings-security ×2 | 2 | 0 | 2 | 6 | 5 | défaut | 3 / −1 (arbitré) |
| GET /api/export | settings-account 1 | 1 | 0 | 1 | 3 | 5 | défaut | 4 / 2 |
| PATCH /api/me | settings-profile 1 | 1 | 0 | 1 | 3 | 10 | défaut | 9 / 7 |
| POST /api/me/avatar | settings-profile 1 | 1 | 0 | 1 | 3 | 10 | défaut | 9 / 7 |
| refresh | 0 spec (créneau de la preuve) | 0 (+21 preuve) | 0 | 0 | 0 | 20 | défaut | — |
| POST /api/export | 0 | 0 | 0 | 0 | 0 | 5 | défaut | 5 |

Critères du Vitest pour les 3 réglables :
- pire cas ≤ plafond ;
- plafond − nominal ≥ 5 ;
- pire cas + 3 ≤ plafond (« une émission de spec de plus »). reset-password : 12 + 3 = 15 → la marge est exactement consommée, et une spec reset de plus rougit.

Les lignes `BUDGET` de `application-e2e.properties` sont comparées au recompte.

## Preuves

- Backend : `./scripts/test-quiet.sh backend` → **584 tests, 0 failure, 0 error, BUILD SUCCESS**. Surefire : `RateLimitE2eProfileIntegrationTest` 4/4, `RateLimitDefaultCeilingsIntegrationTest` 3/3, `RateLimitingDisabledIntegrationTest` 1/1. Aucun nouveau contexte Spring : mêmes annotations que les ex-classes register.
- Frontend :
  - `npx vitest run` → **127 fichiers / 1543 tests, 0 échec** ;
  - `npx tsc --noEmit` → exit 0 ;
  - `npm run lint` → « No ESLint warnings or errors » ;
  - `npm run format:check` → « All matched files use Prettier code style! » (après `prettier --write` des 2 nouveaux fichiers).
- **Garde du budget armée** : `app.rate-limit.login-per-minute` passé temporairement à 19 → Vitest ROUGE sur « login : le plafond e2e couvre le pire cas CI » (`nominal CI 12, pire cas CI 20, plafond e2e 19` / `passe 1 (suite complète) : setup 4 + specs 4` / `passe 2 (auth.setup.ts auth-signature.spec.ts) : setup 4 + specs 0`) et sur « les lignes BUDGET disent vrai » ; fichier restauré puis `cmp` identique.
- **E2E locale sur pile FRAÎCHE**, filtre armé, code de travail (commité ensuite sans modification) :
  - `docker run … s88-547-e2e-db` (Postgres neuf :5436) ; `./mvnw -q -DskipTests package` → jar contenant `register=30, login=30, reset-password=15`.
  - `env -u RATE_LIMIT_ENABLED SPRING_PROFILES_ACTIVE=dev,e2e … java -jar … --server.port=8086` → log : 3 × `rate limit OVERRIDDEN via app.rate-limit.{register,login,reset-password}-per-minute to 30/30/15`, 0 × `rate limiting DISABLED`.
  - Proxy de comptage :8087 → :8086 ; `next build` (`E2E_API_PROXY_TARGET=http://localhost:8087`) exit 0 ; `next start -p 3100`.
  - Oracles : `/api/auth/me` 401, `/fr/login` 200, test-support 404.
  - Passe 1 : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 playwright test --ignore-snapshots --retries=2` → `Running 385 tests using 2 workers` (1 seul bloc) → **374 passed / 1 failed / 1 flaky / 8 skipped / 1 did not run (2.6m)**.
    - failed = `sprint-77-theme-visual.spec.ts:620` (référence `-darwin.png` absente, attendu hors Linux, rien régénéré) ;
    - flaky = `sprint-84-palette.spec.ts:128` (`toBeFocused` sur une pastille, passé au retry ; aucune requête throttlée, aucun 429) ;
    - did not run = la preuve `rate-limit-armed` (dépendance `chromium` en échec à cause du rouge darwin — comportement documenté).
  - Passe 2 : `playwright test auth.setup.ts auth-signature.spec.ts --retries=2` → **5 passed / 8 skipped** (pas d'`AUTH_JWT_PUBLIC_KEY`).
  - Preuve seule : `playwright test --project=rate-limit-armed --no-deps` → **1 passed** (essai 0, donc 429 pile à la 21e).
  - Proxy de comptage (`slots-run2.jsonl`), **0 × 429 sur tous les créneaux sauf `refresh`** : login 12 (11×200, 1×401 attendu), register 12×201, reset 4 (3×200, 1×400 attendu), forgot 3×200, change-password 204+400, export/PATCH me/avatar 1×200 chacun, refresh **20×401 + 2×429** (21e requête + XFF forgé). Compte mesuré = recompte statique, créneau par créneau.
- Démontage : `next start`, backend, proxy arrêtés ; `docker rm -f s88-547-e2e-db` ; ports 3100/8086/8087/5436 libres.
- Staging : `git status --porcelain` après commits → seuls les `docs/memory/sprints/sprint-88/*` non suivis du lead. Aucun PNG, `e2e/.auth`, `test-results/`.
- NON FAIT : aucun push, aucune CI (3 runs verts consécutifs = lead, sur la PR de sprint) ; pile compose (`docker compose --profile e2e`) non jouée — seule la variable a été retirée ; `next dev` non joué.

## Couverture des AC

- AC1 budget login recompté depuis les sources — **OK** : `e2e-rate-limit-budget.test.ts` (login + register + reset + forgot + change-password, 2 passes CI, retries), confronté à une mesure réelle.
- AC2 plafond login e2e justifié — **OK** : 30 = 2,5 × nominal CI 12, marge 10 sur le pire cas 20 (`application-e2e.properties`, IT e2e 30 / défaut 10).
- AC3 retrait du flag ci.yml + compose — **OK** (`9e49b8f`).
- AC4 suite complète sans 429 imprévu — **OK en local** (0 × 429 hors preuve, rouge darwin et flaky sans rapport). **CI : non mesurée ici**, à la charge du lead (3 runs).
- AC5 décision + chiffres documentés — **OK côté code** (properties, javadoc du filtre, compose, ci.yml, playwright.config.ts) ; la DEC dans `decisions.md` est à rédiger par le lead depuis les signaux ci-dessous.

## Signaux mémoire

[MEMORY:decision] Context: #547, ré-armement du rate-limit E2E ; recompte login 12/20 et reset 4/12 contre des défauts 10/5. Decision: option D — login (e2e 30) et reset-password par IP (e2e 15) réglables, register e2e 20→30, forgot-password et change-password au défaut ; flag retiré de ci.yml et compose. Why: seuls ces créneaux débordent sans échec préalable ; forgot/change-password ne débordent qu'en double retry d'un test déjà rouge, et monter leurs plafonds achèterait du vert sur des tests instables.
[MEMORY:pitfall] Context: la prémisse de DEC-S79-002 (« register est le seul créneau qu'une suite martèle depuis une IP ») est fausse : derrière le proxy Next toute la suite compte sur une IP, et login dépasse son défaut en CI nominal. Solution: prémisse corrigée dans la javadoc de RateLimitingFilter#limits ; DEC-S79-002 à amender. Prevention: une prémisse « seul X » dans une DEC se vérifie en comptant TOUS les créneaux.
[MEMORY:pitfall] Context: le budget register de #475 annonçait 8 ; la CI en émet 12, car la passe 2 (`auth.setup.ts auth-signature.spec.ts`) re-provisionne contre le même backend, dont les seaux survivent entre passes. Solution: le Vitest lit les passes dans ci.yml. Prevention: un budget rate-limit E2E somme les passes CI qui rejouent setup.
[MEMORY:pitfall] Context: le compteur par regex de #475 comptait une seule fois une fonction LOCALE de spec émettrice appelée N fois (`submitLogin` ×2, `submitResetPassword` ×3 dans reset-password-failures). Solution: détection par AST TypeScript (`ts.createSourceFile`), fonctions résolues en point fixe, appels comptés. Prevention: un compteur d'émissions compte des APPELS, pas des occurrences de texte.
[MEMORY:pattern] Problem: vérifier qu'un budget rate-limit statique correspond au trafic réel. Solution: proxy HTTP de comptage (Node, ~40 lignes) intercalé via `E2E_API_PROXY_TARGET`, qui logge méthode+chemin+statut des créneaux throttlés, analysé sur une fenêtre glissante de 60 s ; S88 : mesuré = statique sur 10 créneaux, deux fois. Anti-pattern: conclure un budget depuis un grep seul ou depuis un run vert filtre désarmé.
[MEMORY:pattern] Problem: prouver qu'un filtre anti-abus est armé sur le chemin réseau réel sans polluer la suite. Solution: créneau consommé par 0 spec (vérifié par test statique), preuve dans un projet Playwright dédié qui dépend de tous les autres (`rate-limit-armed`, suffixe `.proof.ts` hors testMatch par défaut), assertion exacte à l'essai 0 et tolérante au retry. Anti-pattern: une spec qui vide un seau partagé en parallèle des autres.
[MEMORY:pitfall] Context: un projet Playwright avec `dependencies` ne tourne pas si une spec d'un projet dont il dépend échoue ; en local darwin, le rouge attendu de `sprint-77-theme-visual.spec.ts:620` saute donc la preuve d'armement (« 1 did not run »). Solution: la jouer seule avec `--project=rate-limit-armed --no-deps`. Prevention: lire « did not run » dans le résumé avant de conclure que la preuve est passée.

## Recommandations suite

Pas de RECOMMAND_TEST_RUNNER car les suites backend/Vitest/tsc/lint/format et une E2E complète filtre armé ont été jouées par l'agent, puis 3 runs CI verts consécutifs sur df2337e (lead).
RECOMMAND_LEAD_CI: oui — sur la PR de sprint, vérifier dans chaque run : 0 × 429 dans `backend.log`, la ligne `[rate-limit-armed]` passée, et l'absence de « did not run ».
RECOMMAND_LEAD_DEC: oui — rédiger la DEC #547 et amender la prémisse de DEC-S79-002 (signaux ci-dessus).
RECOMMAND_REVIEWER: oui — diff backend (filtre, 2 IT renommées) et frontend (Vitest AST, preuve, projet Playwright) ; rappel RTK : `rtk proxy git diff`.
RECOMMAND_SECURITY_EXPERT: non — plafonds e2e ≤ 3× défaut, profil jamais actif en prod, défauts prod assertés par IT, XFF toujours ignoré (vérifié en live).
Pas de RECOMMAND_DB_EXPERT car #547 ne touche ni données, ni schéma, ni migration.
RECOMMAND_DOCS: oui — les références historiques à `e2e-register-budget.test.ts` / `RegisterRateLimit*IntegrationTest` dans `docs/memory/**` (audits S79, done S79/S88) sont laissées telles quelles, hors périmètre de cet agent.

STATUS: COMPLETED
