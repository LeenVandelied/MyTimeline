[BRIEFING ISSUE #434 — Sprint 78, vague 1]

## ⚠ GARDE-FOU WORKTREE — À EXÉCUTER AVANT TOUTE AUTRE COMMANDE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton `cwd` par défaut peut
être `/Users/herrh/VSProjects/MyTimeline` (le dépôt principal) — écrire là serait une perte sèche.

**Racine de travail (unique chemin valide) :**
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`

Premier appel Bash obligatoire :

```bash
pwd && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

Attendu : branche `sprint/78`, HEAD `1ebdd64` (ou un descendant).
Si `pwd` ne finit PAS par `traitement-s-xs-parallele-d0ae59` : **arrête-toi et signale-le**.
Préfixe TOUS tes chemins Read/Edit/Write par cette racine absolue.

## ⚠ WORKING TREE PARTAGÉ — un autre agent réécrit `frontend/` EN CE MOMENT

L'issue **#528** tourne en parallèle et **reformate potentiellement 119 fichiers sous
`frontend/`** (prettier + prettier-plugin-tailwindcss), plus `.github/workflows/ci.yml`,
`frontend/package.json` et `docs/memory/decisions.md`.

Conséquences concrètes pour toi :
- `git status` sera bruyant et **instable de bout en bout** : ne tire AUCUNE conclusion d'un
  `git status` global (PIT-S72-006). Raisonne uniquement sur TES fichiers.
- `git add <chemins explicites>` **uniquement**. JAMAIS `git add -A`, `git add .`, `git add -u`.
- `git commit -- <mêmes chemins explicites>` : sans pathspec, `git commit` commite TOUT l'index,
  donc le travail de l'autre agent (PIT-S57-001).
- JAMAIS `git commit --amend`, `git stash`, `git checkout -- .`, `git reset`.
- **Fichiers INTERDITS** (ils appartiennent à #528 / #169) : `frontend/package.json`,
  `frontend/package-lock.json`, `frontend/.prettierrc`, `frontend/.prettierignore`,
  `.github/workflows/ci.yml`, `docs/memory/decisions.md`, `frontend/README.md`,
  `frontend/vitest.config.mts`, `backend/pom.xml`, tout `frontend/src/**` et `frontend/e2e/**`
  **de façon durable** (voir l'exception « fichier sonde » plus bas).
- **Fichiers qui te sont RÉSERVÉS** : `scripts/test-quiet.sh`, `README.md` **racine**, et les
  gabarits de briefing sous `.claude/` s'il en existe.

## ⚠ PAS DE PLAYWRIGHT, PAS DE E2E

L'exclusivité Playwright de la vague 1 est détenue par #528. **Tu ne lances jamais
`./scripts/test-quiet.sh e2e`, ni la CLI Playwright, ni aucun serveur `next dev` / `next start`
de longue durée.** Deux agents qui partagent la stack E2E se corrompent mutuellement
(PIT-S73-008), et le port peut être squatté par un AUTRE worktree du même projet
(PIT-S60-008). Le lead exécutera la suite E2E complète en Phase 6.

Tu peux en revanche lancer `npm run typecheck`, `npm run lint`, `npm run build` et `npm run test`
depuis `frontend/` — ils ne nécessitent pas de serveur.

## Issue #434 — [BUG] Aligner `scripts/test-quiet.sh frontend` sur ce qu'annoncent les docs

### Contexte (corps de l'issue)

`scripts/test-quiet.sh` permet de lancer rapidement les vérifications automatiques du frontend.
La documentation et les consignes internes décrivaient ce contrôle comme complet : tests +
build + typecheck + style. En réalité il ne lance **que** Vitest. Un développeur — ou un agent —
qui voit ce contrôle au vert et en conclut « le frontend est bon » se trompe : le build peut être
cassé sans que ce contrôle le détecte. Ce malentendu a déjà produit **un rapport de vérification
entièrement faux** lors d'un sprint précédent (PIT-S60-009, texte intégral dans le pack), et
s'est reproduit dans les documents de travail du Sprint 60 lui-même.

### À faire — arbitrage binaire

1. **Étendre** le scope `frontend` pour qu'il exécute réellement `typecheck` + `lint` + `build`
   en plus de Vitest — que le contrôle corresponde à ce que son nom laisse penser.
2. **Renommer** ce scope en `frontend-unit` (signalant qu'il ne couvre que l'unitaire) et
   documenter séparément les commandes build / typecheck / lint.

**Tu tranches, tu ne demandes pas.** Mesure d'abord le coût (option 1 rallonge fortement le
scope : `next build` sur ce projet n'est pas gratuit — chronomètre-le), puis choisis, applique
intégralement, et écris ce qui plaidait CONTRE ton choix.

Si tu retiens l'option 2 (renommage), tu dois traiter **tous les appelants existants** du scope
`frontend` — un scope renommé sans ses appelants est une régression, pas une clarification.
Grep-les : `docs/`, `.claude/`, `README.md`, `scripts/`, workflows.

### Critères d'acceptation

- [ ] Décision documentée entre les deux options, avec la mesure de durée qui la fonde
- [ ] `scripts/test-quiet.sh frontend` (ou son nouveau nom) exécute **exactement** ce que sa
      documentation annonce — ni plus, ni moins
- [ ] Le `README.md` racine et les gabarits de briefing de sprint sont cohérents avec le
      comportement réel
- [ ] **Vérification empirique obligatoire** : casser volontairement le build (erreur de type)
      et confirmer que le scope choisi le détecte — ou, si scope renommé, que la documentation
      indique clairement la commande alternative, et que CELLE-CI détecte la casse.
      Protocole imposé pour cette vérification : voir « Fichier sonde » ci-dessous.

## Plan d'implémentation (architect, `/sprint plan`)

```yaml
issue_434:
  fichiers_cles:
    - "scripts/test-quiet.sh  (run_frontend ; case SCOPE)"
    - "README.md  (racine)"
  couches_touchees: ["ci"]
  strategie_test: "manuel (exécuter les scopes) — pas de test automatisé du script"
  risque_regression: "Option 1 (étendre le scope) rallonge fortement `frontend` (build Next) et
    peut faire échouer les briefings de sprint qui l'appellent en boucle ; option 2 (renommer en
    frontend-unit) casse tous les appels existants du scope `frontend`."
  ordre_ecriture: "décision documentée → script → README/briefings"
  zod_dto_sync: "NON"
  possibly_done: false
```

### État réel du code — vérifié par l'architect puis par le lead (2026-09-06)

**Le corps de l'issue est en partie périmé. Deux écarts relevés — vérifie AVANT de t'appuyer
sur l'énoncé** (PIT-S71-001, PIT-S74-003) :

1. **Les numéros de ligne de la « piste technique » sont faux.** L'issue dit
   `run_frontend`, lignes ~96-103 ; l'architect a mesuré ~L200-225, et le `case SCOPE` ~L250.
   Localise la fonction par son nom, pas par son numéro de ligne.

2. **Le scope n'est pas « nu ».** Depuis #308, le script a gagné un **préflight substantiel**
   (résolution des paquets importés par `eslint.config.mjs`, détection d'un `node_modules`
   absent ou vide). Le scope n'est donc pas vide : il est **incomplet au sens annoncé**.
   Le `README.md` a déjà été corrigé au S60, et le script **documente honnêtement son périmètre
   dans son en-tête (~L18-20)**. Ton diff doit tenir compte de cet existant plutôt que de le
   réécrire depuis zéro.

3. `run_frontend()` n'exécute effectivement que `npm test --silent` (Vitest) : ni typecheck,
   ni lint, ni build. **CONFIRMÉ.**

4. Le scope `coverage` contient **déjà** un branchement conditionnel
   (`grep -q jacoco backend/pom.xml`) : il s'activera tout seul quand **#169** livrera, en
   vague 2. **N'y touche pas** — et ne « corrige » pas ce branchement au prétexte qu'il ne
   s'active pas aujourd'hui.

5. Pour référence (job CI `frontend`, `.github/workflows/ci.yml` ~L77-115) : la CI enchaîne
   `npm ci` → `Build` → `Tests (Vitest)` → `Typecheck` → `Lint`. C'est l'ordre de référence si
   tu retiens l'option 1. **Tu ne modifies PAS `ci.yml`** (fichier de #528).

### Fichier sonde — protocole imposé pour la vérification empirique

Tu dois casser le typecheck pour prouver que ton scope le détecte, mais un autre agent réécrit
`frontend/src/**` en même temps. Contrainte :

- Nomme le fichier **exactement** `frontend/src/__tmp-434-typecheck-probe.ts` (l'agent #528 a
  été prévenu de ce nom précis et sait qu'il doit l'ignorer).
- Crée-le, lance ton scope, lis l'exit code, **supprime-le immédiatement** dans le même
  enchaînement. Il ne doit JAMAIS être stagé ni commité.
- Vérifie sa disparition avant de conclure : `ls frontend/src/__tmp-434-typecheck-probe.ts`
  doit renvoyer « No such file ». Un `trap EXIT` à chemin relatif MENT (PIT-S71-005) — vérifie
  explicitement, ne te fie pas au trap.

### Piège de mesure

Le hook RTK falsifie des sorties : il a déjà transformé un `prettier --check` rouge en « All
files formatted correctly » (PIT-S74-008), et il falsifie aussi `next build` — **la redirection
vers un fichier ne désamorce rien** (PIT-S75-002). `vitest` a été affiché « PASS (23) FAIL (0) »
alors qu'une suite échouait à la COLLECTE (PIT-S45-003).

**Toute affirmation de ta part sur un vert/rouge doit citer un exit code lu sans pipe :**

```bash
rtk proxy <commande> > /tmp/out-434.txt 2>&1; echo "EXIT=$?"; tail -5 /tmp/out-434.txt
```

Un `… | tail -15` rapporte l'exit code de `tail`, pas celui de la commande.

Attention aussi : `warn-test-delegation.sh` tue la commande ENTIÈRE, **y compris un heredoc qui
écrit un fichier**, et l'échec se déguise en lancement réussi (PIT-S63-007, PIT-S74-007). Le lead
s'est fait piéger en direct en écrivant CE briefing : un heredoc contenant la chaîne de la CLI
Playwright a été tué par le hook. Si une écriture par heredoc semble n'avoir rien produit, c'est
probablement ça — utilise l'outil Write.

## Triage
Taille: S
Modèle: opus
Effort: high
