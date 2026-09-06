## Dépendances intra-sprint

- **Vague 1**, en parallèle avec **#434** (`scripts/test-quiet.sh` + `README.md` racine).
- **#169** (JaCoCo + vitest coverage) est en **vague 2** et attend ton commit : elle touche
  `.github/workflows/ci.yml` et `frontend/vitest.config.mts`. **`ci.yml` est à TOI pendant la
  vague 1** — #169 rebasera sur ton état. Laisse le fichier dans un état cohérent et commité.
- **Fichiers qui te sont RÉSERVÉS ce sprint** (personne d'autre n'y touche) :
  `.github/workflows/ci.yml`, `frontend/package.json`, `frontend/package-lock.json`,
  `frontend/.prettierrc`, `frontend/.prettierignore`, `docs/memory/decisions.md`,
  et tout `frontend/src/**` + `frontend/e2e/**`.
- **Fichiers INTERDITS** : `scripts/test-quiet.sh`, `README.md` racine, `backend/**`,
  `frontend/vitest.config.mts`, `docs/memory/sprint-history.md`.

## Exclusivité Playwright

**Tu détiens l'exclusivité Playwright pour la vague 1.** Aucun autre agent ne lance de E2E.
Si tu reformates `frontend/e2e/**` (10 specs concernées), c'est à toi de vérifier la
non-régression. Attention :
- Les specs de diff visuel (`sprint-76-legal-visual`, `sprint-77-theme-visual`) comparent des
  captures de référence. Un réordonnancement de classes Tailwind **peut** changer la cascade
  (PIT-S53-001/003/004 dans le pack) — mais `prettier-plugin-tailwindcss` trie selon un ordre
  **canonique** qui n'est censé changer que la source, pas le rendu. Si une comparaison visuelle
  rougit, c'est un signal RÉEL : ne « corrige » pas en régénérant les références
  (`--update-snapshots` grave la mutation dans la référence — PIT-S77-019/017).
- Les références de screenshot sont plateforme-dépendantes (jammy ≠ noble). Un rouge local sur
  `toHaveScreenshot` peut n'être QUE cela. Distingue-le avant de conclure, et dis-le explicitement
  dans ton rapport si tu ne peux pas trancher.
- Playwright peut sortir **exit 0** avec « N did not run » si le projet `setup` échoue : lis le
  COMPTE de tests, jamais le seul code de sortie (PIT-S77-020).
- Recette E2E locale : la config `playwright.config.ts` documente la recette worktree (webpack,
  PAS turbopack). Lis-la avant de lancer quoi que ce soit. Si l'environnement E2E ne se lève pas
  en moins de ~15 minutes d'efforts, **ne t'obstine pas** : rapporte-le en clair, livre le reste,
  et signale `RECOMMAND_TEST_RUNNER` — le lead lancera la suite complète en Phase 6.

## Contraintes

- Branche cible : `sprint/78` (déjà checkout dans le worktree). **Aucune CI ne tourne sur les
  branches `sprint/N`** (PIT-S64-008) — tu ne peux donc pas « laisser la CI juger » : la
  vérification locale est la seule qui existe avant la PR.
- Commit : **1 seul commit logique**, message gitmoji en **français**, corps expliquant
  l'arbitrage. Si le reformatage est massif, il reste dans le MÊME commit que le câblage — un
  reformatage sans son gate est exactement le statu quo que l'issue condamne.
- `git add <chemins explicites>` puis `git commit -- <mêmes chemins>`.
  **zsh ne fait pas de word-splitting** : `git add -- $F` avec une liste dans une variable ne
  stage RIEN (PIT-S76-005). Énumère les chemins littéralement, ou utilise un tableau bash.
- Tests obligatoires avant de conclure, chacun avec son exit code lu :
  `npm run test` (Vitest), `npm run typecheck`, `npm run build`, `npm run lint`,
  et `npm run format:check` si tu as retenu cette branche.
  `./scripts/test-quiet.sh` peut échouer dans un worktree (`node_modules` absent —
  PIT-S69-002) : dans ce cas lance les commandes npm directement depuis `frontend/`.
- Si tu dois trancher un arbitrage secondaire non prévu (ex. faut-il ignorer un dossier
  supplémentaire), tranche et documente — ne bloque pas.
- **Ne modifie AUCUN fichier sous `docs/memory/sprints/sprint-78/`** sauf ton propre
  `issue-528-done.md`.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

Écris d'abord le fichier
`docs/memory/sprints/sprint-78/issue-528-done.md`, puis retourne un résumé identique.

Le done.md DOIT contenir, dans cet ordre :

```
# Issue #528 — <titre court>

## Commits
<SHA> — <message>

## Résumé
<objectif, arbitrage retenu ET pourquoi l'autre a été écarté, fichiers clés, chiffres mesurés
avec leurs exit codes, pièges rencontrés>

## Tests
<commande → EXIT=N → verdict, une ligne par commande>

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
