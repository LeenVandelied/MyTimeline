# Issue #408 — Preuve : une PR à job `e2e` rouge est réellement bloquée au merge

**Sprint 80, vague 3.** Aucun code de production livré : ce fichier EST le livrable.

## Ce que #361 avait prouvé, et ce qui manquait

#361 (S55) a rendu `e2e` requis sur `dev`. Son critère « une PR dont le job `e2e` échoue est
bloquée au merge » n'a été vérifié qu'à moitié : on avait constaté qu'une PR **verte** passait à
`mergeStateStatus: CLEAN` une fois le check ajouté (#402). Le cas **négatif** n'avait jamais été
provoqué. Un garde-fou dont on n'a jamais vu la barrière descendre n'est pas vérifié.

## Le piège logique traité ici

`mergeStateStatus: BLOCKED` **ne prouve rien à lui seul** : une PR peut être BLOCKED pour une review
manquante, une branche en retard (`strict: true`), ou un autre check requis rouge. La preuve n'est
valide qu'avec l'**imputation** — établie ci-dessous en trois temps :

1. les règles de protection lues (quels blocages sont seulement *possibles*) ;
2. les 3 autres checks requis VERTS pendant que `e2e` est ROUGE ;
3. un contrôle positif (mêmes règles, même base, `e2e` vert → `CLEAN`).

## 1. Règles de protection de `dev` (lues, accès accordé)

`gh api repos/LeenVandelied/MyTimeline/branches/dev/protection` :

| clé | valeur | ce que ça élimine comme cause de blocage |
|---|---|---|
| `required_status_checks.contexts` | `backend`, `frontend`, `e2e`, `ai-env-packs` | les 4 seuls checks capables de bloquer |
| `required_status_checks.strict` | `true` | branche en retard = cause possible → **écartée** : `git merge-base --is-ancestor origin/dev HEAD` vrai, et `mergeable: MERGEABLE` |
| `required_approving_review_count` | **0** | review manquante = **impossible** comme cause |
| `required_conversation_resolution` | `false` | fil non résolu = **impossible** |
| `required_signatures.enabled` | `false` | commit non signé = **impossible** |
| `required_linear_history` | `false` | historique non linéaire = **impossible** |
| `enforce_admins.enabled` | `true` | la règle s'applique même au propriétaire — le blocage n'est pas contournable |

**Conséquence** : sur ce dépôt, le SEUL levier de blocage d'une PR à jour et sans conflit est
l'état des 4 status checks requis. C'est ce qui rend l'imputation possible.

## 2. Le dispositif jetable

- Branche : `throwaway/s80-e2e-red`, basée sur `claude/sprint-80-start-04f5f3`
  (à jour avec `origin/dev` : `git merge-base --is-ancestor origin/dev HEAD` → vrai).
- PR : **#556** vers `dev`, titre préfixé `[NE PAS MERGER]`.
- SHA cassé : `9e4eae9dc4d117c655b404976141bfa99b17f168`.

### La cassure — une seule ligne

`frontend/e2e/document-lang.spec.ts`, dans la boucle `#413 — <html lang> localisé (WCAG 3.1.1)` :

```diff
       const response = await request.get(path)
-      expect(response.status(), `${path} doit répondre 200`).toBe(200)
+      // [NE PAS MERGER] cassure volontaire — issue #408
+      expect(response.status(), `${path} doit répondre 200`).toBe(418)
```

`git diff --stat` : **1 fichier, 2 insertions, 1 suppression.**

### Pourquoi CETTE assertion et pas une autre

| contrainte | choix fait |
|---|---|
| PIT-S63-002 (`retries: 2` rejoue 3 fois ; une attente qui expire a déjà fait passer ce job de 15 à 42 min) | assertion d'**égalité sur une valeur déjà en main** (`response.status()` d'un `request.get()` déjà résolu) → échec en millisecondes, aucun timeout consommé |
| PIT-S78-006 (un diff large rend le check coverage-E2E fantôme et bruite la démonstration) | **une seule ligne** modifiée |
| ambiguïté d'imputation avec la vague 1 | spec **non touchée** par la vague 1 — `git diff --stat origin/dev...HEAD -- frontend/e2e/` ne liste que `categories.spec.ts`, `sprint-62-select-focus-indicator.spec.ts`, `support/pixel.ts` |
| PIT-S77-020 (un `exit 0` avec « N did not run » quand `setup` s'effondre — et son symétrique : un rouge obtenu pour la mauvaise raison) | la cassure vit dans le projet `chromium`, qui **dépend de `setup`** : si `setup` tombait, le rouge ne serait pas le mien. Les steps 1→14 du job (backend, readiness, build de prod, oracles) sont tous `success` avant la passe Playwright |

L'erreur attendue est autodescriptive (`Expected: 418 / Received: 200`) : elle ne peut pas être
confondue avec un effondrement du harnais.

## 3. Le job `e2e` a échoué — et pour MA raison

Run [`34060872826`](https://github.com/LeenVandelied/MyTimeline/actions/runs/34060872826),
job `e2e` : **failure**.

Steps du job — le harnais est allé au bout, il ne s'est pas effondré :

```
 8. Start backend (Spring Boot, profils dev+e2e, :8080) : success
 9. Wait for backend readiness                          : success
12. Build frontend (production)                         : success
13. Start frontend production servers                   : success
14. Wait for frontends + oracles                        : success
15. Run E2E (Playwright golden path, build de production): FAILURE   <- ici
16. Run E2E (vérification de signature RS256)           : skipped
```

Décompte Playwright de la passe 1 (contrôle PIT-S77-020 — un code de sortie ne suffit jamais,
il faut lire le nombre de tests **réellement exécutés**) :

```
Running 319 tests using 2 workers
306 passed
  4 failed
  9 skipped
```

`306 + 4 + 9 = 319` : **aucun « did not run »**, aucun `flaky`. Le projet `setup` a bien provisionné
les comptes, et 306 tests sont passés normalement autour de la cassure.

Les 4 échecs sont exactement les 4 cas de la boucle cassée (`/fr/login`, `/en/login`, `/es/login`,
`/de/register`). **Les 24 enregistrements d'échec du log** (4 tests × 3 tentatives sous `retries: 2`,
comptés en double entre sortie standard et annotations) portent tous la MÊME cause, et aucune autre :

```
> 36 |       expect(response.status(), `${path} doit répondre 200`).toBe(418)
    Expected: 418
    Received: 200
```

Zéro autre motif d'échec dans le log. **Le rouge est bien celui que j'ai provoqué**, pas un
effondrement du harnais qui aurait prouvé « la CI bloque quand elle casse » au lieu de
« le gate `e2e` bloque ».

Coût du choix d'assertion : la cassure n'a consommé aucun timeout — la passe 1 est restée dans son
enveloppe habituelle malgré 12 exécutions ratées.

## 3bis. PREUVE — `mergeStateStatus` à l'état rouge (sortie brute)

```
$ gh pr view 556 --json number,state,mergeable,mergeStateStatus,baseRefName,headRefOid
{"baseRefName":"dev","headRefOid":"9e4eae9dc4d117c655b404976141bfa99b17f168",
 "mergeStateStatus":"BLOCKED","mergeable":"MERGEABLE","number":556,"state":"OPEN"}
```

```
$ gh pr view 556 --json statusCheckRollup ...
[REQUIS]     ai-env-packs : SUCCESS
[REQUIS]     backend      : SUCCESS
[REQUIS]     e2e          : FAILURE   <-
[REQUIS]     frontend     : SUCCESS
[non requis] flyway-smoke : SUCCESS
[non requis] secret-scan  : SUCCESS
[non requis] security     : SUCCESS
```

### L'imputation, explicitement

- `mergeable: MERGEABLE` → **pas** de conflit, et la branche n'est pas en retard (`BEHIND` écarté,
  confirmé par ailleurs par `git merge-base --is-ancestor origin/dev HEAD`).
- `required_approving_review_count: 0` → une review manquante ne peut pas être la cause.
- `required_conversation_resolution`, `required_signatures`, `required_linear_history` : tous
  `false` → aucun ne peut être la cause.
- **3 des 4 checks requis sont SUCCESS.** Les 3 checks non requis sont SUCCESS aussi.
- Il ne reste qu'une seule cause possible de `BLOCKED` : **`e2e: FAILURE`**.

La barrière est descendue, et on sait quelle barrière c'est.

> **Test non joué, volontairement** : appeler l'API de merge pour capturer le refus `405` de GitHub
> aurait été la preuve la plus directe. Écarté — sur un dépôt PUBLIC, une erreur de manipulation y
> fusionnerait un test cassé dans `dev`. Le couple `BLOCKED` + imputation ci-dessus suffit, sans
> jamais approcher le bouton.

## 4. Contrôle positif — mêmes règles, même base, `e2e` VERT

Obtenu **sans consommer un seul run de CI** : la vague 2 (#476) avait laissé deux PR jetables à CI
entièrement verte, toutes deux basées sur `dev`.

| PR | head | `backend` | `frontend` | `e2e` | `ai-env-packs` | `mergeable` | `mergeStateStatus` |
|---|---|---|---|---|---|---|---|
| #554 | `105be32` | SUCCESS | SUCCESS | **SUCCESS** | SUCCESS | MERGEABLE | **CLEAN** |
| #555 | `8294fc4` | SUCCESS | SUCCESS | **SUCCESS** | SUCCESS | MERGEABLE | **CLEAN** |
| #556 | `9e4eae9` | SUCCESS | SUCCESS | **FAILURE** | SUCCESS | MERGEABLE | **BLOCKED** |

`8294fc4` (head de #555) est un **ancêtre direct** de la branche de sprint dont #556 descend : même
lignée, même base `dev`, mêmes règles de protection. La seule variable qui change entre la ligne
#555 et la ligne #556 est l'état du check `e2e`.

**C'est la paire qui ferme la démonstration** : verte → CLEAN, rouge → BLOCKED, toutes choses égales
par ailleurs.

> Limite honnête : #554 et #555 sont aujourd'hui `CLOSED`. GitHub continue de servir leur
> `mergeStateStatus` calculé (`CLEAN`), mais la valeur n'est plus recalculée en direct. Elle vaut
> comme témoin de l'état atteint quand elles étaient ouvertes, pas comme mesure live.

## 5. Nettoyage — vérifié, pas déclaré

Le dépôt est **PUBLIC** : l'issue insistait pour ne rien laisser traîner.

```
$ gh pr close 556 --delete-branch
✓ Closed pull request LeenVandelied/MyTimeline#556
✓ Deleted branch throwaway/s80-e2e-red

$ git ls-remote origin | grep throwaway
(vide)

$ git branch --list 'throwaway/*'
(vide)

$ grep -n "418\|NE PAS MERGER" frontend/e2e/document-lang.spec.ts
(aucune trace)

$ git diff --stat origin/dev...HEAD -- frontend/e2e/
 frontend/e2e/categories.spec.ts                  |  38 ++++
 frontend/e2e/sprint-62-select-focus-indicator... | 120 ++++++++++-----
 frontend/e2e/support/pixel.ts                    |  98 +++++++++---
```

Le diff `frontend/e2e/` de la branche de sprint contre `dev` ne contient que les **3 fichiers de la
vague 1** — la cassure n'a jamais touché la branche de sprint. PR #556 : `CLOSED`, jamais mergée.

⚠ Effet de bord à connaître : `gh pr close --delete-branch` **bascule le worktree sur `main`** après
suppression de la branche. Sur un worktree de sprint, il faut revenir explicitement sur la branche
de sprint derrière — sans quoi les commits suivants atterrissent sur `main`.

## 6. Verdict

Les 5 critères d'acceptation de #408 sont satisfaits :

| critère | état |
|---|---|
| branche jetable avec un test E2E cassé | ✅ `throwaway/s80-e2e-red`, SHA `9e4eae9` |
| PR vers `dev` ouverte | ✅ #556 |
| job `e2e` échoue effectivement | ✅ run `34060872826`, et **pour la raison provoquée** (24/24 enregistrements = `Expected: 418 / Received: 200`) |
| le merge est bloqué tant que le check est rouge | ✅ `mergeStateStatus: BLOCKED`, **imputé à `e2e`** par élimination des autres causes |
| branche et PR supprimées sans merge, aucun code cassé ne subsiste | ✅ vérifié par commandes ci-dessus |

**Le garde-fou de #361 est désormais vérifié dans les deux sens** : vert → `CLEAN` (#554/#555),
rouge → `BLOCKED` (#556). #361 n'avait établi que la première moitié.

## 7. Ce que cette preuve ne dit PAS

Bornage explicite, pour qu'on ne la surinterprète pas comme #361 l'a été :

- Elle vaut pour **`dev`**, pas pour `main` — dont la protection n'a pas été lue ici
  (c'est l'objet de **#409**, déjà ouverte).
- Elle vaut pour un compte **sans droit de contournement effectif**. `enforce_admins: true` est lu
  dans la configuration, mais je ne l'ai pas testé en tentant un merge administrateur.
- Elle n'a **pas** été poussée jusqu'au refus `405` de l'API de merge : ce dernier pas a été écarté
  parce qu'une erreur de manipulation aurait fusionné un test cassé dans `dev` sur un dépôt public.
  Le blocage est donc établi par l'état déclaré par GitHub + l'élimination des causes alternatives,
  pas par une tentative de merge réelle.
- Elle ne dit rien de `flyway-smoke` ni de `secret-scan`, qui **tournent sans être requis**
  (issues **#407** et **#433**, déjà ouvertes).

## Signaux mémoire

- `[MEMORY:pattern]` **Un `mergeStateStatus: BLOCKED` ne s'impute pas tout seul.** Une PR peut être
  BLOCKED pour une review manquante, une branche en retard, un conflit, un fil non résolu ou un
  autre check requis. Le protocole qui rend l'imputation valide : (1) lire
  `branches/<b>/protection` et éliminer par la configuration les causes rendues *impossibles* ;
  (2) montrer les AUTRES checks requis verts pendant que le check visé est rouge ; (3) opposer un
  contrôle positif de même base. Sans les trois, on constate un blocage sans savoir qui bloque.
- `[MEMORY:pattern]` **Un contrôle positif peut être gratuit.** Les PR jetables déjà fermées d'un
  sprint antérieur conservent leur `mergeStateStatus` et leur rollup : #554/#555 (vague 2) ont
  fourni la moitié verte de la démonstration sans consommer un seul run de CI. Réflexe à avoir avant
  d'ouvrir une PR de contrôle.
- `[MEMORY:pitfall]` **`gh pr close --delete-branch` bascule le worktree sur `main`.** Sur un
  worktree de sprint, les commits suivants atterriraient sur `main` sans avertissement. Revenir
  explicitement sur la branche de sprint, et le vérifier (`git rev-parse --abbrev-ref HEAD`) avant
  de committer le livrable. Rencontré ici après la fermeture de #556.
- `[MEMORY:pitfall]` **Casser un E2E pour faire rougir un gate : choisir une assertion d'égalité sur
  une valeur DÉJÀ en main**, jamais une attente d'élément absent. Sous `retries: 2` chaque échec est
  rejoué 3 fois ; PIT-S63-002 a fait passer ce job de 15 à 42 min par ce mécanisme. Ici, 4 tests ×
  3 tentatives sur `expect(response.status()).toBe(418)` n'ont coûté aucun timeout.
- `[MEMORY:pitfall]` **Un job rouge doit être rouge pour LA raison provoquée.** Symétrique de
  PIT-S77-020 : sans contrôle, on prouve « la CI bloque quand elle casse » et non « le gate visé
  bloque ». Contrôle joué ici : steps 8→14 tous `success` (le harnais tient), `306 + 4 + 9 = 319`
  (aucun « did not run », aucun `flaky`), et **24 enregistrements d'échec sur 24** portant la seule
  cause `Expected: 418 / Received: 200`.
- `[MEMORY:decision]` **Ne pas pousser la preuve jusqu'à l'appel de l'API de merge.** Le refus `405`
  serait plus direct, mais sur un dépôt PUBLIC une erreur de manipulation fusionnerait un test cassé
  dans `dev`. `BLOCKED` + imputation par élimination est jugé suffisant ; la limite est déclarée en
  §7 plutôt que masquée.
