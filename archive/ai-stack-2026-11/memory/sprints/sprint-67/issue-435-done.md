# Issue #435 — Réparer `npm audit fix` sur `frontend/` (Sprint 67, vague 1)

**Commit :** `9e6e3ea` — `:wrench: fix(frontend): override postcss littéral pour débloquer npm audit fix`
**Fichiers :** `frontend/package.json`, `frontend/README.md` (2 fichiers, +39/−1). Lockfile **absent du commit**.

## Ce qui a changé

`overrides.postcss` : `"$postcss"` → `"^8.5.23"` (littérale, identique au spec de `devDependencies.postcss`).

## Oracle d'équivalence : le lockfile n'a pas bougé

C'était le critère posé au briefing — si la littérale n'était pas strictement équivalente à
`$postcss`, l'arbre aurait changé. Vérifié deux fois : par l'agent (md5 identique avant/après
`npm install --package-lock-only`) et **re-vérifié par le lead** :
`git diff --stat origin/dev..HEAD -- frontend/package-lock.json` → vide.

## Vérifications du lead (indépendantes du rapport de l'agent)

| Contrôle | Résultat |
|---|---|
| `npm audit fix --dry-run` — lignes `npm error` | **0** — plus d'`Unable to resolve reference` |
| `npm audit --omit=dev --audit-level=high` (étape CI bloquante) | `found 0 vulnerabilities` |
| Lockfile dans le commit | non (0 occurrence) |
| `overrides.postcss` | `^8.5.23` littérale |
| `next` → pin postcss (lu dans le lock) | `next 15.5.22 -> postcss 8.4.31` (**exact**, confirme le point ci-dessous) |
| Section `## Overrides npm` dans `frontend/README.md` | présente (ligne 22) |

`npm audit fix --dry-run` sort en exit 1 : normal, il reste 8 vulnérabilités (1 moderate + 7 high,
toutes dev). Le critère de l'issue portait sur la disparition de l'erreur de résolution, pas sur
l'absence de vulnérabilité. Les 291 lignes de propositions n'ont **pas** été appliquées (périmètre V2).

## Le résultat qui compte : l'override est *load-bearing*, pas cosmétique

L'agent ne l'a pas supposé, il l'a **mesuré** — sur une copie hors dépôt, pour ne pas écrire dans le
lockfile partagé :

> `next@15.5.22` épingle `postcss` à la version **exacte** `8.4.31`. Sans l'override, npm recrée un
> `node_modules/next/node_modules/postcss@8.4.31` imbriqué, et `npm audit --omit=dev` passe de
> **0 à 2 vulnérabilités de PRODUCTION** (GHSA-r28c-9q8g-f849, GHSA-6g55-p6wh-862q).

Autrement dit l'override tient à lui seul la verdeur de l'étape **bloquante** du job CI `security`.
Le supprimer lors d'un futur « nettoyage des dépendances » casserait le merge sur `dev`.
Le lead a confirmé le pin exact en relisant `package-lock.json`.

**Conséquence pour la vague 2 : ne pas toucher aux overrides.**

## Documentation (critère d'acceptation n°4)

Doublée, volontairement :
- clé `_overridesRationale` dans `package.json`, **au contact de la déclaration** — c'est là qu'un
  nettoyage de dépendances frappe (`package.json` n'accepte pas de commentaires JSON) ;
- section `## Overrides npm — ne pas supprimer` dans `frontend/README.md` (fichier existant, aucun
  fichier de doc inventé), avec la recette de reproduction, trop longue pour du JSON.

## Tests (compteurs réels, pas « vert »)

| Commande | Exit | Détail |
|---|---|---|
| `npm run build` | 0 | compilé en 8,3 s, 52 pages, CSS Tailwind v4 émis (98,1 K) — **le critère de l'issue** |
| `npm run lint` | 0 | « No ESLint warnings or errors » |
| `npm run test` | 0 | **1030/1030** tests, 102/102 fichiers |
| `npm run typecheck` | 0 | — |
| `npx prettier --check package.json README.md` | 0 | — |

## Signaux mémoire

- `[MEMORY:pitfall]` — un `overrides` en `$name` est toujours remplaçable par la littérale du spec
  correspondant ; le md5 du lockfile est l'oracle d'équivalence. Clôt `PIT-S60-006`.
- `[MEMORY:decision]` — documenter un override sans commentaires JSON : clé `_overridesRationale`
  (proximité) + section README (détail).
- `[MEMORY:pattern]` — prouver qu'un override est load-bearing : copier `package.json` +
  `package-lock.json` **hors dépôt**, retirer l'override, `npm install --package-lock-only
  --ignore-scripts` + `npm audit --omit=dev`. Anti-pattern : le tester en place (écrit le lock partagé).

## Recommandations suite

- `RECOMMAND_FOLLOWUP` (P3) — `next lint` / `next build` avertissent « multiple lockfiles » : le
  workspace root inféré est `/Users/herrh/VSProjects/package-lock.json`. Voisin de `PIT-S61-007`.
  Candidat : `outputFileTracingRoot` dans `next.config`. **Hors périmètre #435** — à trancher en Phase 4.
- Pas de `RECOMMAND_DB_EXPERT` (aucune migration), pas de `RECOMMAND_SECURITY` (aucune surface auth
  ni PII touchée), pas de `RECOMMAND_UI_DESIGN` (aucune surface visuelle).
- `RECOMMAND_TEST_RUNNER` : non — la suite a été lancée en entier et rapportée avec compteurs.

## Limite assumée

L'équivalence est prouvée pour l'arbre **actuel**. Si un futur bump de `next` changeait son pin
postcss, la littérale `^8.5.23` devrait être revue — c'est précisément ce que la doc ajoutée signale.

STATUS: COMPLETED
