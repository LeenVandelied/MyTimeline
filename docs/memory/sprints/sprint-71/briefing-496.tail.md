## Dependances intra-sprint
- Aucune dependance bloquante en amont.
- **Doit etre livree AVANT #496** (vague 2), qui editera les commentaires de `EventEditForm.tsx`.
- #497 travaille EN PARALLELE sur `EventPreviewTimeline.tsx` et `timeline.css` — n'y touche pas.

## Designer
Non applicable (pas de nouvelle surface visuelle a valider en amont) — sauf mention contraire
dans le plan d'implementation ci-dessus.

## Contraintes d'execution (LIRE — pieges deja payes sur ce projet)

- **Repertoire de travail** : `cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  EN PREMIERE COMMANDE. C'est un **worktree git**, pas le repo principal. Ne JAMAIS `cd` vers
  `/Users/herrh/VSProjects/MyTimeline` tout court : tu travaillerais sur un autre checkout et
  ton verdict serait faux.
- **Garde-fou HEAD** : verifie `git rev-parse --abbrev-ref HEAD` == `claude/sprint-71-start-09aa02`
  avant toute ecriture. Si ce n'est pas le cas : STOP et remonte-le.
- **Working tree PARTAGE** : 3 autres subagents travaillent EN PARALLELE dans ce meme repertoire
  sur d'autres issues. Consequences non negociables :
  - `git add` **CIBLE fichier par fichier**. JAMAIS `git add -A`, JAMAIS `git add .`,
    JAMAIS `git commit -a` — tu commiterais le travail en cours des autres.
  - Ne `git checkout` / `git restore` / `git stash` **rien** que tu n'aies pas ecrit toi-meme.
  - Ne touche pas aux fichiers listes en « Ne PAS toucher » ci-dessous.
  - Le SHA que tu lis via `git rev-parse HEAD` juste apres ton commit peut deja avoir bouge
    (commit concurrent). Reporte le SHA rendu par ta propre commande `git commit`, et dis-le
    si tu as un doute.
- **Piege outillage RTK** : `git diff` peut renvoyer une sortie vide/tronquee sous le hook RTK.
  Utilise `rtk proxy git diff ...` (ou redirige vers un fichier puis lis-le). Une sortie vide
  n'est PAS une preuve qu'il n'y a pas de diff.
- **Commit** : 1 seul commit logique, message gitmoji en francais, se terminant par
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. **Ne PAS `git push`.**
- **Tests** : `./scripts/test-quiet.sh <scope>` (OBLIGATOIRE, inline). Le lancement direct de
  `backend/./mvnw` est le repli si le script echoue. Si volume > 500 tests OU > 3 min :
  ecris `RECOMMAND_TEST_RUNNER` dans ton retour plutot que d'attendre.
- **Migration Flyway** : aucune attendue sur cette issue. Si tu en crees une, ce serait `V16`
  et il faut le signaler (`RECOMMAND_DB_EXPERT`).
- **Ne PAS toucher aux fichiers** : `EventPreviewTimeline.tsx`, `frontend/src/styles/**/timeline.css` (perimetre de #497)

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Ecris `docs/memory/sprints/sprint-71/issue-496-done.md` avec :

RETOUR :
- commits: [SHA...]
- resume: objectif + BR touchees + fichiers cles + pitfalls rencontres + tests (chiffres reels)
- [MEMORY:*] signaux: bug / pitfall / pattern / business-rule / decision (si applicable)
- recommandations suite: signaux `RECOMMAND_*` (DB_EXPERT / TEST_RUNNER / SECURITY / UI_DESIGN /
  FOLLOWUP) **OU une negation explicite sur UNE SEULE LIGNE** du type
  `Pas de RECOMMAND_SECURITY car <raison>` — la negation coupee par un retour a la ligne n'est
  pas reconnue par le hook de completude.
- Section `## Recommandations suite` OBLIGATOIRE (meme vide-avec-negation), sinon la cloture
  du sprint est bloquee.
- Derniere ligne du fichier : `STATUS: COMPLETED` (ou `STATUS: PARTIAL` avec une section
  `BLOQUE_SUR` au-dessus).

Ne declare pas « termine » ce que tu n'as pas execute : enumere ce qui n'a PAS ete verifie.
