[BRIEFING ISSUE #472 — SPRINT 80, VAGUE 1]

## Garde-fou de position (à jouer EN PREMIER, avant toute lecture)

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-8b85dc
git rev-parse --abbrev-ref HEAD   # DOIT rendre : claude/sprint-80-start-04f5f3
pwd                               # DOIT finir par /sprint-69-8b85dc
```
Si l'un des deux ne correspond pas : STOP, tu es dans le mauvais dépôt (piège récurrent des
sous-agents lancés depuis un worktree — ils défaut-cwd sur le dépôt principal et produisent
des faux KO). Toutes tes commandes partent de ce répertoire.

## Issue

**#472 — [BUG] Deux flakes E2E résiduels hors famille #467 (popover Firefox, suppression de catégorie)**
Taille M · priority:P2 · epic:infrastructure · frontend + test

## Contexte

Deux tests E2E échouent par intermittence, **sans rapport avec la famille de flakes de
virtualisation** corrigée par l'issue #467 pendant le Sprint 64. Ils ont été observés au cours de
**6 runs E2E complets consécutifs** joués en local pour valider ce correctif — c'est-à-dire dans des
conditions où on regardait attentivement, ce qui explique qu'ils n'aient jamais été relevés avant.

Aucun des deux n'implique le correctif de #467 : ils échouaient déjà, et sur des zones qu'il ne
touche pas.

## Les deux symptômes, avec leurs taux observés

| Spec | Test | Occurrences |
|---|---|---|
| `frontend/e2e/sprint-62-select-focus-indicator.spec.ts` | popover mobile — variantes claire **et** sombre | **2 runs sur 5** |
| `frontend/e2e/categories.spec.ts` | suppression d'une catégorie | **1 run sur 5** |

Les taux sont indicatifs : 5 runs ne suffisent pas à établir une fréquence fiable, mais ils
suffisent à établir que **les deux existent**.

## Pourquoi le premier mérite une attention particulière

`sprint-62-select-focus-indicator.spec.ts` est la **seule spec que le projet Playwright `firefox`
exécute**. Son `testMatch` y est restreint depuis le Sprint 62 (`frontend/playwright.config.ts`,
projet `firefox`), et le commentaire du fichier précise qu'élargir ce périmètre est une **décision
de sprint**, pas un détail.

Conséquence : si cette spec est instable, **toute la couverture Gecko du dépôt l'est**. Il n'y a pas
d'autre test pour compenser, et le job CI `e2e` installe Firefox exprès pour elle — un échec y rougit
un check requis.

## Ce qui est établi, et ce qui ne l'est pas

**Établi :**
- Les deux échecs se produisent en run **complet** local (`workers: 1` depuis l'issue #465).
- Ils sont **indépendants** du correctif de #467 (`frontend/e2e/support/timeline-lanes.ts`), qui
  n'intervient ni dans le popover d'un `Select`, ni dans la suppression d'une catégorie.
- Ils n'appartiennent **pas** à la famille de virtualisation verticale : celle-ci est verte sur
  5 runs consécutifs après correctif, et sur les runs CI `33608628176` et suivants.

**Non établi — à faire :**
- La **cause** de chacun. Aucun diagnostic n'a été mené : ils ont été relevés en passant, pendant la
  validation d'autre chose.
- Leur **fréquence réelle**, et notamment s'ils se manifestent aussi **en CI** (les observations
  ci-dessus sont locales). À la clôture du Sprint 64, la CI est verte.
- S'il s'agit de **deux défauts distincts** ou de deux symptômes d'une même cause (contention,
  timing d'animation, état partagé entre specs). Rien ne permet de trancher aujourd'hui.

## À faire

1. Reproduire chacun des deux de façon fiable — c'est le préalable, et c'est la partie coûteuse
   (un run complet dure ~7 à 9 min).
2. Diagnostiquer sur **artefact**, pas sur hypothèse : depuis l'issue #461 du Sprint 64, un échec
   E2E en CI laisse un rapport HTML et des traces téléchargeables
   (`.github/workflows/ci.yml`, step d'upload — chemins `playwright-report/` et `test-results/`).
3. Corriger, ou documenter explicitement pourquoi le symptôme est toléré.

⚠ **Piège de méthode, déjà payé deux fois sur ce dépôt** : isoler un test intermittent pour
l'observer peut **le faire disparaître** — c'est ce qui s'est produit avec la famille #467, dont le
déclencheur était le volume accumulé par la suite entière. Vérifier en run complet avant de conclure
qu'un symptôme a cessé. Voir `PIT-S64-009`.

## Critères d'acceptation

- [ ] Chacun des deux symptômes est reproduit de façon fiable, ou déclaré non reproductible avec le
      nombre de tentatives à l'appui
- [ ] La cause de chacun est identifiée, ou l'impossibilité de l'identifier est documentée
- [ ] Un run E2E complet passe **deux fois de suite** sans aucun des deux symptômes
- [ ] Si l'un est jugé tolérable en l'état, c'est écrit dans la spec concernée avec le motif

## Piste technique

- `frontend/e2e/sprint-62-select-focus-indicator.spec.ts` — popover mobile, variantes claire et sombre
- `frontend/e2e/categories.spec.ts` — parcours de suppression
- `frontend/playwright.config.ts` — projet `firefox` et son `testMatch` restreint (ne pas l'élargir
  sans décision de sprint), `workers: 1`, `retries: 2` en CI

⚠ Numéros de ligne non cités volontairement : ces fichiers sont susceptibles d'avoir bougé.

## Dépendances

Aucune. **Indépendant de #467** (famille de virtualisation, corrigée au Sprint 64) et de #469
(identités E2E hors scope module).

## Estimation

M — le diagnostic de deux instabilités distinctes, chacune exigeant plusieurs runs complets de ~8 min
avant même de pouvoir formuler une hypothèse.

---

Origine : relevés pendant la validation du correctif de #467, à la clôture du Sprint 64
(6 runs E2E complets). Source : `docs/memory/sprints/sprint-64/issue-467-done.md`.


---

## CORRECTIONS DU LEAD À L'ÉNONCÉ CI-DESSUS (vérifiées dans le dépôt le 2026-09-06)

Sur ce dépôt, les énoncés d'issue se périment : au S74, 3 pistes techniques sur 4 étaient
fausses. Ce qui suit a été revérifié à la source AUJOURD'HUI. **Ces corrections priment sur
le texte de l'issue.**

1. **« run complet local (`workers: 1` depuis l'issue #465) » est PÉRIMÉ.**
   `frontend/playwright.config.ts` porte aujourd'hui `workers: process.env.CI ? 1 : 2`.
   Le local est repassé à **2** avec #469 (S65). Les observations « 2 runs sur 5 » de l'issue
   ont donc été faites dans un régime de charge **différent** de celui que tu vas jouer.
   Conséquence directe : ne prends pas les taux 2/5 et 1/5 pour une base de comparaison — ils
   ne sont pas reproductibles à l'identique. Tu mesures un régime, pas une continuité.

2. **La prémisse structurelle de l'issue, elle, est EXACTE.**
   `playwright.config.ts` (projet `firefox`) porte bien
   `testMatch: /sprint-62-select-focus-indicator\.spec\.ts/`. Cette spec est donc réellement
   la seule couverture Gecko du dépôt. **Ne PAS élargir ce `testMatch`** — l'issue le dit, et
   ce serait changer le scope du sprint.

3. **Un verrou de run existe désormais** (`frontend/e2e/support/run-lock.ts`, #469/S65) : il
   REFUSE (il n'attend pas) un second run Playwright concurrent dans le worktree. Tu es le
   seul agent du sprint à toucher Playwright — mais si un `globalSetup` échoue en criant sur
   le verrou, c'est un run fantôme qui traîne, pas un défaut de ta spec. Tue-le et rejoue.

---

## HARNAIS E2E — DÉJÀ MONTÉ ET VÉRIFIÉ PAR LE LEAD. NE LE REMONTE PAS.

Le lead a monté et validé la pile avant de te briefer. **Ne relance ni `docker compose`, ni
`npm ci`, ni un autre serveur Next** — tu casserais le harnais sous tes propres pieds.

| Élément | État | Détail |
|---|---|---|
| Backend e2e | **UP** | conteneurs `s80e2e-backend-e2e-1` / `s80e2e-postgres-e2e-1`, exposé sur **`:8086`** |
| Serveur Next | **UP** | `next dev` en **webpack** sur **`:3000`**, log dans `/tmp/next-s80.log` |
| `node_modules` | **installé** | `npm ci` joué dans `frontend/` |

Ports **8085 et 5435 volontairement évités** : squattés par un conteneur e2e périmé d'une
autre session (`sprint-plan-5-9ef090-*`). N'y touche pas, ils ne sont pas à nous.

**Oracle réseau (le seul qui tranche, cf. `playwright.config.ts`) — rejoue-le avant ta
première campagne et si un doute surgit :**
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/me   # DOIT rendre 401
```
**401** = le proxy `/api` est en place. **404** = le rewrite est absent → n'accuse ni le
rate-limit, ni le CORS, ni un 409 : ces trois conclusions ont coûté les sprints 47, 56 et 57.
Préviens le lead plutôt que de rebâtir la pile.

**Commande de run complet — utilise CELLE-CI**, et surtout pas `npm run test:e2e` (qui
relancerait un serveur turbopack, lequel infère un mauvais workspace root dans un worktree :
toutes les pages rendent 500 et AUCUNE spec ne tourne, PIT-S61-007) :
```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-8b85dc/frontend
PLAYWRIGHT_BASE_URL=http://localhost:3000 SKIP_DELEGATION=1 npx playwright test 2>&1 | tail -40
```
`SKIP_DELEGATION=1` est **obligatoire** : un garde-fou du dépôt intercepte sinon la commande
et te demande de déléguer à un `test-runner`. **NE DÉLÈGUE PAS** — sur ce projet un
`test-runner` délégué a conclu « E2E impossible » à tort **4 fois sur 4** (PIT-S73-004). Tu
joues les runs toi-même.

Un run complet dure **~4 à 8 min** (≈240 tests). Prévois-le dans ton budget : l'issue est
taillée M précisément pour ça.

⚠ **`rtk` avale certaines sorties.** Si un listing sort `PASS (0) FAIL (0)` alors que des
specs existent, préfixe la commande par `rtk proxy` (PIT-S65-003).

⚠ **Lis le COMPTE de tests, jamais le seul code de sortie** : Playwright sort **exit 0** avec
« N did not run » quand le projet `setup` échoue (PIT-S77-020). Un `echo $?` à 0 ne prouve rien.

---

## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_472:
  fichiers_cles:
    - "frontend/e2e/sprint-62-select-focus-indicator.spec.ts  (28 Ko, SEULE spec du projet firefox)"
    - "frontend/e2e/categories.spec.ts"
    - "frontend/playwright.config.ts  (projet firefox, testMatch restreint)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E — plusieurs runs COMPLETS consécutifs ; un run vert isolé ne prouve rien"
  risque_regression: |
    PAT-S72-002 (« rejouer la spec isolée pour confirmer ») a une prémisse tacite : rejouer une
    spec SEULE retire la charge ET les specs polluantes. Sur ce dépôt la cause d'un flake a
    DÉJÀ été le volume accumulé par la suite entière (#467) et une spec TIERCE qui seede une
    donnée pathologique sur un compte partagé (PIT-S73-006). La preuve exige donc un run
    COMPLET répété, jamais un rejeu ciblé.
  ordre_ecriture: "reproduire (runs répétés) → diagnostiquer sur ARTEFACT → corriger → 2+ runs complets consécutifs verts"
  zod_dto_sync: "NON"
```

## Méthode imposée (les critères d'acceptation en dépendent)

1. **Reproduire d'abord, diagnostiquer ensuite.** Joue des runs COMPLETS et consigne le
   résultat de chacun (passed/failed/skipped + durée + quelles specs rouges). Un tableau de
   runs est le livrable central de cette issue.
2. **Diagnostique sur artefact, pas sur hypothèse** : `playwright-report/` et `test-results/`
   (traces). ⚠ Ne GREP PAS `playwright-report/index.html` — les données y sont encodées, un
   grep y est un faux négatif garanti (PIT-S64-002). Ouvre la trace.
3. **N'isole JAMAIS pour conclure.** Isoler un flake peut le faire disparaître — c'est arrivé
   deux fois ici (#467/PIT-S64-009, et le contre-exemple S73 où l'isolement retirait la spec
   POLLUANTE et pas la charge). Tu peux isoler pour EXPLORER ; tu ne peux conclure que sur run
   complet.
4. **« Non reproductible » est une conclusion valide** — mais seulement chiffrée : nombre de
   runs complets joués, et sur quel régime de workers. L'issue l'autorise explicitement.
5. **Tolérer un symptôme est valide aussi** — mais alors c'est écrit DANS la spec concernée,
   avec le motif, comme l'exige le dernier critère d'acceptation.

## Ce que tu ne dois PAS faire

- ❌ Élargir le `testMatch` du projet `firefox` (décision de sprint, hors de ton scope).
- ❌ Baisser `workers` en silence pour faire verdir. `playwright.config.ts` l'interdit
  nommément : « c'est la cause racine qu'il faut ouvrir — PAS cette valeur qu'il faut
  rebaisser une fois de plus en silence ». La valeur CI est par ailleurs le sujet de #476
  (vague 2) — n'y touche pas du tout.
- ❌ Ajouter un `retries` local, une attente en durée fixe ou un `test.slow()` pour masquer un
  flake sans l'avoir diagnostiqué. Si tu poses une attente, elle doit viser un état observable
  (`toBeVisible`, `toHaveCount`, `waitForResponse`), pas une durée.
- ❌ Toucher `frontend/e2e/support/timeline-lanes.ts` (correctif #467, hors périmètre) ni les
  fichiers du harnais partagé sans nécessité démontrée.

## Triage
Taille: M
Modèle: opus
Effort: high

---

## Context-pack — pièges E2E / Playwright du dépôt (lire EN PRIORITÉ)

<!-- ===== pit-frontend (sous-ensemble E2E) ===== -->

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

## PIT-S56-005 — Le `webServer` de `playwright.config.ts` lance `npm run dev` NU : `npx playwright test` est rouge par construction
S56 #391 : `playwright.config.ts:45-50` démarre le front sans `E2E_API_PROXY_TARGET` ni `NEXT_PUBLIC_API_URL`
→ `/api/*` non réécrit par Next, `POST register` en **404**, et `auth.setup.ts` échoue avec un message qui
oriente à tort vers le rate-limit ou le CORS. **Règle : ne jamais laisser Playwright démarrer son propre
`webServer` sur ce dépôt.** Recette : lancer le dev à part avec
`NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3000` +
`PLAYWRIGHT_BASE_URL=http://localhost:3000` — **port 3000 impérativement**, le CORS backend le fige
([[PIT-S56-004]]). [[PIT-S58-003]] complète : ces variables se posent au **build**, pas au start.

## PIT-S58-003 — E2E : `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` se posent au `next build`
Les rewrites Next sont **sérialisés dans `routes-manifest.json`** au build : les poser au `next start` n'a
aucun effet. Sans `NEXT_PUBLIC_API_URL=/api`, `apiClient` perd son préfixe et produit des **404 invisibles**
pour le watcher d'`auth.setup.ts`, qui accuse alors le rate-limit, le CORS ou un 409 — trois diagnostics
faux. **Oracle fiable : `curl /api/auth/me` doit renvoyer 401.** S58 : un audit a rapporté 5 échecs E2E de
ce fait ; rejoués sur la même base après correction de l'environnement, **136/0/8 vert, en suite comme en
isolation**. Complète [[PIT-S57-003]] (un `curl` qui réussit ne disculpe pas le CORS) : ici c'est le
symétrique, un environnement cassé qui accuse le code.

## PIT-S61-005 — Le check coverage-E2E est vert quand les specs sont seulement CITÉES
Au S61 il affichait « 10 testids ajoutés, 0 sans spec » alors que **les 5 specs du sprint n'avaient jamais été
exécutées** et que 2 échouaient. Il vérifie qu'un `data-testid` apparaît sous `frontend/e2e/`, il ne lance rien.
Combiné à 920 Vitest verts et un build OK, l'illusion est convaincante. Un `RECOMMAND_TEST_RUNNER` se traite en
**exécutant**, jamais en constatant. Famille [[PIT-S48-002]] (CI verte ≠ page correcte).

## PIT-S62-011 — Deux runs E2E complets rapprochés ne PEUVENT pas passer
`global-setup` purge `.auth/accounts.json`, donc chaque run ré-enregistre 4 comptes contre un bucket de **5/min/IP**. Le 2ᵉ échoue en `provision <compte>` avec `Test timeout of 180000ms` et « N did not run » — symptôme qui **ressemble à une panne d'infra**, pas à un rate-limit. Attendre ≥ 2,5 min entre deux runs. Cousin de [[e2e-cors-origin-proxy-trap]] : sur ce harnais, tout échec de provisioning se déguise en autre chose. (Sprint 62)

## PIT-S62-012 — Sans `PLAYWRIGHT_BASE_URL`, Playwright démarre un serveur SANS le proxy `/api`
`playwright.config.ts` fait `baseURL = PLAYWRIGHT_BASE_URL ?? localhost:3000` et, à défaut, lance son propre `webServer` (`npm run dev`) **sans** `E2E_API_PROXY_TARGET` : le rewrite `/api/*` n'existe pas, le `POST /api/auth/register` du projet `setup` tombe en **404**, les 4 comptes échouent et **aucun test ne démarre**. Un audit S62 en a conclu « BLOQUANT, régression du code » à tort. **Oracle : `401` sur `/api/auth/me` = proxy OK ; `404` = proxy absent.** Lire l'oracle avant toute hypothèse — cf. [[e2e-cors-origin-proxy-trap]]. (Sprint 62, audit Phase 6)

## PIT-S63-002 — `actionTimeout: 0` est le défaut Playwright : une erreur de routage coûte le budget du TEST
Sans budget explicite sur les clics d'un parcours à branches, une attente impossible consomme les **300 s du test**, × `retries: 2`. Le job `e2e` est passé de ~15 min à **42 min** pour 4 tests. Poser un budget par clic fait échouer **vite** et **nommer** le chemin manquant. (Sprint 63 #449)

## PIT-S64-002 — Greper `playwright-report/index.html` est un faux négatif GARANTI
Le reporter `html` embarque ses données en **base64** dans `<template id="playwrightReportBase64">` (441 Ko décodés → `report.json` + ~32 JSON). Chercher le nom d'un test échoué dans le HTML ne renvoie donc jamais rien, même quand l'échec y est. **Décoder avant de conclure.** (Sprint 64 #461)

## PIT-S64-009 — Les flakes de virtualisation de la timeline DISPARAISSENT quand on les isole
La suite E2E sème une catégorie et un produit par spec **sans nettoyage** et dépasse désormais `LANE_VIRTUALIZATION_MIN_ROWS = 60` (`virtualization.ts:80`) — 76 lanes en CI, 77 en local : la lane semée n'est plus montée dans le DOM. Rejouer la spec seule ne sème qu'une catégorie ⇒ virtualisation inactive ⇒ **le test passe**. Le réflexe d'isolement fait donc disparaître le défaut. C'est une **famille** (le membre qui tombe varie), suivie par l'issue **#467**. (Sprint 64)

## PIT-S65-003 — Un listing Playwright `--list` sans `rtk proxy` sort en `PASS (0) FAIL (0)`
Le hook RTK tronque/mal-parse la sortie du listing : le résultat ressemble **exactement** à une suite vide — soit précisément le faux signal que #470 élimine par ailleurs. Préfixer `rtk proxy` pour tout listing Playwright. Même famille que [[PIT-S20-003]] (`git diff` vidé) et [[PIT-S27-002]]. (Sprint 65 #470)

## PIT-S72-004 — Le premier hit d'une route sous `next dev` dépasse un timeout Playwright de 5 s
La suite E2E est morte au projet `setup` (`provision shared`), 248 tests non exécutés : `expect(getByTestId('dashboard')).toBeVisible()` a 5 s de timeout, or le **premier** `GET /fr/dashboard` a pris **4172 ms** (compilation webpack 3,4 s) contre 72/59/35 ms ensuite — les 3 provisions suivantes sont passées. Diagnostic par lecture des durées dans le log `next dev`, pas par hypothèse. Prévention : préchauffer les routes ou relancer une fois avant de conclure à un défaut ; un échec du **seul premier** cas d'une série identique désigne l'environnement, pas le code. (Sprint 72)

## PIT-S72-005 — Un conteneur e2e « prêt à l'emploi » peut porter une image antérieure au code du sprint
`mytimeline-e2e-backend-e2e-1` était disponible et correctement configuré, mais son image précédait #142 : l'utiliser aurait rendu une suite verte **sans aucune valeur** sur le code à valider. Recette retenue : `./mvnw package -DskipTests` puis `java -jar` sur `:8086`, en ne réutilisant du conteneur que la base Postgres. Prévention : avant de s'appuyer sur un backend conteneurisé pour valider un diff, comparer la date de l'image aux commits à tester. Nuance [[mytimeline-e2e-ci-only-gate]] §S61 qui recommandait ce raccourci. (Sprint 72)

## PIT-S73-004 — Un `test-runner` délégué conclut « E2E impossible » à tort — 4 fois sur 4 sur ce projet
S73 : verdict `INDETERMINE` sur « `next dev` échoue sur la branche du sprint, marche sur `origin/dev` ⇒ régression de build ». Réfuté en 45 s : `next dev` démarre en 1,25 s et la suite passe 249/0. Cause réelle = inférence de workspace root en worktree ([[PIT-S61-007]]), déjà documentée dans `frontend/playwright.config.ts` avec sa recette de contournement (webpack, pas turbopack). Prévention : le lead lance la suite lui-même (~6 min) plutôt que de déléguer ; lire `playwright.config.ts` AVANT tout diagnostic. Précédents : S49 ×2, S51. (Sprint 73)

## PIT-S73-006 — Une spec E2E qui seede une donnée PATHOLOGIQUE sur un compte PARTAGÉ casse une AUTRE spec
La sonde du S73 seedait un produit au nom de 64 caractères sans espace sur le compte `PROD` ; `seedProduct` ne nettoie rien, donc la donnée persiste. `sprint-62` utilise le même compte : son popover de `<Select>` s'élargit et le point échantillonné sort du viewport 390 px → 2 tests rouges en CI, à 1000 lignes du diff. Solution : helper `deleteProduct` + `afterEach` **inconditionnel** (jamais en fin de `test()` — non atteint quand le test échoue, précisément le jour où la pollution dure). Prévention : toute spec qui seede du hors-norme le supprime. (Sprint 73)

## PIT-S73-008 — Deux subagents en fan-out qui partagent la stack E2E se corrompent mutuellement
Deux absorptions lancées en parallèle dans le même worktree ont chacune démarré `next dev` + Playwright : `.next` corrompu en cours de run (`Cannot find module './vendor-chunks/…'`, 500 sur `/fr/dashboard`) → tests rouges dont le diagnostic accuse FAUSSEMENT le code de la page ; puis 3 runs perdus sur le verrou `e2e/.auth/run.lock`. Prévention : sérialiser les agents qui ont besoin de la stack E2E, ou ne paralléliser que ceux qui n'en ont pas besoin. (Sprint 73)

## PIT-S73-009 — `Date.now()` comme suffixe de nom sur un compte E2E partagé collisionne, et remonte en 500
`uq_categories_owner_name` est `UNIQUE(owner, name)` : à `workers: 2`, deux tests seedant « S73 <timestamp> » dans la même milliseconde violent la contrainte. Le backend remonte **500** (pas 409) → diagnostiqué à tort comme « backend cassé ». Prévention : toujours le helper `unique()` de `frontend/e2e/support/products.ts`. (Sprint 73)

## PIT-S74-004 — Un correctif d'imbrication a11y casse en silence tout locator E2E écrit en DESCENDANCE
Sortir `<DropdownMenuItem>` de son `<Link>` fait que l'ancre EST le `menuitem` : un seul nœud porte `href` et `role`. Les locators `a[href="…"] [role="menuitem"]` (avec espace) passent alors à **0 élément** — invisible à `tsc` et `vitest`, rouge seulement en E2E. Prévention : `grep -rn 'role="…"\|a\[href=' e2e/` avant tout passage à `asChild`, et corriger en sélecteur composé (`a[href][role="menuitem"]`). Corollaire d'orchestration : si `frontend/e2e/` est hors du périmètre d'écriture du subagent (vague parallèle), il rendra `PARTIAL` — c'est le comportement voulu, au lead d'appliquer la retouche. (Sprint 74 #342)

## PIT-S77-020 — Playwright sort **exit 0** avec « N did not run » quand le projet `setup` échoue : lire le COMPTE de tests, pas le code de sortie
Vérification du lead lancée sans `--no-deps` : Playwright a joué le projet `setup`, qui provisionne des comptes contre un backend absent ; les **11 tests visuels ont été sautés** et la sortie affichait « 1 passed, **11 did not run** » — **avec un code de sortie 0**. Une vérification qui ne vérifiait rien. Un code de sortie ne suffit jamais : lire le nombre de tests **réellement exécutés**. Voisin de [[PIT-S61-005]] et [[PIT-S45-003]]. (Sprint 77, audit de clôture)

## PIT-S78-006 — Un reformatage massif rend le check coverage-E2E entièrement FANTÔME
L'heuristique de Phase 8 collecte les `data-testid` des lignes `^+` du diff. Après un reformatage de 119 fichiers, **chaque ligne touchée compte comme ajoutée** : le check a rendu un MAJEUR sur 9 testids « sans spec » qui existaient tous déjà sur `origin/dev`. Réfutation en une commande : `git grep <testid> origin/dev`. Le sprint n'introduisait aucun testid. Voisin de [[PIT-S61-005]] (le check est vert quand les specs sont seulement citées) — dans les deux sens, il mesure le diff, pas la réalité. (Sprint 78, Phase 8)

## PIT-S79-007 — Playwright 1.61 ne permet pas de permuter l'ordre : ne pas promettre un « run en ordre inversé » comme si un flag l'offrait
Pas de `--shuffle`, et l'ordre des fichiers passé en CLI est **ignoré** (Playwright trie par chemin — vérifié par contrôle négatif). Inverser l'ordre des fichiers suppose de les **renommer** par préfixe numérique inverse le temps du run, et l'ordre **intra-fichier** reste hors de portée — précisément le cas que décrivait #463. Parade : adosser la preuve à une **mesure d'état** (comptage en base de ce que la suite laisse derrière : 81 produits + 88 catégories → 0 + 2), qui couvre l'intra-fichier que la permutation n'atteint pas. Voisin de [[isolation-verte-ne-prouve-pas-flaky]] : un run isolé retire la charge polluante, il ne prouve rien seul. (Sprint 79 #463)

---

## Context-pack métier — categories (pour la spec de suppression)

<!-- ===== br-categories ===== -->

# Context-pack domaine : `categories`

> Domaine : `categories` — référentiel de classification des produits (value object `id` + `name`), exposé en CRUD REST sans logique d'état métier.
> Acteurs principaux : `user` (tout utilisateur authentifié ROLE_USER). Aucun `admin` distinct n'existe pour ce domaine.

---

## 1. Lifecycles (machines à états)

### Entité : `Category`

CRUD simple — pas de lifecycle d'état.

`Category` est un value object pur (`id: UUID`, `name: String`, cf. `domain/models/Category.java`). Aucun champ de statut, pas de soft delete : `deleteCategory` appelle `deleteById` (suppression physique, cf. `CategoryServiceImpl:65`). Pas de transition d'état à modéliser.

---

## 2. Actions x Acteurs

| Action | `user` (ROLE_USER) | `admin` | `system` | Notes |
|---|---|---|---|---|
| Créer une catégorie (`POST /api/categories`) | ✅ | n/a | ❌ | Aucun garde admin — fallthrough `.anyRequest().authenticated()` (`SecurityConfig`) |
| Lister les catégories (`GET /api/categories`) | ✅ | n/a | ❌ | Retourne `List<Category>` brut |
| Lire une catégorie (`GET /api/categories/{id}`) | ✅ | n/a | ❌ | 404 si absente |
| Supprimer une catégorie (`DELETE /api/categories/{id}`) | ✅ | n/a | ❌ | Suppression physique, pas de soft delete |
| Modifier une catégorie (`PUT/PATCH`) | ❌ | ❌ | ❌ | ⚠️ Aucun endpoint exposé — `updateCategory` implémenté mais mort (cf. BR-CAT-006) |
| Utilisateur anonyme | ❌ | ❌ | ❌ | Bloqué par `.anyRequest().authenticated()` |

> Aucune distinction `ROLE_ADMIN` dans `SecurityConfig` pour `/api/categories/**` : tout utilisateur authentifié est l'unique acteur. Colonne `admin` = n/a.

---

## 3. Business Rules atomiques

### BR-CAT-001 — Nom de catégorie obligatoire (⚠️ NON IMPLÉMENTÉ)
**Règle** : Le `name` d'une `Category` MUST NOT être null ou vide à la création.
**Pourquoi** : Une catégorie sans nom est inexploitable côté UI et côté classification produit.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. Aucune annotation Bean Validation sur `Category.java` ni `CategoryEntity.java` (`name` sans `@NotBlank`, `@Column(nullable=false)`). La colonne `name` est nullable au niveau JPA. Aucun `@Valid` sur le `@RequestBody` du `CategoryController`.
**Test attendu** : `CategoryControllerTest` — `POST /api/categories` avec `name` vide/null doit renvoyer 400 (après ajout de `@NotBlank` + `@Valid`).

### BR-CAT-002 — Suppression d'une catégorie inexistante rejetée
**Règle** : Supprimer une catégorie dont l'`id` n'existe pas MUST lever `CategoryNotFoundException`.
**Pourquoi** : Éviter une suppression silencieuse no-op et signaler 404 au client.
**Implémentation** : `CategoryServiceImpl.deleteCategory:62` — `if (!existsById(id)) throw new CategoryNotFoundException(id)`. Le contrôleur double-check également (`CategoryController:48`), voir AP-CAT-04.
**Test attendu** : `CategoryServiceImplTest` — `deleteCategory(unknownId)` lève `CategoryNotFoundException` ; `CategoryControllerTest` — `DELETE /{id}` inconnu renvoie 404.

### BR-CAT-003 — Mise à jour d'une catégorie inexistante rejetée
**Règle** : Mettre à jour une catégorie dont l'`id` n'existe pas MUST lever `CategoryNotFoundException`.
**Pourquoi** : Empêcher un `save` de créer accidentellement une entité via un upsert sur un id fourni.
**Implémentation** : `CategoryServiceImpl.updateCategory:35` — `if (!existsById(category.getId())) throw`. ⚠️ Règle non atteignable via l'API : aucun endpoint n'expose `updateCategory` (cf. BR-CAT-006).
**Test attendu** : `CategoryServiceImplTest` — `updateCategory(categoryWithUnknownId)` lève `CategoryNotFoundException`.

### BR-CAT-004 — Unicité du nom de catégorie (⚠️ NON IMPLÉMENTÉ)
**Règle** : Deux catégories MUST NOT partager le même `name`.
**Pourquoi** : `findDomainCategoryByName` ne renvoie que le premier résultat ; des doublons rendent la résolution par nom non déterministe.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. Pas de `@Column(unique=true)` sur `name` (`CategoryEntity:13`), pas de check d'unicité dans `CategoryServiceImpl.createCategory:28-29` avant `save`. `CategoryRepositoryJpaImpl.findDomainCategoryByName:40-52` fait `getResultList()` et retourne `results.get(0)` silencieusement si plusieurs lignes partagent le nom.
**Test attendu** : `CategoryServiceImplTest` — créer deux catégories de même nom doit lever une exception métier (après ajout du check + contrainte UNIQUE).

### BR-CAT-005 — Catégorie requise et référençable côté produit
**Règle** : Un `Product` MUST référencer une `Category` existante via un `id` UUID valide ; la FK `category_id` est NOT NULL en base.
**Pourquoi** : `ProductEntity.category` est `@ManyToOne @JoinColumn(name='category_id', nullable=false)` — un produit sans catégorie est invalide au niveau DB.
**Implémentation** : Côté écriture, `productCreateSchema` (`frontend/src/types/product.ts:18`) valide `category: z.string().uuid('La catégorie est requise')` (format UUID uniquement, pas d'existence). Côté lecture, `productSchema` (`product.ts:7-10`) attend `category: { id, name }` sans `.uuid()`. ⚠️ Aucune validation backend que l'UUID correspond à une catégorie réelle au moment de la création produit.
**Test attendu** : test d'intégration produit — créer un produit avec `category` UUID inconnu doit échouer proprement (404/400), pas une violation FK brute.

### BR-CAT-006 — Endpoint de mise à jour absent (⚠️ NON IMPLÉMENTÉ)
**Règle** : La modification d'une catégorie via l'API MUST être possible (`PUT`/`PATCH /api/categories/{id}`).
**Pourquoi** : `CategoryServiceImpl.updateCategory:34-39` est entièrement implémenté mais aucun handler du `CategoryController` ne l'expose — méthode de service morte, mise à jour impossible via API.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ côté contrôleur. `CategoryController` n'a que `POST`, `GET`, `GET/{id}`, `DELETE/{id}`.
**Test attendu** : `CategoryControllerTest` — `PUT /api/categories/{id}` met à jour le `name` et renvoie 200 (après exposition de l'endpoint avec request/response DTO).

### BR-CAT-007 — Chargement dynamique des catégories côté UI (⚠️ NON IMPLÉMENTÉ)
**Règle** : Le formulaire de création produit MUST charger les catégories depuis `GET /api/categories`, pas via des valeurs codées en dur.
**Pourquoi** : `AddProducts.tsx:172-184` contient 4 UUID de catégorie littéraux dans le JSX ; le formulaire casse dès que la base est seedée différemment selon l'environnement.
**Implémentation** : ⚠️ NON IMPLÉMENTÉ. `AddProducts.tsx` court-circuite `GET /api/categories`.
**Test attendu** : test de composant `AddProducts` — le select de catégorie est peuplé depuis un fetch mocké de `GET /api/categories`, sans UUID en dur.

---

## 4. Dépendances inter-domaines

- **`products` dépend de `categories`** : `CategoryEntity -> ProductEntity` en `OneToMany` (côté inverse), `ProductEntity.category` en `@ManyToOne @JoinColumn(name='category_id', nullable=false)`. FK requise en base, mais **aucun cascade** côté `Category` : supprimer une catégorie référencée par des produits provoque une violation de contrainte FK (suppression physique non protégée — voir AP-CAT-05).
- **`categories` dépend de `auth`** : tout accès passe par le fallthrough `.anyRequest().authenticated()` (JWT ROLE_USER). **Depuis Sprint 10 (#52, ADR-002) : ownership PAR UTILISATEUR** — `Category.ownerId` (FK users, NULLABLE) ; `owner NULL` = catégorie « système » (lisible de tous, non modifiable/supprimable → 403). PATCH/DELETE exigent `owner_id == JWT` (403 sinon). Lecture scopée : `GET` liste ne renvoie que `owner == caller ∪ système`, `GET /{id}` d'autrui → 404 (anti-énumération), DTO `CategoryResponse` n'expose PAS l'`ownerId` (booléen `system`).
- **`Category` (domain model)** : value object pur `id` + `name`, sans champ de relation. Le lien vers les produits n'existe qu'au niveau infrastructure (`CategoryEntity`/`ProductEntity`).

---

## 5. Anti-patterns documentés

- **AP-CAT-01 — Injection de l'implémentation concrète** : `CategoryController:8,20` importe et injecte `CategoryServiceImpl` (couche application) au lieu du port `CategoryService` (domaine). Brise la règle hexagonale ; le contrôleur est couplé à l'implémentation.
- **AP-CAT-02 — Double injection du même champ** : `CategoryController:19-25` déclare `@Autowired` sur le champ ET un constructeur `@Autowired` pour `categoryService`. Comportement indéfini, Spring peut injecter deux fois. Garder une seule injection par constructeur.
- **AP-CAT-03 — Domaine exposé en couche HTTP** : `CategoryController:28` désérialise le `@RequestBody` directement vers `Category` (domain model) et `CategoryController:34` retourne `List<Category>` brut. Aucun request/response DTO — le modèle de domaine fuit vers les consommateurs de l'API. Introduire un `CategoryRequest`/`CategoryResponse`.
- **AP-CAT-04 — Double `existsById` (fenêtre de race + double requête)** : `CategoryController:48` vérifie `existsById` puis `CategoryServiceImpl.deleteCategory:62` re-vérifie. Double requête + fenêtre de race entre les deux checks. Laisser la décision 404 au service / `@ExceptionHandler` sur `CategoryNotFoundException`.
- **AP-CAT-05 — Suppression physique sans soft delete ni protection FK** : `deleteCategory` fait un `deleteById` physique (`CategoryServiceImpl:65`). Aucun soft delete, aucune vérification de produits référents — risque de violation FK ou d'orphelins. Contraire à la règle soft-delete du projet.
- **AP-CAT-06 — Champ `name` sans contrainte** : `CategoryEntity:13` n'a ni `@Column(nullable=false)`, ni `@Column(unique=true)`, ni `@NotBlank`. Colonne nullable et dupliquable malgré une sémantique « requis et unique ».
- **AP-CAT-07 — Création sans check de doublon** : `CategoryServiceImpl.createCategory:28-29` `save` sans vérifier l'existence d'un même nom — doublons silencieux (cf. BR-CAT-004).
- **AP-CAT-08 — Résolution par nom non déterministe** : `CategoryRepositoryJpaImpl.findDomainCategoryByName:40-52` renvoie `results.get(0)` parmi plusieurs lignes possibles, sans contrainte UNIQUE garantissant l'unicité.
- **AP-CAT-09 — ~~Absence de garde admin~~ SUPERSEDÉ (Sprint 10, ADR-002)** : le référentiel global est remplacé par l'ownership par utilisateur (`owner_id == JWT` sur PATCH/DELETE). Voir la dépendance `auth` en §4.

> **MàJ Sprint 10 (#52 + review PR #153)** — anti-patterns RÉSOLUS : AP-CAT-01/02 (port `CategoryService` injecté), AP-CAT-03 (DTOs `CategoryRequest`/`CategoryResponse`), AP-CAT-04 (double `existsById` retiré), AP-CAT-05 (réassignation atomique `?reassignToCategoryId=` + garde self-target), AP-CAT-06/07 (`@NotBlank` + `UNIQUE(owner_id,name)` + check applicatif → 409), AP-CAT-08 (`findByOwnerAndName` + `setMaxResults(1)`). RESTENT ouverts : AP-CAT-10 (partiel), AP-CAT-11 (front, #61/S11).
- **AP-CAT-10 — Code mort** : `CategoryNotFoundException(String name):10` n'est jamais utilisé ; `CategoryServiceImpl.updateCategory` est implémenté mais non exposé par un endpoint (cf. BR-CAT-006).
- **AP-CAT-11 — UUID de catégories codés en dur dans le JSX** : `AddProducts.tsx:172-184` (4 UUID littéraux) court-circuite `GET /api/categories` (cf. BR-CAT-007).

---

## Référence

- Coverage actuelle : `coverage-categories.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/` (`infrastructure/adapters/controllers/CategoryController.java`, `application/services/CategoryServiceImpl.java`, `infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java`, `infrastructure/entities/CategoryEntity.java`, `domain/models/Category.java`, `domain/exceptions/CategoryNotFoundException.java`)
- Frontend : `frontend/src/types/product.ts` (schémas Zod), `frontend/src/components/.../AddProducts.tsx` (formulaire de création produit)

---

## MàJ Sprint 22 (#62/#68) — UI catégories + sémantique PATCH-clear

- **Front livré** : `CategoryDrawer` (create/edit desktop+mobile, réassignation via `DeleteConfirmDialog variant="category"`), page catégories (`CategoriesView`), hooks `useCreateCategory`/`useUpdateCategory` + `categoryService` (create/update/delete). Color = **String libre** côté Zod (`.max(255).optional()`, PAS de `@Pattern` hex — cf. PAT-S22-001).
- **PATCH clear-via-clé-omise (⚠ contrat implicite, cf. PAT-S22-003)** : `CategoryServiceImpl.updateCategory` fait `existing.setColor(color)` / `setDescription(...)` **INCONDITIONNEL** ; `CategoryUpdateRequest` a des champs `String` simples → une clé JSON absente arrive `null` (Jackson) → le champ est **effacé**. Conséquence : le front DOIT toujours porter `name` + toute valeur à conserver ; omettre `color` = l'effacer (c'est ainsi que le bouton « reset couleur » du drawer fonctionne). **NE PAS** refactorer le DTO en `Optional<String>` ni passer le service en « update-si-non-null » sans casser silencieusement le reset.
- **Suppression catégorie liée** : exige `reassignToCategoryId` (sinon `CategoryInUseException` → 409). Tout appelant de `DeleteConfirmDialog variant="category"` DOIT passer `linkedProductsCount` pour armer le select de réassignation (cf. BUG-S22-002).


<!-- CACHE_CONTROL_BREAKPOINT -->

---

## Dépendances intra-sprint

- Tu es la **vague 1**. Personne d'autre ne tourne en parallèle.
- **#476 (vague 2)** tranchera `workers` en CI et **#408 (vague 3)** exige une baseline verte.
  Les deux dépendent de ton résultat : si tu laisses un flake vivant, #408 ne peut pas
  distinguer « bloqué parce que j'ai cassé une assertion » de « bloqué parce que ça flake ».
- Tu es donc le **seul** à modifier `frontend/playwright.config.ts` — et uniquement si ton
  diagnostic l'exige (hors `workers`, hors `testMatch` firefox).

## Designer
Non applicable (aucun changement visuel).

## Contraintes

- **Branche cible** : `claude/sprint-80-start-04f5f3` (déjà checkout, ne change PAS de branche).
- **Commit** : 1 commit logique, message **gitmoji en français**, corps expliquant le
  diagnostic (pas seulement le correctif).
- ⚠ **`git add` avec chemins EXPLICITES uniquement.** Jamais `git add -A`, jamais `git add .`,
  jamais `git add -- $VAR` (inerte sous zsh, ton commit serait VIDE et tu croirais avoir
  livré). Écris les chemins en clair :
  `git add frontend/e2e/categories.spec.ts frontend/e2e/....spec.ts`
- **Ne commite PAS** : `playwright-report/`, `test-results/`, `frontend/e2e/.auth/`,
  `node_modules/`, `/tmp/*`.
- Vérifie ton commit après coup : `git show --stat HEAD`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA]
- runs joués: <tableau compact — n° / passed / failed / skipped / durée / specs rouges>
- diagnostic popover firefox: <cause identifiée | non reproductible en N runs | toléré + motif>
- diagnostic suppression catégorie: <idem>
- resume: <fichiers clés touchés + ce qui a changé>
- [MEMORY:pitfall] / [MEMORY:pattern] / [MEMORY:decision] : <liste — OBLIGATOIRE de les
  écrire ici, ils sont perdus sinon>
- recommandations suite: <RECOMMAND_* ou pitfall subtil ; sinon négation explicite
  « pas de RECOMMAND_X car ... »>
- RECOMMAND_FOLLOWUP: <desc [triage XS|S|M|L] [domaine]> ou « aucun »
- STATUS: COMPLETED   <- dernière ligne (ou STATUS: PARTIAL + section BLOQUE_SUR)
```

⚠ **Les signaux `[MEMORY:*]` doivent figurer dans ton retour.** Au S76 les agents les ont
oubliés et l'information a été perdue à la consolidation.

⚠ **Honnêteté de rapport** : si tu n'as pas joué N runs complets, ne l'écris pas. « Je n'ai
pas vérifié » est une réponse acceptable et attendue. Un flake déclaré mort sans run complet
répété sera rejeté à la review.
