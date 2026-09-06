## Dépendances intra-sprint

- **Vague 2, dernière issue du sprint.** #528 et #434 sont livrées et commitées :
  `5650264` (câblage `format:check` + reformatage de 119 fichiers), `fb8c21a` (scope
  `frontend` étendu). Tu travailles sur leur état, pas sur celui du plan.
- `.github/workflows/ci.yml` et `frontend/package.json` étaient réservés à #528 pendant la
  vague 1 : **ils sont à toi maintenant**. Idem `frontend/vitest.config.mts`.
- **Ne modifie PAS** `docs/memory/pitfalls.md` ni les packs `.ai-env/context-packs/pit-*.md` :
  ils sont consolidés par le lead en Phase 2 de `/sprint end`.
- **Ne modifie AUCUN fichier sous `docs/memory/sprints/sprint-78/`** sauf ton propre
  `issue-169-done.md`.
- Si tu ajoutes une devDependency frontend (`@vitest/coverage-v8` ou équivalent) :
  `package-lock.json` change, c'est attendu et il est déjà dans `.prettierignore`.
  **Vérifie que la version du provider est compatible avec Vitest `^2.1.9`** — un provider
  majeur en avance casse le run avec un message qui n'a rien à voir.

## Contraintes

- Branche : celle du worktree (`claude/sprint-78-start-5c9db2`, fast-forward de `sprint/78`).
  **Aucune CI ne tourne sur les branches de sprint** (PIT-S64-008) : le premier run réel est
  l'ouverture de la PR. Tu ne peux donc PAS prouver « l'artefact est téléchargeable » par un
  run CI. **Ce que tu dois prouver à la place** :
  1. les deux rapports sont réellement PRODUITS localement (chemins listés par `ls -la`) ;
  2. les chemins déclarés dans les steps `upload-artifact` correspondent EXACTEMENT à ces
     chemins, en tenant compte du `working-directory` du job (le `path:` d'`upload-artifact`
     est relatif à la RACINE du dépôt, **pas** au `working-directory` — c'est le mode d'échec
     classique de cette action, et il produit un artefact vide sans faire rougir le job) ;
  3. le YAML parse et la structure des 7 jobs est intacte.
  Dis explicitement, dans ton done.md, que le téléchargement effectif reste à constater sur le
  premier run de la PR. Ne l'annonce pas comme vérifié.
- Un step `upload-artifact` qui ne trouve rien **warne** au lieu d'échouer. Si tu veux qu'un
  rapport manquant se voie, ajoute `if-no-files-found: error`. Tranche et documente.
- Commit : **1 seul commit logique**, message gitmoji en **français**, corps expliquant les
  choix (provider de coverage, phase Maven du `report`, périmètre d'exclusion éventuel).
- `git add <chemins explicites>` puis `git commit -m "msg" -- <mêmes chemins>`.
  **zsh ne fait pas de word-splitting** : `git add -- $F` avec une liste dans une variable ne
  stage RIEN (PIT-S76-005). Énumère les chemins littéralement.
- **Le nouveau gate `format:check` s'applique à toi** : si tu touches `frontend/vitest.config.mts`
  ou tout fichier sous `frontend/` hors `.prettierignore`, lance `npm run format:check` avant de
  committer, sinon tu rends la CI rouge pour un espace.
- Tests attendus avant de conclure, chacun avec son exit code lu sans pipe :
  `npm run test`, `npm run typecheck`, `npm run build`, `npm run lint`, `npm run format:check`
  côté frontend ; côté backend `./mvnw --batch-mode verify` si Docker est disponible, sinon
  `./mvnw help:effective-pom` (et dis que Docker manquait).
- **Ne lance PAS Playwright / E2E.** Le lead s'en charge en Phase 6.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris d'abord le fichier
`docs/memory/sprints/sprint-78/issue-169-done.md`, puis retourne un résumé identique.

Le done.md DOIT contenir, dans cet ordre :

```
# Issue #169 — <titre court>

## Commits
<SHA> — <message>

## Résumé
<ce qui est câblé, où, avec quelle phase Maven / quel provider vitest ; ce qui a été
délibérément NON fait (seuils) ; chemins d'artefacts et pourquoi ils sont corrects vis-à-vis
du working-directory ; pièges rencontrés>

## Tests
<commande → EXIT=N → verdict, une ligne par commande>
<preuve d'existence des rapports : ls -la des deux chemins>

## Non vérifié / assumé
<ce que tu n'as PAS pu prouver — en particulier le téléchargement réel de l'artefact,
qui n'existera qu'au premier run de la PR>

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
