# Issue #838 — Pas de bannière « erreur serveur » quand la sauvegarde du thème échoue

## Commits
- `23ebe9ce` :bug: fix(theme): plus de bannière « erreur serveur » quand la sauvegarde du thème échoue (#838). Auteur et message vérifiés avec `git log -1 --format='%h %an %s'`. 6 fichiers, uniquement les miens, ajoutés par chemin littéral.

## Résumé
- Ce que j'ai lu avant de coder : `apiClient.ts:193-198` (HEAD) appelait `networkStatusStore.reportServerError()` sur toute réponse `>= 500`, avant tout court-circuit et quelle que soit l'option `inlineHandledStatuses`. Un 500 sur `PUT /me/preferences` montait donc `OfflineBanner` (`data-testid="network-banner"`, monté par `app/[locale]/layout.tsx`) en `server-error`. La prémisse de l'architect est confirmée.
- Correctif (`apiClient.ts`) : la branche de report exclut maintenant `status === 500 && handlesStatusInline(error.config, 500)`. Le reste ne change pas : les timeouts, les 5xx des autres requêtes, les 502/503/504 de cette même requête, le toast et le 429 se comportent comme avant.
- Commentaires faux corrigés : `inlineErrorHandling.ts:26-27` (« ne coupe QUE le toast »), `apiClient.ts:~263` (« reste alimenté dans les deux cas »), la JSDoc de `inlineHandledStatuses` et celle de `HANDLES_SERVER_ERROR_INLINE`. J'ai aussi ajouté une ligne à `AuthContext.tsx` (commentaire de `persistThemeChoice`). Aucun code exécutable n'a changé à part la garde.
- Critères d'acceptation :
  - [x] Plus de bannière sur un 500 de la sauvegarde du thème. Prouvé par E2E et par Vitest sur la chaîne réelle.
  - [x] Le 429 ne change pas (ni toast ni bannière). Prouvé par E2E et Vitest, avec et sans l'option.
  - [x] Le thème reste appliqué : en E2E, `.dark` est sur `<html>` et `aria-pressed=true` après l'échec ; en Vitest, `setTheme('dark')` est appelé une seule fois.
  - [x] Vérifié sur la chaîne réelle dans un vrai navigateur. Seule la réponse HTTP est simulée (`page.route`), pas le service ni le toast (PIT-S102-001).

## Décisions
- L'opt-out porte sur le statut **500 seul**, pas sur toute la famille 5xx. C'est le sens littéral de l'arbitrage (« un 500 traité inline ») et du type `InlineHandledStatus = 403 | 500`. Un 503 sur `PUT /me/preferences` monte donc encore la bannière, mais sans toast puisque l'intercepteur n'a pas de branche 503. Un test le fige. Si le dev veut aussi couvrir 502/503/504 pour cette requête, voir la suite proposée plus bas.
- L'opt-out **s'abstient seulement de signaler** : il n'appelle pas `clear()`. Si une autre requête a déjà posé `server-error`, ce 500 silencieux ne l'efface pas. Un test le fige aussi.
- Coût accepté par l'arbitrage du dev : si `PUT /me/preferences` est la seule requête en échec, un serveur malade passe inaperçu. Le témoin E2E montre que les autres requêtes continuent d'alimenter la bannière sur la même page.

## Fichiers
- `frontend/src/services/apiClient.ts` : garde plus commentaires.
- `frontend/src/services/inlineErrorHandling.ts` : commentaires seulement.
- `frontend/src/contexts/AuthContext.tsx` : une ligne de commentaire.
- `frontend/src/services/apiClient.test.ts` : 5 tests dans le bloc `#838 — bus réseau et opt-out 500 par requête`.
- `frontend/src/contexts/AuthContext.themeSaveToast.test.tsx` : assertions sur `networkStatusStore` dans la chaîne réelle, cas 429 ajouté, témoin sans opt-out qui doit poser `server-error`.
- `frontend/e2e/sprint-116-theme-save-no-banner.spec.ts` (nouveau) : 3 tests. Il ajoute zéro `data-testid` et zéro connexion par formulaire (`sessionState(SHARED)`), et le `PUT` n'atteint jamais le backend.

## Tests
- Le Vitest a d'abord été écrit **rouge** : 2 échecs, `expected 'server-error' to be null`, l'un dans l'intercepteur, l'autre dans la chaîne réelle. Avec la garde : 27/27 verts.
- Contrôles négatifs Vitest :
  - (a) Garde retirée → 2 rouges, exactement les deux tests visés.
  - (b) Garde élargie à toute la famille 5xx (`!handlesStatusInline(config, 500)` sans `status === 500`) → 1 rouge (le test du 503).
  - Les deux fois, le fichier restauré a été comparé à l'original avec `cmp`.
- Vitest, suite complète : **2341 passés / 0 échec, 177 fichiers**, rejouée après les commits de #839 et #567. `e2e-rate-limit-budget.test.ts` relancé après l'écriture de ma spec : 51/51.
  - Avant les commits de #839, ce fichier avait 9 rouges. Ils venaient des fichiers de #839 encore en cours d'édition (`passe 2 … expected [shared,pwd,del,prod] to equal [shared]`), pas de mon travail.
- `npx tsc --noEmit` : 0 erreur. `next lint --file` sur les 6 fichiers : aucun warning ni erreur. `rtk proxy npx prettier --check` sur les 6 fichiers : conforme (la spec a été reformatée une fois).
- E2E. Pile dédiée : `COMPOSE_PROJECT_NAME=s116e2e`, backend sur `:8096`, Postgres sur `:5446`. L'image est `s115e2e-backend-e2e` re-taguée, après vérification que `git rev-list --count --since=<Created> HEAD -- backend/ docker-compose.yml` vaut **0**. Le front tourne sur `:3100` (CORS par défaut). Oracles : `/fr/login` = 200, `/api/auth/me` = 401.
  - Spec neuve sous `next dev` webpack : 3/3 verts.
  - **Contrôle négatif E2E** (garde retirée, rechargée à chaud) : le test 500 est **rouge** (`network-banner` Expected 0, Received 1). Les témoins 429 et bannière restent verts. Fichier restauré, vérifié avec `cmp`.
  - Specs qui touchent la surface, toutes rejouées (liste `/usr/bin/grep -rln "reportServerError|network-banner|inlineHandledStatuses|me/preferences|keepThemeOffSharedAccount" e2e`) : `settings-preferences`, `sprint-104-landing-sticky-nav`, `sprint-111-theme-account-preference`, `sprint-111-theme-toggle-unified`, `sprint-116-theme-save-no-banner`, `sprint-77-theme-visual`, `sprint-95-toast-overlap`, `sprint-96-auth-banner-overlap`.
    - Sous `next build` + `next start` : **74 passés / 1 échec sur 75, en 28 s**. Le seul rouge est `sprint-77-theme-visual:620`, le test d'armement des captures : « Référence absente …-chromium-darwin.png ». C'est attendu sur macOS : il refuse d'écrire une référence, et la CI Linux tranche.
    - Sous `next dev`, `sprint-111-theme-account-preference:88` était rouge. Il était **rouge aussi avec l'`apiClient.ts` de HEAD** (test A/B), donc ce n'est pas #838. Cause lue dans la trace : aucun `POST /api/auth/login` n'est envoyé, et les champs du formulaire sont vidés et marqués `[invalid]`, signe d'un remplissage avant l'hydratation sous `next dev`. Ce test est vert sous `next start`.
  - Spec neuve sous `next start` : 3/3 verts, puis `--repeat-each=3` : 9/9 verts.
- Ce que je n'ai **pas** vérifié :
  - La suite E2E complète n'a pas été jouée.
  - Le projet `firefox` ne joue pas cette spec (son `testMatch` ne la retient pas).
  - Aucun 500 réel du backend sur `PUT /me/preferences` n'a été provoqué : la réponse vient de `page.route`.
  - Le contrôle négatif E2E a été fait sous `next dev` uniquement, pas sous build de production.
  - Le comportement 503 sur cette route n'a pas été joué en E2E (seulement en Vitest).
- Environnement :
  - `frontend/node_modules` était périmé (zod 3.24.2 installé, `^4.6.7` déclaré depuis `755736e9`) : `z.guid is not a function` faisait échouer tout montage `AuthContext`. J'ai lancé **`npm ci`**, qui a pris 1 min.
  - Serveur Next `:3100` arrêté par son PID (cwd vérifié).
  - Pile docker `s116e2e` **laissée debout** pour le lead. Démontage : `COMPOSE_PROJECT_NAME=s116e2e docker compose --profile e2e down -v`.
  - `frontend/.next` contient maintenant un build de production avec `NEXT_PUBLIC_API_URL=/api`.

## Signaux mémoire
- [MEMORY:decision] Context: #838, un 500 de `PUT /me/preferences` déclaré traité inline (#833) montait encore la bannière `OfflineBanner` via le bus #76. Decision: si `handlesStatusInline(config, 500)` est vrai, l'intercepteur n'appelle plus `reportServerError()`. L'opt-out vaut pour le 500 seul (502/503/504 reportent), il ne fait que s'abstenir (pas de `clear()`), et les autres requêtes alimentent toujours le bus. Why: arbitrage dev du 2026-10-25. Un échec sans conséquence visible ne doit être signalé ni par un toast ni par une bannière. Le risque « serveur malade invisible » est borné au cas où cette requête serait la seule en échec.
- [MEMORY:pitfall] Context: après le passage à zod 4 (`755736e9`), le `node_modules` partagé du worktree était resté en zod 3.24.2. Tous les tests qui importent `types/settings.ts` levaient `z.guid is not a function`, ce qui ressemble à une régression du code testé. Solution: `npm ci`. Prevention: avant de lire un rouge Vitest en début de sprint, comparer `node -p "require('./node_modules/zod/package.json').version"` avec `package.json`, ou faire `npm ci` d'office quand le lock a bougé depuis la dernière installation.
- [MEMORY:pitfall] Context: sous `next dev`, `sprint-111-theme-account-preference:88` rougit de façon reproductible. Aucun `POST /api/auth/login` ne part, et les champs `login-username`/`login-password` sont vidés et `[invalid]` parce qu'ils ont été remplis avant l'hydratation. C'est le même échec sur HEAD (A/B), et le test est vert sous `next build` + `next start`. Solution: rejouer contre le build de production avant tout diagnostic. Prevention: s'ajoute à la liste « next dev sans préchargement : faux rouges » (S91/S115).
- [MEMORY:pattern] Problem: un E2E « absence de bannière » est vacant si la bannière est démontée ou si le store est débranché. Solution: (1) attendre une preuve que l'intercepteur est passé (le `console.error` du `catch` de l'appelant, émis après le rejet) plus deux `requestAnimationFrame` avant de vérifier l'absence ; (2) ajouter dans la même spec un témoin positif (500 sur une autre requête sans opt-out, la bannière doit apparaître) ; (3) faire un contrôle négatif rechargé à chaud qui doit rougir. Anti-pattern: `toHaveCount(0)` juste après le clic, qui passe avant même que la réponse arrive.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni backend touché.
- Pas de RECOMMAND_SECURITY : aucun changement d'auth, de log ni de redirection 401 ; seul un report d'état réseau est omis.
- Pas de RECOMMAND_UI_DESIGN : aucun rendu modifié, une bannière en moins dans un cas précis.
- Pas de RECOMMAND_TEST_RUNNER : E2E joué par moi (75 tests de surface + spec neuve répétée ×3) ; la suite complète reste à la CI ou au lead.
- RECOMMAND_FOLLOWUP: décider si l'opt-out de `PUT /me/preferences` doit aussi couvrir 502/503/504. Aujourd'hui, un 503 sur cette route ne toaste pas mais monte encore la bannière ; c'est figé par un test Vitest [XS | frontend]
- RECOMMAND_FOLLOWUP: `sprint-111-theme-account-preference:88` est rouge sous `next dev` (remplissage du formulaire de connexion avant l'hydratation, `loginViaForm` n'attend que `login-form` visible) ; ajouter une barrière d'hydratation sur le formulaire de connexion [XS | e2e]

fichiers de contexte lus: `docs/memory/sprints/sprint-116/briefing-838.md` (intégral, l.57 arbitrage), `docs/memory/sprints/sprint-112/issue-833-done.md` (RECOMMAND_FOLLOWUP bus réseau), `.ai-env/context-packs/pit-frontend.md` (PIT-S102-001 l.1708, PIT-S102-003), `frontend/src/services/apiClient.ts` (l.193-198, 259-267), `frontend/src/services/inlineErrorHandling.ts` (l.26-27), `frontend/src/services/networkStatus.ts`, `frontend/src/components/shared/OfflineBanner.tsx` (testid `network-banner`), `frontend/src/contexts/AuthContext.tsx` (`persistThemeChoice` l.136-170), `frontend/src/contexts/AuthContext.themeSaveToast.test.tsx`, `frontend/playwright.config.ts` (`assertWebServerEnv`, `webServer`), `frontend/e2e/support/session.ts`, `frontend/e2e/support/theme-preference.ts`, `frontend/e2e/sprint-96-auth-banner-overlap.spec.ts`, `frontend/e2e/sprint-111-theme-toggle-unified.spec.ts`, `docker-compose.yml` (services e2e) ; br-auth.md NON LU (aucune BR touchée)

STATUS: COMPLETED
