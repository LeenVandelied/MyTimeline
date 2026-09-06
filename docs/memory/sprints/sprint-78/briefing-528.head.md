[BRIEFING ISSUE #528 — Sprint 78, vague 1]

## ⚠ GARDE-FOU WORKTREE — À EXÉCUTER AVANT TOUTE AUTRE COMMANDE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton `cwd` par défaut peut
être `/Users/herrh/VSProjects/MyTimeline` (le dépôt principal) — écrire là serait une perte sèche.

**Racine de travail (unique chemin valide) :**
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`

Premier appel Bash obligatoire, et vérification du HEAD attendu :

```bash
pwd && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

Attendu : branche `sprint/78`, HEAD `12f8bc1` (ou un descendant si un autre agent a déjà commité).
Si `pwd` ne finit PAS par `traitement-s-xs-parallele-d0ae59` : **arrête-toi et signale-le**.
Préfixe TOUS tes chemins Read/Edit/Write par cette racine absolue.

## ⚠ WORKING TREE PARTAGÉ — un autre agent code EN MÊME TEMPS QUE TOI

L'issue **#434** tourne en parallèle sur le MÊME working tree. Elle touche
`scripts/test-quiet.sh`, le `README.md` **racine**, et peut créer/supprimer un fichier sonde
éphémère nommé `frontend/src/__tmp-434-typecheck-probe.ts`.

Règles non négociables :
- `git add <chemins explicites>` **uniquement**. JAMAIS `git add -A`, `git add .`, `git add -u`.
- `git commit -- <mêmes chemins explicites>` (sans pathspec, `git commit` commite TOUT l'index,
  y compris ce que l'autre agent y aurait mis — cf. PIT-S57-001 dans le pack).
- JAMAIS `git commit --amend`, JAMAIS `git stash`, JAMAIS `git checkout -- .`, JAMAIS `git reset`.
- Si un `prettier --check` final signale `frontend/src/__tmp-434-typecheck-probe.ts` ou tout
  fichier hors de ton périmètre que tu ne reconnais pas : **ignore-le**, c'est l'autre agent.
  Ne le reformate pas, ne le commite pas, ne le supprime pas.
- Ne touche PAS : `scripts/test-quiet.sh`, `README.md` (racine), `backend/**`,
  `frontend/vitest.config.mts`. Ils appartiennent à #434 et #169.

## Issue #528 — [CHORE] Trancher le sort de `format:check` — le câbler en CI ou retirer les scripts `format*`

### Contexte (corps de l'issue)

`frontend/package.json` déclare des scripts `format` / `format:check`, mais **aucun workflow
`.github/workflows/` ne lance `format:check`**. La CI lance `npm run lint` (eslint) — lint et
formatage sont deux gates distincts, et une CI verte ne dit rien du second.

C'est une **redécouverte, pas une nouveauté** : le défaut est déjà consigné sous `BUG-S71-002`
dans `docs/memory/bugs-resolved.md`, avec la même conclusion et le même arbitrage laissé ouvert.
Deux sprints (S71, S75) l'ont signalé sans le trancher. L'issue #510 était le MÊME défaut :
fermée comme doublon de celle-ci le 2026-09-06.

### Arbitrage attendu (binaire — c'est le cœur de l'issue)

- **Soit** câbler `format:check` dans la CI — ce qui impose de reformater d'abord la dette
  existante. `prettier-plugin-tailwindcss` réordonne les classes : le diff sera large et touchera
  des fichiers sans rapport avec un quelconque sprint.
- **Soit** retirer les scripts `format*` du `package.json`, et assumer que le formatage n'est pas
  un gate de ce dépôt.

Le statu quo — des scripts qui existent, échouent, et que rien n'exécute — est le pire des trois :
il produit à chaque sprint un faux signal que les agents doivent instruire pour le disqualifier.

**Tu tranches, tu ne demandes pas.** Choisis la branche que la mesure justifie, applique-la
intégralement, et écris le raisonnement (y compris ce qui plaide CONTRE ton choix) dans la
décision consignée.

### Critères d'acceptation

- [ ] L'une des deux branches de l'arbitrage est appliquée **intégralement**
- [ ] Si `format:check` est câblé : `npm run format:check` est VERT à HEAD après reformatage,
      **et** l'étape CI est réellement bloquante (pas un `continue-on-error`, pas un step dont
      la dernière commande ne peut pas échouer — cf. PIT-S64-007)
- [ ] Si les scripts sont retirés : `prettier` et `prettier-plugin-tailwindcss` sortent aussi des
      `devDependencies`, `.prettierrc` / `.prettierignore` sont traités, et rien dans le dépôt
      ne référence plus `format:check` (README, docs, briefings, hooks)
- [ ] La décision est consignée dans `docs/memory/decisions.md` (fichier qui t'est RÉSERVÉ ce
      sprint — cf. section Dépendances) pour clore la boucle de redécouverte
- [ ] La suite unitaire frontend et le `next build` restent verts après reformatage

## Plan d'implémentation (architect, `/sprint plan`)

```yaml
issue_528:
  fichiers_cles:
    - ".github/workflows/ci.yml"
    - "frontend/package.json"
    - "frontend/src/**  (fichiers non conformes)"
    - "frontend/e2e/**  (fichiers non conformes)"
  couches_touchees: ["ci", "frontend"]
  strategie_test: "unit+E2E (non-régression après reformatage massif)"
  risque_regression: "prettier-plugin-tailwindcss réordonne les classes Tailwind — un ordre modifié
    peut changer la cascade et casser une comparaison visuelle (sprint-76-legal-visual,
    sprint-77-theme-visual)."
  ordre_ecriture: "décision → reformat → câblage CI → run des specs visuelles"
  zod_dto_sync: "NON"
  possibly_done: false
```

### État réel du code — MESURÉ par le lead le 2026-09-06 sur `sprint/78` @ `12f8bc1`

Ces chiffres sont vérifiés, pas déduits. **Trois d'entre eux contredisent le corps de l'issue et
le mini-plan architect — c'est la mesure qui fait foi, pas l'énoncé** (cf. PIT-S71-001).

1. `grep -c format:check .github/workflows/ci.yml` → **0**. Le gate n'existe pas en CI.
   Jobs présents : `backend`, `frontend`, `e2e`, `flyway-smoke`, `security`, `secret-scan`,
   `ai-env-packs`. Le job `frontend` (`.github/workflows/ci.yml` ~L77-115) enchaîne
   `npm ci` → `Build` → `Tests (Vitest)` → `Typecheck` → `Lint`, en `working-directory: frontend`.

2. **La dette n'est PAS de 2-3 fichiers** comme le laisse entendre le corps de l'issue.
   - `npx prettier --check src e2e` → EXIT 1, « Code style issues found in **104 files** ».
   - **Mais le script `format:check` du dépôt vaut `prettier --check .`** — périmètre `.`, pas
     `src e2e`. Mesuré : EXIT 1, « Code style issues found in **119 files** ».
   - **119 est le chiffre qui compte** : c'est ce que la CI verrait. Le mini-plan architect dit
     104 (il a mesuré `src e2e`) — il sous-estime de 15 fichiers, dont `tailwind.config.ts`.

3. `frontend/.prettierrc` et `frontend/.prettierignore` **existent** (le second ignore déjà
   `.next`, `node_modules`, `coverage`, `playwright-report`, `test-results`, `storybook-static`,
   `public/locales`, `src/styles/ds`). `.prettierrc` : `semi:false`, `singleQuote:true`,
   `trailingComma:"all"`, `printWidth:100`, `tabWidth:2`, `arrowParens:"always"`,
   `plugins:["prettier-plugin-tailwindcss"]`.

4. `frontend/README.md` existe et tombe dans le périmètre `.` de prettier. Le `README.md`
   **racine** n'y tombe PAS (prettier tourne en `working-directory: frontend`) — et il appartient
   à #434 de toute façon.

### PIÈGE DE MESURE CONFIRMÉ EN DIRECT (lead, 2026-09-06) — lis ceci deux fois

Le hook RTK **transforme un `prettier --check` ROUGE en « All files formatted correctly »**
(PIT-S74-008, texte intégral dans le pack ci-dessous). Et un appel derrière un pipe
(`… | tail -15`) rapporte l'exit code de `tail`, donc **0**.

**Protocole de mesure imposé** — toute affirmation de ta part sur l'état du formatage doit venir
de cette forme exacte, sans pipe, avec l'exit code lu immédiatement :

```bash
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59/frontend
rtk proxy npx prettier --check . > /tmp/pc-528.txt 2>&1; echo "EXIT=$?"; tail -3 /tmp/pc-528.txt
```

Un rapport qui annonce « vert » sans un `EXIT=0` obtenu ainsi sera considéré comme non vérifié.
Le même piège vaut pour `next build` (PIT-S75-002) et `git log -1` (PIT-S77-008).

## Triage
Taille: S
Modèle: opus
Effort: high
