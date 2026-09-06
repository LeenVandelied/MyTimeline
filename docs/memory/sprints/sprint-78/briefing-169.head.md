[BRIEFING ISSUE #169 — Sprint 78, vague 2]

## ⚠ GARDE-FOU WORKTREE — À EXÉCUTER AVANT TOUTE AUTRE COMMANDE

Tu travailles dans un **worktree git**, PAS dans le dépôt principal. Ton `cwd` par défaut peut
être `/Users/herrh/VSProjects/MyTimeline` (le dépôt principal) — écrire là serait une perte sèche.

**Racine de travail (unique chemin valide) :**
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`

Premier appel Bash obligatoire :

```bash
pwd && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

⚠ **La branche locale de ce worktree s'appelle `claude/sprint-78-start-5c9db2`, PAS `sprint/78`**
(la branche `sprint/78` est attachée à un autre worktree ; celle-ci en est un fast-forward exact
et sera poussée vers `sprint/78` à l'ouverture de la PR). **C'est normal, ne le « corrige » pas**,
ne fais aucun `git checkout` / `git switch` / `git branch -m`.
Si `pwd` ne finit PAS par `traitement-s-xs-parallele-d0ae59` : **arrête-toi et signale-le**.
Préfixe TOUS tes chemins Read/Edit/Write par cette racine absolue.

## Contexte de vague — tu es SEUL sur l'arbre

Vague 2. Les deux issues de la vague 1 (**#528** et **#434**) sont **livrées et commitées**.
Aucun autre agent ne code en même temps que toi. Les règles de working tree partagé restent
néanmoins de mise pour le commit :
- `git add <chemins explicites>`, jamais `git add -A` / `git add .` / `git add -u`.
- `git commit -m "msg" -- <mêmes chemins>` (⚠ `-m` AVANT le `--`, sinon le message est pris
  pour un pathspec — PIT-S57-001).
- JAMAIS `git commit --amend`, `git stash`, `git reset`, `git checkout -- .`.

## Issue #169 — [CHORE] Rendre la couverture de tests mesurable : JaCoCo + vitest --coverage en CI

### Corps de l'issue

**Contexte.** Personne ne peut dire aujourd'hui, chiffres à l'appui, quelle proportion du code
est réellement testée. Cette information est utile pour prioriser les efforts de test d'un
sprint à l'autre.

**Description.** Aucun rapport de couverture n'est généré, ni backend ni frontend : le plugin
`jacoco` est absent de `backend/pom.xml`, et aucun dossier `frontend/coverage/` n'existe. La
couverture réelle n'est donc ni mesurable ni suivable dans le temps — les documents de suivi
(`coverage-*.md`) comptent les tests manuellement.

**Description technique.**
- Ajouter le plugin JaCoCo au build Maven (rapport généré à l'étape `verify`)
- Ajouter `vitest run --coverage` côté frontend (reporter au format `lcov`)
- Publier les deux rapports comme artefacts téléchargeables depuis chaque run de CI
- **Pas de seuil bloquant dans un premier temps** — l'objectif est de mesurer avant d'imposer
  un seuil

**Critères d'acceptation.**
- [ ] Rapport JaCoCo généré et exporté en artefact CI
- [ ] Rapport vitest coverage (lcov) généré et exporté en artefact CI
- [ ] Les deux artefacts sont téléchargeables depuis un run CI GitHub Actions

**Origine.** Audit qualité 2026-07-02 — `docs/audit/audit-2026-07-02.md`, axe 3.

### Ce que l'issue NE demande PAS — et que tu ne dois pas ajouter

- **Aucun seuil bloquant** (`<limit>`, `check` goal JaCoCo, `thresholds` vitest). Mesurer, pas
  gater. En ajouter un transformerait un sprint « rendre mesurable » en gate surprise.
- Aucun service externe (Codecov, SonarQube, badge). Artefacts GitHub Actions, point.
- Aucun changement de tests existants.

## Plan d'implémentation (architect, `/sprint plan`)

```yaml
issue_169:
  fichiers_cles:
    - "backend/pom.xml"
    - "frontend/vitest.config.mts"      # ⚠ .mts, PAS .ts (l'architect a écrit .ts — faux)
    - ".github/workflows/ci.yml  (jobs backend + frontend)"
  couches_touchees: ["ci", "backend", "frontend"]
  strategie_test: "manuel (artefacts téléchargeables depuis un run CI)"
  risque_regression: "L'agent JaCoCo s'attache à argLine ; le backend utilise Testcontainers —
    un argLine surchargé sans concaténer l'existant casse TOUTE la suite backend."
  ordre_ecriture: "pom.xml → vitest.config → ci.yml (upload artefacts)"
  zod_dto_sync: "NON"
  possibly_done: false
```

### État réel du code — MESURÉ par le lead le 2026-09-06 (post-vague 1)

Vérifie ce qui suit, mais pars de là. **Un point du mini-plan architect est faux, deux points
utiles n'y figurent pas** (PIT-S71-001 : un énoncé recopié n'acquiert pas de vérité par
répétition).

1. `grep -c jacoco backend/pom.xml` → **0**. CONFIRMÉ absent.

2. **Le fichier de config Vitest est `frontend/vitest.config.mts`** — extension `.mts`, pas
   `.ts`. Le mini-plan architect ET la piste technique de l'issue disent `.ts`. Il n'existe
   aucun `vitest.config.ts`. Il ne contient aujourd'hui **aucune** clé `coverage`.
   `test.exclude` y vaut `['node_modules/**', '.next/**', 'e2e/**', '**/*.stories.{ts,tsx}']`
   et `test.include` cible `src/**`, `app/**`, `middleware.{test,spec}.ts`.

3. **`maven-surefire-plugin` est déjà déclaré dans `backend/pom.xml`** (section `<build>`), avec
   un `<configuration><systemPropertyVariables><api.version>` pour Testcontainers — **mais SANS
   aucun `<argLine>`**. C'est la bonne nouvelle : `jacoco:prepare-agent` pose la propriété
   `argLine` et surefire la consomme automatiquement tant que personne ne la surcharge.
   **Règle absolue** : si tu ajoutes un `<argLine>` littéral à surefire, tu détaches l'agent
   JaCoCo et/ou tu casses Testcontainers. Si un `<argLine>` devient nécessaire, il DOIT
   contenir `@{argLine}` pour concaténer celui de JaCoCo. Le mode d'échec est brutal : toute
   la suite backend tombe.

4. La CI lance `./mvnw --batch-mode --no-transfer-progress verify` (job `backend`,
   `working-directory: backend`, JDK 21 temurin). Un `report` lié à la phase `verify` (ou
   `test`) est donc exécuté par la CI telle quelle.

5. **Le job CI `frontend` a changé pendant la vague 1** : #528 y a ajouté un step final
   `Format (Prettier)` → `npm run format:check`, après `Lint`. La séquence est désormais
   `npm ci` → `Build` → `Tests (Vitest)` → `Typecheck` → `Lint` → `Format (Prettier)`.
   Lis le fichier, ne te fie pas à une description antérieure (PIT-S68-002).

6. **`actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02  # v4` est déjà utilisée**
   dans ce workflow (job `e2e`). **Réutilise exactement ce SHA épinglé** — le dépôt épingle
   toutes ses actions par SHA, une référence `@v4` flottante serait une régression de posture.

7. Les sorties sont déjà ignorées par git : `backend/target/` (`.gitignore` racine) et
   `coverage/` (`frontend/.gitignore`). `frontend/.prettierignore` ignore déjà `coverage`, donc
   le nouveau gate `format:check` de #528 ne mordra pas sur les rapports générés.

8. **Le scope `coverage` de `scripts/test-quiet.sh` t'attend déjà** : il contient un branchement
   `grep -q jacoco backend/pom.xml` → si présent, `test jacoco:report`, sinon un message ℹ.
   Ton travail va donc **activer** ce chemin, qui n'a jamais tourné. ⚠ #434 a modifié
   `scripts/test-quiet.sh` pendant la vague 1 : **relis le script tel qu'il est maintenant**
   avant de supposer quoi que ce soit de son contenu ou de ses scopes. Vérifie que le chemin
   `coverage` fonctionne réellement une fois JaCoCo présent — et **si tu dois le retoucher,
   fais-le au minimum et dis-le explicitement** (le fichier vient d'être arbitré par #434).

9. **Ce que #434 a livré en vague 1, et qui te concerne directement** : le scope `frontend` de
   `scripts/test-quiet.sh` a été ÉTENDU — il enchaîne désormais `build → vitest → typecheck →
   lint`, arrêt au premier échec, ~53 s à cache `.next` chaud (contre ~27 s avant). Un nouveau
   scope `frontend-unit` (Vitest seul) a été ajouté pour la boucle rapide. Conséquence pour
   toi : `./scripts/test-quiet.sh frontend` est maintenant un vrai gate mais il **lance un
   `next build`** — utilise `frontend-unit` pour tes itérations rapides, et le scope complet
   une fois seulement, à la fin.

### Piège de mesure — protocole imposé

Le hook RTK falsifie des sorties : `next build` rendu « 2 routes » au lieu de 52 pages
(PIT-S75-002), `prettier --check` rouge affiché vert (PIT-S74-008), `vitest` « PASS/FAIL »
inventé (PIT-S45-003), `git log -1` rendant le parent (PIT-S77-008). **La redirection vers un
fichier ne désamorce rien** : le fichier capture la sortie DÉJÀ résumée.

Toute affirmation de ta part sur un vert/rouge ou un chiffre doit venir de cette forme, sans
pipe, avec l'exit code lu immédiatement :

```bash
rtk proxy <commande> > /tmp/out-169.txt 2>&1; echo "EXIT=$?"; tail -20 /tmp/out-169.txt
```

Et **la preuve qu'un rapport existe est le fichier**, pas la sortie du build :
`ls -la backend/target/site/jacoco/index.html` et `ls -la frontend/coverage/lcov.info`.

⚠ La suite backend utilise **Testcontainers** : elle exige un Docker vivant et prend plusieurs
minutes. Si Docker est absent sur ce poste, **dis-le au lieu de conclure**, et rabats-toi sur
`./mvnw help:effective-pom` / `./mvnw validate` pour prouver que le plugin est bien lié aux
phases attendues. Ne conclus jamais « la suite est rouge » sur un défaut d'environnement
(PIT-S69-002, PIT-S70-002).

## Triage
Taille: XS→S
Modèle: opus
Effort: high
