## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)

## PIT-S21-001 — Sprint depuis worktree : le garde-fou EFFICACE est un bloc en tête de briefing (pas « vérifie avant commit »)
Rappel du piège (cf. auto-memory `sprint-subagent-worktree-cwd`) : un subagent lancé depuis `.claude/worktrees/*` défaut-cwd sur le repo principal (`dev`) et écrit au mauvais endroit. En S21, les briefings à garde-fou faible (« vérifie la branche avant de commit ») ont ENCORE laissé #75 et #86 détourer (~10 min/agent + résidus untracked à nettoyer sur `dev`). Ce qui a marché pour #87 + correction : un bloc `⚠️ GARDE-FOU WORKTREE` en TOUT PREMIER avec (a) chemin absolu du worktree, (b) 1re action `cd <worktree> && /usr/bin/git rev-parse --show-toplevel`, (c) tous chemins Write ABSOLUS sous le worktree, (d) `/usr/bin/git -C <worktree>` (bypass RTK qui masque l'écart). Lead : `git -C <repo-principal> status` après chaque retour + `clean -fd` SCOPÉ (jamais global : emporte `.mcp.json`/`CLAUDE.md`/`.ai-env/`). (Sprint 21 #75/#86/#87)

## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)

## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)

## PIT-S76-005 — zsh ne fait pas de word-splitting : `git add -- $F` avec une liste de chemins en variable ne stage RIEN
Sous zsh (shell de ce poste), `$F` contenant plusieurs chemins arrive comme **UN SEUL** pathspec : `git add` sort en 128, rien n'est indexé. L'échec est bruyant donc bénin, mais il coûte un aller-retour à chaque agent d'une vague de fan-out — et le même piège produit des FAUX POSITIFS silencieux dans les boucles d'audit (`for tid in $NEW_TESTIDS` du check coverage-E2E a rendu un MAJEUR fantôme au S76). Écrire les chemins littéralement, ou `${=F}`, ou un tableau. À corriger dans les gabarits de briefing qui recommandent « `git add <fichiers exacts>` ». (Sprint 76 #310)

## PIT-S88-002 — Sous zsh, une commande ou une liste rangée dans une variable ne se découpe pas : `$P <<SQL` et `set -- $T` échouent en silence
Deux occurrences au S88. (1) Repro #545 : `P="docker exec … psql"; $P <<SQL` donne `command not found`, le script continue, et la « migration réussie » portait sur une base vide de sens. (2) Watcher CI du lead : `T="7 0"; set -- $T` laisse `$1="7 0"` et `$2` vide, la condition « 7 checks et 0 en attente » n'est jamais vraie, et le watcher tourne jusqu'à son timeout alors que la CI était verte. Même famille que `git add -- $F` (S76). **Règle : sous zsh, jamais de commande ni de liste dans une variable scalaire — fonction shell, tableau `${=T}`, ou parsing en Python ; et vérifier l'état produit, pas le code de sortie.** (Sprint 88 #545, lead)

## PIT-S54-004 — Sur un worktree partagé, un E2E rouge peut appartenir au diff d'un AUTRE agent
En vague 1, la 1re passe E2E de #331 est sortie entièrement rouge dès le `setup` (`getByTestId('dashboard')`
absent), alors que le diff de #331 n'a rien à voir avec l'auth : #329 éditait `auth.setup.ts` **en direct dans
le même working tree** pendant le run. Solution : sur worktree partagé, isoler par `git stash push -- <mes
fichiers>` puis re-run avant d'accuser son propre diff ; un `POST /api/auth/register` en direct (201) départage
API vs UI en 2 s. Corollaire de méthode observé côté lead : **ne jamais lancer deux suites Playwright
concurrentes** contre un backend/une base uniques — la contention a produit 8 puis 12 rouges sur un code
identique (`event-outside-label` rougissait sous contention, passe au run isolé). La règle `--workers=1` du
runbook S47 vaut aussi AU-DESSUS du process Playwright. Cf. [[mytimeline-e2e-ci-only-gate]].

## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.

## PIT-S86-008 — `test-quiet.sh frontend` contient `next build` : l'interdire et l'exiger dans le même briefing est contradictoire
En vague parallèle, le briefing donnait l'exclusivité de `next dev`/`next build` à un agent ET exigeait `./scripts/test-quiet.sh frontend` des autres — scope qui lance `next build` (même `.next`, PIT-S81-022). Solution : `frontend-unit` + `tsc --noEmit` pour les agents sans navigateur ; le build complet est joué par l'agent exclusif ou par le lead. (Sprint 86 #646)

## PIT-S83-007 — `process.env.TZ = undefined` n'efface pas la variable : il la met à la CHAÎNE `"undefined"`
Un test qui force `TZ='Asia/Tokyo'` puis restaure par `process.env.TZ = previousTz` contamine tout test suivant du même worker : `TZ` n'étant settée ni en CI ni dans un shell local, `previousTz` vaut presque toujours `undefined`, que Node coerce en `"undefined"` — zone invalide qui retombe sur UTC. Mesuré : `getTimezoneOffset()` rend 0 au lieu de -120. **Invisible sur la CI Ubuntu, déjà en UTC**, donc jamais rouge là où l'on regarde. Restaurer par `if (previousTz === undefined) delete process.env.TZ; else process.env.TZ = previousTz`. Plus généralement, un test de fuseau doit FORCER `TZ` — sinon il est vacant en CI, où le défaut qu'il couvre est un NO-OP — et sa contre-épreuve doit échouer aussi sous `TZ=UTC`. Trouvé par la review de **cycle 2**, sur un commit qui corrigeait lui-même le cycle 1. (Sprint 83 #518)

## PIT-S83-008 — Un `LocalDateTime` Java arrive SANS offset, et `new Date(iso)` le lit dans le fuseau du NAVIGATEUR
`SessionResponse.lastActivity/createdAt` et `ExportJobResponse.expiresAt` sont des `LocalDateTime` : Jackson écrit `2026-07-05T10:00:00`. `ExportDataFlow` ajoutait `Z` (référentiel serveur, #58), `SessionList` faisait `new Date(iso)` — deux lectures opposées du même contrat, dont une fausse du décalage local. Défaut **pré-existant**, promu par #518 en affirmation lisible par la machine (`<time dateTime>`). Passer par `parseServerDateTime` / `serverDateTime` de `lib/date-iso.ts`. ⚠ Rien ne verrouille la zone du backend en UTC (`Clock.systemDefaultZone()`, aucun `TZ` conteneur) : la convention repose sur un défaut Docker implicite. (Sprint 83 #518, review cycle 1)

## PIT-S83-004 — `next build` vert + `vitest` vert pendant que `tsc --noEmit` est ROUGE
Les `.test.tsx` sortent du périmètre du build : un cast faux dans un fichier de test (`id` au lieu de `jobId`) passe le build et vitest, et ne rougit que `tsc`. Symétrique de PIT-S41-002 (le build attrape ce que RTL ne voit pas). Le verdict frontend, c'est `./scripts/test-quiet.sh frontend` **complet** — jamais build + vitest seuls. (Sprint 83 #518)

## PIT-S22-001 — `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest
En S22 #68, `next build` échouait sur `no-unused-vars` (`nameConflict` en `useState` jamais lu, le 409 étant surfacé via `form.setError`) — INVISIBLE à `tsc --noEmit` et à la suite Vitest (306 verts). Seul le lint gate de `next build` l'attrape. Règle : `npm run build` OBLIGATOIRE en fin de TOUTE tâche frontend, pas seulement tests+tsc. Fix S22 : consommer la valeur en `aria-invalid` (lint OK + a11y). (Sprint 22 #68)

## PIT-S62-009 — Working tree partagé : `frontend/.next` est unique, et le `next dev` d'un agent meurt sans notification
Un `next build` réécrit `.next` sous les pieds du serveur d'un autre agent, **sans autre signal que la mort de sa tâche de fond** — `git status` ne dit rien (variante « environnement » de [[PIT-S60-005]]). Un agent qui déclare « environnement laissé debout » doit **re-sonder le port**, pas se fier au fait qu'il l'a démarré. Pour builder sans casser le voisin : copie hors dépôt — `next build` webpack accepte un `node_modules` **symlinké**, **Turbopack le refuse** (`TurbopackInternalError: Symlink node_modules is invalid`), il faut hardlinker (`rsync --link-dest`). Et `next start` avec `output:'standalone'` sert de façon non fiable : utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`). (Sprint 62)

## PIT-S81-022 — Deux `next dev` sur le même worktree se détruisent mutuellement
Les deux écrivent `frontend/.next` ; le premier meurt en cascade (`Cannot find module './343.js'` depuis `webpack-runtime.js`, puis `ENOENT .next/server/vendor-chunks/lucide-react.js`). Interdire le remontage dans un briefing **ne suffit pas** : vérifier `lsof -nP -iTCP:3000 -sTCP:LISTEN` avant de conclure sur un rouge, et ne PAS relancer son propre serveur par-dessus celui d'un agent — on rejoue la corruption dans l'autre sens. Corollaire : ne pas lancer le scope `frontend` de `test-quiet.sh` (qui contient `next build`) tant qu'un `next dev` sert l'E2E. (Sprint 81, lead)

## PIT-S88-009 — Pile E2E locale en `next build` : sans `NEXT_PUBLIC_API_URL=/api` AU BUILD, aucun POST ne part alors que les oracles répondent
`NEXT_PUBLIC_*` est figé à la compilation. Construit sans la variable, le client appelle une base indéfinie : le setup affiche « AUCUNE réponse POST observée » pendant que `/api/auth/me` rend 401 et `/fr/login` 200 (les oracles passent par le rewrite, pas par le client). Au S88 l'agent a d'abord accusé son correctif ; l'A/B avec la version précédente de la fixture, rouge à l'identique, a désigné l'environnement. **Règle : `NEXT_PUBLIC_API_URL=/api` ET `E2E_API_PROXY_TARGET` au build ; devant un rouge, rejouer l'ancienne fixture avant d'accuser la nouvelle.** (Sprint 88 #547, revue)

## PIT-S58-003 — E2E : `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` se posent au `next build`
Les rewrites Next sont **sérialisés dans `routes-manifest.json`** au build : les poser au `next start` n'a
aucun effet. Sans `NEXT_PUBLIC_API_URL=/api`, `apiClient` perd son préfixe et produit des **404 invisibles**
pour le watcher d'`auth.setup.ts`, qui accuse alors le rate-limit, le CORS ou un 409 — trois diagnostics
faux. **Oracle fiable : `curl /api/auth/me` doit renvoyer 401.** S58 : un audit a rapporté 5 échecs E2E de
ce fait ; rejoués sur la même base après correction de l'environnement, **136/0/8 vert, en suite comme en
isolation**. Complète [[PIT-S57-003]] (un `curl` qui réussit ne disculpe pas le CORS) : ici c'est le
symétrique, un environnement cassé qui accuse le code.

## PIT-S60-008 — Le squatteur de port peut être un AUTRE worktree DU MÊME projet
Variante de [[PIT-S56-004]] : `:3100` était tenu par un `next-server` de
`worktrees/new-feature-2347-14cb9a/frontend` (up 21 h), rendant **500 sur `/fr/register`**. Le réflexe « c'est
un autre projet du poste » ne suffit donc pas — même nom de projet, même app, mais **code d'une autre branche**.
`lsof -a -p <pid> -d cwd` identifie le propriétaire réel. Prendre un port libre plutôt que tuer le process d'une
autre session.

## PIT-S83-012 — Une image de backend e2e se date ; une sonde HTTP, elle, ne prouve pas l'existence d'une route
Au S83, `sprint-82-recurrence-capped-hint` échouait en local. L'image du conteneur backend (`docker inspect --format '{{.Created}}'`) datait du 2026-08-30 ; le flag `capped` a été livré le 2026-09-03 (`ba8f585`) : l'image ne **pouvait pas** contenir la fonctionnalité. La CI l'a confirmé (vert). La sonde HTTP, elle, ne tranchait rien : le filtre de sécurité rend **401 pour toute route non authentifiée, existante ou non** (calibré sur une route inventée). Dater l'image contre le commit de la fonctionnalité ; ne pas conclure d'un 401. (Sprint 83, Phase 6)

## PIT-S75-002 — RTK falsifie aussi la sortie de `next build`, et la redirection vers fichier ne désamorce RIEN
Famille [[PIT-S74-008]] / [[BUG-S70-002]], élargie au cas le plus trompeur. `npx next build` filtré a rendu « **2 routes (1 static, 1 dynamic)** » en 8,2 s là où le vrai build produit **52/52 pages** sur 99 lignes. Le point nouveau et contre-intuitif : **`> log` capture la sortie DÉJÀ résumée** — le fichier fait 5 lignes, donc un `tail` comme une relecture complète du fichier **confirment le faux chiffre**. Le réflexe « je redirige pour ne pas me faire filtrer » ne protège pas. Prévention : sur toute commande dont la SORTIE EST LA PREUVE (build, test, check de formatage), passer par `rtk proxy` **d'emblée**, et vérifier `echo "exit=$?"`. (Sprint 75 #279)
