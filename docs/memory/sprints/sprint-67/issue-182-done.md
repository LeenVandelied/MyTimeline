# Issue #182 — Nettoyer les CVE devDeps npm (chaîne Storybook) — Sprint 67, vague 2

**Commit :** `24ff500` — `:arrow_up: chore(frontend): bump chaîne Storybook 10.6.0, retire image-size (#182)`
**Fichier :** `frontend/package-lock.json` **uniquement** (vérifié par le lead : `git show --name-only`).

## L'énoncé était périmé

L'issue visait `vite`, `vitest`, `flatted`, `minimatch`, `picomatch` et « 4 high + 1 critical ».
Cette chaîne **avait déjà été résorbée** : aucune de ces entrées ne remontait plus, et il n'y avait
plus aucune vulnérabilité `critical`. Corps de l'issue corrigé sur GitHub avant exécution.

Ce qui restait réellement : `@storybook/nextjs-vite` → `vite-plugin-storybook-nextjs` → `image-size`.

## Ce qui a été fait

Bump ciblé de la chaîne Storybook `10.4.6 → 10.6.0` par `npm update <paquets ciblés>`, **jamais**
`npm audit fix` (`PIT-S31-001` : `audit fix` tire des majeurs transitifs non voulus).
`image-size@2.0.2` disparaît de l'arbre : `vite-plugin-storybook-nextjs@10.6.0` dépend désormais de
`probe-image-size@7.4.0`.

Churn : ADD 14 / REMOVE 9 / CHANGE 34 sur les entrées `packages` du lockfile.

## Deux anomalies détectées, vérifiées, et déclarées

L'agent ne les a pas passées sous silence — c'est le point à retenir de cette issue :

1. **`vite-plugin-storybook-nextjs 3.3.0 → 10.6.0`** — un saut de majeur apparent. Vérifié :
   `@storybook/nextjs-vite@10.6.0` le déclare en version **exacte** `"10.6.0"` (contre `"^3.2.4"` en
   10.4.6). C'est un réalignement de versioning décidé en amont, pas un majeur subi par nous.
2. **`oxc-resolver` + 19 bindings : `11.23.0 → 11.21.2`** — un **downgrade**, et il était **absent
   du relevé `--dry-run` du lead**. Vérifié : `storybook@10.6.0` l'épingle en exact `"11.21.2"`
   (contre `"^11.19.1"` en 10.4.6). Subi, mais explicable et non accidentel.

> Le second point est aussi une correction de ma propre mesure : mon relevé `npm audit fix --dry-run`
> ne l'avait pas fait apparaître. L'agent a diffé le lockfile plutôt que de se fier à mon résumé.

## Le compteur de npm est trompeur

`npm` annonce « 195 / 183 packages added ». La churn réelle du lockfile est de **15 add / 10 remove**
au total sur les deux commits : l'essentiel des « ajouts » sont des **binaires de plateforme
optionnels** (`@oxc-resolver/binding-*`, `@emnapi/*`) déjà présents dans le lock.
→ juger l'ampleur d'un bump sur le **diff du lock**, pas sur la sortie texte de npm.

## Tests (compteurs réels, mesurés à cette étape)

`build` exit 0 · `lint` exit 0 · `test` **1030/1030** (102 fichiers) · `typecheck` exit 0 ·
`build-storybook` exit 0. `npm run storybook` : serveur démarré sur `:6017`, HTTP 200, puis tué
(0 process résiduel). Environnement re-vérifié après coup (`PIT-S60-005`) : `eslint-plugin-storybook`
toujours résolvable.

## Signaux mémoire

- `[MEMORY:pattern]` — le compteur « added N packages » de npm affole ; differ les entrées
  `packages` du lock (add/remove/change + comparaison de majeurs) donne l'ampleur réelle.
  Anti-pattern : juger un bump sur la sortie texte de npm.

## Limites assumées

- E2E Playwright **non lancés** (hors périmètre des deux issues).
- Le downgrade `oxc-resolver` est **subi** (pin exact amont) : couvert par build, lint, tests et
  `build-storybook`, mais aucune vérification spécifique au-delà.

STATUS: COMPLETED
