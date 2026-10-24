# Issue #832 — Budget de connexions E2E à 26/30 au pire cas CI

## Commits
- `4be8ce20` :white_check_mark: test(e2e): session par storageState contrôlée pour les specs qui ne testent pas la connexion (#832) — auteur de Laforcade Loïc, vérifié par `git log --oneline -3` juste après le commit (parent `e916b5ad`).

## Résumé
Objectif : décharger le budget `login` E2E (14 nominal / 26 pire cas CI / plafond 30) par un helper de session `storageState` (arbitrage dev du 2026-09-24, plafond inchangé).

**Prémisse du plan RÉFUTÉE (mesurée).** `registerAndLogin` avait **0 appelant** (`/usr/bin/grep -rn registerAndLogin frontend/e2e` → seulement `support/auth.ts` (définition) et un commentaire historique de `support/accounts.ts`). Le plan disait « appelé par de nombreuses specs ». Et **76 specs utilisent déjà `test.use({ storageState: X.storageState })`** : le motif storageState existait, sans nom ni garde. Les émetteurs `login` réels (recompte AST du Vitest, confirmé par grep `login-submit|auth/login`) :
- setup : 4 comptes × 1 login × 2 passes = 8 (non multiplié : `retries: 0`) ;
- specs (passe 1) : golden-path 1, forgot-password 1, reset-password-failures 2, sprint-111-theme-account-preference 2 = 6 → pire cas 18.
Les 6 émissions de specs TESTENT le formulaire / le mot de passe / l'arbitrage à la connexion explicite (hors migration selon le briefing). **Aucune connexion évitable n'existait → budget avant = après : login 14/26/30, register 13/23/30** (lignes BUDGET inchangées, Vitest vert). Le gain est préventif : empêcher la prochaine spec de payer 3 jetons pour rien.

Livré :
- `frontend/e2e/support/session.ts` (nouveau) : `sessionState(account)` = fixture `storageState` (fonction, évaluée au DÉMARRAGE du test, pas à l'import → `--list` sûr) qui appelle `assertUsableSession` : lève avec la cause nommée si le fichier est ABSENT (`--no-deps`, setup KO), SANS cookie `jwt`, ou PÉRIMÉ (`expires` dépassé, `COOKIE_MAX_AGE` backend = 2 jours). JSDoc FR : pourquoi (budget), quand NE PAS l'utiliser (spec qui teste la connexion, compte neuf : aucun moyen d'ouvrir une session sans `POST /api/auth/login`, register n'en ouvre pas — vérifié dans `AuthController`), quel compte (SHARED/PROD/PWD/DEL, identités partagées entre workers), et ⚠ logout sous session partagée = révocation du jti en base (BR-AUT-010), invisible au garde.
- `frontend/e2e/support/auth.ts` : `registerAndLogin` supprimé (0 appelant, piège à jetons) ; JSDoc d'en-tête renvoie vers `sessionState`.
- `frontend/e2e/settings-navigation.spec.ts` : migré en exemple (`test.use({ storageState: sessionState(SHARED) })`), lecture seule sur SHARED.
- `frontend/src/__tests__/e2e-rate-limit-budget.test.ts` : ancre `register.helpers == ['registerOnly']` ; NOUVELLE ancre `countSpecs('login').helpers == []` (un helper de support qui se reconnecte par formulaire fait rougir, message qui pointe `sessionState`) ; bloc `#832` de 5 tests sur storageState synthétiques (valide, cookie de session `-1`, absent, sans jwt, périmé, et la fixture ne remet pas le chemin si le contrôle lève).
- `backend/src/main/resources/application-e2e.properties` : COMMENTAIRES seulement (bloc login : décision S112, recompte inchangé, levier restant). Propriétés `app.rate-limit.*` intactes (grep : 30/30/15).

Levier réel identifié, non traité (exige `ci.yml`, modification de pipeline CI à faire confirmer par le dev) : la passe 2 CI (`auth.setup.ts auth-signature.spec.ts`) re-provisionne les 4 comptes alors qu'`auth-signature.spec.ts` n'utilise que `SHARED` (lu : seul import de compte, l. 5/105/329) → −3 login et −3 register par run : login 11/23, register 10/20.

fichiers de contexte lus: docs/memory/sprints/sprint-112/briefing-832.md, frontend/e2e/support/auth.ts, frontend/e2e/support/accounts.ts, frontend/e2e/support/fixtures.ts, frontend/e2e/auth.setup.ts, frontend/e2e/auth-signature.spec.ts (extraits), frontend/e2e/sprint-111-theme-account-preference.spec.ts, frontend/e2e/settings-navigation.spec.ts, frontend/src/__tests__/e2e-rate-limit-budget.test.ts (en-tête, computeBudget, assertions dépôt, countSpecs), backend/src/main/resources/application-e2e.properties, backend/.../RateLimitingFilter.java (clés de créneaux), backend/.../AuthController.java (register/refresh, COOKIE_MAX_AGE), .github/workflows/ci.yml (passes, grep), docs/memory/patterns.md (l. 187, grep)

## Tests
- `npx vitest run src/__tests__/e2e-rate-limit-budget.test.ts` : avant 37/37 ; après **42/42** (37 + 5 nouveaux).
- Contrôles négatifs (mutations temporaires, restaurées, vérifiées par re-run vert) : garde d'expiration neutralisée → le test « PÉRIMÉ » rougit (1 failed / 41) ; helper `loginAgain` (clic `login-submit`) ajouté dans `support/auth.ts` → l'ancre rougit (`expected [ 'loginAgain' ] to deeply equal []`).
- `npx tsc --noEmit -p .` : 0 erreur ; `npx next lint --file` (session.ts, auth.ts, settings-navigation, budget test) : 0 ; `rtk proxy npx prettier --check` sur les 4 fichiers TS : OK.
- E2E (oracles `:3100` 401/200 avant et après) : `settings-navigation.spec.ts` run 1 **OK** (6 passed : 5 setup + 1 cible), run 2 après pause 20 s **OK** (6 passed). Contrôle négatif E2E : `shared.json` déplacé puis restauré, `--no-deps --retries=0` → 1 failed avec le message `ABSENT` du garde (prouve que Playwright exécute bien la fixture-fonction). Aucun SETUP-KO.
- NON vérifié : suite E2E complète (lead) ; specs `registerOnly` (forgot-password, reset-password-failures, sprint-111-theme-account-preference) non rejouées — `registerOnly` n'a pas changé, seul `registerAndLogin` a été retiré de `auth.ts` ; CI Linux ; backend non relancé (commentaires seuls).

## Critères d'acceptation
- [x] Décision prise et documentée : helper `storageState` (`sessionState`), plafond maintenu — JSDoc de `session.ts`, commentaire du bloc login de `application-e2e.properties`, signal `[MEMORY:decision]` ci-dessous.
- [x] (N/A) Plafond relevé : non, par arbitrage ; propriété et `RateLimitE2eProfileIntegrationTest` intacts.
- [x] Helper ajouté + au moins une spec existante qui n'a pas besoin du formulaire l'utilise : `settings-navigation.spec.ts` (2 runs verts). Réserve : aucune spec ne consommait de connexion évitable, le gain budgétaire est nul aujourd'hui (préventif).
- [x] `e2e-rate-limit-budget.test.ts` vert : 42/42.

## Signaux mémoire
- [MEMORY:decision] Context: #832, budget login E2E 14/26/30 (marge 4 au pire cas). Decision: plafond `login-per-minute=30` maintenu ; toute spec authentifiée qui ne teste pas la connexion prend sa session par `e2e/support/session.ts#sessionState` (fixture storageState contrôlée : absent / sans jwt / périmé) ; `registerAndLogin` supprimé ; le Vitest budget interdit tout helper de support qui émet un login. Why: relever le plafond rachète de la marge sans rien protéger ; aucune session ne s'obtient sans `POST /api/auth/login`, donc la seule économie possible est de ne pas se reconnecter. Recompte S112 : les 6 connexions de specs testent toutes le formulaire → chiffres inchangés ; prochain levier = passe 2 CI SHARED-only (−3/−3).
- [MEMORY:pitfall] Context: plan du lead et énoncé #832 supposaient `registerAndLogin` « appelé par de nombreuses specs ». Solution: grep absolu → 0 appelant ; 76 specs déjà en storageState. Prevention: avant de planifier une migration « de X vers Y », compter les appelants de X (cousin de « Prérequis d'issue : grepper les appelants » et des énoncés périmés S74).
- [MEMORY:pattern] Problem: un `storageState` absent/périmé fait démarrer le test anonyme et l'échec se lit « dashboard introuvable ». Solution: surcharger `storageState` par une fixture-FONCTION via `test.use({ storageState: async ({}, use) => { check; await use(path) } })` — contrôlée au démarrage du test, pas à l'import (le runner charge les specs avant le setup). Anti-pattern: valider le fichier au scope module (casse `--list` et la collecte).

## Recommandations suite
- RECOMMAND_FOLLOWUP: passe 2 CI ne provisionner que SHARED (seul compte d'`auth-signature.spec.ts`) — login 14/26→11/23, register 13/23→10/20 ; touche `ci.yml` (confirmation dev requise) + modèle par passe dans `e2e-rate-limit-budget.test.ts` [S | e2e/ci]
- RECOMMAND_FOLLOWUP: migrer progressivement les 75 autres `test.use({ storageState: X.storageState })` vers `sessionState(X)` (garde de démarrage), par lots avec rejeu [S | e2e]
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touchés.
- Pas de RECOMMAND_SECURITY : plafonds de rate-limit inchangés, aucun code applicatif modifié.
- Pas de RECOMMAND_UI_DESIGN : aucune UI touchée.
- Pas de RECOMMAND_TEST_RUNNER : suite complète prévue par le lead ; spec migrée rejouée 2× verte + contrôle négatif.

STATUS: COMPLETED
