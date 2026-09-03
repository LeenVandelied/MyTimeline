# Issue #438 — Vulnérabilités HIGH résiduelles devDeps — Sprint 67, vague 2

**Commits :** `b7f05ee` (`:lock: fix(frontend): résorbe les 7 CVE HIGH devDeps`) — `frontend/package-lock.json` seul
· `64e0616` (`:memo: docs(ci)`) — `.github/workflows/ci.yml`, **écrit par le lead** après arbitrage dev.

## Résultat

`npm audit` dev+prod : **8 → 0**. Étape CI bloquante (`--omit=dev --audit-level=high`) : **0**, à
chacune des trois mesures (avant, après #182, après #438). Vérifié indépendamment par le lead.

| CVE | Verdict | Version |
|---|---|---|
| `brace-expansion` | corrigée | `1.1.16 → 1.1.18` (sous `minimatch@3.1.5`) **et** `5.0.8 → 5.0.9` |
| `fast-uri` | corrigée | `3.1.4 → 3.1.7` |
| `js-yaml` | corrigée | `4.3.0 → 4.3.2` |
| `browserslist` | corrigée | `4.28.4 → 4.28.8` |
| `image-size` | corrigée **par suppression** | remplacé par `probe-image-size@7.4.0` |
| `vite-plugin-storybook-nextjs` | corrigée | `3.3.0 → 10.6.0` (#182) |
| `@storybook/nextjs-vite` | corrigée | `10.4.6 → 10.6.0` (#182) |
| `@humanfs/node` (moderate) | corrigée | `0.16.6 → 0.16.8` (+ `@humanfs/core 0.19.1 → 0.19.2`) |

Aucune entrée « non corrigée ». Que des patchs in-range pour #438 : ADD 1 / REMOVE 1 / CHANGE 12.
Méthode : `npm update` ciblé, **jamais** `npm audit fix` — les 8 CVE étaient toutes des patchs
tenant dans les plages déjà déclarées, `audit fix` n'a jamais été nécessaire.

## Le vrai résultat : un « blocage amont » faux depuis ~20 sprints

`.github/workflows/ci.yml` documentait depuis le Sprint 45 que `brace-expansion` était
**incorrigible en aval** : « le seul brace-expansion corrigé est 5.0.8, qui change sa forme
d'export ; le forcer casse le lint (`expand is not a function`, minimatch@3 l'appelle comme une
fonction) ». Cette phrase a été recopiée telle quelle dans l'énoncé de #438.

**Réfuté, et mesuré — pas déduit :**
- `minimatch@3.1.5` déclare `brace-expansion: ^1.1.7` (lu dans le lock, re-vérifié par le lead) ;
  la `1.1.18` y entre. **La branche 5.x n'est donc jamais sollicitée** et la question de sa forme
  d'export ne se pose pas.
- `typeof require('minimatch/node_modules/brace-expansion') === "function"` — forme d'export préservée.
- `minimatch('abc.js','*.{js,ts}') === true` — l'expansion d'accolades fonctionne.
- `npm run lint` sort en **exit 0**, sans aucune occurrence de `expand is not a function`.

## Arbitrage documentaire (critère d'acceptation n°3 de l'issue)

`.github/workflows/ci.yml` est un pipeline CI → modification soumise à confirmation explicite du dev.
Question posée, réponse du 2026-09-03 : **conserver les deux étapes** (PROD bloquante + dev/prod
`continue-on-error`) et **corriger le commentaire périmé**.

Écarté sciemment : refusionner en une seule étape bloquante — ce que `ci.yml` prévoyait pourtant
lui-même (« = revenir à #222 »). Motif : la prochaine CVE publiée dans une devDependency bloquerait
alors **tous** les merges vers `dev`, et ce sprint démontre que cela arrive souvent (5 des 8 entrées
sont apparues depuis le Sprint 60). La baseline informative étant désormais **verte**, un rouge y
redevient un signal exploitable — c'est précisément l'objectif de l'issue (« plutôt que de laisser
un signal rouge permanent qui n'appelle plus d'action »).

Appliqué par le lead en `64e0616`. Diff **100 % commentaires** (vérifié : aucune ligne exécutable
modifiée, les deux steps et le `continue-on-error` intacts, YAML re-parsé). Les agents avaient
interdiction de toucher à ce fichier.

## Tests

`build` exit 0 · `lint` exit 0 · `test` **1030/1030** (102 fichiers) · `typecheck` exit 0 ·
`build-storybook` exit 0. Baseline pré-travaux relancée par l'agent : 1030/1030 — **écart nul**.
Aucun test modifié, aucun code applicatif touché.

## Signaux mémoire

- `[MEMORY:pitfall]` — **un « blocage amont » n'est pas un acquis.** Il se périme silencieusement
  le jour où l'amont publie un patch dans la plage semver déjà déclarée : rien ne le signale, et le
  verdict survit dans un commentaire de CI et dans les énoncés d'issues. Ici ~20 sprints.
  Prévention : lire les **plages déclarées dans le lock** avant de croire un « non corrigeable ».
- `[MEMORY:pattern]` — `npm audit fix` tire des majeurs non voulus (`PIT-S31-001`) et une 2e passe
  aggrave (`PIT-S45-006`). Lire les plages du lock puis `npm update <ciblé>`.
  Anti-pattern : lancer `audit fix` puis auditer le résultat a posteriori.
- `[MEMORY:decision]` — split de l'étape `npm audit` CI conservé, motif écrit dans `ci.yml`.

## Recommandations suite

- L'agent recommandait de durcir l'étape CI maintenant que l'audit atteint 0.
  **Arbitré NON** par le dev (cf. ci-dessus) — la recommandation est traitée, pas ignorée.
- Pas de `RECOMMAND_DB_EXPERT` (aucune migration), pas de `RECOMMAND_SECURITY` (aucune surface auth
  ni PII ; les CVE sont dans l'outillage de dev, rien n'est livré au runtime), pas de
  `RECOMMAND_UI_DESIGN` (aucune surface visuelle).
- `RECOMMAND_TEST_RUNNER` : le lead l'a spawné en Phase 6 pour vérification indépendante.

## Limites assumées

- E2E Playwright **non lancés** (hors périmètre ; ils exigent un backend debout).
- Le downgrade subi `oxc-resolver 11.23.0 → 11.21.2` (pin exact amont) est couvert par build/lint/
  tests/build-storybook, sans vérification spécifique au-delà.
- L'audit est vert **à cette date**. Une CVE publiée demain sur une devDep le repassera au rouge :
  c'est exactement l'usage attendu de l'étape informative désormais verte.

STATUS: COMPLETED
