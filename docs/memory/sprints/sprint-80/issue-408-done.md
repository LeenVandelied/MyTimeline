# Issue #408 — [CHORE] Prouver qu'une PR à job e2e rouge est bloquée au merge

**Sprint 80, vague 3** · commit `5412c5d` · dossier de preuve :
`docs/memory/sprints/sprint-80/issue-408-preuve-blocage-merge.md` (265 lignes).

## Résultat : le garde-fou est vérifié, imputation comprise

La barrière a été vue descendre. Et surtout, le **piège logique** de cette issue a été traité :
`mergeStateStatus: BLOCKED` ne prouve rien seul — une PR peut être bloquée par une review manquante,
une branche en retard ou un autre check requis. La preuve établit donc l'**imputation** au job `e2e`.

## Le dispositif

- **PR jetable #556**, branche `throwaway/s80-e2e-red`, base `dev`, SHA cassé `9e4eae9`.
- **Cassure minimale, une ligne** : `frontend/e2e/document-lang.spec.ts :: "#413 — <html lang>
  localisé"`, `expect(response.status()).toBe(200)` → `.toBe(418)`. Diff +2/−1 sur 1 fichier.
- Choix motivé : assertion d'**égalité sur une valeur déjà en main**, donc échec en millisecondes —
  aucune attente consommée malgré `retries: 2` (PIT-S63-002 : c'est ce mécanisme qui a fait passer
  le job de 15 à 42 min). Spec **non touchée** par la vague 1, pour écarter toute ambiguïté.

## Preuve à l'état rouge (sortie brute)

```
$ gh pr view 556 --json number,state,mergeable,mergeStateStatus,baseRefName,headRefOid
{"baseRefName":"dev","headRefOid":"9e4eae9dc4d117c655b404976141bfa99b17f168",
 "mergeStateStatus":"BLOCKED","mergeable":"MERGEABLE","number":556,"state":"OPEN"}
```

## L'imputation, en trois pièces

1. **Règles de protection de `dev` lues** (accès accordé) : 4 checks requis
   (`backend`, `frontend`, `e2e`, `ai-env-packs`), `strict=true`, `enforce_admins=true`,
   `required_approving_review_count=0`, `required_conversation_resolution=false`,
   `required_signatures=false`, `required_linear_history=false`.
   ⇒ review, résolution de conversation, signature et historique linéaire sont **éliminés** comme
   causes possibles du `BLOCKED`.
2. **Les 3 autres checks requis étaient VERTS** pendant que `e2e` était rouge :
   `backend` SUCCESS · `frontend` SUCCESS · `ai-env-packs` SUCCESS · **`e2e` FAILURE**.
   (Non requis, verts aussi : `flyway-smoke`, `secret-scan`, `security`.)
   `mergeable: MERGEABLE` + `git merge-base --is-ancestor origin/dev HEAD` écartent le conflit et
   l'état BEHIND malgré `strict:true`.
   ⇒ **il ne reste qu'une seule cause possible : `e2e: FAILURE`.**
3. **Contrôle positif, obtenu sans consommer un seul run de CI** : les PR jetables #554 (`105be32`)
   et #555 (`8294fc4`) de la vague 2, même base `dev`, mêmes règles, 4/4 requis SUCCESS →
   `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`. `8294fc4` est un ancêtre direct de la branche
   de sprint. *Limite déclarée : ces PR sont CLOSED, la valeur n'est plus recalculée en direct.*

## Le rouge était bien le rouge provoqué

Contrôle à trois niveaux (symétrique de PIT-S77-020) sur le run `34060872826` :
- steps 8→14 du harnais tous `success` — l'infrastructure n'est pas tombée ;
- `Running 319 tests using 2 workers` puis `306 passed / 4 failed / 9 skipped` = **319**, donc aucun
  « did not run » et aucun `flaky` ;
- **24 enregistrements d'échec sur 24** portent la seule cause `Expected: 418 / Received: 200`.
  Zéro autre motif dans le log.

## Limite assumée et déclarée

La preuve n'a **pas** été poussée jusqu'à l'appel de l'API de merge (pour capturer un refus 405) :
sur un dépôt **public**, une erreur de manipulation fusionnerait un test cassé dans `dev`. Le couple
`BLOCKED` + imputation suffit. La limite est écrite au §7 du dossier plutôt que masquée — c'est
exactement le défaut de rigueur que cette issue corrige chez #361.

## Nettoyage (vérifié par le lead)

- PR #556 : **CLOSED**, `mergedAt = null`, aucun merge commit.
- `git ls-remote origin | grep -c throwaway` → **0** ; branche locale supprimée.
- Aucune trace de la cassure sur la branche de sprint : `git diff origin/dev...HEAD -- frontend/e2e/`
  ne contient que les 3 fichiers de la vague 1.

## Signaux mémoire

- `[MEMORY:pattern]` Un `BLOCKED` ne s'impute pas seul. Les trois pièces : (1) lire
  `branches/<b>/protection` pour éliminer les causes rendues impossibles, (2) montrer les autres
  checks requis verts, (3) opposer un contrôle positif de même base. Sans les trois, on constate un
  blocage sans savoir qui bloque.
- `[MEMORY:pattern]` Un contrôle positif peut être **gratuit** : les PR jetables déjà fermées d'un
  sprint conservent leur `mergeStateStatus` et leur rollup. #554/#555 ont fourni la moitié verte de
  la démonstration sans un seul run de CI.
- `[MEMORY:pitfall]` **`gh pr close --delete-branch` bascule le worktree sur `main`.** Les commits
  suivants atterriraient sur `main` sans le moindre avertissement. Rencontré ici ; revenir
  explicitement sur la branche de sprint et le vérifier avant de committer.
- `[MEMORY:pitfall]` Pour faire rougir un gate, casser une **assertion d'égalité sur une valeur déjà
  en main**, jamais une attente d'élément absent : sous `retries: 2` l'échec est rejoué 3 fois et
  consomme le budget du test (PIT-S63-002).
- `[MEMORY:pitfall]` Un job rouge doit être rouge **pour la raison provoquée** — symétrique de
  PIT-S77-020. Contrôle à trois niveaux : steps du harnais `success`, somme
  passed+failed+skipped = total annoncé, et 100 % des enregistrements d'échec portant la cause
  attendue.
- `[MEMORY:decision]` Preuve volontairement non poussée jusqu'à l'appel de l'API de merge (refus
  405) : risque de fusionner un test cassé sur un dépôt public. Limite déclarée, pas masquée.

## Recommandations suite

- Pas de `RECOMMAND_TEST_RUNNER` : preuve en CI, aucune campagne locale jouée — et la baseline
  locale n'est pas verte par construction (vague 1).
- Pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` : aucun schéma, aucune surface d'auth.
- Pas de `RECOMMAND_REVIEWER` : le livrable est un document, zéro code de production.

## RECOMMAND_FOLLOWUP

**Aucun.** Les deux candidats naturels sont **déjà portés par des issues ouvertes** — #433 (rendre
`secret-scan` requis) et #407 (rendre `flyway-smoke` requis) — et #409 couvre déjà la protection de
`main`. Le follow-up sur `timeout-minutes: 45` a déjà été émis par la vague 2.

STATUS: COMPLETED
