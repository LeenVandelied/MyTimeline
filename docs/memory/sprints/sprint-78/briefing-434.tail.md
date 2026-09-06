## Dépendances intra-sprint

- **Vague 1**, en parallèle avec **#528** (`format:check` / reformatage massif de `frontend/`).
- **#169** (JaCoCo + vitest coverage) est en **vague 2**. Elle rendra actif le branchement
  `coverage` déjà présent dans `scripts/test-quiet.sh`. **Ne l'anticipe pas**, ne le modifie pas :
  ton diff doit rester compatible avec ce branchement tel qu'il est écrit aujourd'hui.
- Si ton arbitrage rend le scope `frontend` sensiblement plus long, **dis-le explicitement** :
  #169 et les sprints suivants appellent ce scope en boucle. C'est une conséquence à assumer,
  pas à cacher.

## Contraintes

- Branche cible : `sprint/78` (déjà checkout dans le worktree). **Aucune CI ne tourne sur les
  branches `sprint/N`** (PIT-S64-008) : la vérification locale est la seule qui existe avant la PR.
- Commit : **1 seul commit logique**, message gitmoji en **français**, corps expliquant
  l'arbitrage et citant la mesure de durée qui le fonde.
- `git add <chemins explicites>` puis `git commit -- <mêmes chemins>`.
  **zsh ne fait pas de word-splitting** : `git add -- $F` avec une liste dans une variable ne
  stage RIEN (PIT-S76-005). Énumère les chemins littéralement.
- `./scripts/test-quiet.sh` peut échouer dans un worktree parce que `node_modules` y est absent,
  et le `node_modules` partagé du dépôt principal ne le sauve pas (PIT-S69-002). **C'est une
  contrainte de premier ordre pour cette issue** : si le script ne peut pas tourner ici, dis-le,
  et vérifie ton arbitrage en lançant les commandes npm équivalentes depuis `frontend/`.
  Ne conclus jamais « le scope marche » sur un script que tu n'as pas réussi à exécuter.
- Un garde-fou cité dans la doc peut n'exister nulle part (PIT-S58-004) : si tu écris dans le
  README qu'une commande existe, exécute-la d'abord.
- **Ne modifie AUCUN fichier sous `docs/memory/sprints/sprint-78/`** sauf ton propre
  `issue-434-done.md`.
- `docs/memory/decisions.md` est **réservé à #528** ce sprint. Ta décision ne s'y écrit PAS :
  émets-la comme signal `[MEMORY:decision]` dans ton done.md — le lead la consolidera en Phase 2
  de `/sprint end`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris d'abord le fichier
`docs/memory/sprints/sprint-78/issue-434-done.md`, puis retourne un résumé identique.

Le done.md DOIT contenir, dans cet ordre :

```
# Issue #434 — <titre court>

## Commits
<SHA> — <message>

## Résumé
<arbitrage retenu ET pourquoi l'autre a été écarté, mesure de durée, fichiers clés, appelants
traités, pièges rencontrés>

## Tests
<commande → EXIT=N → verdict, une ligne par commande>
<preuve empirique de la détection de casse : sonde créée, scope lancé, EXIT=N, sonde supprimée>

## Signaux mémoire
[MEMORY:decision] <une ligne>
[MEMORY:pitfall] <une ligne>   (autant que nécessaire ; écris-les ICI, pas seulement dans ta
                                réponse — c'est ce fichier que le lead consolide)

## Recommandations suite
RECOMMAND_<X> : <raison>
ou une NÉGATION EXPLICITE tenant sur UNE SEULE LIGNE, ex :
"Pas de RECOMMAND_DB_EXPERT car aucune migration ni requête SQL touchée."
(le vérificateur de complétude lit LIGNE À LIGNE — une négation repliée sur deux lignes n'est
pas reconnue : PIT-S67-004 / PIT-S70-005 / PIT-S76-007)
RECOMMAND_FOLLOWUP: <desc> [triage XS|S|M|L|XL | domaine <x>]   (si applicable)

STATUS: COMPLETED
```

Dernière ligne du fichier = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` avec une section
`BLOQUE_SUR` détaillée juste avant). Rien après.
