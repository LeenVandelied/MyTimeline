# Signaux `RECOMMAND_TEST_RUNNER` — traitement (Sprint 95)

Deux agents (#701, #713) ont émis `RECOMMAND_TEST_RUNNER` au motif que la suite frontend
dépasse le seuil de 500 tests fixé par leur briefing (1873 tests).

## Décision du lead : PAS de spawn `test-runner`. Le lead a exécuté les suites lui-même.

**Motif — mesure, pas préférence.** L'historique du dépôt porte **quatre verdicts
« E2E impossible » successifs rendus par un `test-runner` délégué**, tous faux (le dernier au
S73). La cause est structurelle : le runner tourne en isolation, ne dispose pas de la recette de
montage de la pile (profil compose `e2e`, ports, variables proxy posées au BUILD, contournement
du `--turbopack` en worktree) et conclut à l'impossibilité plutôt qu'à sa propre méconnaissance.
Déléguer ici aurait reproduit ce défaut au lieu de l'éviter.

Le motif invoqué par les agents est par ailleurs un seuil de VOLUME, pas un signal de risque :
la suite frontend tourne en 25 s et la suite E2E complète en 2,7 min. Le coût que le seuil visait
à éviter (saturation du contexte du lead par une sortie verbeuse) a été traité autrement — sortie
redirigée vers un fichier, seules les lignes de synthèse relues.

## Ce qui a été réellement exécuté par le lead, au HEAD `1d846b09`

- `./scripts/test-quiet.sh backend` → 632/632
- `./scripts/test-quiet.sh frontend` → OK (build + unitaires + typecheck + lint)
- `npm run format:check` (binaire réel, hors RTK) → propre
- Suite Playwright **COMPLÈTE** (430 tests) → **422 passed / 8 skipped / 0 failed**, 2,7 min

Détail de la recette de montage et des oracles de santé : `docs/memory/audits/sprint-95-test-coverage.md`.

## Conséquence

Signaux `RECOMMAND_TEST_RUNNER` de `issue-701-done.md` et `issue-713-done.md` : **TRAITÉS**,
par exécution directe et non par délégation. Aucun report au sprint suivant.
