# Pitfalls — stack `frontend` (MyTimeline)

> **GÉNÉRÉ — ne pas éditer à la main.**
> Source : `docs/memory/pitfalls.md` · Table : `.ai-env/tools/pit-classification.tsv`
> Régénérer : `bash .ai-env/tools/gen-pit-packs.sh` (fin de sprint, après consolidation).
>
> Entrées classées `frontend`, `both` ou `tooling`. Les `tooling` (worktree, RTK,
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


## PIT-S22-001 — `next build` (lint bloquant) attrape des erreurs invisibles à tsc + vitest
En S22 #68, `next build` échouait sur `no-unused-vars` (`nameConflict` en `useState` jamais lu, le 409 étant surfacé via `form.setError`) — INVISIBLE à `tsc --noEmit` et à la suite Vitest (306 verts). Seul le lint gate de `next build` l'attrape. Règle : `npm run build` OBLIGATOIRE en fin de TOUTE tâche frontend, pas seulement tests+tsc. Fix S22 : consommer la valeur en `aria-invalid` (lint OK + a11y). (Sprint 22 #68)


## PIT-S22-003 — Garde-fou cwd worktree : le bloc EN TÊTE reste indispensable (récurrence S22)
Confirme PIT-S21-001 : en S22, #62 (garde cwd reléguée dans « Contraintes », pas en tête) a ENCORE écrit dans le repo principal avant rapatriement manuel. À l'inverse #68 et le fix review217 (bloc `⚠️ GARDE CWD WORKTREE` en TOUT PREMIER + chemins absolus + `git -C <worktree>`) n'ont eu AUCUNE fuite. Règle : le bloc worktree va en première ligne du briefing, jamais dans une section basse. (Sprint 22 #62 vs #68)


## PIT-S24-002 — Subagent worktree : Read/Edit en chemin RELATIF (et `cd` compound) résolvent sur le repo PRINCIPAL
Prolonge PIT-S22-003 (au-delà du seul `cd`) : en S24 #82, un `Read`/`Edit` en chemin relatif a résolu sur le repo principal (`dev`), pas le worktree (`sprint/24`) → édition livrée au mauvais endroit, invisible au commit worktree, détectée seulement via `git rev-parse --show-toplevel`. Règle : TOUJOURS chemins absolus préfixés worktree pour Read/Edit ; `git -C <worktree>` jamais `cd` ; vérifier `--show-toplevel == worktree` AVANT toute écriture, pas seulement avant commit. (Sprint 24 #82)


## PIT-S27-002 — `git diff > patch.diff` via le hook RTK produit une sortie compactée non-parsable par `git apply`
En S27, un subagent voulant relocaliser des edits (mauvais worktree, cf [[PIT-S24-002]]) via `git diff > patch.diff` puis `git apply` a échoué : le hook RTK réécrit `git diff` et compacte la sortie → « No valid patches in input ». Prévention : pour un patch brut valide, `rtk proxy git diff` (bypass filtre) ou ré-appliquer les edits directement via Write/Edit. (Sprint 27 #122)


## PIT-S27-003 (renforce [[PIT-S24-002]]) — Worktree : même les chemins ABSOLUS vers `/MyTimeline/backend/...` ciblent le repo PRINCIPAL, pas le worktree
S27 : 3 subagents sur 5 ont initialement écrit dans le repo principal (`dev`) — pas seulement via chemins relatifs (PIT-S24-002) mais aussi via chemins absolus `/Users/herrh/VSProjects/MyTimeline/backend/...` (= le repo principal, PAS le worktree `.claude/worktrees/<slug>`). Tous se sont auto-récupérés (relocalisation + `git checkout`/`rm` sur dev). Le garde-fou textuel dans le briefing n'a PAS suffi. Prévention durable : garde-fou `git rev-parse --show-toplevel` == worktree ET `git branch --show-current` == `sprint/N` AVANT chaque écriture ; préfixer TOUT chemin par le répertoire worktree complet. (Sprint 27 #93/#122/#154)


## PIT-S41-005 — `next build` (ESLint CI) échoue sur `no-unused-vars` invisible à `vitest`
En S41, une variable inutilisée dans un fichier de test (`const user = userEvent.setup()` dans un test qui n'utilise que `fireEvent.keyDown`) passe `vitest run` (456/456 vert) mais fait ÉCHOUER le job CI `frontend` : `next build` lance ESLint sur les tests et traite `@typescript-eslint/no-unused-vars` en ERREUR (`Failed to compile`). **Règle : un run vitest vert ne garantit PAS le build ; valider `npx eslint <fichiers touchés>` (ou `next build`) avant push, surtout sur les fichiers de test ajoutés.** Extension concrète de la note pack cp-frontend « next build attrape des erreurs invisibles aux tests RTL ». (Sprint 41 #228, CI frontend)


## PIT-S45-003 — RTK MENT sur les résultats de tests : toujours lire le code de sortie réel
En S45, le hook RTK a été pris en défaut **deux fois** : `vitest` affiché « PASS (23) FAIL (0) » alors que `success:false` et qu'une suite échouait **à la COLLECTE** ; `prettier` affiché « All files formatted » avec **exit 1**. S'y ajoute le comportement déjà connu sur `git diff` (sortie vide/tronquée). **Règle : ne JAMAIS rapporter un test vert depuis un résumé RTK — passer par `rtk proxy <cmd>` ou un reporter JSON, et lire le code de sortie.** Un rapport d'agent qui cite des chiffres sans exit code est à re-vérifier. (Sprint 45, 3 agents concernés)


## PIT-S53-001 — En Tailwind 4, `text-*` apparie un `line-height` : layeriser une règle d'élément la lui fait céder
Le correctif de #339 layerisait les 5 propriétés de `h1..h6` en bloc. Or une utilitaire `text-*` ne pose pas
que `font-size` : elle pose **aussi** `line-height: var(--tw-leading, var(--text-lg--line-height))`, défauts
émis dans `@layer theme`. Hors layer, la règle du DS battait cet appariement ; layerisée, elle **cède**.
Mesuré : `h2.text-lg` **29,16 px (1.08) → 42 px (1,5556)**, `h1.text-xl` **37,8 → 49 px**. **28 titres** du
dépôt portent `text-*` sans `leading-*` explicite → dérive **systémique et silencieuse** du rythme typo.
Mapper `--leading-*` dans `@theme` **ne protège pas** : ça gouverne les utilitaires nommées `leading-*`, pas
l'appariement. Solution : sortir `line-height` du layer, seul ; les 4 autres propriétés y restent (elles
doivent céder, c'est l'objet de #339). Contrepartie mesurée nulle (les 6 titres à `leading-*` explicite
valent déjà 1.08).


## PIT-S53-002 — Un `:root` hors layer aux noms du namespace `@theme` rend la lecture de `@theme` trompeuse
`ds/tokens/typography.css` déclare `--leading-*` / `--tracking-*` / `--text-*` dans un `:root` **hors layer**,
avec les mêmes noms que le namespace de thème de Tailwind 4 (qui émet ses défauts dans `@layer theme`).
Hors layer battant tout layer, **les tokens du DS gagnaient déjà**. Le lead a lu l'absence de ces clés dans
`@theme` et en a conclu que le défaut Tailwind s'appliquait (« `leading-tight` rend 1.25 ») : **faux**, il
rendait 1.08. Toute une décision de sprint a été bâtie sur cette inférence. Solution : ne jamais déduire une
valeur effective de la lecture de `@theme` seul — compiler via PostCSS et résoudre la précédence de layers
(helper `winningRootVar`, `base-layer.test.ts`). Corollaire dangereux : layeriser ces `:root` ferait basculer
toute l'échelle typo/chromatique sur les défauts Tailwind.


## PIT-S53-003 — Un audit de cascade par `className` littéral rate les utilitaires passées en prop
Le balayage de #340 concluait « 0 conflit » sur `ds/components/*.css` jusqu'à ce qu'un 2ᵉ passage résolve les
**consommateurs** de chaque composant : `AppShell` rend `<Avatar className="rounded-sm">`, et le
`border-radius` du DS (7 px) annulait l'override (5 px) — l'override était un **NO-OP** depuis toujours.
Solution : tout audit de cascade doit croiser classe-source **et** prop-passthrough. Prévention : sinon il
conclut faussement à l'absence de conflit, ce qui est pire que pas d'audit.


## PIT-S53-004 — Layeriser une règle `:hover` supprime l'état de survol s'il existe une utilitaire sans variante
`.feature-card:hover{box-shadow}` et `.testimonial-card:hover{border-color}` sont en conflit réel avec
`shadow-lg` / `border-rule` posées sur les mêmes éléments — mais ces utilitaires **n'ont pas de variante
`hover:`**. Les layeriser aurait fait gagner l'utilitaire en permanence → **l'élévation au survol
disparaissait**. La « correction » aurait créé la régression. Solution : avant de layeriser, vérifier les
paires (règle `:hover` hors layer / utilitaire non-hover sur le même élément). Cf. `DEC-S53-002`.


## PIT-S53-005 — Un conflit de cascade masqué par un correctif redondant sur une AUTRE propriété
`scrollbar-none` (`@utility` → `@layer utilities`) pose `scrollbar-width: none`, que le
`* { scrollbar-width: thin }` hors layer **annulait**. Invisible en développement : sous Chromium la barre
disparaissait quand même via l'**autre** moitié de l'utilitaire (`::-webkit-scrollbar{display:none}`,
propriété différente donc jamais en conflit). **Cassé sur Firefox seul** (`ProductCarousel:50`,
`DensityRibbon:77`). Anti-pattern : conclure « ça marche » depuis un seul moteur quand une utilitaire agit
par deux propriétés distinctes. ⚠ Le correctif n'a **pas** été observé sous Firefox, seulement déduit.


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


## PIT-S54-002 — Un `grep` de testid n'atteste NI un usage réel NI un rendu
Deux faux positifs distincts, même racine, au S54. (1) **Faux OK de couverture** : le check COVERAGE-E2E du
protocole A.4 (`grep -rq "$val" frontend/e2e/`) a rendu OK sur `product-option-<id>` alors que la seule
occurrence était un **commentaire** (`timeline.spec.ts:41`) — le testid livré par #331 n'était consommé par
aucune spec. (2) **Faux « existe » de rendu** : trois specs de #330 échouaient sur un locator jamais résolu
(`timeline-zoom-in`, `timeline-fullscreen`, `timeline-loading`) — le grep prouvait qu'ils étaient *écrits*,
pas *montés* (rendu conditionnel au viewport, ou code mort masqué par un composant parent ajouté plus tard :
`AppShell` #210 court-circuite la branche loading de `timeline/page.tsx:47`). Solution : prouver un usage par
`grep -E "getByTestId|locator\("` (jamais la simple présence de la chaîne), et prouver un rendu au **runtime**
(`toHaveCount(1)` dans le contexte visé), pas au grep. Cf. [[jsdom-scroll-tests-prove-nothing]].


## PIT-S54-003 — `boundingBox()` d'un panneau animé se périme entre deux gestes et rend un oracle vacuous
Une mesure `boundingBox()` prise juste après `toBeVisible()` capture une position **transitoire** : ~24 px de
dérive mesurés sur le bottom-sheet (animation d'entrée puis réajustement de layout quand focus-trap +
scroll-lock se posent). Réutiliser cette box pour un geste `page.mouse` fait viser des coordonnées obsolètes
qui retombent sur l'élément *sous* le panneau → aucun `pointerdown` sur la cible → **aucun geste ne part**, et
un `toBeVisible()` post-geste reste vert « par inaction ». Le premier correctif (`059030d`) n'a rafraîchi que
la 2ᵉ mesure ; la review a rattrapé le 1er swipe resté vacuous. Solution : mesure fraîche **stabilisée** (deux
lectures consécutives égales, sans `waitForTimeout` arbitraire) avant CHAQUE geste, **plus** un oracle positif
que l'élément a bougé (`transform`/`translateY` pendant le drag) avant `mouse.up()`.


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


## PIT-S56-001 — Un test unitaire hors shell couvre une branche structurellement inatteignable
S56 #391 : `timeline/page.tsx` portait un `if (loading) return <div data-testid="timeline-loading">`. Le test
RTL rendait la page **en isolation**, hors du shell qui intercepte déjà le chargement de session — la branche
était donc verte en test et **inatteignable en production**. Elle a survécu **3 sprints** sous cette couverture.
Prévention : pour toute branche de garde (auth/loading), vérifier que l'ancêtre qui monte le composant ne
l'intercepte pas déjà. **Un test RTL de branche de garde sur une page sous shell est suspect par défaut.**
Correctif : supprimer test et branche **ensemble**, et poser le contrat au niveau où l'état est atteignable.


## PIT-S56-002 — Un stub d'API navigateur qui mute l'état sans émettre son événement inverse le verdict
S56 #395 : le stub E2E de `requestFullscreen`/`exitFullscreen` mutait `document.fullscreenElement` **sans
dispatcher `fullscreenchange`**. Effet : il fait **rougir une implémentation correcte** (celle qui dérive son
état de l'événement) et **passer une fausse** (celle qui bascule un `useState` dans le handler). Le verdict du
test est donc exactement inversé. Prévention : tout stub d'une API à événement doit dispatcher l'événement ;
et l'oracle d'une issue « exposer un état observable » doit inclure un cas qui **contourne le déclencheur UI**
(ici `page.evaluate(() => document.exitFullscreen())`). Cf. [[PAT-S56-001]].


## PIT-S56-003 — Une constante « par défaut » peut être redéclarée en local sous un commentaire qui jure le contraire
S56 #393 : `DEFAULT_COLOR` était exportée par `types/event.ts` **et** redéclarée en local dans
`EventContent.tsx` — ironiquement sous un commentaire « #150 modèle couleur unique ». Un fix de valeur qui
suit le nom cité par l'issue n'aurait touché qu'une des deux → **deux « défauts » divergents selon le
composant**. Prévention : sur toute issue « changer une valeur par défaut », **grep la VALEUR littérale en
plus du nom de la constante** — la copie ne porte pas toujours le même nom, ni un commentaire honnête.


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


## PIT-S57-002 — Vitest tronque le rapport d'échec passé comme valeur comparée → message décapité en CI
Vitest 3.2.7 tronque à ~40 caractères les valeurs d'un `toBe` dans le message d'`AssertionError`
(`expected 'GARDE SERVEUR DÉSYNC…' to be …`), et le reporter JSON ne transporte **que** ce message. Un
rapport d'échec multi-ligne — précisément ce qui rend un garde-fou actionnable — est donc parfaitement
lisible en local et **inutilisable là où il compte**. Solution : passer le texte en **2ᵉ argument** d'
`expect(value, message)`. Prévention : tout test dont l'échec doit être actionnable doit être vu rouge
**sous reporter non interactif**, pas seulement en local. Symétrique de [[ci-green-is-not-page-correct]] :
ici c'est un rouge vert-en-apparence-utile qui ne survit pas au trajet vers la CI.


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



## PIT-S58-001 — Le fond sous un `outline` n'est PAS le `background-color` d'un ancêtre
`outline-offset: 2px` peint le trait **sur le parent**, et ce qui s'y trouve réellement peut être un
dégradé, un `color-mix`, un pseudo-élément ou un empilement de surfaces. Remonter le DOM pour trouver le
premier ancêtre non transparent produit donc de **faux ratios** : S58 a mesuré **1,00:1** sur un CTA accent
avant que la lecture de pixel ne donne **5,93:1**. Corollaire symétrique, même sprint : une sonde
« pixel le plus écarté du fond » attrape la **bordure du popover** (1 px au-delà du trait) et annonce
**16,3:1 au lieu de 6,08:1**. Les offsets d'échantillonnage se fixent par **dump brut**, jamais par
heuristique de contraste maximal. Règle : tout ratio annoncé doit dire **comment** il a été obtenu —
`getComputedStyle` ne tranche que la couleur *déclarée*, jamais la couleur *peinte*.


## PIT-S58-002 — Mesurer un contraste au mauvais instant ou dans le mauvais état
Deux façons d'obtenir une valeur fausse sans que rien ne le signale.
(1) **Instant** : Tailwind v4 fait entrer `outline-color` (et les couleurs de bordure) dans
`transition-colors`. Une sonde lancée moins de **~400 ms** après le changement d'état lit une couleur
**interpolée**. Attendre ≥450 ms, et exiger que le pixel ET `getComputedStyle` concordent.
(2) **État** : S58 a lu 1,59:1 sur un bouton qui était `disabled` (`opacity:.4`), et un autre dont l'état
par défaut `aria-pressed=true` écrase la bordure par `accent`. **Asserter l'état avant de mesurer**
(`:focus-visible === true`, non `disabled`, `aria-pressed` connu) fait partie de la mesure.


## PIT-S58-003 — E2E : `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` se posent au `next build`
Les rewrites Next sont **sérialisés dans `routes-manifest.json`** au build : les poser au `next start` n'a
aucun effet. Sans `NEXT_PUBLIC_API_URL=/api`, `apiClient` perd son préfixe et produit des **404 invisibles**
pour le watcher d'`auth.setup.ts`, qui accuse alors le rate-limit, le CORS ou un 409 — trois diagnostics
faux. **Oracle fiable : `curl /api/auth/me` doit renvoyer 401.** S58 : un audit a rapporté 5 échecs E2E de
ce fait ; rejoués sur la même base après correction de l'environnement, **136/0/8 vert, en suite comme en
isolation**. Complète [[PIT-S57-003]] (un `curl` qui réussit ne disculpe pas le CORS) : ici c'est le
symétrique, un environnement cassé qui accuse le code.


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


## PIT-S59-001 — Un désalignement de paliers ne prédit PAS où le défaut sort
#381 localisait un défaut de logo « entre 768 et 1023 px » par lecture du code seul (seul élément resté en
`md:` quand #347 avait tout basculé en `lg:`). **Mesure jammy : aucun défaut dans cette plage** — le
`container` Tailwind plafonne la largeur utile à 736 px et la nav est masquée, les deux annulent le défaut
attendu. **Le vrai défaut était à 1024 px**, un pixel hors périmètre : 2 lignes et 0 px de marge en
`fr`/`de`/`es`. Prévention : mesurer les DEUX côtés du seuil suivant, jamais le seul palier incriminé.


## PIT-S59-002 — Un élément « débordant » relevé sur `npm run dev` peut être de l'outillage de dev
Un audit par `getBoundingClientRect().right > clientWidth` remonte le bouton flottant des **TanStack Query
Devtools** (`.tsqd-parent-container`) et l'overlay `nextjs-portal`, avec un `right` qui **suit la largeur du
viewport** (329@320, 384@375, 399@390) — indiscernable d'un vrai défaut, alors que
`scrollWidth == clientWidth`. **A produit #341 : trois sprints de suspicion sur un SVG de landing qui
n'existe pas.** Exclusion portée par `frontend/e2e/support/dev-tooling.ts`. Cf. [[PIT-S58-005]].


## PIT-S59-003 — `text-4xl`/`text-5xl` absents de `@theme inline` ne sont PAS inertes
Sans `--text-*: initial`, ces classes retombent sur les **défauts Tailwind** (36/48 px) — donc **plus petit**
que `text-3xl` (57 px) de l'échelle DS. Le `h1` du hero rendait ainsi plus petit que le logo du header :
hiérarchie inversée, invisible à la lecture du nom de classe. Garde-fou source livré
(`frontend/src/__tests__/ds-type-scale.test.ts`). Prévention : toute taille se **mesure au navigateur**.


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


## PIT-S60-006 — `npm audit fix` échoue tant qu'un `overrides` auto-référentiel existe
`frontend/package.json` déclare `overrides: { "postcss": "$postcss" }` ; l'arbre virtuel d'`audit fix` ne résout
pas la référence → `npm error Unable to resolve reference $postcss`, sur **toute** invocation. L'issue #422
affirmait pourtant que `npm audit fix` était « confirmé suffisant ». Solution retenue : `npm update <transitif>`
quand la version corrigée tient dans la plage semver du parent (lire la plage **dans le lock** avant). **Ne pas
glisser vers `--force`** : il accepte les bumps majeurs. Prévention : ne jamais écrire dans une issue qu'une
commande est confirmée sans l'avoir lancée.


## PIT-S60-007 — `npm run typecheck` rouge sur une route FANTÔME : `.next/types` d'un build antérieur
`tsconfig.json:26` inclut `.next/types/**/*.ts`, donc `tsc` type-checke les artefacts d'un build précédent —
au S60, une erreur citant `app/[locale]/settings/page.js`, route disparue au passage en route group. Solution :
rebuild puis re-typecheck. **Prévention : une erreur `tsc` qui ne cite QUE `.next/**` n'est pas imputable à son
propre diff.**


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


## PIT-S60-010 — Un commentaire de test peut annoncer une isolation que le test ne respecte pas
`console-error-guard.test.ts:20-21` annonce que son lint de fixtures reste « isolé des plugins next/storybook ».
Vrai pour le volet 2 (config minimale), **faux pour le volet 1**, qui appelle
`new ESLint().calculateConfigForFile(...)` — donc charge `eslint.config.mjs` et **tous** ses imports. C'est ce
qui rend ce fichier, et lui seul, sensible à un `node_modules` incomplet. Le commentaire a probablement orienté
#308 vers la déclaration de dépendance plutôt que vers le cwd. Cf. [[PIT-S41-004]], [[PIT-S53-006]].


## PIT-S61-001 — Vitest : un mock de module PARTAGÉ + `mockReset()` fait passer un rejet traité pour un échec
Un mock de module partagé rendant une promesse rejetée, combiné à `mockReset()`/`mockClear()` en `beforeEach`,
fait rapporter la valeur de rejet comme un échec de test (`Serialized Error`, message `undefined`) **alors que le
rejet EST traité**. Établi par bisection (#307) : passe sans `beforeEach`, échoue avec `mockReset`, `mockClear`
ou une promesse pré-`catch`ée. Remède : recréer un `vi.fn()` par test. Variante de [[PIT-S11-002]].


## PIT-S61-002 — Désactiver des champs révèle les valeurs manquantes du pré-remplissage
`mapToFullCalendarEvent` jetait `durationValue`/`durationUnit` : un formulaire ouvert depuis la frise naissait
**invalide** sur `durationUnit` alors que `type='duration'`. Bug **silencieux** tant que le submit était
seulement refusé, **bloquant** dès que #230 a verrouillé les champs. Avant de poser un `disabled`, vérifier que
le schéma reste satisfiable avec les valeurs **réellement pré-remplies**, pas celles du fixture de test.


## PIT-S61-003 — `filter:grayscale()` ne préserve PAS le ratio de contraste WCAG
Contredit le commentaire posé par #230. `contrastInk` ne choisit que du noir ou du blanc, or **ce sont des points
fixes de `grayscale()`** : l'encre ne bouge pas, seul le fond bouge — et il s'**assombrit** (le filtre pondère les
canaux gamma-encodés, la luminance WCAG linéarise d'abord ; par convexité le gris obtenu a une luminance
inférieure). Encre claire → contraste augmente ; **encre foncée → il diminue**. Mesuré : 8,6 % des couleurs
passant AA échouaient après grisage. Toute décision d'a11y doit porter sur le **couple rendu** (fond + encre),
jamais sur la couleur source : exposer un `renderedColor(state)` unique consommé par l'encre ET par le verdict.


## PIT-S61-004 — Ne jamais annoncer un seuil de contraste sans les constantes du dépôt
`INK_DARK` vaut **`#0B0C0E`** (L = 0.00366), pas `#000000` : le point d'égalisation noir/blanc descend de 4.583 à
4.424. Le lead ET le reviewer ont cité `#0070F8` comme cas cassant — calculé avec du noir pur. Recalculé avec la
constante réelle, cette couleur **basculait déjà** avant correctif (4.494 < 4.5) : l'exemple ne démontrait rien.
Le phénomène était réel, l'exemplaire faux. Recalculer avec les constantes du code avant d'annoncer un ratio.


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


## PIT-S62-001 — `elementsFromPoint()` n'est PAS une preuve de peinture
Corollaire de [[PIT-S58-001]] côté hit-testing. Une couche Radix ouverte pose `body{pointer-events:none}` : tout le reste sort du test de survol et l'élément visé **remonte en tête de pile alors qu'il est recouvert**. S62 : la preuve DOM se lisait comme une *confirmation* que le popover était peint, tandis que le pixel montrait 100 % de panneau de drawer sur 15 offsets. `getComputedStyle` donne la couleur déclarée, `elementsFromPoint` la pile hit-testée — **jamais la peinte**. Seule la lecture de pixel tranche. (Sprint 62 #414)


## PIT-S62-002 — `page.screenshot({clip})` intersecte le viewport en silence
Toute échelle dérivée de `décodé/clip` devient fausse dès que l'élément touche le bord droit ou bas, et l'accesseur lit un pixel décalé. Mesuré : élément collé au bord bas, lecture « fond adjacent » à +6 px → rend **la couleur de l'élément lui-même**, unanimité **93 %** — donc indétectable par une garde d'unanimité. Clamper le clip sur `page.viewportSize()`, asserter `decoded ≈ clip × devicePixelRatio`, et **lever** au lieu de rabattre un point hors région. Une unanimité haute n'atteste ni de l'échelle ni de la position. (Sprint 62, review cycle 1)


## PIT-S62-003 — Un garde-fou validé par des fixtures supprimées n'est pas armé
S62 : 3 gardes ajoutées à `e2e/support/pixel.ts`, prouvées par des fixtures synthétiques **supprimées avant commit**. Les specs existantes restaient vertes — mais unanimité 100 % et éléments loin des bords : **aucune garde ne se déclenchait sur un cas réel du dépôt**. Toute régression future (seuil inversé, `<` en `<=`, tolérance élargie) serait passée en CI verte. Exiger un test **du garde lui-même**, avec contrôle négatif (sans lui, une garde qui lèverait *toujours* passe). Variante « garde-fou » de [[coverage-check-vert-ne-prouve-rien]]. (Sprint 62, review cycle 2)


## PIT-S62-004 — Retirer un layout d'une route retire AUSSI sa `metadata`
Pas seulement son `<html>`. La 1re passe de #413 a vu le document manquant et **pas** le `<title>` : `NEXT_MISSING_ROOT_TAGS` est bruyant, la perte de `metadata` est **silencieuse**. Après tout déplacement de `<html>`, mesurer le `<title>` **servi**, pas seulement la balise `<html>`. (Sprint 62 #413)


## PIT-S62-005 — Layout racine transparent : Next casse la 404, et deux contournements ne marchent pas
Next **exige** que le layout RACINE rende `<html>`/`<body>` pour servir `/_not-found`. Réduire `app/layout.tsx` à `{children}` (pattern next-intl) donne `NEXT_MISSING_ROOT_TAGS` sur toute URL non matchée. Mesuré inefficaces : `app/not-found.tsx` avec son propre `<html>` (**prérend** correctement mais **n'est jamais servi**) ; attrape-tout `[locale]/[...rest]` + `notFound()` (la route est atteinte mais `notFound()` **échappe** à `[locale]/not-found.tsx`). Seule forme servie : `experimental.globalNotFound` + `app/global-not-found.tsx` — cf. [[PAT-S62-002]]. (Sprint 62 #413)


## PIT-S62-006 — Un écran prérendu hors layout ne peut pas résoudre la locale pendant le rendu
Mismatch d'hydratation garanti sur `lang` **et** sur le texte. Poser la locale en `useEffect` (1er rendu = défaut des deux côtés). La voie `headers()` est interdite : elle sortirait la route du décompte `Generating static pages`. Corollaire : le `<title>` d'une telle page ne peut pas être localisé — `metadata` est résolue au build sur une page **unique** servie pour toutes les locales, sans `params` ni URL. (Sprint 62 #413)


## PIT-S62-007 — Contrôle à `<input>` masqué : le contour `@layer base` est structurellement inopérant
`opacity:0; width:0; height:0` → le contour se peint sur **0×0 px**. Tout composant qui masque son input doit porter le contour du DS sur sa **sœur visible**, sinon il n'a aucun indicateur de focus, quel que soit le token. Grep de détection : `input{...opacity:0...width:0}` + `+ .<classe>` sans `outline`. (Sprint 62 #415)


## PIT-S62-008 — Sur Radix, « désactivé » est un attribut sur un `div`, jamais une propriété DOM
Une garde d'état qui ne teste que `.disabled` (sur `HTMLInputElement`/`HTMLButtonElement`) est **inopérante** sur `Select`/`DropdownMenu`/`Checkbox`/`Switch` : Radix pose `aria-disabled` / `data-disabled`. Et un `Item`/`Group` **ancêtre** désactive ses descendants sans qu'aucune propriété DOM ne le signale → tester `el.closest('[aria-disabled="true"],[data-disabled]')`, pas `el` seul. Sans ça, le 1,59:1 de S58 (mesure sur contrôle désactivé) revient. (Sprint 62, review cycles 1 et 2)


## PIT-S62-009 — Working tree partagé : `frontend/.next` est unique, et le `next dev` d'un agent meurt sans notification
Un `next build` réécrit `.next` sous les pieds du serveur d'un autre agent, **sans autre signal que la mort de sa tâche de fond** — `git status` ne dit rien (variante « environnement » de [[PIT-S60-005]]). Un agent qui déclare « environnement laissé debout » doit **re-sonder le port**, pas se fier au fait qu'il l'a démarré. Pour builder sans casser le voisin : copie hors dépôt — `next build` webpack accepte un `node_modules` **symlinké**, **Turbopack le refuse** (`TurbopackInternalError: Symlink node_modules is invalid`), il faut hardlinker (`rsync --link-dest`). Et `next start` avec `output:'standalone'` sert de façon non fiable : utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`). (Sprint 62)


## PIT-S62-010 — RTK filtre plus que les commandes directes
Famille [[PIT-S50-007]], élargie trois fois au S62. (1) `git diff` rendu quasi vide — connu. (2) **Les redirections vers fichier** : `npx next build > log 2>&1` a écrit un résumé RTK de 6 lignes (« 2 routes », faux) au lieu de la sortie Next. (3) **Les commandes à l'intérieur d'un `Bash` composé** : un run E2E a logué `PASS (200) FAIL (0)` sans la ligne `8 skipped`. (4) `ps aux | grep` → « 0 processus » alors que Playwright tournait. Parades : préfixer `rtk proxy`, ou mettre la commande dans un **fichier `.sh` exécuté par chemin** (le hook ne le réécrit pas) ; `/bin/ps -eo` ou `pgrep -fl` jamais `ps | grep` ; vérifier qu'un log de test contient bien les lignes par test avant d'en tirer un compteur. **Ne jamais reprendre un récap de commit RTK** : « 2 files changed » annoncé sur un commit de 4 / 282 lignes. (Sprint 62)


## PIT-S62-011 — Deux runs E2E complets rapprochés ne PEUVENT pas passer
`global-setup` purge `.auth/accounts.json`, donc chaque run ré-enregistre 4 comptes contre un bucket de **5/min/IP**. Le 2ᵉ échoue en `provision <compte>` avec `Test timeout of 180000ms` et « N did not run » — symptôme qui **ressemble à une panne d'infra**, pas à un rate-limit. Attendre ≥ 2,5 min entre deux runs. Cousin de [[e2e-cors-origin-proxy-trap]] : sur ce harnais, tout échec de provisioning se déguise en autre chose. (Sprint 62)


## PIT-S62-012 — Sans `PLAYWRIGHT_BASE_URL`, Playwright démarre un serveur SANS le proxy `/api`
`playwright.config.ts` fait `baseURL = PLAYWRIGHT_BASE_URL ?? localhost:3000` et, à défaut, lance son propre `webServer` (`npm run dev`) **sans** `E2E_API_PROXY_TARGET` : le rewrite `/api/*` n'existe pas, le `POST /api/auth/register` du projet `setup` tombe en **404**, les 4 comptes échouent et **aucun test ne démarre**. Un audit S62 en a conclu « BLOQUANT, régression du code » à tort. **Oracle : `401` sur `/api/auth/me` = proxy OK ; `404` = proxy absent.** Lire l'oracle avant toute hypothèse — cf. [[e2e-cors-origin-proxy-trap]]. (Sprint 62, audit Phase 6)


## PIT-S62-013 — Importer `globals.css` dans un composant testé crache ~5 500 lignes de stderr
jsdom + `css: true`. `vi.mock` de la feuille dans le test. (Sprint 62 #413)


## PIT-S62-014 — Un briefing qui exige de citer un fichier supprimé est infalsifiable
Erreur du lead au S62 : le briefing d'un subagent imposait de lire `briefing-415.md` et d'en citer les marqueurs comme preuve de chargement du context-pack — alors que les briefings venaient d'être **retirés avant l'ouverture de la PR** (convention anti-bloat). Soit l'agent invente les marqueurs, soit il bloque. L'agent a refusé d'inventer et l'a signalé en tête de rapport — bon comportement. Ne pas adosser une preuve de chargement à un artefact que la convention de sprint supprime. (Sprint 62)


## PIT-S63-001 — `locator.count()` n'auto-attend pas : routage responsive en course silencieuse
Router un parcours E2E par `getByTestId('x').count()` crée une course quand la bascule est un `matchMedia` JS. `useMediaQuery` rend **`false` au premier rendu** (SSR-safe) : la frise est DESKTOP avant hydratation. Aux largeurs mobiles le test prenait donc la branche desktop, cliquait la pastille (qui, elle, auto-attend et se résout), puis attendait un `event-drawer-edit` **jamais monté** par `TimelineMobilePortrait`. Parade : résoudre la variante par `matchMedia` **dans la page**, puis **vérifier la racine** de cette variante sous budget court. Famille [[PIT-S61-006]] (grepper les appelants) : le symbole existe, le chemin non. (Sprint 63 #74/#449)


## PIT-S63-002 — `actionTimeout: 0` est le défaut Playwright : une erreur de routage coûte le budget du TEST
Sans budget explicite sur les clics d'un parcours à branches, une attente impossible consomme les **300 s du test**, × `retries: 2`. Le job `e2e` est passé de ~15 min à **42 min** pour 4 tests. Poser un budget par clic fait échouer **vite** et **nommer** le chemin manquant. (Sprint 63 #449)


## PIT-S63-003 — L'outillage de dev bloque le CLIC, pas seulement la MESURE
`.tsqd-parent-container` (React Query Devtools) était exclu des mesures depuis le S59, mais **interceptait les clics** — 42 tentatives repoussées. La CI e2e tourne sur `next dev` : l'outillage est présent. Parade : `pointer-events: none` via `addInitScript`, en le **laissant dans le DOM** pour ne pas invalider l'exclusion de mesure existante. (Sprint 63 #449)


## PIT-S63-004 — Invoquer un pitfall de MÉTRIQUE pour excuser un TIMEOUT est une erreur de catégorie
Erreur du lead au S63 : 4 échecs E2E excusés par [[PIT-S52-001]] (« mesures de largeur non concluantes sur macOS »). Or ce pitfall couvre les écarts de **métrique de police** ; un test qui **expire** n'a produit **aucune** mesure. La cause réelle était un routage responsive faux ([[PIT-S63-001]]). Signal de reconnaissance : l'échec est un `locator.*: Test timeout`, pas un écart de valeur. Refuser ce raisonnement est ce qui a mené au vrai diagnostic. (Sprint 63)


## PIT-S63-005 — Tailwind v4 : `max-[Npx]` compile en `width < N`, pas `<=`
Le palier compact s'arrête donc à `N-1`, et **`N` devient un second creux local** (header `de` : 52 px à 359, **23 px à 360**). Vérifié deux fois (`columnGap` 4/8 px, `paddingLeft` 8/16 px). Une grille de largeurs qui saute de 320 à 375 est **aveugle** à ce creux. Mesurer `N-1` **et** `N` pour tout palier `max-[]`, comme [[PIT-S59-001]] l'exige déjà pour les seuils `min-`. (Sprint 63 #423)


## PIT-S63-006 — Un mock i18n en `${ns}.${key}` rend un namespace FAUX indiscernable d'un juste
`useTranslations('deleteDialog')` (namespace inexistant) et `('common.deleteDialog')` (juste) produisent **le même** résultat de test. Le défaut a survécu plusieurs sprints sous **3 fichiers de tests verts**, et les E2E ne ciblaient que des `data-testid`, jamais du texte. Prévention : tout composant à `useTranslations` doit avoir au moins une assertion sur un **libellé traduit**, via `NextIntlClientProvider` alimenté par les VRAIS messages + collecteur `onError`. (Sprint 63 #441)


## PIT-S63-007 — `warn-test-delegation.sh` tue la commande entière, y compris un heredoc qui ÉCRIT
Le hook PreToolUse détecte une chaîne d'invocation de runner de test **n'importe où** dans la commande — **y compris un `cat <<EOF` qui ne fait que rédiger un fichier** la contenant. Le fichier n'est jamais créé et l'échec suivant (« no such file ») oriente vers un faux diagnostic. Rencontré **deux fois** au S63, par un agent puis par le lead. Parade : écrire ces fichiers avec l'outil `Write` ; `SKIP_DELEGATION=1` pour un run ciblé. (Sprint 63 #442)


## PIT-S63-008 — « Environnement laissé debout » est une promesse que rien ne tient
Un agent a conclu son rapport par « `next dev` laissé debout, réutilisable » ; sa tâche de fond a été tuée **après** l'envoi, et l'affirmation est devenue fausse sans que rien ne la corrige. Survenu **3 fois** au S63. Prévention : ne jamais promettre un **état** à l'agent suivant — donner la **commande de relance** et un fait **horodaté**. Variante temporelle de [[PIT-S62-009]]. (Sprint 63 #442)


## PIT-S63-009 — Un `test.fail()` laissé comme marqueur de dette fige le périmètre de l'issue suivante
Le S62 avait figé le popover invisible en 2 `test.fail()` sur **un seul widget**. L'issue #446 a donc décrit un défaut de `ui/select` — alors que la cause est un **palier `z` partagé** : `PopoverPicker`, monté dans le même drawer, était cassé à l'identique (46-66 % de panneau mesurés) et absent du périmètre. Corriger le seul `Select` aurait laissé le champ voisin invisible **dans le formulaire qu'on prétendait réparer**. Grepper les **frères du composant** avant d'accepter le périmètre d'une issue de superposition. (Sprint 63 #446)


## PIT-S63-010 — Étendre un matcher de test CSS par inertie fait rougir du CSS sain
#447 demandait d'asserter le focus « des 3 sélecteurs surveillés » — or **aucun** ne porte de règle de focus : les indicateurs vivent sur des sélecteurs **composés frère-adjacent** (`.mt-check input:focus-visible + .mt-check__box`, `core.css:160/172/189`). Réutiliser le matcher exact existant aurait rendu `decls.length === 0` puis fait échouer `toBeGreaterThan(0)` **sur du CSS parfaitement sain**. Grepper la règle **réelle** avant d'étendre. Symétrique de [[PIT-S61-006]]. (Sprint 63 #447)


## PIT-S63-011 — Recette docker jammy : `host.docker.internal` donne 403 CORS sur tout écran authentifié
Le backend fige `localhost:3000` comme origine acceptée. Depuis le conteneur, viser `host.docker.internal:3000` rend **403** ; via un **forwarder TCP** `127.0.0.1:3000 → host.docker.internal:3000`, la requête atteint la logique applicative (400). Invisible pour les audits de **landing** (pages non authentifiées) — d'où sa découverte tardive. (Sprint 63 #74)


## PIT-S63-012 — Balayage `rect.right > clientWidth` : exclure les défileurs, mais surtout PAS `<body>`
La frise produit 9-16 faux positifs par largeur (défilement horizontal légitime). Mais exclure `<body>` est pire : un scroll-lock Radix ouvert y déclare **tout le document** comme « contenu » et **masque l'élément fautif**. (Sprint 63 #74)


## PIT-S63-013 — `unique()` fabrique un faux débordement : jeton de 16 chiffres insécable
`support/products.ts:40` produit un identifiant de 16 chiffres ; rendu dans un `h1`, il déborde de 50-53 px. Un audit a failli « corriger » ce non-défaut. **Signal de reconnaissance : le débordement n'est PAS corrélé à la locale.** Défaut réel adjacent tracé : le `h1` du titre produit n'a pas de `break-words`. (Sprint 63 #74)


## PIT-S63-014 — `scrollLeft` est en pixels : toute échelle variable le périme
Au zoom, l'échelle px/jour change ; le navigateur **rabat** la valeur périmée sur `scrollWidth − clientWidth` et la virtualisation horizontale démonte **toutes** les pastilles (0 dans le DOM, lanes toujours rendues). Mesuré : `31348 / 32330 / 982`. **Règle : une position de défilement mémorisée dans une vue à échelle variable se stocke dans l'unité du DOMAINE (jours), jamais en pixels.** (Sprint 63 #449/#451)


## PIT-S63-015 — Mesurer `scrollLeft` sous `scroll-behavior: smooth` donne des valeurs fantômes
4 lectures contradictoires (4, 16, 17, 17259) pour **deux** écritures identiques à 59677 : les mesures étaient prises **en pleine animation**. Attendre deux lectures consécutives égales avant toute mesure ; poser une position avec `behavior:'instant'` — l'animation est de toute façon rabattue par le clamp avant d'aboutir. Famille [[PIT-S54-003]]. (Sprint 63 #449)


## PIT-S63-016 — Un effet de positionnement en `useEffect(..., [])` réussit sur des données absentes
`computeRange([])` (`zoom.ts:122`) renvoie `min = max = today` puis ±30 j : une étendue **factice mais plausible**. `scrollToToday()` s'exécutait donc au montage **avant l'arrivée des données**, réussissait silencieusement sur cette étendue fausse, et n'était **jamais rejoué**. Résultat mesuré : frise ouverte **13 ans avant aujourd'hui**, **sans aucun symptôme d'erreur**. Keyer un effet de positionnement sur l'**identité des données**, pas sur le montage. (Sprint 63 #449)


## PIT-S63-017 — Les garde-fous à `grep` ne distinguent pas une NÉGATION d'une demande
Deux occurrences au S63. (1) `check-sprint-completeness.sh` a remonté 7 « signaux non traités » : **5 étaient des négations explicites** (« pas de `RECOMMAND_DB_EXPERT` car aucun schéma »), les 2 autres étaient traités. (2) La précondition Phase 9 `grep -q "\[MISSING\]"` aurait abandonné à tort sur les phrases « **Aucun** `[MISSING]` » de l'audit. Un `grep` de jeton lit la présence, jamais l'intention. Vérifier le contexte avant d'agir sur un tel garde-fou. (Sprint 63, clôture) — **S64 : les DEUX se sont reproduits**, et une 3e nuance est apparue : `check-sprint-completeness.sh` teste `ls $SPRINT_DIR | grep <marker>`, donc un **NOM DE FICHIER**, jamais le traitement réel. Un signal parfaitement traité par un AUTRE specialist reste « non traité » ; à l'inverse, un fichier vide nommé `*test-runner*` suffirait à passer. Voie de sortie honnête : reformuler le signal en négation (`Pas de RECOMMAND_X ouvert — clos car …`), jamais renommer un artefact pour tromper le grep.


## PIT-S64-001 — Un `tsc` vert ne prouve RIEN du reporter Playwright
`ReporterDescription` est typé `[string, any]` : `['html', { open: 'jamais' }]` **compile**. Contrôle négatif joué au S64 — `tsc --noEmit` EXIT=0 sur une valeur invalide. Seul un run CI réel atteste qu'un reporter écrit ce qu'on croit. Même famille que « coverage vert ne prouve rien ». (Sprint 64 #461)


## PIT-S64-002 — Greper `playwright-report/index.html` est un faux négatif GARANTI
Le reporter `html` embarque ses données en **base64** dans `<template id="playwrightReportBase64">` (441 Ko décodés → `report.json` + ~32 JSON). Chercher le nom d'un test échoué dans le HTML ne renvoie donc jamais rien, même quand l'échec y est. **Décoder avant de conclure.** (Sprint 64 #461)


## PIT-S64-003 — Un correctif qui agit sur l'ordre d'EXÉCUTION ne corrige jamais une dépendance à l'ordre d'IMPORT
La persistance de `.auth/accounts.json` a été présentée comme le correctif de [[PIT-S47-004]]. Elle ne l'était pas : `dependencies: ['setup']` ordonne l'**exécution**, pas le **moment de l'import du module**, et le projet `setup` étant lui-même `fullyParallel`, le worker qui écrivait le fichier n'était pas celui qui enregistrait les comptes. Mesuré au S64 (4 specs `settings-*` rouges par run dès `workers >= 2`). Le mécanisme d'identité a été refait au S65 (#469) : graine `E2E_RUN_ID` posée avant le fork des workers + résolution paresseuse. **La leçon durable n'est pas la valeur de `workers` mais la forme du raisonnement** — vérifier qu'un correctif agit sur la MÊME dimension que le défaut. (Sprint 64 #465, mécanisme refait S65 #469)

## PIT-S64-004 — Le message « does not work with output: standalone » de `next start` est TROMPEUR
`output: 'standalone'` est **additif** : `.next/standalone/` est produit EN PLUS, et `next start` reste pleinement fonctionnel. Vérifié au S64 sur le build exact : SSG 200, `/fr/nope` 404, chunks JS 200, CSS 200, `favicon.ico` 200, rewrite `/api/*` actif. **Contredit `PIT-S62-009`** qui l'annonçait « non fiable ». Ne pas basculer sur `.next/standalone/server.js` sur la foi de ce message. (Sprint 64 #462)


## PIT-S64-005 — `curl … -w '%{http_code}' || echo 000` CONCATÈNE au lieu de substituer
Le résultat est `000000`, qui passe un test `-lt 500` : une boucle d'attente se croit satisfaite au premier tour et laisse passer un service mort. Mesuré au S64 en écrivant les oracles du job `e2e`. (Sprint 64 #462)


## PIT-S64-006 — `npx <cmd> &` : `$!` capture le WRAPPER, pas le process
`npx` fork un enfant. Un `kill "$PID"` posé sur `$!` tue `npm exec` et **ment** sur ce qu'il arrête ; que l'enfant meure dépend du relais de SIGTERM par npm — un détail d'implémentation, pas un contrat. Utiliser le binaire direct (`./node_modules/.bin/<cmd>`, script à shebang exec'é) pour que `$!` soit le bon PID. (Sprint 64, revue)


## PIT-S64-007 — Un step GitHub Actions dont la dernière commande est `echo >> "$GITHUB_ENV"` NE PEUT JAMAIS ÉCHOUER
Le `echo` rend 0, donc le step sort en succès même si le service lancé juste avant est mort à la seconde 0. Le diagnostic est repoussé au step suivant, qui accuse alors l'attente plutôt que le démarrage (jusqu'à 180 s perdues). Terminer un tel step par un contrôle de vie explicite qui `exit 1`. (Sprint 64, revue)


## PIT-S64-008 — Aucune CI ne tourne sur les branches `sprint/N`
`.github/workflows/ci.yml` déclenche sur `pull_request: [dev, main]` et `push: [dev, main]` **uniquement**. Un `git push origin sprint/N` ne lance rien : le premier run réel d'un sprint est **l'ouverture de sa PR**. Toute preuve exigeant la CI en cours de sprint passe par une **PR jetable** vers `dev`. (Sprint 64 #461)


## PIT-S64-009 — Les flakes de virtualisation de la timeline DISPARAISSENT quand on les isole
La suite E2E sème une catégorie et un produit par spec **sans nettoyage** et dépasse désormais `LANE_VIRTUALIZATION_MIN_ROWS = 60` (`virtualization.ts:80`) — 76 lanes en CI, 77 en local : la lane semée n'est plus montée dans le DOM. Rejouer la spec seule ne sème qu'une catégorie ⇒ virtualisation inactive ⇒ **le test passe**. Le réflexe d'isolement fait donc disparaître le défaut. C'est une **famille** (le membre qui tombe varie), suivie par l'issue **#467**. (Sprint 64)


## PIT-S65-002 — Un run de mesure lancé en ARRIÈRE-PLAN par un subagent meurt avec sa session — et deux campagnes concurrentes se corrompent en silence
Deux campagnes de mesure de #469 ont été perdues ainsi. (1) Le subagent lançait ses runs en tâche de fond puis rendait la main : les process mouraient avec sa session, **aucun résultat capturé**. (2) Le lead, croyant les runs morts, a lancé les siens **pendant qu'ils tournaient encore** : les deux campagnes écrivaient dans les **mêmes fichiers de log** d'un scratchpad partagé et partageaient `e2e/.auth/` — d'où un faux rouge portant la signature [[PIT-S47-004]] pour une cause qui n'a rien à voir. Diagnostics fautifs du lead à ne pas reproduire : `find -maxdepth 4` trop court pour atteindre le scratchpad (« pas de logs » ≠ « runs morts ») et un `ps` tombé dans l'intervalle entre deux runs. **Parades** : mesurer au premier plan ; répertoire de logs **horodaté unique** par campagne ; et surtout **compter les blocs `Running N tests using M workers` par log — il doit y en avoir exactement 1**. Un log en contenant deux (`231 passed (7.0m)` ET `222 passed / 10 failed (8.2m)`) est la preuve de la concurrence. (Sprint 65 #469)


## PIT-S65-003 — Un listing Playwright `--list` sans `rtk proxy` sort en `PASS (0) FAIL (0)`
Le hook RTK tronque/mal-parse la sortie du listing : le résultat ressemble **exactement** à une suite vide — soit précisément le faux signal que #470 élimine par ailleurs. Préfixer `rtk proxy` pour tout listing Playwright. Même famille que [[PIT-S20-003]] (`git diff` vidé) et [[PIT-S27-002]]. (Sprint 65 #470)


## PIT-S65-004 — Une boucle de poll CI dont la condition de sortie cherche un MOT dans la sortie texte se termine à tort
Une boucle `if ! echo "$OUT" | grep -qE 'pending|queued'` est sortie **dès la 1re itération** sur la réponse `no checks reported on the branch` : juste après un push, les checks n'existent pas encore, la chaîne ne contient donc aucun de ces mots, et l'absence de checks se lit comme « CI stabilisée ». Variante de [[PIT-S55-*]] (watcher muet), mais ici le watcher ment au lieu de se taire. **Ne jamais faire porter la condition sur la présence d'un mot dans une sortie texte** : interroger le STATUT du run pour le SHA exact (`gh run list --json headSha,status --jq 'select(.headSha=="<sha>")'`) et n'accepter que `completed`. (Sprint 65)


## PIT-S65-005 — ÉDITER le corps d'une entrée `PIT-*` existante périme les packs, pas seulement en AJOUTER une
Le job CI **requis** `ai-env-packs` lance `gen-pit-packs.sh --check`. La note connue portait sur l'ajout d'entrées non classées ; en réalité **toute édition du corps d'une entrée existante** périme les packs dérivés. Au S65, `PIT-S47-004` et `PIT-S64-003` réécrits ⇒ `ai-env-packs` rouge en 12 s, découvert **après** l'ouverture de la PR. Réflexe : dès que `docs/memory/pitfalls.md` apparaît dans `git status`, relancer `gen-pit-packs.sh` avant de pousser. Nuance : seules les entrées de sprints **≥ S53** figurent en texte intégral dans les packs (les plus anciennes n'y sont qu'en index de titres) — éditer une vieille entrée peut donc ne produire **aucun** diff de pack tout en faisant échouer `--check` à cause d'une autre. (Sprint 65)


## PIT-S66-001 — Une action centrale peut n'avoir qu'UN déclencheur, logé dans un conteneur `hidden lg:flex` : morte sous le palier, sans aucun test rouge
Au S66 (#455), `setShowCreate(true)` n'avait qu'un appelant, dans l'`<aside className="hidden … lg:flex">` du shell : créer un événement était impossible sous 1024 px depuis le S44, et ni Vitest (jsdom sans layout) ni les E2E desktop ne pouvaient le voir. Un compte d'appelants > 0 ne prouve PAS l'atteignabilité : il faut grepper les appelants d'un `setX(true)` ET remonter leurs conteneurs responsive. Prévention : pour toute action centrale, un E2E qui exerce le palier dans les DEUX sens (borne basse ET borne haute), cf. PAT-S66-001.


## PIT-S66-002 — Une utilitaire Tailwind `duration-*` SEULE arme une transition sur TOUTES les propriétés (`transition-property` initial = `all`)
Au S66 (#79), un panneau portant `motion-safe:duration-200` (posé pour une animation d'entrée) a vu son `max-height` inline s'ANIMER : le DOM montrait `style.maxHeight = "462px"` mais `getComputedStyle` variait d'une lecture à l'autre (683 → 675 → 571 px) et un `!important` inline n'y changeait rien (une transition prime sur l'inline dans la cascade). Cause : `transition-duration` sans `transition-property` explicite → `all`. Fix : restreindre `transition-property` (ici `transform`). Prévention : quand une valeur calculée contredit un style inline, lire `el.getAnimations()` AVANT de chercher un `!important`, et se méfier de toute `duration-*` posée sans `transition-*`.


## PIT-S67-001 — Un « blocage amont non corrigeable » se périme EN SILENCE, et survit dans un commentaire de CI puis dans les énoncés d'issues qui le citent
Au S45, `.github/workflows/ci.yml` a consigné que l'advisory `brace-expansion` était incorrigible en aval : « le seul corrigé est 5.0.8, qui change sa forme d'export ; le forcer casse le lint (`expand is not a function`) ». Vrai à l'époque. Faux ~20 sprints plus tard : une `1.1.18` est sortie sur la branche 1.x, or `minimatch@3.1.5` déclare `brace-expansion: ^1.1.7` → elle y entre, la branche 5.x n'est jamais sollicitée, `npm run lint` sort exit 0 avec 0 occurrence de l'erreur. Le verdict avait été recopié tel quel dans l'énoncé de #438, ce qui orientait l'issue vers un arbitrage documentaire (« masquer le signal rouge ? ») au lieu d'une correction : les 8 entrées d'audit étaient TOUTES des patchs in-range, `npm audit` est passé de 8 à 0. Prévention : un blocage amont n'est pas un acquis — il se périme le jour où l'amont publie un patch dans la plage semver DÉJÀ déclarée, et rien ne le signale. Lire les plages dans le lockfile (`packages[].dependencies`) avant de croire un « non corrigeable », et re-tester à chaque sprint plutôt que recopier.


## PIT-S67-002 — Retirer l'`overrides.postcss` de MyTimeline casserait l'étape CI BLOQUANTE : `next` épingle postcss en version EXACTE
`next@15.5.22` déclare `postcss` en `8.4.31` **exact** (version vulnérable, GHSA-r28c-9q8g-f849 / GHSA-6g55-p6wh-862q). Sans l'override qui le hisse en `^8.5.23`, npm recrée un `node_modules/next/node_modules/postcss@8.4.31` imbriqué et `npm audit --omit=dev` — l'étape BLOQUANTE du job CI `security` — repasse de 0 à 2 vulnérabilités de PRODUCTION. Mesuré au S67 sur une copie hors dépôt. L'override `sharp` joue le même rôle. Prévention : ces deux `overrides` sont load-bearing, PAS du bruit à nettoyer ; leur raison d'être est inscrite dans `frontend/package.json` (clé `_overridesRationale`) et `frontend/README.md` § « Overrides npm ». À revoir si un futur bump de `next` change son pin postcss.


## PIT-S67-003 — Le compteur « added N packages » de npm surestime massivement la churn réelle du lockfile
Au S67, `npm` annonçait « 195 / 183 packages added » sur le bump de la chaîne Storybook : de quoi croire à une explosion du lockfile et refuser le changement. La churn réelle, mesurée en diffant les entrées `packages` du lock, était de **15 add / 10 remove** — l'écrasante majorité des « ajouts » sont des binaires de plateforme OPTIONNELS (`@oxc-resolver/binding-*`, `@emnapi/*`) déjà présents au lock. Prévention : juger l'ampleur d'un bump sur le diff du lockfile (add/remove/change + comparaison des majeurs), jamais sur la sortie texte de npm. Corollaire : c'est aussi en diffant le lock qu'on trouve ce que `npm audit fix --dry-run` ne montre pas — au S67, un downgrade subi `oxc-resolver 11.23.0 → 11.21.2` (+19 bindings), absent du relevé `--dry-run` du lead, épinglé en exact par `storybook@10.6.0`.


## PIT-S67-004 — `check-sprint-completeness.sh` lit LIGNE À LIGNE : une négation « pas de RECOMMAND_X » repliée sur la ligne suivante compte comme signal NON traité
Le hook extrait chaque ligne contenant `RECOMMAND_<SPEC>` et teste la négation (`pas de.{0,5}recommand`, `non applicable`, `aucun`…) sur **cette seule ligne**. Au S67, `issue-438-done.md` portait « …, pas de\n  `RECOMMAND_UI_DESIGN` (aucune surface visuelle). » : le « pas de » étant sur la ligne précédente, le signal a été compté comme actionnable et non traité, bloquant `/sprint end`. Second piège du même hook : il cherche un fichier dont le NOM contient `test-runner` / `db-expert` / `ui-design` **dans `docs/memory/sprints/sprint-N/`** — un test-runner réellement spawné dont le rapport n'est rangé que dans `docs/memory/audits/` reste invisible. Prévention : une négation `RECOMMAND_*` tient sur UNE ligne (un tiret par spécialiste), et le rapport d'un spécialiste spawné se dépose dans le dossier du sprint (convention S61 : `sprints/sprint-61/test-runner-report.md`).


## PIT-S68-002 — La section « RETOMBÉE CI » d'un briefing peut être elle-même périmée : lire le job, pas l'énoncé de la spec
Au S68, le lead a averti l'agent contre la lecture d'énoncés périmés, PUIS a écrit dans le même briefing une section « retombée CI » fausse : elle affirmait qu'`auth-signature.spec.ts` skippe en CI et que le mode dégradé virerait au rouge. Source de l'erreur : le lead a lu l'en-tête § « Conditionnement » de la spec (écrit au S50) au lieu de lire `ci.yml`. Depuis #462/S64, le job `e2e` lance DEUX serveurs Next (`:3000` dégradé, `:3001` vérifiant) encadrés par un oracle `probe_mode` — la spec ne skippe pas, elle tourne contre `:3001`. Le commentaire de spec était périmé de quatre sprints. Prévention : toute affirmation sur le comportement CI se vérifie dans `.github/workflows/ci.yml` à l'instant T, jamais dans un commentaire de code qui le décrit. Même famille que [[upstream-blocker-verdict-expires]] — la « retombée CI » d'un briefing n'est pas une source, c'est une hypothèse à valider.


## PIT-S69-001 — Ajouter un `useQuery` dans un composant testé sans `QueryClientProvider` casse TOUS ses tests : mocker le HOOK, pas envelopper d'un provider
Au S69 (#67), brancher `useRecurrencePreview` (TanStack `useQuery`) dans `EventEditForm` a fait échouer l'intégralité d'`EventEditForm.test.tsx` — le fichier ne monte aucun `QueryClientProvider`. Réflexe coûteux et mauvais : envelopper chaque `render` d'un provider (bruit dans ~45 tests, et on se met à tester TanStack plutôt que le composant). Solution retenue : `vi.mock('@/hooks/useRecurrencePreview')` et piloter le retour test par test — le composant est testé sur ce qu'il FAIT du `data`, pas sur la mécanique de query. **Second piège, dans la foulée** : `vi.clearAllMocks()` (souvent en `beforeEach` global) efface les appels ET les implémentations mais PAS de manière fiable les `mockReturnValue` posés au niveau module — il faut REPOSER le retour par défaut dans un `beforeEach` dédié, sinon un test hérite du `mockReturnValue` du précédent et devient vert/rouge selon l'ordre d'exécution.


## PIT-S69-002 — `./scripts/test-quiet.sh frontend` échoue dans un worktree : `node_modules` absent, et le `node_modules` partagé du dépôt principal peut être périmé
Un worktree git ne porte pas de `node_modules` (non versionné) : toute commande frontend y échoue d'entrée. Contournement appliqué au S69 : symlink temporaire `frontend/node_modules -> <dépôt principal>/frontend/node_modules`, **retiré après usage** (sinon il finit committé ou fausse un `git status`). Piège suivant, plus sournois : ce `node_modules` partagé peut être PÉRIMÉ par rapport au `package.json` de la branche — au S69 il manquait `eslint-plugin-storybook` (pourtant déclaré), ce que le préflight de `test-quiet.sh` signale en bloquant TOUTE la suite, et ce qui fait aussi cracher `tsc` sur les seuls `*.stories.tsx`. Ces échecs ne sont PAS des régressions du sprint. Prévention : lancer `vitest`/`tsc` directement et **juger sur les fichiers du diff** (`tsc --noEmit | grep <fichiers touchés>`), puis considérer la CI — qui installe frais — comme le gate autoritatif de la suite complète. Corollaire : ne jamais conclure « la suite est rouge » sur un préflight d'environnement.


## PIT-S70-001 — Un briefing peut attribuer un identifiant `BR-*` à la mauvaise règle : grepper le pack AVANT de s'y appuyer
Au S70, le briefing du lead affirmait « BR-EVE-009 = perf de l'aperçu live, débounce 150 ms ». **Faux** : `br-events.md:92` définit BR-EVE-009 comme le **modèle couleur event** (design v3 #44), et `grep -ci debounc` sur le pack rend **0**. Origine : les commentaires PRÉ-EXISTANTS `EventEditForm.tsx:174` et `:289` propagent déjà cette mauvaise attribution, et le lead les a recopiés sans vérifier la source. Le fullstack-dev a détecté l'écart et l'a **signalé sans corriger silencieusement** les deux commentaires — bon arbitrage : renommer ou réattribuer une BR est une décision, pas un nettoyage de passage. Prévention : tout identifiant `BR-*`/`PIT-*` cité dans un briefing se vérifie par un `grep` dans le pack correspondant, **y compris ceux que le lead fournit**. Même famille que [[PIT-S68-002]] et `upstream-blocker-verdict-expires` : l'énoncé n'est pas la source.


## PIT-S70-002 — « Pré-existant, non lié au sprint » : l'étiquette d'un audit se réfute avec la CI de la base
Au S70, le premier passage du `test-runner` a rendu `PARTIAL_FAILURE` avec deux verdicts faux, tous deux étiquetés « pré-existant ». (1) « `npm run build` FAIL, page `/terms` manquante » — la page existe, et surtout **la CI de `dev` était verte sur `fd954b2`, la base exacte du sprint**, alors que la CI lance le build. (2) « E2E 4 failed / 247 skipped, serveur `next dev` défaillant » — l'agent avait lancé un build **contre un `next dev` en cours**, piège nommé dans le runbook E2E S47, provoquant le 500 `InvariantError: clientReferenceManifest` qui tue `auth.setup.ts` ; il a donc créé la panne puis l'a imputée au code. Prévention, deux réflexes gratuits : **comparer tout échec dit « pré-existant » à la CI du SHA de base** (`gh run list --branch dev`), et **distinguer « rouge » de « non mesuré »** — une suite dont le `setup` échoue et qui passe 247 specs en `skipped` n'a rien mesuré, ne jamais l'écrire comme un résultat.


## PIT-S70-003 — Un `opacity` cumulé à une variante déjà « faible » se paie sur le trait qui porte l'objet
`.mt-evt--draft` (occurrence fantôme de l'aperçu) portait `opacity:.8` en plus d'un fond à 8 %, d'un contour pointillé, d'une encre `muted` et d'une absence d'ombre. Le dimmer ne retirait donc plus d'insistance — il retirait du **contraste**, précisément sur les deux seuls éléments qui rendent l'objet lisible : contour à **2,49:1** en thème sombre (sous le seuil WCAG 1.4.11 de 3:1) et date du fantôme à **3,59:1** en clair (sous 4.5:1). Correctif : **retirer le dimmer**, pas assouplir le seuil ; l'identité colorée est conservée (le contour reste peint par `--mt-evt`). Prévention : avant d'empiler un `opacity` sur un traitement déjà atténué, mesurer — et vérifier le nombre de consommateurs de la classe avant de la modifier (ici un seul, `EventPreviewTimeline.tsx:180`, d'où l'absence de risque sur la frise réelle).


## PIT-S70-004 — `border-*-color` vaut `currentColor` quand aucune bordure n'est déclarée : la sonde répond, mais à une autre question
En mesurant le contraste d'un contour, `getComputedStyle(el).borderTopColor` renvoie `currentColor` (donc la couleur du TEXTE) si l'élément ne déclare pas de bordure — la mesure réussit et produit un chiffre plausible qui ne décrit pas ce qu'on croit mesurer. Au S70, `e2e/support/contrast.ts` a reçu une garde qui **lève** dans ce cas plutôt que de rendre une valeur. Même famille que [[PIT-S53-001]] (une assertion sur `text-*` peut apparier un `line-height` au lieu d'une taille) : le danger n'est pas l'erreur bruyante, c'est la sonde silencieusement décalée. Prévention : toute sonde de style calculé doit échouer explicitement quand la propriété visée n'est pas réellement déclarée.


## PIT-S70-005 — `check-sprint-completeness.sh` teste LIGNE PAR LIGNE : une négation coupée par un retour à la ligne n'est pas reconnue
Le hook cherche `RECOMMAND_<SPEC>` puis teste, **sur la même ligne**, un motif de négation (`pas de.{0,5}recommand`, `^\s*-?\s*(pas de|aucun)`, `non applicable`, `n/a`…). Au S70, trois négations parfaitement explicites ont été comptées comme signaux non traités uniquement parce que le retour à la ligne d'un paragraphe markdown séparait le « Pas de » du `RECOMMAND_DB_EXPERT`. Symptôme trompeur : `/sprint end` bloque en Phase 1 alors que les `done.md` sont conformes sur le fond. Prévention : dans un `done.md`, écrire **une négation par ligne**, commençant par la négation et portant l'identifiant du signal sur cette même ligne (`- Pas de \`RECOMMAND_X\` : <raison>`). Ne jamais réécrire pour « faire passer » un signal réellement pendant — ici seule la mise en forme était en cause, le fond était déjà correct.


## PIT-S70-006 — Un écart transmis par un agent qui n'a pas ouvert de navigateur est une HYPOTHÈSE, pas un constat
La vague 1 du S70 a livré une liste de 4 « écarts visuels connus », que le lead a recopiée telle quelle dans le briefing de la vague 2 comme checklist d'entrée. La vérification mesurée en a **réfuté 2** : le « double filet » header/aperçu (filets réellement distants de **207 px** en clair, 187 px en sombre) et l'« amputation du corps défilant » (le bandeau occupe 29,6 % de 700 px, il reste 418 px). Les deux venaient d'une lecture de code, pas d'une observation. Prévention : étiqueter explicitement la provenance de chaque écart transmis entre vagues (`mesuré` vs `déduit du code`) — un agent qui n'a pas rendu la page ne peut produire que des hypothèses, et les propager comme des faits fait perdre du temps à la vague suivante.


## PIT-S71-001 — Un inventaire fourni par un énoncé (surfaces, occurrences) est un point de départ, jamais le périmètre
Deux occurrences au S71. (1) #495 : « les 3 surfaces d'édition `EventDrawer` / `TimelineEditHost` / `ConflictDialog` », affirmé par l'issue, par le `done.md` du S70 et par 2 blocs de commentaires d'`EventEditForm.tsx` — **deux des trois ne montent pas `EventEditForm`** ; un `grep -rn "<EventEditForm"` (2 s) réfute l'énoncé et divise le périmètre par 3. (2) #496 : le briefing nommait 2 renvois `BR-*` fautifs, le repo en portait **4**. Prévention : grepper l'inventaire sur le code AVANT d'agir, et classer chaque occurrence RECIBLÉ / INTACT — la trace du tri prouve qu'on n'a ratissé ni trop large ni trop court. Même famille que [[PIT-S70-001]] et [[upstream-blocker-verdict-expires]] : un énoncé recopié n'acquiert pas de vérité par répétition. (Sprint 71 #495 #496)


## PIT-S71-002 — RTK ne fait pas que tronquer l'affichage : il CORROMPT des sorties qui servent de données
Extension mesurée au S71 de [[rtk-git-diff-empty-output]] et [[BUG-S70-002]] (portée plus large qu'écrite). (1) `rtk proxy git diff > f` a produit un **patch inapplicable** (#134) : `git add -p` étant par ailleurs indisponible, le plumbing git est resté le seul chemin sûr. (2) `grep -oE` sur `br-events.md` a rendu une liste d'identifiants **amputée de BR-EVE-010** (#496) — choisir un id « libre » dessus aurait réutilisé un id OCCUPÉ ; `rtk proxy grep` a rétabli la liste. Prévention : toute sortie qui sert de DONNÉE (patch, liste d'identifiants, comptage) passe par `rtk proxy` ET se recoupe par une seconde commande. (Sprint 71 #134 #496)


## PIT-S71-003 — Chrome renvoie `color(srgb ...)` et non `rgb()` pour un fond issu de `color-mix` : le parseur naïf SURESTIME le contraste
Vérification navigateur S71 : l'instrument de mesure ne matchait que `rgb(...)`, n'a donc pas reconnu le fond composite et a lu le mauvais fond — ratio **surestimé de +0,18** (citron, thème clair). Une passe a11y menée avec cet outil peut déclarer conforme ce qui ne l'est pas, sans rien signaler. Prévention : accepter `color(srgb r g b)` autant que `rgb()`/`oklch()`, et faire **échouer explicitement** le parseur sur un format inconnu plutôt que retomber sur un ancêtre. Cousin de [[PIT-S58-001]] (mauvais élément) et [[PIT-S70-004]] (sonde silencieusement décalée) : ici l'élément est bon, c'est le FORMAT qui trahit. (Sprint 71, vérif navigateur)


## PIT-S71-005 — Un `trap EXIT` de restauration à chemin RELATIF ment : il annonce `[restored]` sur un fichier encore muté
Script de mutation testing (#495) : `trap restore EXIT`, puis la suite Playwright lancée depuis `frontend/` via un `cd`. Le trap s'exécute dans le cwd **final** → `FileNotFoundError` sur le chemin relatif, fichier source resté **muté** dans un working tree partagé par 3 autres agents — et le script a rendu `exit 0` en affichant `[restored]`. Prévention : chemins **absolus** dans tout trap de restauration, et vérifier la restauration par un `grep -c` du motif attendu, jamais par la sortie du script. (Sprint 71 #495)


## PIT-S71-006 — Compter les tests d'un pack coverage par `grep -c '@Test'` est faux dès qu'il existe un `@ParameterizedTest`
Une méthode `@ParameterizedTest` compte pour 1 déclaration et N exécutions (`PasswordPolicyTest` : 4 déclarées / **29 exécutées**). Au S71, la reprise des compteurs de `coverage-auth.md` depuis surefire a corrigé **7 écarts** (total 155 → 172) et exhumé une **classe fantôme inexistante à HEAD** (`JwtServiceSecretValidationTest`, renommée depuis N sprints) : un compteur faux survit indéfiniment parce que rien ne le confronte au réel. Prévention : compter depuis `target/surefire-reports/*.txt` (`Tests run:`), jamais depuis les annotations, et consigner la méthode en tête de pack. (Sprint 71, cycle de correction)


## PIT-S71-007 — Un plancher de contraste ne se cherche pas par dichotomie : le prédicat n'est pas monotone
Le long du chemin couleur→encre du thème, la luminance peut **traverser** celle du fond (couleur quasi noire en thème sombre) : le ratio descend jusqu'à 1,00:1 avant de remonter. Une recherche binaire converge donc vers un faux plancher. Prévention : balayage **linéaire** du paramètre de mélange, et vérification du ratio sur le hex **arrondi** effectivement rendu, pas sur la valeur flottante intermédiaire. (Sprint 71 #497)


## PIT-S71-008 — Normaliser la casse d'un hex sur le chemin « déjà conforme » fait passer une identité pour une modification
Une fonction de plancher qui `toLowerCase()` sa sortie avant même de décider qu'il n'y a rien à corriger renvoie une valeur ≠ de l'entrée : style inline recalculé à chaque frappe, `toBe` faussement rouge, diff bruyant. Prévention : court-circuiter (`return input`) sur le chemin conforme **avant** toute normalisation de format. (Sprint 71 #497)


## PIT-S71-010 — Indexer ses seuls hunks dans un working tree partagé : plumbing git, jamais le working tree
`UserControllerTest.java` était édité en parallèle par #134 et #148. `git add -p` est indisponible (mode non interactif) et le diff redirigé est corrompu ([[PIT-S71-002]]). Recette : `git cat-file -p HEAD:<path>` → reconstruction du contenu voulu → `git hash-object -w` → `git update-index --cacheinfo` : l'index reçoit la version voulue et **le working tree n'est jamais touché**, donc le WIP du voisin reste intact. Complément de [[sprint-parallel-commits-shared-worktree]]. (Sprint 71 #134)


## PIT-S72-002 — « `tsc --noEmit` : 0 erreur » dans un rapport d'agent peut être faux — vitest ne typecheck pas
L'agent de #72 a rapporté un typecheck propre ; `i18n-intl-classes.test.ts:65` levait pourtant TS2322 à HEAD. La suite vitest était verte parce qu'elle **ne typecheck pas** : seul le job frontend en CI l'aurait attrapé. L'écart a été trouvé par l'agent de l'autre issue, puis vérifié par le lead. Prévention : rejouer soi-même `tsc --noEmit` avant de reprendre un chiffre de typage dans un audit ; deux rapports d'agent qui se contredisent se tranchent par la mesure, jamais par l'ancienneté du rapport. Voir [[PIT-S71-...]] sur l'étiquette « pré-existant ». (Sprint 72)


## PIT-S72-004 — Le premier hit d'une route sous `next dev` dépasse un timeout Playwright de 5 s
La suite E2E est morte au projet `setup` (`provision shared`), 248 tests non exécutés : `expect(getByTestId('dashboard')).toBeVisible()` a 5 s de timeout, or le **premier** `GET /fr/dashboard` a pris **4172 ms** (compilation webpack 3,4 s) contre 72/59/35 ms ensuite — les 3 provisions suivantes sont passées. Diagnostic par lecture des durées dans le log `next dev`, pas par hypothèse. Prévention : préchauffer les routes ou relancer une fois avant de conclure à un défaut ; un échec du **seul premier** cas d'une série identique désigne l'environnement, pas le code. (Sprint 72)


## PIT-S72-005 — Un conteneur e2e « prêt à l'emploi » peut porter une image antérieure au code du sprint
`mytimeline-e2e-backend-e2e-1` était disponible et correctement configuré, mais son image précédait #142 : l'utiliser aurait rendu une suite verte **sans aucune valeur** sur le code à valider. Recette retenue : `./mvnw package -DskipTests` puis `java -jar` sur `:8086`, en ne réutilisant du conteneur que la base Postgres. Prévention : avant de s'appuyer sur un backend conteneurisé pour valider un diff, comparer la date de l'image aux commits à tester. Nuance [[mytimeline-e2e-ci-only-gate]] §S61 qui recommandait ce raccourci. (Sprint 72)


## PIT-S72-006 — Un run de tests dans un working tree partagé n'est valable que si `git status` est stable de bout en bout
La suite frontend est sortie rouge (4 tests / 1 fichier) pendant que l'agent de #142 éditait `authService.ts` dans le même arbre ; verte au re-run isolé. Prévention : en fan-out, re-jouer avant d'imputer un échec à son propre diff. Corollaire direct de l'étiquette « pré-existant » et complément de [[PIT-S71-010]]. (Sprint 72 #72)


## PIT-S72-007 — Le callback de `walkDecls` (PostCSS) est typé `false | void` : une lambda-expression casse le typecheck
`rule.walkDecls((d) => decls.set(d.prop, d.value))` renvoie la `Map` de `Map.set`, alors qu'une valeur non-`false` interrompt le parcours — d'où TS2322. Invisible sous vitest, rouge sous `tsc --noEmit`. Prévention : corps de bloc obligatoire pour tout visiteur PostCSS dont on ignore la valeur de retour. (Sprint 72 #72)

---

## §2 — Index historique (titre = règle ; détail dans docs/memory/pitfalls.md)

- PIT-S1-004 — `git add -A` dans un worktree sprint capture les artefacts d'orchestration
- PIT-S3-002 — Corriger `.gitignore` ne dé-tracke pas un fichier déjà suivi
- PIT-S3-005 — Subagent fullstack-dev lancé depuis un worktree `/sprint` commite sur `dev` du checkout principal
- PIT-S4-005 — `git add -A` dans un worktree `/sprint` aspire les artefacts d'orchestration du lead
- PIT-S5-004 — Worktree partagé multi-agents (fan-out /sprint, même working tree)
- PIT-S7-001 — jsdom n'exécute pas `window.location.href=` (no-op silencieux)
- PIT-S7-002 — TanStack Query v5 : `staleTime:Infinity` + `initialData` fige la valeur du premier render
- PIT-S7-003 — Logger l'objet axios `error` brut expose le password en clair
- PIT-S8-001 — `next build` CSR bailout : `useSearchParams()` sans `<Suspense>`
- PIT-S8-004 — (orchestration) L'audit tests ne lance PAS `next build`
- PIT-S8-005 — `React.use(params)` (Next async params) incassable en vitest
- PIT-S9-002 — br-auth pack pointe `useAuth.ts` mais la vraie source PII est `AuthContext.tsx`
- PIT-S9-003 — Audit PII : `grep localStorage` seul insuffisant avec TanStack Query
- PIT-S11-001 — Radix Select/Dialog en test Vitest+jsdom : Pointer Capture / scrollIntoView manquants
- PIT-S11-002 — Tester le rejet d'une mutation TanStack v5 en isolation → unhandled rejection au runner
- PIT-S11-003 — Assouplir un schéma Zod (désync DTO) sans auditer les schémas DÉRIVÉS qui l'héritent
- PIT-S14-002 — Architect Phase 0.5 « aucune evidence » faux négatif : lire le fichier cible réel, pas grep du nom d'exception
- PIT-S15-001 — `next dev`/`next build` réécrit `next-env.d.ts` → casse `npm run lint`
- PIT-S15-002 — E2E full-stack cross-port : cookie JWT SameSite=Lax non envoyé sur POST
- PIT-S15-004 — `next build` (ESLint strict) échoue là où vitest+tsc passent ; commitlint header ≤100
- PIT-S16-003 — Codemod `storybook upgrade` laisse des packages périmés dans package.json
- PIT-S16-004 — id généré via compteur module-level → mismatch d'hydratation SSR
- PIT-S17-001 — Migration vers classes DS `.mt-*` : vérifier que `globals.css` importe la feuille DS
- PIT-S17-002 — Concat de classes CSS en template string : l'espace séparateur saute silencieusement
- PIT-S17-003 — Réécriture de composant : un `data-testid`/contenu couvert par E2E mais pas par l'unit se perd silencieusement
- PIT-S18-001 — Migration modèle 1-couleur (BR-EVE-009) : appliquer AUSSI à la vue lecture, pas que le formulaire
- PIT-S19-002 — Imports inutilisés dans un test : vitest vert mais `next build` (eslint strict) rouge en CI
- PIT-S20-001 — Convertir une clé i18n string→objet casse les autres consommateurs (next-intl)
- PIT-S20-002 — Masquer une scrollbar scroll-x : `scrollbar-width:none` seul ne suffit pas sous Chromium
- PIT-S21-002 — Test swipe/pointer sous jsdom : `clientY` des synthetic pointer events = null
- PIT-S21-003 — AuthContext détient son user en useState : `invalidateQueries` ne le rafraîchit PAS
- PIT-S22-002 — Tester le threading d'une prop vers un enfant MOCKÉ : exposer la prop en data-attr
- PIT-S24-001 — `.focus()` seul ne défile pas des conteneurs scrollables imbriqués → `scrollIntoView` explicite
- PIT-S26-001 — Composant `useTranslations` (next-intl) monté au layout RACINE App Router → crash prerender SSG de TOUTES les pages
- PIT-S26-002 — Timeout axios global requalifie les uploads multipart longs en erreur réseau
- PIT-S28-001 — Un `case`-arm de test partagé entre scopes de nature différente = faux vert silencieux
- PIT-S29-001 — RTK tronque/mélange la sortie de `docker compose build/ps`
- PIT-S31-001 — `npm audit fix` tire des majeurs transitifs non voulus
- PIT-S31-002 — Garde ESLint anti-fuite `console.error` : couvrir le mono-arg
- PIT-S33-001 — URL absolue renvoyée par le backend + `apiClient.baseURL` finissant par `/api` → double `/api/api`
- PIT-S33-002 — Liste de locales dupliquée dans N fichiers → 404 silencieux sur les langues non déclarées partout
- PIT-S34-001 — `getRequestConfig({locale})` déprécié en next-intl (utiliser `requestLocale`)
- PIT-S37-003 — E2E : DB dev locale bloquée à une vieille version Flyway → boot backend échoue sur données stale
- PIT-S39-001 — Bordures UI Graphite : les tokens `rule`/`rule-strong` échouent le seuil WCAG AA ≥3:1
- PIT-S40-001 — `git mv` d'un segment de route Next.js → `.next/types/**` périmé → `tsc` TS2307 fantômes
- PIT-S40-002 — Shell client-only enveloppant `children` : la garde auth (redirection incluse) DOIT vivre dans le shell
- PIT-S40-003 — Consolider la nav dans un shell casse les E2E desktop qui cliquaient la nav propre d'un écran (devenue `lg:hidden`)
- PIT-S41-001 — Hitbox a11y `::before` (PAT-S24-002) clippée par un ancêtre `overflow:hidden` → cible < 44px aux bords
- PIT-S41-002 — Flex item + `text-overflow:ellipsis` sans `min-width:0` → ellipsis muette, hard-clip du parent
- PIT-S41-003 — CSS timeline vit dans le design system (`styles/ds/components/`), pas à côté des `.tsx`
- PIT-S41-004 — `./scripts/test-quiet.sh frontend` lancé depuis le repo principal (pas le worktree) → faux échec `eslint-plugin-storybook`
- PIT-S44-001 — `EventCreationRequest` : `durationValue`/`durationUnit` requis MÊME pour `type='single'`
- PIT-S44-003 — `if (!open) return null` ne démonte PAS un composant : l'état interne survit
- PIT-S44-004 — Copier un pattern a11y maison sans reprendre son invariant : `aria-hidden` sur spinner ⇒ état muet
- PIT-S44-005 — Schéma Zod jamais `parse()` : un `superRefine` qui ne protège rien
- PIT-S42-003 — Des `data-testid` en source ne prouvent PAS un flux atteignable
- PIT-S45-001 — Middleware Next : un `Location` RELATIF renvoie 500 (`ERR_INVALID_URL`), build ET tests unitaires VERTS
- PIT-S45-002 — Tester un `config.matcher` Next avec une regex reconstruite à la main : 3 itérations de trou de sécurité
- PIT-S45-004 — `nextUrl.pathname` n'est PAS percent-décodé : toute garde comparant des segments en clair est contournable
- PIT-S45-005 — Vagues parallèles : « prendre le prochain numéro libre » produit des collisions (2× ADR-004)
- PIT-S45-006 — `npm audit fix` : une 2e passe AGGRAVE, et les « fix available » mentent
- PIT-S45-007 — `frontend/.eslintcache` est TRACKÉ par git : tout run eslint pollue le working tree partagé
- PIT-S45-008 — `node_modules` n'est PAS partagé entre worktrees ; setup vitest et `server.deps.inline`
- PIT-S46-001 — Un `data-testid` en dur dans un composant partagé pollue les compteurs E2E des autres surfaces
- PIT-S46-002 — Réutiliser un callback desktop pour un chemin mobile n'hérite PAS de ses protections
- PIT-S46-003 — `DeleteConfirmDialog.onConfirm` transmet un `reassignToCategoryId?: string` à tout callback branché
- PIT-S46-004 — Le gate `[MISSING]` de `/sprint end` grep le littéral : écrire « aucun [MISSING] » bloque la PR
- PIT-S47-001 — Un `find` qui renvoie 0 ne prouve PAS une absence : le cwd du shell persiste entre les appels
- PIT-S47-002 — Le profil `dev` fige `app.cors.allowed-origins=:3000` : un front sur un autre port échoue en accusant le rate-limit
- PIT-S47-003 — La base de dev `eventmanager` est inmigrable : V7 casse sur des données que V9 nettoierait
- PIT-S47-004 — `workers > 1` rougit 4 specs `settings-*` : DEUX causes distinctes, même signature
- PIT-S47-005 — `npm run build` tue le `next dev` en cours, et Next 15.5.22 peut renvoyer un 500 fantôme après recompilation
- PIT-S48-001 — Contraste bi-mode : la contrainte serrée change de fond selon le thème
- PIT-S48-002 — Tailwind v4 scanne les COMMENTAIRES : citer une classe morte la ressuscite
- PIT-S48-003 — `.section-animation { opacity: 0 }` sans repli = landing INVISIBLE, pas « non animée »
- PIT-S48-004 — Changer une URL casse des specs E2E que le grep des `href` ne trouve pas
- PIT-S48-005 — `<Button asChild>` remonte sur le `<a>` des propriétés qui ne s'appliquaient qu'à l'élément interne — DEUX régressions invisibles aux tests
- PIT-S49-001 — Un couple `hover:bg-*` + `hover:text-*` dans un variant partagé est CASSABLE PAR CONSTRUCTION — 4 CTA invisibles en production
- PIT-S49-002 — L'échelle typo du DS Graphite ÉCRASE celle de Tailwind — tout budget de largeur calculé sur les valeurs Tailwind est faux d'un facteur ~2
- PIT-S49-003 — Un grep sur `frontend/src` RATE `frontend/app` (App Router hors `src/`) — le lead a « corrigé » une issue dans le mauvais sens
- PIT-S49-004 — Les panneaux navigateur d'agent mentent : `document.hidden` tue `IntersectionObserver`, et `innerHeight` ≠ `clientHeight`
- PIT-S49-005 — Trois façons dont un test de contraste/rendu passe au VERT à tort
- PIT-S49-006 — Deux agents ont déclaré la stack E2E morte alors qu'elle tournait ; et `test-quiet.sh e2e` contourne le `--workers=1` du runbook
- PIT-S49-007 — Tailwind v4 scanne les fichiers `.test.ts` : un témoin de test peut générer du CSS invalide et mettre l'app en 500
- PIT-S49-008 — Un défaut de contraste peut n'exister QUE dans un état mixte souris + clavier
- PIT-S50-003 — Passer une fonction en `async` casse les call sites de test EN SILENCE
- PIT-S50-004 — `url.host = 'h'` ne supprime PAS le port existant (WHATWG)
- PIT-S50-005 — `openssl … | base64` replie à 76 colonnes sur GNU, pas sur BSD/macOS
- PIT-S50-006 — Un audit documentaire écrit en vague N est périmé par le code de la vague N+1 du MÊME sprint
- PIT-S50-007 — Le hook RTK tronque les SORTIES, pas seulement les diffs : il fausse les MESURES
- PIT-S52-001 — Mesurer un débordement de mise en page sur macOS seul ne prouve RIEN
- PIT-S52-002 — Un port qui répond ne prouve pas que c'est VOTRE process qui répond
- PIT-S52-003 — Un `text-*` posé sur le conteneur d'un composant Radix est hérité, donc cassable
- PIT-S52-004 — L'indicateur de focus n'est pas forcément dans le `className` du composant
- PIT-S52-005 — Sonde `wget localhost` en image alpine : `unhealthy` à vie sur une app qui répond 200
- PIT-S52-006 — Un plan d'architecte peut produire le FAUX négatif de chemin fantôme
- PIT-S52-007 — Le hook RTK décale aussi `git log` (amende PIT-S50-007)

