# Pitfalls — stack `backend` (MyTimeline)

> **GÉNÉRÉ — ne pas éditer à la main.**
> Source : `docs/memory/pitfalls.md` · Table : `.ai-env/tools/pit-classification.tsv`
> Régénérer : `bash .ai-env/tools/gen-pit-packs.sh` (fin de sprint, après consolidation).
>
> Entrées classées `backend`, `both` ou `tooling`. Les `tooling` (worktree, RTK,
> CI, environnement) figurent dans les DEUX packs : elles piègent les sous-agents
> quelle que soit leur stack.
>
> **§1 = texte intégral** (sprints ≥ S53 + récurrents). **§2 = index de titres** ;
> le titre énonce la règle — si une entrée de §2 touche ton issue, lire le détail
> dans `docs/memory/pitfalls.md` AVANT de coder.

---

## §1 — Actifs (texte intégral)

## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)


## PIT-S16-002 — Subagent en worktree : `cd` Bash résout sur le repo principal
Un subagent lancé depuis un worktree peut voir son `Bash cd <chemin relatif>` résoudre sur le repo principal (`dev`) au lieu du worktree → fichiers écrits au mauvais endroit, faux KO. Solution : chemins ABSOLUS du worktree + `git -C <worktree>`, vérifier `git branch --show-current` AVANT chaque écriture (pas seulement avant commit). (Sprint 16 #166)


## PIT-S19-001 — Subagent lancé depuis un worktree : les écritures dérapent vers le repo principal (raffinement worktree-cwd)
Un fullstack-dev spawné dans un worktree lit bien le worktree (Read initial OK) MAIS ses `Write`/`Edit` + `cd` bash peuvent écrire dans le REPO PRINCIPAL : le cwd bash se reset au repo principal entre appels. En Sprint 19, #63 a codé dans `/Users/herrh/VSProjects/MyTimeline/frontend` (repo principal, SANS le commit #192), puis recopié main→worktree en écrasant l'intégration `<EventPill>` de #192 (regression détectée par le lead à la vérification post-vague, corrigée en `a0a94f1`). Le garde-fou HEAD **au début** NE SUFFIT PAS — c'est l'écriture qui dérape. Prévention : chemins ABSOLUS sous le worktree, `git -C <worktree>` pour tout git, et vérifier `git status` du worktree APRÈS chaque batch d'écriture. Aggravation si le repo principal n'a pas les commits des vagues précédentes → clobber silencieux. (Sprint 19 #63, incident merge)


## PIT-S20-003 — Wrapper `rtk git diff` en 3-dots renvoie vide silencieusement (outillage review)
Sur ce repo/env, `git diff a...b` passé via le wrapper `rtk` retourne une sortie VIDE sans erreur → un reviewer/agent croit à tort qu'il n'y a aucun changement. Prévention : pour les diffs de review (surtout 3-dots `origin/dev...HEAD`), utiliser `/usr/bin/git` directement (bypass wrapper), ou `gh pr diff <PR>`. (Sprint 20, review PR #208)


## PIT-S21-001 — Sprint depuis worktree : le garde-fou EFFICACE est un bloc en tête de briefing (pas « vérifie avant commit »)
Rappel du piège (cf. auto-memory `sprint-subagent-worktree-cwd`) : un subagent lancé depuis `.claude/worktrees/*` défaut-cwd sur le repo principal (`dev`) et écrit au mauvais endroit. En S21, les briefings à garde-fou faible (« vérifie la branche avant de commit ») ont ENCORE laissé #75 et #86 détourer (~10 min/agent + résidus untracked à nettoyer sur `dev`). Ce qui a marché pour #87 + correction : un bloc `⚠️ GARDE-FOU WORKTREE` en TOUT PREMIER avec (a) chemin absolu du worktree, (b) 1re action `cd <worktree> && /usr/bin/git rev-parse --show-toplevel`, (c) tous chemins Write ABSOLUS sous le worktree, (d) `/usr/bin/git -C <worktree>` (bypass RTK qui masque l'écart). Lead : `git -C <repo-principal> status` après chaque retour + `clean -fd` SCOPÉ (jamais global : emporte `.mcp.json`/`CLAUDE.md`/`.ai-env/`). (Sprint 21 #75/#86/#87)


## PIT-S22-003 — Garde-fou cwd worktree : le bloc EN TÊTE reste indispensable (récurrence S22)
Confirme PIT-S21-001 : en S22, #62 (garde cwd reléguée dans « Contraintes », pas en tête) a ENCORE écrit dans le repo principal avant rapatriement manuel. À l'inverse #68 et le fix review217 (bloc `⚠️ GARDE CWD WORKTREE` en TOUT PREMIER + chemins absolus + `git -C <worktree>`) n'ont eu AUCUNE fuite. Règle : le bloc worktree va en première ligne du briefing, jamais dans une section basse. (Sprint 22 #62 vs #68)


## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)


## PIT-S27-002 — `git diff > patch.diff` via le hook RTK produit une sortie compactée non-parsable par `git apply`
En S27, un subagent voulant relocaliser des edits (mauvais worktree, cf [[PIT-S24-002]]) via `git diff > patch.diff` puis `git apply` a échoué : le hook RTK réécrit `git diff` et compacte la sortie → « No valid patches in input ». Prévention : pour un patch brut valide, `rtk proxy git diff` (bypass filtre) ou ré-appliquer les edits directement via Write/Edit. (Sprint 27 #122)


## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)


## PIT-S45-003 — RTK MENT sur les résultats de tests : toujours lire le code de sortie réel
En S45, le hook RTK a été pris en défaut **deux fois** : `vitest` affiché « PASS (23) FAIL (0) » alors que `success:false` et qu'une suite échouait **à la COLLECTE** ; `prettier` affiché « All files formatted » avec **exit 1**. S'y ajoute le comportement déjà connu sur `git diff` (sortie vide/tronquée). **Règle : ne JAMAIS rapporter un test vert depuis un résumé RTK — passer par `rtk proxy <cmd>` ou un reporter JSON, et lire le code de sortie.** Un rapport d'agent qui cite des chiffres sans exit code est à re-vérifier. (Sprint 45, 3 agents concernés)


## PIT-S53-006 — Un rapport `test-runner` peut être faux de façon *plausible* (cwd sur le dépôt principal)
Le `test-runner` du S53 a rapporté `814/821`, « 1 suite en échec : Cannot find package
'eslint-plugin-storybook' » et « `base-layer.test.ts` : 2 tests ». **Les trois chiffres étaient faux** : le
paquet est déclaré ET installé, la suite donne **834/834**, le fichier contient **11** tests. Cause : cwd sur
le **dépôt principal** au lieu du worktree (`node_modules` différents) — cf. `PIT-S8` / `PIT-S38`. Le mode
d'échec est traître : le rapport est **plausible** (nombre proche du vrai + cause d'échec crédible), pas
manifestement cassé. Solution : ne jamais reprendre un chiffre de test d'un subagent dans un audit ou un
corps de PR sans l'avoir relancé soi-même depuis le worktree. Un écart de quelques tests est le **signal**
qu'il faut re-mesurer.


## PIT-S54-001 — Un backoff de retry qui dépasse le budget de timeout du test rend le retry ET son diagnostic inatteignables
Le retry 429 de `auth.setup.ts` était **mort depuis le S47** : le budget Playwright par défaut (30 s) est
inférieur au coût d'UN cycle (8 s d'attente `login-form` + 20 s de backoff bucket4j = 28 s), donc la 2ᵉ
soumission expirait **toujours** — mesuré 4/4 `provision` en `Test timeout of 30000ms exceeded`, sans une
ligne de diagnostic. Le message d'échec censé distinguer les causes n'était jamais atteint. Corrigé par
`PROVISION_TIMEOUT_MS` (150 s puis 180 s après recalcul du pire cas ~127 s en review — le premier calcul
oubliait les deux `ensureRegisterForm(recover)`, qui sont des boucles de retry complètes). Solution : tout
`waitForTimeout` de backoff impose un `test.setTimeout()` explicite couvrant `(tentatives × attente) +
(backoffs) + navigations + marge`, écrit en commentaire à côté de la constante.


## PIT-S54-004 — Sur un worktree partagé, un E2E rouge peut appartenir au diff d'un AUTRE agent
En vague 1, la 1re passe E2E de #331 est sortie entièrement rouge dès le `setup` (`getByTestId('dashboard')`
absent), alors que le diff de #331 n'a rien à voir avec l'auth : #329 éditait `auth.setup.ts` **en direct dans
le même working tree** pendant le run. Solution : sur worktree partagé, isoler par `git stash push -- <mes
fichiers>` puis re-run avant d'accuser son propre diff ; un `POST /api/auth/register` en direct (201) départage
API vs UI en 2 s. Corollaire de méthode observé côté lead : **ne jamais lancer deux suites Playwright
concurrentes** contre un backend/une base uniques — la contention a produit 8 puis 12 rouges sur un code
identique (`event-outside-label` rougissait sous contention, passe au run isolé). La règle `--workers=1` du
runbook S47 vaut aussi AU-DESSUS du process Playwright. Cf. [[mytimeline-e2e-ci-only-gate]].


## PIT-S55-001 — Un placeholder NON VIDE dans `.env.example` défait le no-op qu'il documente
`BrevoEmailService:64` no-ope sur `apiKey.isBlank()`. Livrer `BREVO_API_KEY=xkeysib-REMPLACER-PAR-VOTRE-CLE`
fait donc prendre la branche HTTP : POST réel vers l'API → 401 → `log.error`, soit l'**inverse exact** du
« no-op silencieux » promis par le commentaire deux lignes au-dessus — et le fichier dit au dev de le copier
vers `.env`. Solution : valeur **vide**, format attendu dans le commentaire. Jumeau du même bug : une ligne
`VAR=` **exportée** (`set -a; . .env`, `env_file:`) fait EXISTER la propriété Spring avec la chaîne vide, qui
**écrase** `${var:default}` — commenter la ligne (`#BREVO_SENDER_EMAIL=`) pour que le défaut s'applique.
Prévention : pour chaque variable d'un `.env.example`, vérifier **dans le code** (a) si la branche teste
`isBlank()`, (b) si un défaut applicatif doit s'appliquer. Trouvé en revue, pas à l'écriture.


## PIT-S55-002 — `git commit --amend` en fan-out réécrit le commit d'un AUTRE agent
Sprint 55 : un agent a amendé pour remplacer un SHA placeholder dans son propre rapport. Entre son commit et
son amend, un autre agent avait poussé HEAD — **l'amend a réécrit le commit de l'autre**, qui porte désormais
4 lignes du rapport du premier. Rien perdu (`git log --stat`), historique faux. `--amend` réécrit le HEAD
*courant*, qui en fan-out n'est pas forcément le sien : aussi destructeur que `reset`. **Cause racine** :
demander à l'agent d'écrire son propre SHA dans son rapport crée mécaniquement le besoin d'amender.
Solution : ne pas le demander, ou accepter un 2ᵉ commit. Ajouter `--amend` à la liste des verbes git
interdits des briefings, aux côtés de `reset`/`rebase`/`checkout`/`stash`/`clean`.
Cf. [[sprint-parallel-commits-shared-worktree]].


## PIT-S55-003 — Le triage `/review-pr` compte les lignes de `docs/` et peut produire une review VIDE
PR #402 : 633 lignes → mode TEAM (seuil 300). Mais 355 de ces lignes sont des artefacts `docs/memory/**` que
la consolidation ne review pas, et les 4 spawns de la phase B.3 sont gatés sur `HAS_BACKEND`/`HAS_FRONTEND`/
`HAS_AUTH`/`HAS_DB` — **tous à 0** sur une PR devops/docs. TEAM aurait donc spawné **zéro reviewer**.
Solution : basculer en SOLO et le dire. Prévention : compter les lignes **hors `docs/`** pour le seuil, ou
tester qu'au moins un reviewer est éligible avant d'entrer en TEAM.


## PIT-S56-004 — `:3000` peut appartenir à un AUTRE projet du poste, et changer de port ne sauve pas
S56 #395 : `:3000` était tenu par un `next-server` standalone d'EdelWheels → 404 sur `/fr/register`, alors que
le briefing affirmait qu'un `next dev` du worktree y tournait. Basculer sur `:3100` ne suffit pas : Next relaie
`Origin: localhost:3100` au backend, que `application-dev.properties:35` fige à `localhost:3000` → **403
déguisé en « rate-limit »**. Variante par le **port du serveur dev** du piège déjà connu par le proxy
([[PIT-S57-003]] et l'entrée S47 plus haut). Recette retenue : **conteneur backend frère jetable** (même
réseau/DB, `APP_CORS_ALLOWED_ORIGINS=...:3000,...:3100`, port 8090). Corollaire : vérifier **à qui appartient**
le `:3000` avant de conclure quoi que ce soit sur l'application.


## PIT-S56-005 — Le `webServer` de `playwright.config.ts` lance `npm run dev` NU : `npx playwright test` est rouge par construction
S56 #391 : `playwright.config.ts:45-50` démarre le front sans `E2E_API_PROXY_TARGET` ni `NEXT_PUBLIC_API_URL`
→ `/api/*` non réécrit par Next, `POST register` en **404**, et `auth.setup.ts` échoue avec un message qui
oriente à tort vers le rate-limit ou le CORS. **Règle : ne jamais laisser Playwright démarrer son propre
`webServer` sur ce dépôt.** Recette : lancer le dev à part avec
`NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3000` +
`PLAYWRIGHT_BASE_URL=http://localhost:3000` — **port 3000 impérativement**, le CORS backend le fige
([[PIT-S56-004]]). [[PIT-S58-003]] complète : ces variables se posent au **build**, pas au start.


## PIT-S56-006 — `sprint-history.md` n'est pas une source d'état : 7 sprints sur 24 le démentaient
Audit du 2026-08-16 (déclenché par le S56 mergé depuis 16 jours sans clôture) : les sprints **36, 46, 48,
49, 51, 55, 58** portaient un statut `En cours`/`PLANIFIÉ`/`PR ouverte` alors que **leur code était sur
`dev` dans les 7 cas**. Le fichier décrit l'intention au moment de l'écriture, pas l'état — **toujours
trancher sur GitHub** (`gh api …/milestones?state=all`, `gh pr view`, `git merge-base --is-ancestor`).
**Trois pièges de balayage, tous rencontrés :** (1) grep sur les titres `## Sprint` seuls **rate** les
entrées dont le titre dit « Terminé » et dont la ligne `**Status :**` dit encore « En cours » (cas 51 et
55) — balayer les deux marqueurs séparément ; (2) un **milestone fermé avec `open=0 closed=0`** n'est pas
un sprint sans travail, c'est un sprint dont personne n'a rattaché les issues (cas 36 : code livré,
2 issues restées ouvertes 35 jours) ; (3) **rectifier un statut n'est pas clôturer** — le S56 avait été
passé à `Terminé` pendant `/sprint end 57`, ce qui a **masqué** que ni les issues, ni le milestone, ni la
consolidation mémoire n'avaient suivi. Symétriquement, **5 issues ouvertes étaient parquées dans des
milestones fermés** (#151, #185, #230, #279, #338), donc invisibles au backlog et réputées livrées.
Cf. [[PIT-S46-004]] pour l'autre famille de faux positifs de clôture.


## PIT-S57-001 — `git add` ciblé n'isole PAS un commit sur working tree partagé : `git commit` sans pathspec commite tout l'index
Correction de [[PIT-S55-002]] / `sprint-parallel-commits-shared-worktree`, qui affirmait que le `git add`
ciblé suffisait. **Il ne suffit pas.** S57 vague 1, deux agents en parallèle : celui de #312 (backend) avait
bien `git add` ses 2 seuls fichiers Java, mais son `git commit` a emporté le `git mv` frontend que #299 avait
déjà staged (rename pur, 0 diff — arbre correct, attribution fausse). Symétrique : **un `git mv` laissé
stagé est du butin pour le commit du voisin**. Remède : pathspec sur le **commit** —
`git commit -m "msg" -- <fichiers>`. Appliqué en vague 2 → les 2 commits sont restés parfaitement isolés.
⚠ L'ordre compte : `git commit -- <fichiers> -m "msg"` **échoue** (après `--`, tout est pathspec, y compris
`-m` et le message) ; utiliser `-m` avant le `--`, ou `-F <fichier>`.


## PIT-S57-003 — Un `curl` qui réussit ne disculpe PAS le CORS : il n'envoie pas d'en-tête `Origin`
S57 : suite E2E entièrement rouge dès le projet `setup`, **trois diagnostics faux** avant le bon.
(1) Cause initiale banale — aucun serveur de dev sur `:3000` (arrêté par un agent de la vague précédente) ;
le subagent a pourtant conclu « CORS + backend injoignable ». (2) Relance sur `:3100` : toujours rouge, alors
que `curl -X POST :3100/api/auth/register` renvoyait **201** — ce qui semblait disculper le backend.
(3) Vraie cause : le proxy Next transmet `Origin: http://localhost:3100`, refusé par le profil `dev` figé sur
`allowed-origins=http://localhost:3000`. `curl` passait parce qu'il n'envoie pas d'`Origin`.
Ce qui a tranché : les statuts **instrumentés par le fixture** (`watchRegisterResponses`,
`e2e/auth.setup.ts`) → `[403, 403, 403]`, avec la grille de lecture déjà écrite dans le message d'erreur.
**Réflexe** : lire les statuts instrumentés AVANT toute hypothèse. Écartée en chemin, à tort suspectée :
`e2e/.auth/accounts.json` périmé — `globalSetup` appelle bien `clearPersistedAccounts()`.
Corollaire : un agent qui rend `PARTIAL` sur « E2E non joué » doit être re-vérifié, pas cru — ici le code
était bon, seul l'environnement était cassé. Cf. runbook `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.



## PIT-S58-004 — Un garde-fou cité dans la doc peut n'exister nulle part
`ds/a11y-audit.md` affirmait que toute réintroduction d'anneau local serait rattrapée par
`base-layer.test.ts` — ce fichier ne contenait **aucune** occurrence de `focus` / `outline` / `ring`.
Sur ce dépôt les commentaires servent de mémoire d'arbitrage : une garantie fictive est **pire** que pas de
garantie, parce qu'elle dissuade d'en écrire une vraie. **Vérifier l'existence réelle de chaque garde-fou
cité, pas seulement que le chemin du fichier résolve.** Et quand on écrit l'assertion manquante, écrire
**avec elle ce qu'elle n'attrape pas** (ici : elle verrouille la layerisation du CSS source, elle ne détecte
pas un `ring-2` réintroduit dans un `.tsx`).


## PIT-S58-005 — Trois pièges d'outillage qui déguisent un environnement en défaut applicatif
(1) Sous `next dev`, l'overlay **`nextjs-portal`** capte `elementFromPoint` dans le coin inférieur gauche →
première mesure géométrique faussement à `0×0`. Neutraliser `nextjs-portal{display:none}` avant de mesurer.
(2) `computer{left_click}` du connecteur navigateur **n'ouvre pas** un `DropdownMenu` Radix, même au centre
exact : Radix ouvre sur `pointerdown`. N'en pas déduire un défaut du composant.
(3) Le hook **RTK** tue `npx next dev|start` en ne laissant que « Errors: 1 » — un log serveur de 3 lignes
est un artefact RTK, pas un plantage de l'app. `rtk proxy` obligatoire. Voir [[rtk-git-diff-empty-output]].


## PIT-S59-004 — Turbopack sert un chunk CSS périmé et produit un FAUX VERT
Après édition de `globals.css`, la première passe du test d'injection `.dark` est sortie **22 passed** — la
règle injectée n'était simplement pas dans le CSS servi. `touch` et rechargement n'ont rien changé ; **seul
un redémarrage du serveur dev** a compilé la règle. Prévention : avant de conclure « le défaut injecté n'est
pas vu », `curl` le chunk CSS servi et vérifier que l'injection y figure. (Corollaire de [[PIT-S52-002]].)


## PIT-S60-001 — Une allowlist de scanner combine ses critères en OU : elle blanchit plus large qu'elle n'en a l'air
Un bloc `[[allowlists]]` gitleaks avec `paths` **et** `regexes` mais **sans `condition = "AND"`** blanchit la
valeur **partout dans le dépôt**, pas seulement dans le chemin visé. La lecture du bloc suggère l'inverse : les
deux critères juxtaposés se lisent comme un ET. Trouvé à l'écriture de `.gitleaks.toml` (#362), la première
version blanchissait `EXPORT_TOKEN_SECRET` y compris dans un fichier de prod. **Prévention : toute allowlist de
scanner se teste dans les DEUX sens** — le cas attendu est tu, ET un cas voisin (même valeur hors chemin, autre
secret dans le chemin) reste détecté. Rejouer la variante buggée pour voir le trou est ce qui l'a prouvé.


## PIT-S60-002 — Une empreinte de baseline épinglée sur une ligne encore au HEAD masque à VIE, sans jamais rougir
`.gitleaksignore` (format `commit:fichier:règle:ligne`) épinglait le fixture `SECRET` d'`ExportTokenServiceTest`,
**toujours présent au HEAD**. La règle écrite en tête du fichier l'interdit — au motif que l'empreinte
changerait au prochain commit touchant le fichier. Le mode d'échec réel est **l'inverse et bien plus discret** :
la ligne n'ayant jamais été retouchée depuis son commit d'introduction, l'empreinte reste valide indéfiniment,
donc le masquage devient **permanent** au lieu de rougir. Trouvé par l'audit sécurité de fin de sprint, pas à
l'écriture. Remède : exclusion **durable** ancrée sur un marqueur de la VALEUR (`test-only-insecure`) + le
chemin, `condition = "AND"` ; `.gitleaksignore` réservé aux occurrences **absentes du HEAD**, à vérifier une
par une. Cf. [[PIT-S60-001]].


## PIT-S60-003 — `gitleaks dir` ignore `.gitignore` : un gate CI doit être en mode `git`
Mesuré : `gitleaks dir` scanne 214 Mo et remonte 25 détections, dont **20 dans `frontend/.next/`,
`backend/target/`, `frontend/e2e/.auth/`** — des artefacts de build non versionnés. `gitleaks git` ne voit que
le contenu suivi (21 détections). Un job bâti sur `dir` rougit donc pour des fichiers qui ne sont pas dans le
dépôt, et sera désactivé après deux faux positifs. **Mode `git` pour tout gate CI.**


## PIT-S60-004 — Un scan vert AVANT le commit ne prouve rien sur l'état APRÈS (le scanner peut se détecter lui-même)
Un fichier de baseline listant des empreintes `commit:fichier:generic-api-key:ligne` aligne un SHA 40-hex à
forte entropie et le mot « api-key » sur la même ligne : le scanner peut se déclencher **sur sa propre
configuration**. Vérifié négatif ici, mais le piège général demeure — un scan pré-commit ne voit pas les
fichiers non encore committés. **Rejouer le scan dans un dépôt jetable contenant les fichiers committés** avant
de conclure. Corollaire : `--baseline-path` avec rapport JSON committé est un anti-pattern sur dépôt public —
le rapport **contient les valeurs en clair**.


## PIT-S60-005 — Un sous-agent qui casse l'environnement pour reproduire un cas dégradé peut caler avant de le restaurer
Sprint 60 #308 : l'agent a renommé `frontend/node_modules/eslint-plugin-storybook` en
`.eslint-plugin-storybook.S60-308-bak` pour prouver son garde-fou, puis a calé (watchdog 600 s) **avant la
restauration**. Le worktree est resté dans l'état dégradé — et **`git status` était propre**, `node_modules`
n'étant pas suivi. Un lead qui vérifie l'état d'un sprint sur le seul `git status` ne le voit pas ; l'échec
suivant accuserait le code. **Après tout arrêt anormal d'un sous-agent, vérifier l'ENVIRONNEMENT** (résolution
des paquets, processus laissés, ports tenus), pas seulement l'arbre git. Ici :
`node -e "require.resolve('eslint-plugin-storybook')"`. Le répertoire de sauvegarde se retrouve par
`find node_modules -maxdepth 2 -iname '*<paquet>*'` — le préfixe `.` le cache d'un `ls` ordinaire.


## PIT-S60-008 — Le squatteur de port peut être un AUTRE worktree DU MÊME projet
Variante de [[PIT-S56-004]] : `:3100` était tenu par un `next-server` de
`worktrees/new-feature-2347-14cb9a/frontend` (up 21 h), rendant **500 sur `/fr/register`**. Le réflexe « c'est
un autre projet du poste » ne suffit donc pas — même nom de projet, même app, mais **code d'une autre branche**.
`lsof -a -p <pid> -d cwd` identifie le propriétaire réel. Prendre un port libre plutôt que tuer le process d'une
autre session.


## PIT-S60-009 — `test-quiet.sh frontend` ne lance QUE Vitest, contrairement à ce que disent le README et les briefings
`run_frontend` exécute un seul `npm test --silent` : ni `build`, ni `typecheck`, ni `lint`. La description
« vitest + build + typecheck + lint » circulait dans les briefings de sprint et le README. **Anti-pattern :
conclure « frontend vert » sur ce seul scope.** Corrigé au S60 (README §Tests + piège 4). Voisin de
[[PIT-S58-004]] : une garantie décrite mais inexistante dissuade d'en écrire une vraie.


## PIT-S61-005 — Le check coverage-E2E est vert quand les specs sont seulement CITÉES
Au S61 il affichait « 10 testids ajoutés, 0 sans spec » alors que **les 5 specs du sprint n'avaient jamais été
exécutées** et que 2 échouaient. Il vérifie qu'un `data-testid` apparaît sous `frontend/e2e/`, il ne lance rien.
Combiné à 920 Vitest verts et un build OK, l'illusion est convaincante. Un `RECOMMAND_TEST_RUNNER` se traite en
**exécutant**, jamais en constatant. Famille [[PIT-S48-002]] (CI verte ≠ page correcte).


## PIT-S61-006 — « le flag est fourni par l'issue N » n'est pas une preuve : grepper les APPELANTS
Issue #67, planifiée XS : `RecurrenceExpansion.capped` existait, `MAX_OCCURRENCES = 4000` aussi, le service le
calculait, et la javadoc citait même son consommateur `#67`. Mais **`RecurrenceExpansionService` n'avait aucun
appelant** dans `backend/src/main` — seul son test unitaire le référençait. Code orphelin : aucune réponse d'API
où loger le flag. Un `grep` de la déclaration validait l'issue à tort ; c'est le `grep` des **appels**
(`\.methode(`, service injecté, champ présent dans le DTO de réponse) qui la disqualifie. Sortie du sprint → #439.


## PIT-S61-007 — `npm run dev` (turbopack) infère un mauvais workspace root en worktree, et TOUT casse
Le script force `--turbopack`, qui choisit un **autre worktree** quand plusieurs lockfiles coexistent : toutes les
pages rendent 500 (`ENOENT app-build-manifest.json`), `auth.setup.ts` casse, **0 spec ne s'exécute** — et le
message d'erreur ne dit rien de la cause. Un agent test-runner en a conclu « E2E impossibles sans modifier le
dépôt ». Contournement réel, sans modification : `rtk proxy npx next dev -p 3100` (webpack). Voisin de
[[PIT-S60-008]] (le squatteur de port peut être un autre worktree du même projet).


## PIT-S62-003 — Un garde-fou validé par des fixtures supprimées n'est pas armé
S62 : 3 gardes ajoutées à `e2e/support/pixel.ts`, prouvées par des fixtures synthétiques **supprimées avant commit**. Les specs existantes restaient vertes — mais unanimité 100 % et éléments loin des bords : **aucune garde ne se déclenchait sur un cas réel du dépôt**. Toute régression future (seuil inversé, `<` en `<=`, tolérance élargie) serait passée en CI verte. Exiger un test **du garde lui-même**, avec contrôle négatif (sans lui, une garde qui lèverait *toujours* passe). Variante « garde-fou » de [[coverage-check-vert-ne-prouve-rien]]. (Sprint 62, review cycle 2)


## PIT-S62-009 — Working tree partagé : `frontend/.next` est unique, et le `next dev` d'un agent meurt sans notification
Un `next build` réécrit `.next` sous les pieds du serveur d'un autre agent, **sans autre signal que la mort de sa tâche de fond** — `git status` ne dit rien (variante « environnement » de [[PIT-S60-005]]). Un agent qui déclare « environnement laissé debout » doit **re-sonder le port**, pas se fier au fait qu'il l'a démarré. Pour builder sans casser le voisin : copie hors dépôt — `next build` webpack accepte un `node_modules` **symlinké**, **Turbopack le refuse** (`TurbopackInternalError: Symlink node_modules is invalid`), il faut hardlinker (`rsync --link-dest`). Et `next start` avec `output:'standalone'` sert de façon non fiable : utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`). (Sprint 62)


## PIT-S62-010 — RTK filtre plus que les commandes directes
Famille [[PIT-S50-007]], élargie trois fois au S62. (1) `git diff` rendu quasi vide — connu. (2) **Les redirections vers fichier** : `npx next build > log 2>&1` a écrit un résumé RTK de 6 lignes (« 2 routes », faux) au lieu de la sortie Next. (3) **Les commandes à l'intérieur d'un `Bash` composé** : un run E2E a logué `PASS (200) FAIL (0)` sans la ligne `8 skipped`. (4) `ps aux | grep` → « 0 processus » alors que Playwright tournait. Parades : préfixer `rtk proxy`, ou mettre la commande dans un **fichier `.sh` exécuté par chemin** (le hook ne le réécrit pas) ; `/bin/ps -eo` ou `pgrep -fl` jamais `ps | grep` ; vérifier qu'un log de test contient bien les lignes par test avant d'en tirer un compteur. **Ne jamais reprendre un récap de commit RTK** : « 2 files changed » annoncé sur un commit de 4 / 282 lignes. (Sprint 62)


## PIT-S62-011 — Deux runs E2E complets rapprochés ne PEUVENT pas passer
`global-setup` purge `.auth/accounts.json`, donc chaque run ré-enregistre 4 comptes contre un bucket de **5/min/IP**. Le 2ᵉ échoue en `provision <compte>` avec `Test timeout of 180000ms` et « N did not run » — symptôme qui **ressemble à une panne d'infra**, pas à un rate-limit. Attendre ≥ 2,5 min entre deux runs. Cousin de [[e2e-cors-origin-proxy-trap]] : sur ce harnais, tout échec de provisioning se déguise en autre chose. (Sprint 62)


## PIT-S62-012 — Sans `PLAYWRIGHT_BASE_URL`, Playwright démarre un serveur SANS le proxy `/api`
`playwright.config.ts` fait `baseURL = PLAYWRIGHT_BASE_URL ?? localhost:3000` et, à défaut, lance son propre `webServer` (`npm run dev`) **sans** `E2E_API_PROXY_TARGET` : le rewrite `/api/*` n'existe pas, le `POST /api/auth/register` du projet `setup` tombe en **404**, les 4 comptes échouent et **aucun test ne démarre**. Un audit S62 en a conclu « BLOQUANT, régression du code » à tort. **Oracle : `401` sur `/api/auth/me` = proxy OK ; `404` = proxy absent.** Lire l'oracle avant toute hypothèse — cf. [[e2e-cors-origin-proxy-trap]]. (Sprint 62, audit Phase 6)


## PIT-S62-014 — Un briefing qui exige de citer un fichier supprimé est infalsifiable
Erreur du lead au S62 : le briefing d'un subagent imposait de lire `briefing-415.md` et d'en citer les marqueurs comme preuve de chargement du context-pack — alors que les briefings venaient d'être **retirés avant l'ouverture de la PR** (convention anti-bloat). Soit l'agent invente les marqueurs, soit il bloque. L'agent a refusé d'inventer et l'a signalé en tête de rapport — bon comportement. Ne pas adosser une preuve de chargement à un artefact que la convention de sprint supprime. (Sprint 62)


## PIT-S63-004 — Invoquer un pitfall de MÉTRIQUE pour excuser un TIMEOUT est une erreur de catégorie
Erreur du lead au S63 : 4 échecs E2E excusés par [[PIT-S52-001]] (« mesures de largeur non concluantes sur macOS »). Or ce pitfall couvre les écarts de **métrique de police** ; un test qui **expire** n'a produit **aucune** mesure. La cause réelle était un routage responsive faux ([[PIT-S63-001]]). Signal de reconnaissance : l'échec est un `locator.*: Test timeout`, pas un écart de valeur. Refuser ce raisonnement est ce qui a mené au vrai diagnostic. (Sprint 63)


## PIT-S63-007 — `warn-test-delegation.sh` tue la commande entière, y compris un heredoc qui ÉCRIT
Le hook PreToolUse détecte une chaîne d'invocation de runner de test **n'importe où** dans la commande — **y compris un `cat <<EOF` qui ne fait que rédiger un fichier** la contenant. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un faux diagnostic. Rencontré **deux fois** au S63, par un agent puis par le lead. Parade : écrire ces fichiers avec l'outil `Write` ; `SKIP_DELEGATION=1` pour un run ciblé. (Sprint 63 #442)


## PIT-S63-008 — « Environnement laissé debout » est une promesse que rien ne tient
Un agent a conclu son rapport par « `next dev` laissé debout, réutilisable » ; sa tâche de fond a été tuée **après** l'envoi, et l'affirmation est devenue fausse sans que rien ne la corrige. Survenu **3 fois** au S63. Prévention : ne jamais promettre un **état** à l'agent suivant — donner la **commande de relance** et un fait **horodaté**. Variante temporelle de [[PIT-S62-009]]. (Sprint 63 #442)


## PIT-S63-009 — Un `test.fail()` laissé comme marqueur de dette fige le périmètre de l'issue suivante
Le S62 avait figé le popover invisible en 2 `test.fail()` sur **un seul widget**. L'issue #446 a donc décrit un défaut de `ui/select` — alors que la cause est un **palier `z` partagé** : `PopoverPicker`, monté dans le même drawer, était cassé à l'identique (46-66 % de panneau mesurés) et absent du périmètre. Corriger le seul `Select` aurait laissé le champ voisin invisible **dans le formulaire qu'on prétendait réparer**. Grepper les **frères du composant** avant d'accepter le périmètre d'une issue de superposition. (Sprint 63 #446)


## PIT-S63-011 — Recette docker jammy : `host.docker.internal` donne 403 CORS sur tout écran authentifié
Le backend fige `localhost:3000` comme origine acceptée. Depuis le conteneur, viser `host.docker.internal:3000` rend **403** ; via un **forwarder TCP** `127.0.0.1:3000 → host.docker.internal:3000`, la requête atteint la logique applicative (400). Invisible pour les audits de **landing** (pages non authentifiées) — d'où sa découverte tardive. (Sprint 63 #74)


## PIT-S63-017 — Les garde-fous à `grep` ne distinguent pas une NÉGATION d'une demande
Deux occurrences au S63. (1) `check-sprint-completeness.sh` a remonté 7 « signaux non traités » : **5 étaient des négations explicites** (« pas de `RECOMMAND_DB_EXPERT` car aucun schéma »), les 2 autres étaient traités. (2) La précondition Phase 9 `grep -q "\[MISSING\]"` aurait abandonné à tort sur les phrases « **Aucun** `[MISSING]` » de l'audit. Un `grep` de jeton lit la présence, jamais l'intention. Vérifier le contexte avant d'agir sur un tel garde-fou. (Sprint 63, clôture) — **S64 : les DEUX se sont reproduits**, et une 3e nuance est apparue : `check-sprint-completeness.sh` teste `ls $SPRINT_DIR | grep <marker>`, donc un **NOM DE FICHIER**, jamais le traitement réel. Un signal parfaitement traité par un AUTRE specialist reste « non traité » ; à l'inverse, un fichier vide nommé `*test-runner*` suffirait à passer. Voie de sortie honnête : reformuler le signal en négation (`Pas de RECOMMAND_X ouvert — clos car …`), jamais renommer un artefact pour tromper le grep.


## PIT-S64-001 — Un `tsc` vert ne prouve RIEN du reporter Playwright
`ReporterDescription` est typé `[string, any]` : `['html', { open: 'jamais' }]` **compile**. Contrôle négatif joué au S64 — `tsc --noEmit` EXIT=0 sur une valeur invalide. Seul un run CI réel atteste qu'un reporter écrit ce qu'on croit. Même famille que « coverage vert ne prouve rien ». (Sprint 64 #461)


## PIT-S64-002 — Greper `playwright-report/index.html` est un faux négatif GARANTI
Le reporter `html` embarque ses données en **base64** dans `<template id="playwrightReportBase64">` (441 Ko décodés → `report.json` + ~32 JSON). Chercher le nom d'un test échoué dans le HTML ne renvoie donc jamais rien, même quand l'échec y est. **Décoder avant de conclure.** (Sprint 64 #461)


## PIT-S64-005 — `curl … -w '%{http_code}' || echo 000` CONCATÈNE au lieu de substituer
Le résultat est `000000`, qui passe un test `-lt 500` : une boucle d'attente se croit satisfaite au premier tour et laisse passer un service mort. Mesuré au S64 en écrivant les oracles du job `e2e`. (Sprint 64 #462)


## PIT-S64-006 — `npx <cmd> &` : `$!` capture le WRAPPER, pas le process
`npx` fork un enfant. Un `kill "$PID"` posé sur `$!` tue `npm exec` et **ment** sur ce qu'il arrête ; que l'enfant meure dépend du relais de SIGTERM par npm — un détail d'implémentation, pas un contrat. Utiliser le binaire direct (`./node_modules/.bin/<cmd>`, script à shebang exec'é) pour que `$!` soit le bon PID. (Sprint 64, revue)


## PIT-S64-007 — Un step GitHub Actions dont la dernière commande est `echo >> "$GITHUB_ENV"` NE PEUT JAMAIS ÉCHOUER
Le `echo` rend 0, donc le step sort en succès même si le service lancé juste avant est mort à la seconde 0. Le diagnostic est repoussé au step suivant, qui accuse alors l'attente plutôt que le démarrage (jusqu'à 180 s perdues). Terminer un tel step par un contrôle de vie explicite qui `exit 1`. (Sprint 64, revue)


## PIT-S64-008 — Aucune CI ne tourne sur les branches `sprint/N`
`.github/workflows/ci.yml` déclenche sur `pull_request: [dev, main]` et `push: [dev, main]` **uniquement**. Un `git push origin sprint/N` ne lance rien : le premier run réel d'un sprint est **l'ouverture de sa PR**. Toute preuve exigeant la CI en cours de sprint passe par une **PR jetable** vers `dev`. (Sprint 64 #461)


## PIT-S65-001 — Restaurer un fichier source par `mv` d'une copie `cp` NE PRÉSERVE PAS la mtime → Maven rejoue du bytecode périmé
Contrôle négatif backend : on neutralise une constante, on lance les tests (rouge attendu), on restaure, on relance (vert attendu). Si la restauration se fait par `cp` puis `mv`, la source restaurée est **plus ancienne que le `.class`** : Maven saute la recompilation et le run suivant s'exécute sur du bytecode périmé — **4 faux échecs mesurés au S65**, avec `javap -constants` annonçant `400` là où la source disait `5`. Aggravé par l'inlining des `static final int` (la valeur est copiée dans chaque appelant). Parade : `touch` la source restaurée, ou `mvn clean`, et **confirmer par `javap`** plutôt que par la lecture du fichier. (Sprint 65 #452)


## PIT-S65-002 — Un run de mesure lancé en ARRIÈRE-PLAN par un subagent meurt avec sa session — et deux campagnes concurrentes se corrompent en silence
Deux campagnes de mesure de #469 ont été perdues ainsi. (1) Le subagent lançait ses runs en tâche de fond puis rendait la main : les process mouraient avec sa session, **aucun résultat capturé**. (2) Le lead, croyant les runs morts, a lancé les siens **pendant qu'ils tournaient encore** : les deux campagnes écrivaient dans les **mêmes fichiers de log** d'un scratchpad partagé et partageaient `e2e/.auth/` — d'où un faux rouge portant la signature [[PIT-S47-004]] pour une cause qui n'a rien à voir. Diagnostics fautifs du lead à ne pas reproduire : `find -maxdepth 4` trop court pour atteindre le scratchpad (« pas de logs » ≠ « runs morts ») et un `ps` tombé dans l'intervalle entre deux runs. **Parades** : mesurer au premier plan ; répertoire de logs **horodaté unique** par campagne ; et surtout **compter les blocs `Running N tests using M workers` par log — il doit y en avoir exactement 1**. Un log en contenant deux (`231 passed (7.0m)` ET `222 passed / 10 failed (8.2m)`) est la preuve de la concurrence. (Sprint 65 #469)


## PIT-S65-003 — Un listing Playwright `--list` sans `rtk proxy` sort en `PASS (0) FAIL (0)`
Le hook RTK tronque/mal-parse la sortie du listing : le résultat ressemble **exactement** à une suite vide — soit précisément le faux signal que #470 élimine par ailleurs. Préfixer `rtk proxy` pour tout listing Playwright. Même famille que [[PIT-S20-003]] (`git diff` vidé) et [[PIT-S27-002]]. (Sprint 65 #470)


## PIT-S65-004 — Une boucle de poll CI dont la condition de sortie cherche un MOT dans la sortie texte se termine à tort
Une boucle `if ! echo "$OUT" | grep -qE 'pending|queued'` est sortie **dès la 1re itération** sur la réponse `no checks reported on the branch` : juste après un push, les checks n'existent pas encore, la chaîne ne contient donc aucun de ces mots, et l'absence de checks se lit comme « CI stabilisée ». Variante de [[PIT-S55-*]] (watcher muet), mais ici le watcher ment au lieu de se taire. **Ne jamais faire porter la condition sur la présence d'un mot dans une sortie texte** : interroger le STATUT du run pour le SHA exact (`gh run list --json headSha,status --jq 'select(.headSha=="<sha>")'`) et n'accepter que `completed`. (Sprint 65)


## PIT-S65-005 — ÉDITER le corps d'une entrée `PIT-*` existante périme les packs, pas seulement en AJOUTER une
Le job CI **requis** `ai-env-packs` lance `gen-pit-packs.sh --check`. La note connue portait sur l'ajout d'entrées non classées ; en réalité **toute édition du corps d'une entrée existante** périme les packs dérivés. Au S65, `PIT-S47-004` et `PIT-S64-003` réécrits ⇒ `ai-env-packs` rouge en 12 s, découvert **après** l'ouverture de la PR. Réflexe : dès que `docs/memory/pitfalls.md` apparaît dans `git status`, relancer `gen-pit-packs.sh` avant de pousser. Nuance : seules les entrées de sprints **≥ S53** figurent en texte intégral dans les packs (les plus anciennes n'y sont qu'en index de titres) — éditer une vieille entrée peut donc ne produire **aucun** diff de pack tout en faisant échouer `--check` à cause d'une autre. (Sprint 65)


## PIT-S67-001 — Un « blocage amont non corrigeable » se périme EN SILENCE, et survit dans un commentaire de CI puis dans les énoncés d'issues qui le citent
Au S45, `.github/workflows/ci.yml` a consigné que l'advisory `brace-expansion` était incorrigible en aval : « le seul corrigé est 5.0.8, qui change sa forme d'export ; le forcer casse le lint (`expand is not a function`) ». Vrai à l'époque. Faux ~20 sprints plus tard : une `1.1.18` est sortie sur la branche 1.x, or `minimatch@3.1.5` déclare `brace-expansion: ^1.1.7` → elle y entre, la branche 5.x n'est jamais sollicitée, `npm run lint` sort exit 0 avec 0 occurrence de l'erreur. Le verdict avait été recopié tel quel dans l'énoncé de #438, ce qui orientait l'issue vers un arbitrage documentaire (« masquer le signal rouge ? ») au lieu d'une correction : les 8 entrées d'audit étaient TOUTES des patchs in-range, `npm audit` est passé de 8 à 0. Prévention : un blocage amont n'est pas un acquis — il se périme le jour où l'amont publie un patch dans la plage semver DÉJÀ déclarée, et rien ne le signale. Lire les plages dans le lockfile (`packages[].dependencies`) avant de croire un « non corrigeable », et re-tester à chaque sprint plutôt que recopier.


## PIT-S67-002 — Retirer l'`overrides.postcss` de MyTimeline casserait l'étape CI BLOQUANTE : `next` épingle postcss en version EXACTE
`next@15.5.22` déclare `postcss` en `8.4.31` **exact** (version vulnérable, GHSA-r28c-9q8g-f849 / GHSA-6g55-p6wh-862q). Sans l'override qui le hisse en `^8.5.23`, npm recrée un `node_modules/next/node_modules/postcss@8.4.31` imbriqué et `npm audit --omit=dev` — l'étape BLOQUANTE du job CI `security` — repasse de 0 à 2 vulnérabilités de PRODUCTION. Mesuré au S67 sur une copie hors dépôt. L'override `sharp` joue le même rôle. Prévention : ces deux `overrides` sont load-bearing, PAS du bruit à nettoyer ; leur raison d'être est inscrite dans `frontend/package.json` (clé `_overridesRationale`) et `frontend/README.md` § « Overrides npm ». À revoir si un futur bump de `next` change son pin postcss.


## PIT-S67-003 — Le compteur « added N packages » de npm surestime massivement la churn réelle du lockfile
Au S67, `npm` annonçait « 195 / 183 packages added » sur le bump de la chaîne Storybook : de quoi croire à une explosion du lockfile et refuser le changement. La churn réelle, mesurée en diffant les entrées `packages` du lock, était de **15 add / 10 remove** — l'écrasante majorité des « ajouts » sont des binaires de plateforme OPTIONNELS (`@oxc-resolver/binding-*`, `@emnapi/*`) déjà présents au lock. Prévention : juger l'ampleur d'un bump sur le diff du lockfile (add/remove/change + comparaison des majeurs), jamais sur la sortie texte de npm. Corollaire : c'est aussi en diffant le lock qu'on trouve ce que `npm audit fix --dry-run` ne montre pas — au S67, un downgrade subi `oxc-resolver 11.23.0 → 11.21.2` (+19 bindings), absent du relevé `--dry-run` du lead, épinglé en exact par `storybook@10.6.0`.


## PIT-S67-004 — `check-sprint-completeness.sh` lit LIGNE À LIGNE : une négation « pas de RECOMMAND_X » repliée sur la ligne suivante compte comme signal NON traité
Le hook extrait chaque ligne contenant `RECOMMAND_<SPEC>` et teste la négation (`pas de.{0,5}recommand`, `non applicable`, `aucun`…) sur **cette seule ligne**. Au S67, `issue-438-done.md` portait « …, pas de\n  `RECOMMAND_UI_DESIGN` (aucune surface visuelle). » : le « pas de » étant sur la ligne précédente, le signal a été compté comme actionnable et non traité, bloquant `/sprint end`. Second piège du même hook : il cherche un fichier dont le NOM contient `test-runner` / `db-expert` / `ui-design` **dans `docs/memory/sprints/sprint-N/`** — un test-runner réellement spawné dont le rapport n'est rangé que dans `docs/memory/audits/` reste invisible. Prévention : une négation `RECOMMAND_*` tient sur UNE ligne (un tiret par spécialiste), et le rapport d'un spécialiste spawné se dépose dans le dossier du sprint (convention S61 : `sprints/sprint-61/test-runner-report.md`).


## PIT-S68-001 — `BigInteger.toByteArray()` préfixe un octet de signe `0x00` sur tout modulus RSA → `crypto.subtle.importKey('jwk')` rejette
Pour publier un JWKS, le paramètre `n` (modulus) doit être l'encodage base64url de l'entier NON signé. Or `BigInteger.toByteArray()` (Java) produit un complément à deux : le bit de poids fort d'un modulus RSA valide est toujours à 1, donc la représentation signée y ajoute systématiquement un octet `0x00` de tête pour rester positive. Publié tel quel dans `n`, le tableau fait `keyLen+1` octets ; WebCrypto (`crypto.subtle.importKey('jwk', …)`) et la plupart des parseurs JWK REJETTENT la clé (longueur de modulus incohérente), et la découverte JWKS (#358) échoue en silence côté middleware. Correctif dans `RsaKeyMaterial` : retirer l'octet `0x00` de tête s'il précède un premier octet ≥ 0x80, AVANT l'encodage base64url (SANS padding, RFC 7515). Même traitement pour l'exposant `e`. Oracle : le test cross-system `spkiBase64FromJwk(n,e)` doit reconstruire exactement la clé publique de signature.


## PIT-S68-002 — La section « RETOMBÉE CI » d'un briefing peut être elle-même périmée : lire le job, pas l'énoncé de la spec
Au S68, le lead a averti l'agent contre la lecture d'énoncés périmés, PUIS a écrit dans le même briefing une section « retombée CI » fausse : elle affirmait qu'`auth-signature.spec.ts` skippe en CI et que le mode dégradé virerait au rouge. Source de l'erreur : le lead a lu l'en-tête § « Conditionnement » de la spec (écrit au S50) au lieu de lire `ci.yml`. Depuis #462/S64, le job `e2e` lance DEUX serveurs Next (`:3000` dégradé, `:3001` vérifiant) encadrés par un oracle `probe_mode` — la spec ne skippe pas, elle tourne contre `:3001`. Le commentaire de spec était périmé de quatre sprints. Prévention : toute affirmation sur le comportement CI se vérifie dans `.github/workflows/ci.yml` à l'instant T, jamais dans un commentaire de code qui le décrit. Même famille que [[upstream-blocker-verdict-expires]] — la « retombée CI » d'un briefing n'est pas une source, c'est une hypothèse à valider.


## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.


## PIT-S70-001 — Un briefing peut attribuer un identifiant `BR-*` à la mauvaise règle : grepper le pack AVANT de s'y appuyer
Au S70, le briefing du lead affirmait « BR-EVE-009 = perf de l'aperçu live, débounce 150 ms ». **Faux** : `br-events.md:92` définit BR-EVE-009 comme le **modèle couleur event** (design v3 #44), et `grep -ci debounc` sur le pack rend **0**. Origine : les commentaires PRÉ-EXISTANTS `EventEditForm.tsx:174` et `:289` propagent déjà cette mauvaise attribution, et le lead les a recopiés sans vérifier la source. Le fullstack-dev a détecté l'écart et l'a **signalé sans corriger silencieusement** les deux commentaires — bon arbitrage : renommer ou réattribuer une BR est une décision, pas un nettoyage de passage. Prévention : tout identifiant `BR-*`/`PIT-*` cité dans un briefing se vérifie par un `grep` dans le pack correspondant, **y compris ceux que le lead fournit**. Même famille que [[PIT-S68-002]] et `upstream-blocker-verdict-expires` : l'énoncé n'est pas la source.


## PIT-S70-002 — « Pré-existant, non lié au sprint » : l'étiquette d'un audit se réfute avec la CI de la base
Au S70, le premier passage du `test-runner` a rendu `PARTIAL_FAILURE` avec deux verdicts faux, tous deux étiquetés « pré-existant ». (1) « `npm run build` FAIL, page `/terms` manquante » — la page existe, et surtout **la CI de `dev` était verte sur `fd954b2`, la base exacte du sprint**, alors que la CI lance le build. (2) « E2E 4 failed / 247 skipped, serveur `next dev` défaillant » — l'agent avait lancé un build **contre un `next dev` en cours**, piège nommé dans le runbook E2E S47, provoquant le 500 `InvariantError: clientReferenceManifest` qui tue `auth.setup.ts` ; il a donc créé la panne puis l'a imputée au code. Prévention, deux réflexes gratuits : **comparer tout échec dit « pré-existant » à la CI du SHA de base** (`gh run list --branch dev`), et **distinguer « rouge » de « non mesuré »** — une suite dont le `setup` échoue et qui passe 247 specs en `skipped` n'a rien mesuré, ne jamais l'écrire comme un résultat.


## PIT-S70-005 — `check-sprint-completeness.sh` teste LIGNE PAR LIGNE : une négation coupée par un retour à la ligne n'est pas reconnue
Le hook cherche `RECOMMAND_<SPEC>` puis teste, **sur la même ligne**, un motif de négation (`pas de.{0,5}recommand`, `^\s*-?\s*(pas de|aucun)`, `non applicable`, `n/a`…). Au S70, trois négations parfaitement explicites ont été comptées comme signaux non traités uniquement parce que le retour à la ligne d'un paragraphe markdown séparait le « Pas de » du `RECOMMAND_DB_EXPERT`. Symptôme trompeur : `/sprint end` bloque en Phase 1 alors que les `done.md` sont conformes sur le fond. Prévention : dans un `done.md`, écrire **une négation par ligne**, commençant par la négation et portant l'identifiant du signal sur cette même ligne (`- Pas de \`RECOMMAND_X\` : <raison>`). Ne jamais réécrire pour « faire passer » un signal réellement pendant — ici seule la mise en forme était en cause, le fond était déjà correct.


## PIT-S70-006 — Un écart transmis par un agent qui n'a pas ouvert de navigateur est une HYPOTHÈSE, pas un constat
La vague 1 du S70 a livré une liste de 4 « écarts visuels connus », que le lead a recopiée telle quelle dans le briefing de la vague 2 comme checklist d'entrée. La vérification mesurée en a **réfuté 2** : le « double filet » header/aperçu (filets réellement distants de **207 px** en clair, 187 px en sombre) et l'« amputation du corps défilant » (le bandeau occupe 29,6 % de 700 px, il reste 418 px). Les deux venaient d'une lecture de code, pas d'une observation. Prévention : étiqueter explicitement la provenance de chaque écart transmis entre vagues (`mesuré` vs `déduit du code`) — un agent qui n'a pas rendu la page ne peut produire que des hypothèses, et les propager comme des faits fait perdre du temps à la vague suivante.


## PIT-S71-001 — Un inventaire fourni par un énoncé (surfaces, occurrences) est un point de départ, jamais le périmètre
Deux occurrences au S71. (1) #495 : « les 3 surfaces d'édition `EventDrawer` / `TimelineEditHost` / `ConflictDialog` », affirmé par l'issue, par le `done.md` du S70 et par 2 blocs de commentaires d'`EventEditForm.tsx` — **deux des trois ne montent pas `EventEditForm`** ; un `grep -rn "<EventEditForm"` (2 s) réfute l'énoncé et divise le périmètre par 3. (2) #496 : le briefing nommait 2 renvois `BR-*` fautifs, le repo en portait **4**. Prévention : grepper l'inventaire sur le code AVANT d'agir, et classer chaque occurrence RECIBLÉ / INTACT — la trace du tri prouve qu'on n'a ratissé ni trop large ni trop court. Même famille que [[PIT-S70-001]] et [[upstream-blocker-verdict-expires]] : un énoncé recopié n'acquiert pas de vérité par répétition. (Sprint 71 #495 #496)


## PIT-S71-002 — RTK ne fait pas que tronquer l'affichage : il CORROMPT des sorties qui servent de données
Extension mesurée au S71 de [[rtk-git-diff-empty-output]] et [[BUG-S70-002]] (portée plus large qu'écrite). (1) `rtk proxy git diff > f` a produit un **patch inapplicable** (#134) : `git add -p` étant par ailleurs indisponible, le plumbing git est resté le seul chemin sûr. (2) `grep -oE` sur `br-events.md` a rendu une liste d'identifiants **amputée de BR-EVE-010** (#496) — choisir un id « libre » dessus aurait réutilisé un id OCCUPÉ ; `rtk proxy grep` a rétabli la liste. Prévention : toute sortie qui sert de DONNÉE (patch, liste d'identifiants, comptage) passe par `rtk proxy` ET se recoupe par une seconde commande. (Sprint 71 #134 #496)


## PIT-S71-004 — `mvnw surefire:test` ne recompile PAS les tests : le verdict peut venir d'une classe périmée
`./mvnw -o surefire:test -Dtest=X` n'invoque pas la phase `test-compile` du cycle de vie ; après édition d'un test, c'est le `.class` de la compilation précédente qui tourne. Le rouge (ou le vert) obtenu ne décrit alors pas le code qu'on vient d'écrire. Prévention : `./mvnw -o test-compile` avant tout `surefire:test` ciblé, ou lancer `test` tout court. (Sprint 71 #148)


## PIT-S71-005 — Un `trap EXIT` de restauration à chemin RELATIF ment : il annonce `[restored]` sur un fichier encore muté
Script de mutation testing (#495) : `trap restore EXIT`, puis la suite Playwright lancée depuis `frontend/` via un `cd`. Le trap s'exécute dans le cwd **final** → `FileNotFoundError` sur le chemin relatif, fichier source resté **muté** dans un working tree partagé par 3 autres agents — et le script a rendu `exit 0` en affichant `[restored]`. Prévention : chemins **absolus** dans tout trap de restauration, et vérifier la restauration par un `grep -c` du motif attendu, jamais par la sortie du script. (Sprint 71 #495)


## PIT-S71-006 — Compter les tests d'un pack coverage par `grep -c '@Test'` est faux dès qu'il existe un `@ParameterizedTest`
Une méthode `@ParameterizedTest` compte pour 1 déclaration et N exécutions (`PasswordPolicyTest` : 4 déclarées / **29 exécutées**). Au S71, la reprise des compteurs de `coverage-auth.md` depuis surefire a corrigé **7 écarts** (total 155 → 172) et exhumé une **classe fantôme inexistante à HEAD** (`JwtServiceSecretValidationTest`, renommée depuis N sprints) : un compteur faux survit indéfiniment parce que rien ne le confronte au réel. Prévention : compter depuis `target/surefire-reports/*.txt` (`Tests run:`), jamais depuis les annotations, et consigner la méthode en tête de pack. (Sprint 71, cycle de correction)


## PIT-S71-009 — `Map.of` plafonne à 10 paires clé/valeur
`RateLimitingFilter.LIMITS` en comptait 8 ; deux ajouts la portaient **pile** à 10 — la prochaine entrée n'aurait plus compilé, pour une raison sans rapport avec le sujet du commit. Bascule préventive sur `Map.ofEntries`. Prévention : toute map de configuration statique qui approche 8 entrées passe en `ofEntries`. (Sprint 71 #134)


## PIT-S71-010 — Indexer ses seuls hunks dans un working tree partagé : plumbing git, jamais le working tree
`UserControllerTest.java` était édité en parallèle par #134 et #148. `git add -p` est indisponible (mode non interactif) et le diff redirigé est corrompu ([[PIT-S71-002]]). Recette : `git cat-file -p HEAD:<path>` → reconstruction du contenu voulu → `git hash-object -w` → `git update-index --cacheinfo` : l'index reçoit la version voulue et **le working tree n'est jamais touché**, donc le WIP du voisin reste intact. Complément de [[sprint-parallel-commits-shared-worktree]]. (Sprint 71 #134)


## PIT-S72-001 — Une référence « BR-XX » écrite dans un commentaire n'est pas une preuve
`BrevoEmailService` et 12 autres emplacements attribuaient l'anti-énumération de forgot-password à **BR-AUT-005**, qui est en réalité « échec d'authentification → 401 ». La bonne règle est **BR-AUT-012**. L'erreur datait de #49 et s'est propagée par recopie — le lead lui-même l'a reprise dans son premier briefing avant de la corriger. Prévention : vérifier l'énoncé dans `br-<domaine>.md` avant de reprendre une référence lue dans du code ou une issue. Généralise [[PIT-S70-001]]. (Sprint 72 #142)


## PIT-S72-003 — Ne jamais modifier le texte d'une migration Flyway déjà appliquée, même un commentaire
La review batch recommandait de corriger l'étiquette BR fausse dans `V6__create_password_reset_tokens.sql`. Appliqué tel quel, ce changement de **commentaire** modifie le checksum de la migration et fait échouer la validation Flyway au démarrage sur toute base existante. Le reviewer n'avait pas vu ce piège. Prévention : les fichiers `db/migration/V*.sql` sont immuables une fois appliqués ; une correction documentaire les concernant se met ailleurs (javadoc de l'adapter, pack domaine). (Sprint 72, review batch)


## PIT-S72-004 — Le premier hit d'une route sous `next dev` dépasse un timeout Playwright de 5 s
La suite E2E est morte au projet `setup` (`provision shared`), 248 tests non exécutés : `expect(getByTestId('dashboard')).toBeVisible()` a 5 s de timeout, or le **premier** `GET /fr/dashboard` a pris **4172 ms** (compilation webpack 3,4 s) contre 72/59/35 ms ensuite — les 3 provisions suivantes sont passées. Diagnostic par lecture des durées dans le log `next dev`, pas par hypothèse. Prévention : préchauffer les routes ou relancer une fois avant de conclure à un défaut ; un échec du **seul premier** cas d'une série identique désigne l'environnement, pas le code. (Sprint 72)


## PIT-S72-005 — Un conteneur e2e « prêt à l'emploi » peut porter une image antérieure au code du sprint
`mytimeline-e2e-backend-e2e-1` était disponible et correctement configuré, mais son image précédait #142 : l'utiliser aurait rendu une suite verte **sans aucune valeur** sur le code à valider. Recette retenue : `./mvnw package -DskipTests` puis `java -jar` sur `:8086`, en ne réutilisant du conteneur que la base Postgres. Prévention : avant de s'appuyer sur un backend conteneurisé pour valider un diff, comparer la date de l'image aux commits à tester. Nuance [[mytimeline-e2e-ci-only-gate]] §S61 qui recommandait ce raccourci. (Sprint 72)


## PIT-S72-006 — Un run de tests dans un working tree partagé n'est valable que si `git status` est stable de bout en bout
La suite frontend est sortie rouge (4 tests / 1 fichier) pendant que l'agent de #142 éditait `authService.ts` dans le même arbre ; verte au re-run isolé. Prévention : en fan-out, re-jouer avant d'imputer un échec à son propre diff. Corollaire direct de l'étiquette « pré-existant » et complément de [[PIT-S71-010]]. (Sprint 72 #72)


## PIT-S73-004 — Un `test-runner` délégué conclut « E2E impossible » à tort — 4 fois sur 4 sur ce projet
S73 : verdict `INDETERMINE` sur « `next dev` échoue sur la branche du sprint, marche sur `origin/dev` ⇒ régression de build ». Réfuté en 45 s : `next dev` démarre en 1,25 s et la suite passe 249/0. Cause réelle = inférence de workspace root en worktree ([[PIT-S61-007]]), déjà documentée dans `frontend/playwright.config.ts` avec sa recette de contournement (webpack, pas turbopack). Prévention : le lead lance la suite lui-même (~6 min) plutôt que de déléguer ; lire `playwright.config.ts` AVANT tout diagnostic. Précédents : S49 ×2, S51. (Sprint 73)


## PIT-S73-005 — Un briefing qui pointe un chemin de règles inexistant fait passer les subagents pour négligents
Les 3 briefings du S73 citaient `.claude/rules-jit/frontend.md` : ce fichier n'existe pas (seul `ux-patterns.md` est présent sous `.claude/rules-jit/`). Les 3 subagents ont dûment rapporté « non lu » en écart au briefing — écart imputable au lead, qui avait recopié la liste générique du skill sans la vérifier. Prévention : `ls` les chemins de contexte avant de les inscrire dans un briefing. Voir aussi les chemins fantômes déjà relevés aux S45-S49. (Sprint 73)


## PIT-S73-008 — Deux subagents en fan-out qui partagent la stack E2E se corrompent mutuellement
Deux absorptions lancées en parallèle dans le même worktree ont chacune démarré `next dev` + Playwright : `.next` corrompu en cours de run (`Cannot find module './vendor-chunks/…'`, 500 sur `/fr/dashboard`) → tests rouges dont le diagnostic accuse FAUSSEMENT le code de la page ; puis 3 runs perdus sur le verrou `e2e/.auth/run.lock`. Prévention : sérialiser les agents qui ont besoin de la stack E2E, ou ne paralléliser que ceux qui n'en ont pas besoin. (Sprint 73)


## PIT-S73-009 — `Date.now()` comme suffixe de nom sur un compte E2E partagé collisionne, et remonte en 500
`uq_categories_owner_name` est `UNIQUE(owner, name)` : à `workers: 2`, deux tests seedant « S73 <timestamp> » dans la même milliseconde violent la contrainte. Le backend remonte **500** (pas 409) → diagnostiqué à tort comme « backend cassé ». Prévention : toujours le helper `unique()` de `frontend/e2e/support/products.ts`. (Sprint 73)


## PIT-S74-003 — Un énoncé d'issue peut nommer le mauvais composant, et la recon du lead peut relayer l'erreur
« Le tablist des réglages » de #417 ne passe PAS par `.mt-tab` du DS : `SettingsShell.tsx` utilise des utilitaires Tailwind bruts, `.mt-tab` sert aux onglets **produits**. Appliquer le CSS nommé par l'issue aurait corrigé un composant voisin en laissant le vrai défaut. Le briefing du lead relayait l'erreur — une recon de lead ne l'immunise pas, elle déplace l'erreur d'un cran. Au S74, **3 énoncés sur 4** portaient une piste technique fausse ou périmée (chemin vidé par un sprint antérieur, lignes inexistantes, pattern non transposable). Prévention : `grep` du sélecteur **dans le `.tsx`** avant d'éditer le CSS nommé, et dire explicitement au subagent que le briefing peut se tromper. (Sprint 74 #417 / #342 / #343)


## PIT-S74-007 — `warn-test-delegation.sh` bloque aussi le heredoc qui CONTIENT la commande, et l'échec se déguise en lancement réussi
Le hook scanne le texte de l'appel `Bash` : écrire un script avec un heredoc contenant `npx playwright test` est bloqué comme si on la lançait. Conséquence vécue au S74 : le heredoc bloqué n'a pas créé le `.sh`, l'appel suivant a lancé `nohup` dessus et a rendu un `pid=` rassurant — **10 minutes d'attente sur un run qui n'existait pas**. Prévention : préfixer de `SKIP_DELEGATION=1` **l'appel qui écrit le script**, pas seulement celui qui l'exécute, et vérifier `ls -l` du script avant tout `nohup`. (Sprint 74)


## PIT-S74-008 — RTK transforme un `prettier --check` ROUGE en « All files formatted correctly »
Famille [[PIT-S62-010]], élargie au S74. `npx prettier --check <fichier>` a rendu « Prettier: All files formatted correctly » (résumé RTK) là où la sortie brute disait `[warn] … Code style issues found`. Deux appels successifs sur le MÊME fichier intact ont donné les deux verdicts opposés — le filtre ne s'applique pas de façon déterministe. Conséquence évitée de justesse : croire que son propre edit avait cassé le formatage et lancer un `prettier --write` qui reformate 60 lignes sans rapport dans un fichier shadcn jamais conforme. Prévention : `rtk proxy npx prettier --check …` pour tout verdict de formatage, et **vérifier l'état de la BASE** (`git show origin/dev:<path>`) avant d'imputer une non-conformité à son propre diff. Note connexe : la CI de ce dépôt ne lance PAS prettier (aucune occurrence dans `.github/workflows/`) — le formatage n'est pas un gate. (Sprint 74)


## PIT-S75-001 — Le `default export` d'un request-config next-intl est INTESTABLE sous Vitest : le stub react-client lève
Vitest résout `next-intl/server` sur son bundle **react-client**, où `getRequestConfig` est remplacé par un stub qui lève « not supported in Client Components » — trois tests rouges d'emblée, pour une raison qui n'a rien à voir avec le code testé. Or c'est précisément la branche de repli de `resolveLocale` dont la sémantique changeait en #279, et `next build` ne l'exerce pas (il ne prérend que des segments valides). Remède retenu : extraire la logique pure (`resolveLocale`) et la tester ; le `default export` reste couvert par le build. Prévention : ne pas promettre de test unitaire sur un artefact RSC-only — le repérer AVANT d'annoncer une stratégie de test. (Sprint 75 #279)


## PIT-S75-002 — RTK falsifie aussi la sortie de `next build`, et la redirection vers fichier ne désamorce RIEN
Famille [[PIT-S74-008]] / [[BUG-S70-002]], élargie au cas le plus trompeur. `npx next build` filtré a rendu « **2 routes (1 static, 1 dynamic)** » en 8,2 s là où le vrai build produit **52/52 pages** sur 99 lignes. Le point nouveau et contre-intuitif : **`> log` capture la sortie DÉJÀ résumée** — le fichier fait 5 lignes, donc un `tail` comme une relecture complète du fichier **confirment le faux chiffre**. Le réflexe « je redirige pour ne pas me faire filtrer » ne protège pas. Prévention : sur toute commande dont la SORTIE EST LA PREUVE (build, test, check de formatage), passer par `rtk proxy` **d'emblée**, et vérifier `echo "exit=$?"`. (Sprint 75 #279)


## PIT-S75-003 — Un énoncé qui se déclare « non-impactant au runtime » est une hypothèse à réfuter, pas un fait
#279 affirmait noir sur blanc « Non-impactant au runtime actuel […] indépendant de `getRequestConfig` ». Faux : `next.config.mjs` fait `createNextIntlPlugin('./i18n.ts')`, ce qui en fait le request-config ACTIF, et les pages légales y résolvent leurs messages via `getTranslations`. La conséquence n'est pas académique — elle change la preuve exigible : un `vitest` vert ne prouvait rien, seul un `next build` le pouvait. Troisième sprint consécutif où l'énoncé se trompe ([[PIT-S74-003]], [[DEC-S72-004]]). Prévention : traiter toute clause d'innocuité d'une issue comme une affirmation à vérifier — ici, deux `grep` (le plugin, les appelants) suffisaient. (Sprint 75 #279)


## PIT-S76-001 — `deleteById(ID)` hérité de `SimpleJpaRepository` n'est PAS une requête mais DEUX, et un « double-hit » annoncé est un TRIPLE
`SimpleJpaRepository.deleteById` fait `findById().ifPresent(delete)` : un `SELECT` **puis** un `DELETE`. Précédé d'un `existsById` (`SELECT count(*)`), le coût réel est de **3** instructions, pas 2 — l'énoncé de #175 disait « double-hit ». Conséquence directe : le correctif « évident » (`findEventById(...).orElseThrow()` puis `deleteById(id)`) **n'économise rien**, il remplace le `count` par un `SELECT` et laisse `deleteById` refaire le sien. Ne pas refactorer sur la foi d'un compte annoncé : mesurer avec `Statistics.getPrepareStatementCount` sur un test d'intégration. Nuance qui a changé la conclusion : `open-in-view` est ACTIF ici, donc le compte isolé du service diffère du compte du chemin HTTP réel (3 vs 3 avant, 1 vs 2 après) — mesurer la séquence du contrôleur, pas seulement la méthode. (Sprint 76 #175)


## PIT-S76-002 — Un DELETE bulk JPQL n'est pas versionné : il retire silencieusement le verrou optimiste que `em.remove` appliquait
Sur une entité portant `@Version`, `em.remove` émet `DELETE … WHERE id=? AND version=?` ; un `DELETE FROM E e WHERE e.id = :id` émet `WHERE id=?`. Remplacer l'un par l'autre pour gagner une requête supprime donc une garantie de concurrence — **sans aucun test rouge**. Trouvé en review DB au S76, invisible aux 564 tests existants. Vérifier par un contrôle négatif (édition concurrente committée en `REQUIRES_NEW` imbriquée, déterministe, ni thread ni timing) plutôt que par raisonnement. Nuance mesurée : la fenêtre réellement protégée n'était pas « édité pendant que la page est ouverte » mais les millisecondes INTRA-REQUÊTE entre le `SELECT` d'ownership et le flush — un artefact d'`open-in-view`, pas une garantie métier. La décision reste défendable, mais elle doit être écrite ET épinglée par un test. (Sprint 76 #175)


## PIT-S76-005 — zsh ne fait pas de word-splitting : `git add -- $F` avec une liste de chemins en variable ne stage RIEN
Sous zsh (shell de ce poste), `$F` contenant plusieurs chemins arrive comme **UN SEUL** pathspec : `git add` sort en 128, rien n'est indexé. L'échec est bruyant donc bénin, mais il coûte un aller-retour à chaque agent d'une vague de fan-out — et le même piège produit des FAUX POSITIFS silencieux dans les boucles d'audit (`for tid in $NEW_TESTIDS` du check coverage-E2E a rendu un MAJEUR fantôme au S76). Écrire les chemins littéralement, ou `${=F}`, ou un tableau. À corriger dans les gabarits de briefing qui recommandent « `git add <fichiers exacts>` ». (Sprint 76 #310)


## PIT-S76-007 — Le vérificateur de complétude de sprint lit LIGNE À LIGNE : une négation `RECOMMAND_*` repliée par le formatage compte comme signal NON TRAITÉ
Récurrence mesurée de [[PIT-S70-005]] / [[PIT-S67-004]] au S76 : le done.md de #310 portait « … ; pas\nde `RECOMMAND_DB_EXPERT` ni de `RECOMMAND_SECURITY_EXPERT` car … ». Le « pas » étant sur la ligne précédente, `check-sprint-completeness.sh` a compté **deux** signaux actionnables non traités et bloqué la clôture. Le piège n'est pas la rédaction mais **le repli à 100 colonnes** appliqué après coup. Écrire chaque négation sur UNE ligne, et le dire dans le done.md pour qu'un reformatage ultérieur ne la casse pas. Même famille : le garde-fou de Phase 9 grep `[MISSING]` littéralement et se déclenche sur la PHRASE QUI LE DOCUMENTE dans l'audit. (Sprint 76, clôture)

---

## §2 — Index historique (titre = règle ; détail dans docs/memory/pitfalls.md)

- PIT-S1-001 — @NotBlank sur un DTO de PATCH casse les updates partiels
- PIT-S1-002 — @Valid inerte si le DTO ne porte aucune contrainte
- PIT-S1-003 — jwtService.extractUsername non catché dans un controller → 500
- PIT-S1-004 — `git add -A` dans un worktree sprint capture les artefacts d'orchestration
- PIT-S2-001 — Build backend = `cd backend && mvn` (wrapper + helper réparés Sprint 4)
- PIT-S2-002 — Tester un contrat 401/403 Spring Security exige le full filter chain
- PIT-S2-003 — `@Bean` injecté par un filtre lui-même injecté dans la `@Configuration` qui le déclare → cycle
- PIT-S2-004 — `getServletPath()` vide en MockHttpServletRequest → matcher de Filter cassé
- PIT-S2-005 — Ne jamais faire confiance à `X-Forwarded-For` par défaut pour une clé de sécurité
- PIT-S3-001 — `ddl-auto=update` ne fiabilise PAS les contraintes UNIQUE
- PIT-S3-002 — Corriger `.gitignore` ne dé-tracke pas un fichier déjà suivi
- PIT-S3-003 — `validate` actif : toute colonne entité doit matcher EXACTEMENT la colonne SQL
- PIT-S3-004 — Baseline Flyway depuis métadonnées Hibernate omet les contraintes legacy hors-Hibernate
- PIT-S3-005 — Subagent fullstack-dev lancé depuis un worktree `/sprint` commite sur `dev` du checkout principal
- PIT-S4-001 — MockMvc `standaloneSetup` n'enregistre PAS le `@RestControllerAdvice`
- PIT-S4-002 — MockMvc `standaloneSetup` ne résout pas les champs `@Value`
- PIT-S4-003 — Le header CSP backend ne régit QUE les réponses de l'origine backend
- PIT-S4-004 — Matcher Mockito ambigu sur méthode surchargée
- PIT-S4-005 — `git add -A` dans un worktree `/sprint` aspire les artefacts d'orchestration du lead
- PIT-S5-001 — Baseline Flyway générée depuis Hibernate metadata = drift silencieux
- PIT-S5-002 — Migration durcissante + `baseline-on-migrate=true` s'applique aux bases PEUPLÉES
- PIT-S5-003 — Exception Security jamais routée vers le `@RestControllerAdvice` (corollaire 401)
- PIT-S5-004 — Worktree partagé multi-agents (fan-out /sprint, même working tree)
- PIT-S8-002 — Anti-énumération : vérifier le TIMING, pas que le code retour
- PIT-S8-003 — Tester `@Async` : mocker les ports + latch, pas de DB réelle
- PIT-S9-001 — CHECK constraint legacy bloque la conversion d'une colonne vers un enum
- PIT-S10-001 — Ajout d'un `owner_id` : scoper la MUTATION mais pas la LECTURE laisse une fuite cross-tenant
- PIT-S10-002 — `@ExceptionHandler(DataIntegrityViolationException)` global masque toutes les violations en 409
- PIT-S10-003 — `repository.save(mapper.toEntity(domain))` d'un update, domaine sans `@Version`
- PIT-S10-004 — `@SQLRestriction` masque les lignes lors des opérations transverses (réassignation/comptage) → orphelins FK
- PIT-S10-005 — Valider l'ownership de la ressource CIBLE, pas seulement de la ressource parente
- PIT-S12-001 — `*RepositoryJpaImpl.save` reconstruisant une entité détachée (version=null) au PATCH
- PIT-S12-002 — Retirer un appel repo casse les stubs Mockito strict des AUTRES tests
- PIT-S13-001 — Purge multi-tables d'un user : `@SQLRestriction` masque les lignes archivées → FK résiduelle bloque le DELETE
- PIT-S13-002 — Nouvel appel de port dans un handler → stub Mockito manquant = 401 faux négatif
- PIT-S13-003 — `jwt.secret` de profil test non-Base64 → `generateToken` DecodingException
- PIT-S13-004 — `SecurityContext` thread-local fuité d'un test slice pollue les tests full-chain suivants
- PIT-S14-001 — jjwt 0.12+ : `signWith(key)` seul déduit l'algo selon la taille de clé → figer l'algo
- PIT-S14-002 — Architect Phase 0.5 « aucune evidence » faux négatif : lire le fichier cible réel, pas grep du nom d'exception
- PIT-S15-002 — E2E full-stack cross-port : cookie JWT SameSite=Lax non envoyé sur POST
- PIT-S15-003 — `JWT_SECRET` CI doit être Base64 valide ≥32 octets
- PIT-S16-001 — ArchUnit : exception croisée = UN prédicat combiné, pas deux `dependOnClassesThat` chaînés
- PIT-S23-001 — CVE spring-security-web non backportée sur la ligne 6.4.x (rester sur Boot 3.4.x impose override 6.5.x)
- PIT-S23-002 — `@MockBean`/`@Mock` sur `*ServiceImpl` concret masque une violation DIP (fonctionne mais ment)
- PIT-S25-001 — Élargir un record domaine casse tous les constructeurs positionnels des tests
- PIT-S25-002 — Test optimistic-lock à 2 threads concurrents = flaky (timing-sensible), pas « stabilisable »
- PIT-S27-001 — Extraire un claim JWT (jti/custom) HORS du SecurityContext doit lire le token à la MÊME source que JwtFilter (cookie + Bearer)
- PIT-S28-001 — Un `case`-arm de test partagé entre scopes de nature différente = faux vert silencieux
- PIT-S29-001 — RTK tronque/mélange la sortie de `docker compose build/ps`
- PIT-S32-001 — Port repository custom : éviter le nom `findById` (collision covariante SimpleJpaRepository)
- PIT-S32-002 — Ajouter une entrée `PATH_LIMITS` casse les tests d'intégration POSTant sur ce path
- PIT-S35-001 — Property `${VAR}` sans inner-default lue à `ApplicationEnvironmentPreparedEvent` → placeholder opaque avant le message métier
- PIT-S37-001 — Filtre lisant le body avant le controller sur endpoint public non authentifié → vecteur OOM/DoS
- PIT-S37-002 — `@SpringBootTest(properties={...})` unique crée un contexte caché (+1 pool Hikari) → "too many clients" Postgres
- PIT-S37-003 — E2E : DB dev locale bloquée à une vieille version Flyway → boot backend échoue sur données stale
- PIT-S37-004 — Seed dans un test d'intégration non-`@Transactional` + id pré-assigné sur entité `@GeneratedValue`
- PIT-S41-004 — `./scripts/test-quiet.sh frontend` lancé depuis le repo principal (pas le worktree) → faux échec `eslint-plugin-storybook`
- PIT-S42-001 — Update-in-place de l'entité managée défait l'optimistic-lock (`@Version`)
- PIT-S42-002 — Réponse d'erreur portant un état serveur : ownership AVANT sérialisation
- PIT-S44-001 — `EventCreationRequest` : `durationValue`/`durationUnit` requis MÊME pour `type='single'`
- PIT-S44-002 — `ProductCreationRequest.events` sans `@Valid` : l'absence de cascade est STRUCTURELLE, ne pas la « corriger »
- PIT-S45-005 — Vagues parallèles : « prendre le prochain numéro libre » produit des collisions (2× ADR-004)
- PIT-S45-009 — Choisir un `@Profile` sans vérifier `SPRING_PROFILES_ACTIVE` du job CI : vert en local, rouge en CI
- PIT-S46-004 — Le gate `[MISSING]` de `/sprint end` grep le littéral : écrire « aucun [MISSING] » bloque la PR
- PIT-S47-001 — Un `find` qui renvoie 0 ne prouve PAS une absence : le cwd du shell persiste entre les appels
- PIT-S47-002 — Le profil `dev` fige `app.cors.allowed-origins=:3000` : un front sur un autre port échoue en accusant le rate-limit
- PIT-S47-003 — La base de dev `eventmanager` est inmigrable : V7 casse sur des données que V9 nettoierait
- PIT-S47-004 — `workers > 1` rougit 4 specs `settings-*` : DEUX causes distinctes, même signature
- PIT-S49-006 — Deux agents ont déclaré la stack E2E morte alors qu'elle tournait ; et `test-quiet.sh e2e` contourne le `--workers=1` du runbook
- PIT-S50-001 — L'`alg` d'un JWT est choisi par le PORTEUR du jeton, et une clé publique est publique
- PIT-S50-002 — Un défaut « dégradé silencieux » n'échoue pas au boot : c'est exactement ce qui le rend dangereux
- PIT-S50-005 — `openssl … | base64` replie à 76 colonnes sur GNU, pas sur BSD/macOS
- PIT-S50-006 — Un audit documentaire écrit en vague N est périmé par le code de la vague N+1 du MÊME sprint
- PIT-S50-007 — Le hook RTK tronque les SORTIES, pas seulement les diffs : il fausse les MESURES
- PIT-S50-008 — Retirer un défaut vide d'`application-prod.properties` casse le message du garde-fou
- PIT-S52-002 — Un port qui répond ne prouve pas que c'est VOTRE process qui répond
- PIT-S52-005 — Sonde `wget localhost` en image alpine : `unhealthy` à vie sur une app qui répond 200
- PIT-S52-006 — Un plan d'architecte peut produire le FAUX négatif de chemin fantôme
- PIT-S52-007 — Le hook RTK décale aussi `git log` (amende PIT-S50-007)

