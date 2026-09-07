- commits: [SHA_A_REMPLACER]

- mesure: POST /api/me/avatar via proxy :3000 -> **415**, PAS 401.
  corps `{"timestamp":...,"status":415,"error":"Unsupported Media Type","path":"/api/me/avatar"}`.
  req `content-type: application/json` · `cookie` PRESENT (`NEXT_LOCALE`, `jwt`) · origin `http://localhost:3000`.
  resp `accept: multipart/form-data`, CORS OK (`allow-origin: http://localhost:3000`, `credentials: true`).
  Aucun des 2 cas du tableau discriminant : ni `{"error":"unauthorized"}` ni corps vide. 3e cas.

- verdict: **bug prod-like** (pas le proxy, pas l'auth). 4 mesures qui tranchent :
  A) direct :8086 + `Content-Type: application/json` -> 415
  B) direct :8086 + vrai multipart -> 200
  C) via proxy :3000 + vrai multipart -> **200** => proxy Next FORWARDE cookie + multipart. Hypothese de l'issue REFUTEE.
  D) via proxy sans cookie -> 401 `{"error":"unauthorized"}` (temoin: voila a quoi ressemble un vrai 401).
  Cause: `apiClient` pose `Content-Type: application/json` au niveau instance. axios
  `transformRequest` fait `isFormData && hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data`
  (axios 1.18.1, lib/defaults/index.js:46-56) -> le FICHIER etait serialise en JSON, jamais envoye.
  Rien a voir avec l'E2E : meme client en prod, aucun rewrite implique. Upload avatar casse EN PROD.

- correction: `frontend/src/services/apiClient.ts` — l'intercepteur de requete FormData existant
  (#76, timeout=0) fait desormais aussi `config.headers.delete('Content-Type')`.
  PAS ailleurs : backend hors de cause (B/C = 200 avec le meme cookie) ; toucher la chaine d'auth
  aurait ouvert une faille pour reparer un bug client. PAS dans `userService` : l'intercepteur
  centralise et couvre tout futur multipart (seul producteur de FormData aujourd'hui = `uploadAvatar`).
  Commentaire `uploadAvatar` corrige (il affirmait a tort qu'axios posait la boundary tout seul).
  + `frontend/src/services/apiClient.multipart.test.ts` (NOUVEAU) : garde de non-regression,
  **verifiee ROUGE** en retirant le fix (`expected 'application/json' not to contain 'application/json'`).

- test.fixme: **RETIRE** (`test.fixme` -> `test`). Bloc FIXME de 10 lignes **REECRIT** : il portait
  l'hypothese 401/proxy, refutee par la mesure ; remplace par le constat 415 + la cause reelle.

- runs: 6 passes de `settings-profile.spec.ts`, **8/8 PASS a chaque fois** (A,B,C en workers=1 ;
  D2,E2 en workers=1 apres redemarrage ; F en workers par defaut = 2, comme la CI).
  1 echec intercale (run D) : NON lie au fix — `next dev` degrade, `/fr/register` ET `/fr/login` en 500
  (rot `clientReferenceManifest` apres nombreux recompiles HMR), echec en projet `setup`.
  Redemarrage du seul serveur de dev front (pile docker :8086/:5436 intacte) -> vert.
  Gate frontend complete verte (build + vitest + typecheck + lint) + `prettier --check` OK.

- [MEMORY:*] signaux:
  - [MEMORY:pitfall] Context: instance axios avec `headers: {'Content-Type':'application/json'}` + corps `FormData`.
    Solution: retirer l'en-tete dans un intercepteur (`config.headers.delete('Content-Type')`).
    Prevention: axios ne se contente PAS de laisser l'en-tete, il REMPLACE le corps par du JSON — le fichier
    disparait sans aucune exception cote client. Symptome serveur = 415, jamais 401. Un `Content-Type` JSON
    d'instance est incompatible avec tout upload.
  - [MEMORY:pitfall] Context: l'oracle reseau canonique du projet (`curl /api/auth/me` -> 401 = proxy OK).
    Solution: sonder AUSSI une page (`/fr/register`, `/fr/login`).
    Prevention: l'oracle reste VERT (401) alors que TOUTES les pages rendent 500 — le rewrite `/api/*` court-circuite
    le rendu React. « Oracle 401 » prouve le proxy, PAS la sante du front. C'est ce qui a fait echouer le run D.
  - [MEMORY:pitfall] Context: RTK reecrit le lanceur Playwright `--reporter=line` en `--reporter=json` puis tronque
    a 2000 chars — les `console.log` d'instrumentation sont PERDUS.
    Solution/Prevention: prefixer par `rtk proxy` toute campagne Playwright dont on veut lire la sortie.
  - [MEMORY:pattern] Problem: un test de garde peut passer pour de mauvaises raisons.
    Solution: retirer le fix, verifier que la garde ROUGIT, remettre le fix. Anti-pattern: garde ecrite apres le fix
    et jamais vue echouer.
  - [MEMORY:bug] Cause: `Content-Type: application/json` d'instance axios sur un POST `FormData`.
    Solution: suppression de l'en-tete pour les corps FormData. Rule: l'enonce d'une issue peut se tromper de
    STATUT (401 annonce, 415 mesure) — instrumenter le CORPS avant de retenir une hypothese.

- recommandations suite:
  - Pas de `RECOMMAND_SECURITY` : aucune ligne backend touchee, aucune surface d'auth modifiee (temoin D intact).
  - `RECOMMAND_FOLLOWUP` (mineur, honnetete de mesure) : je n'ai **pas pu reproduire le 401** de l'enonce
    (run CI 28753470777) — sur le code d'aujourd'hui l'echec est un 415 deterministe (6/6). Je n'affirme donc PAS
    que l'ancien 401 CI etait une mauvaise transcription ; je constate qu'il n'existe plus et que la cause 415
    explique entierement le symptome d'origine (`<img>` count 0). Si un 401 avatar reapparait en CI, rouvrir
    avec capture du CORPS (le tableau discriminant du briefing reste valable).

- ABSORBED:
  - Commentaire `uploadAvatar` (`userService.ts`) rendu faux par le fix : corrige.
  - `apiClient` n'avait AUCUN test unitaire : premier fichier de test cree pour ce module.
  - Etat du compte partage restaure apres les curls B/C (DELETE avatar -> 204, `avatarUrl: null`).

- fichiers de contexte lus: br-auth.md + cp-frontend.md (inlines briefing), frontend/playwright.config.ts,
  frontend/e2e/settings-profile.spec.ts, frontend/e2e/support/accounts.ts, frontend/src/services/apiClient.ts,
  frontend/src/services/userService.ts, backend UserController.java (grep avatar),
  node_modules/axios/lib/{defaults/index.js,core/dispatchRequest.js,helpers/resolveConfig.js,adapters/xhr.js}
STATUS: COMPLETED
