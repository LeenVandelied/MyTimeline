# Rapport d'exécution des suites — Sprint 65

> Répond au `RECOMMAND_TEST_RUNNER` de `issue-469-done.md`.
> **Aucun subagent `test-runner` n'a été spawné : les runs ont été joués et lus par le LEAD.**
> Raison assumée — le critère d'acceptation de #469 exige une machine au repos et l'absence de
> toute campagne Playwright concurrente. Un subagent ne pouvait pas garantir cette isolation :
> **deux campagnes de mesure ont précisément été perdues ainsi** (les runs lancés en arrière-plan
> par le subagent mouraient avec sa session, et une campagne du lead s'est retrouvée concurrente
> d'une campagne encore vivante, produisant un faux rouge). Le lead a donc repris la mesure.

## Suites — tous les chiffres sont lus, aucun n'est déduit

| Suite | Comment | Résultat | Exit |
|---|---|---|---|
| Backend | `./scripts/test-quiet.sh backend` | **465 tests, 465 passed, 0 failed, 0 error, 0 skipped** | 0 |
| Frontend unitaire | `./scripts/test-quiet.sh frontend` (Vitest) | **1004 tests / 101 fichiers, 1004 passed** | 0 |
| E2E Playwright | runner direct, serveur externe `:3100`, backend-e2e `:8086` | **240 tests — 232 passed, 0 failed, 8 skipped** | 0 |
| Typecheck | `tsc --noEmit` | 0 erreur | 0 |
| Lint | `eslint` (fichiers touchés) | 0 problème | 0 |

## Mesure #469 — les 2 runs consécutifs exigés par l'issue

| Run | Workers | Résultat | Durée | Blocs `Running` dans le log |
|---|---|---|---|---|
| 1 | 2 | 232 passed / 0 failed / 8 skipped | 3 min 59 | 1 |
| 2 | 2 | 232 passed / 0 failed / 8 skipped | 3 min 11 | 1 |

Les 4 specs `settings-*` sont vertes sur les **deux** runs, et aucune occurrence de la signature
`PIT-S47-004` (`toHaveValue` sur deux graines divergentes) n'apparaît.

**Vérificateur ajouté à la mesure** : le comptage des blocs `Running N tests using M workers` par
log doit valoir **1**. C'est le contrôle qui manquait aux campagnes perdues — un log en contenant
deux (`231 passed (7.0m)` ET `222 passed / 10 failed (8.2m)` dans le même fichier) est la preuve
que deux campagnes concurrentes s'écrasaient.

Repère de vitesse : **9 min 00 à `workers: 1`** (Sprint 64) → **3–4 min à `workers: 2`**, sans échec.

## Runs de vérification post-correctifs

| Moment | Résultat | Durée |
|---|---|---|
| HEAD final (après #470, qui touche `package.json` + `playwright.config.ts`) | 232 passed / 0 failed | 4 min 01 |
| Après les correctifs de review (cycle 2, `aa57109` — dont `run-lock.ts`) | 232 passed / 0 failed | 4 min 36 |

Le second était nécessaire : `run-lock.ts` s'exécute au `globalSetup` de **chaque** run. Le test
ciblé du verrou n'avait prouvé que le chemin de REFUS ; ce run prouve le chemin nominal
(acquisition puis libération, sans trace d'erreur).

## Contrôles négatifs — un test qui ne rougit pas sans le correctif ne prouve rien

- **#452** : horizon porté de 5 à 400 ans ⇒ **4 échecs** ; fichier restauré et re-vérifié vert.
- **#451** : effet `useLayoutEffect([dayWidth])` neutralisé ⇒ **rouge**
  (`Expected: 1 / Received: 0`, la pastille du jour 300 ne monte jamais), avec la prémisse
  « pas de rabattement » passée juste avant ; effet restauré ⇒ **34/34 vert**.
- **Verrou de run** : verrou de 300 min détenu par un process **vivant** ⇒ **REFUSÉ**
  (avant le correctif de review : volé).

## CI

Les 7 jobs passent sur le SHA de tête `663992d` (PR #474), dont les 4 requis
(`backend`, `frontend`, `e2e`, `ai-env-packs`). Le job `e2e` a tourné **7 min 15** — c'est un run
réel, et depuis #470 un « vert vacuous » sur suite vide n'est plus possible par construction.

## Réserve

`workers: 2` n'est acquis **qu'en local**. La CI reste à 1 (`process.env.CI ? 1 : 2`) et sa
viabilité n'y est pas démontrée : un seul runner/IP, et le budget `register` de la suite est déjà
au plafond (5 par run vs 5/min/IP, sans marge).
