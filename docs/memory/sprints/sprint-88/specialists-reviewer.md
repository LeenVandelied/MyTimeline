# Sprint 88 — reviewer batch (cycle 1)

> Spawné par le lead (Phase 7), 2026-09-14. Lecture seule, diff `origin/dev...HEAD` (7 commits, 29 fichiers).

**VERDICT cycle 1 : 0 CRITIQUE / 0 MAJEUR / 6 MINEUR**

## MINEUR
1. `frontend/e2e/auth.setup.ts:118` — boucle interne `REGISTER_RETRIES=3` (attente `login-form` 8 s, backoff 20 s) peut ré-émettre le register d'un même compte dans la même fenêtre ; « 1 register par compte par passe, prouvé » (`application-e2e.properties:38`) est faux ; pire cas réel register 28/30.
2. `frontend/src/__tests__/e2e-rate-limit-budget.test.ts:411` — émissions comptées par occurrence textuelle : un clic dans une boucle compte 1 → le test reste vert malgré le point 1.
3. `frontend/src/__tests__/e2e-rate-limit-budget.test.ts:277` — `readCiPasses` ignore les blocs `run: |` multi-lignes : une 3e passe serait invisible.
4. `frontend/e2e/rate-limit-armed.proof.ts:76` — l'assertion « 429 à la 21e » ne vaut qu'au 1er essai ; avec `retries: 2` une pollution du créneau `refresh` passerait en « flaky », job vert.
5. `backend/.../security/RateLimitingFilter.java:372` — plafond relevé en prod = simple `log.warn` ; `APP_RATE_LIMIT_LOGIN_PER_MINUTE=1000` affaiblit l'anti-bruteforce sans bloquer le boot (même trou pour register depuis #475). Recoupe le MINEUR 1 de `specialists-security.md`.
6. `README.md:259` — `docker compose down -v` efface TOUS les volumes du projet (avatars, exports), pas seulement la base.

## OK
- #568 : propriété effective, aucune réactivation, 17 classes en profil `test`, pas d'upload `surefire-reports`.
- #545 : cause exacte vs V4/V7/V9, diagnostic en lecture seule, remède non destructif d'abord.
- #547 : défauts 10/5/5 uniques, 0/négatif refusés au boot, propriétés seulement en e2e, throttle par token intact, XFF non honoré, IT aux deux bords ; preuve sans collision (`refresh` appelé côté app par un timer de 6 h), dépendance en échec = job déjà rouge, `.proof.ts` hors `testMatch` par défaut et hors passe 2 ; diff `ci.yml` limité au job `e2e`.

## Non vérifié par le reviewer
Aucun test exécuté ; comportement Playwright sur dépendance « flaky » ; en-tête XFF réellement transmis par le proxy Next.

## Suite donnée par le lead
Les 6 MINEUR + le MINEUR 2 sécurité (tests 0/négatif/vide) absorbés dans un cycle de correction unique (1 fullstack-dev), puis cycle 2 de revue sur les seuls commits correctifs.

---

# Cycle 2 (commits correctifs e940ac8, d7b2328, dcb222d, 46afa05, cae1f77) — 2026-09-14

**VERDICT CYCLE 2 : 0 CRITIQUE / 0 MAJEUR / 5 MINEUR** · MINEUR cycle 1 fermés : 6/7 (sécurité MINEUR 2 : « vide » non testé via le vrai binding)

1. `frontend/e2e/auth.setup.ts:98-106` — `catch` → `null` : un 201 tardif (> timeout) est traité comme échec de requête ; la page est déjà sur `/fr/login`, `ensureRegisterForm` échoue 3 fois, setup rouge au mauvais motif ; `click` sans timeout peut émettre un POST non compté.
2. `frontend/src/__tests__/e2e-rate-limit-budget.test.ts:269` — le contrat de la boucle annotée ne regarde que le corps de boucle : une attente glissée dans `submitRegister` ré-émet après 201 sans rougir ; `annotatedFiles` compte des fichiers, pas des boucles.
3. `backend/src/main/resources/application-e2e.properties:52` — `pire-cas-ci=20` exclut les ré-émissions sur 5xx/timeout (qui consomment un jeton) ; backend instable → 36/30.
4. `backend/.../config/ProfileSafetyGuard.java:301` — `Integer.valueOf` refuse l'hexa → `null` → garde passe ; le binding Spring (`NumberUtils.parseNumber`) décode `0x3E8` = 1000 en prod.
5. `backend/src/test/.../RateLimitTunableCeilingTest.java` — « vide = défaut » testé en passant `null`, jamais via la conversion réelle `""` → `null` du `@Value`.

OK : table de statuts complète, login émis une fois, aucun `--retries` en CI, `retries: 0` preuve, multi-lignes, × borne, `isProductionEffective` réutilisé, chiffres cohérents entre properties / playwright.config / ci.yml / Vitest.

## Suite donnée par le lead (cycle 2)
Arbitrage dev 2026-09-14 : n°1, 3, 4 corrigés dans une dernière passe (relue par le lead, pas de 3e cycle reviewer) ; n°2 (contrat de boucle annotée contournable via helper) et n°5 (vide via vrai binding) → follow-ups au triage `/sprint end`.
