## Objectif

Trancher trois contrôles verts qui ne prouvaient pas ce qu'ils prétendaient. Sprint d'outillage
et de CI : **aucun code métier n'est touché** — pas une ligne sous `backend/src/main/java/**`,
aucune logique frontend. Ce qui change, ce sont les gates eux-mêmes.

Milestone : Sprint 78 (#79) · cohésion 0.28 (sous seuil, assumé — DEC-S57-003).

## Issues livrées

| # | Arbitrage retenu | Ce qui a été écarté, et pourquoi |
|---|---|---|
| #528 | **Câbler** `format:check` en CI, et reformater la dette dans le même commit | Retirer les scripts `format*` laissait **zéro** gate de formatage (`next lint` ne le vérifie pas), et le plan du S79 dépend déjà de ce reformatage |
| #434 | **Étendre** le scope `frontend` (build → vitest → typecheck → lint) | Le renommer en `frontend-unit` : ~55 archives de sprint citent le scope actuel, et renommer déplace le piège au lieu de le supprimer |
| #169 | JaCoCo (`verify`) + vitest `--coverage` (lcov), 2 artefacts CI | Tout seuil bloquant : l'issue demande de **mesurer avant de gater** |

## Changements clés

- **`.github/workflows/ci.yml`** — step `Format (Prettier)` ajouté au job `frontend` (sans
  `continue-on-error`, dernière commande = prettier lui-même) + 2 steps `upload-artifact` pour les
  rapports de couverture, sur le SHA v4 déjà épinglé du dépôt.
- **119 fichiers reformatés** (`prettier` + `prettier-plugin-tailwindcss`). C'est l'essentiel du
  volume du diff, et c'est du bruit : voir « Innocuité du reformatage » ci-dessous.
- **`scripts/test-quiet.sh`** — scope `frontend` étendu, scope `frontend-unit` ajouté pour la
  boucle rapide (il ne lance pas `next build`, donc il ne tue pas le `next dev` d'un agent voisin).
- **`backend/pom.xml`** — `jacoco-maven-plugin` 0.8.13, version épinglée (le parent Spring Boot ne
  la gère pas). **Aucun `<argLine>` littéral** : l'agent JaCoCo reste attaché et le
  `-Dapi.version` de Testcontainers est préservé — l'inverse ferait tomber toute la suite backend.
- **`frontend/vitest.config.mts`** — provider `v8`, reporters `text-summary` + `lcov`, script
  `test:coverage` ; `npm test` inchangé.
- **`docs/memory/pitfalls.md`** — `PIT-S60-009` marqué RÉSOLU. Il affirmait au présent que le
  scope `frontend` ne lance que Vitest : rendu faux par ce sprint, et injecté tel quel dans les
  packs de tous les subagents. Packs régénérés.

## Innocuité du reformatage — mesurée, pas postulée

Le risque réel de `prettier-plugin-tailwindcss` est le réordonnancement des classes, qui peut
changer la cascade. Deux mesures, pas un raisonnement :

1. **Empreinte du multi-ensemble de classes** par fichier, avant/après, sur les 119 fichiers :
   aucune classe ajoutée, retirée ni altérée — seul l'ordre change.
2. **Audit des 1354 littéraux** de classes pour les conflits `twMerge` : un seul auto-conflictuel,
   une directive `@source inline(...)` laissée intacte par le tri.

Un effet de bord réel a été trouvé et corrigé : le tri a disloqué une ancre littérale du test de
focus (`checkbox.tsx`), ancre rebasée sur `h-4 w-4 shrink-0` et contrainte documentée dans la spec.

## Tests

Codes de sortie lus **sans pipe**, commandes préfixées `rtk proxy` (le hook falsifie `next build`,
`prettier --check` et `vitest` sur ce poste).

- **Backend** : `mvnw verify` → EXIT=0, **566 tests**, 0 échec (Docker 29.2.1). Couverture
  initiale 90,49 % instructions / 72,18 % branches.
- **Frontend** : vitest **1313/1313**, typecheck, lint, `next build` (**52/52 pages**),
  `format:check` → tous EXIT=0. Couverture initiale 70,77 % statements (chiffre BRUT, gonflé par
  des configs racine happées par v8 — pas une cible).
- **E2E** : suite réellement jouée par le lead sur une stack isolée (Postgres dédié, backend natif,
  `next dev` en webpack) : **304 passed / 5 failed / 9 skipped** en 6,3 min.

**Les 5 échecs E2E sont instruits un par un** dans `docs/memory/audits/sprint-78-test-coverage.md`,
et aucun n'est imputable à ce diff : 1 dû au drapeau `--ignore-snapshots` sur darwin (le garde-fou
de la spec a correctement **refusé d'écrire** une référence de plateforme étrangère), 3 à
`BREVO_API_KEY` absente (log backend à l'appui), 1 (`golden-path`) à une contention d'identités /
rate-limit sur `register` — vert en isolation, et surtout **ce sprint ne modifie aucune ligne de
backend exécutable** alors que l'échec est un refus côté serveur. Le suspect réel est #475/#463,
déjà planifiées au Sprint 79.

## Review

Cycle 1 : **0 CRITIQUE / 2 MAJEUR / 5 MINEUR**. Les deux MAJEUR portaient sur le correctif de #434
lui-même, qui réintroduisait par la porte de derrière le défaut qu'il corrigeait : un script npm
manquant produisait un skip à 0 suivi d'un « OK » annonçant les quatre étapes.

Cycle 2 (les commits de correction sont relus à leur tour) : **0 CRITIQUE / 0 MAJEUR / 5 MINEUR**.

Il y a réfuté **un contrôle écrit par le lead**, et c'est le constat le plus utile de la review :
lancer `if ./scripts/test-quiet.sh frontend` pour prouver l'armement était vacuous — le script
tourne dans son propre processus, dont le `set -e` n'est jamais désarmé par le `if` de l'appelant.
Contrôle refait en sourçant les fonctions et en appelant `run_frontend` en contexte conditionnel
dans le shell :

| Version | Résultat |
|---|---|
| avant le correctif | build ROUGE, typecheck ROUGE, et pourtant `✓ OK (build + tests unitaires + typecheck + lint)`, **return 0** |
| après | **return 1** dès le build, aucune étape ultérieure |

## Ce qui n'est PAS prouvé — à lire avant de merger

- **Les comparaisons de captures n'ont pas tourné.** C'est le seul risque résiduel du reformatage.
  Les références sont suffixées `-chromium-linux` : sur darwin, Playwright en écrirait de
  nouvelles au lieu de comparer. **Le job `e2e` de cette PR est la seule instance qui peut juger.**
- **Le téléchargement effectif des deux artefacts de couverture** ne pouvait pas être prouvé
  localement (aucune CI ne tourne sur les branches `sprint/N`). Prouvé à la place : rapports
  réellement produits, `path:` corrects vis-à-vis de la racine du dépôt et non du
  `working-directory` (erreur classique qui produit un artefact vide **sans faire rougir le job**),
  YAML valide à 7 jobs. **À constater sur le premier run de cette PR.**
- `if-no-files-found: error` n'a jamais été déclenché : raisonné, pas mesuré.
- Le coût du scope `frontend` étendu (53 s) a été mesuré à cache `.next` **chaud** ; à froid, plus.

## Couverture E2E

Le contrôle heuristique a rendu un MAJEUR sur 9 testids « sans spec ». **Faux positif intégral** :
les 9 existent déjà sur `dev`. Le reformatage fait compter chaque ligne comme ajoutée par
l'heuristique. Ce sprint n'introduit aucun testid — aucune surface UI nouvelle.

## Suites proposées

- Constater les 2 artefacts non vides au premier run, puis consigner les valeurs de référence
- `husky` / `lint-staged` déclarés mais `.husky/` inexistant : installer le hook (le gate
  deviendrait indolore) ou retirer les deux dépendances mortes
- Exclure les configs racine du périmètre v8 une fois la référence brute consignée
- Reporter la correction des `rules-jit` en amont du plugin ai-env

🤖 Generated with [Claude Code](https://claude.com/claude-code)

