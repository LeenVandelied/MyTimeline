# Issue #528 — `format:check` câblé en CI + dette de 119 fichiers reformatée

## Commits
`5650264` — :art: chore(ci): cable `format:check` et reformate la dette de 119 fichiers (121 fichiers, +1432/-1478)

## Résumé
Arbitrage tranché : **câblage**, pas retrait. Step `Format (Prettier)` ajouté au job `frontend` de `.github/workflows/ci.yml`, après `Lint` ; sans `continue-on-error`, dernière commande = prettier (PIT-S64-007).

Chiffre : `prettier --check .` → **EXIT=1, 119 fichiers** (90 `src/`, 14 `e2e/`, 10 `app/`, 5 racine). Pas 2-3 (énoncé), pas 104 (mini-plan architect, qui mesurait `src e2e` au lieu du périmètre `.` du script). Le lead avait raison sur 119.

Pourquoi câbler : `next lint` ne vérifie pas le formatage → retirer laissait **zéro** gate ; `prettier-plugin-tailwindcss` a une valeur réelle sur Tailwind v4 ; le mini-plan **S79 dépend déjà** de ce reformatage. Écarté (retrait) car il fallait aussi sortir 2 devDeps, `.prettierrc`, `.prettierignore` et assumer la dérive silencieuse de 6 options de style délibérées.

Contre mon choix, assumé : `git blame` pollué sur 90 fichiers `src/` ; `husky`/`lint-staged` déclarés mais **`.husky/` n'existe pas** et pas de script `prepare` → aucun rattrapage pre-commit, les contributeurs découvriront le gate en CI ; 78 sprints ont tenu sans.

Innocuité du tri **mesurée, pas supposée** : (1) empreinte du multi-ensemble de classes HEAD vs après sur les 119 fichiers → aucune classe ajoutée/retirée/altérée, seul l'ordre change (11 deltas résiduels = mots français de titres de tests, artefacts du changement de quotes) ; (2) audit des **1354** littéraux de classes → **1 seul** auto-conflictuel vis-à-vis de `twMerge`, une directive `@source inline(...)` de `base-layer.test.ts`, **laissée intacte** par le tri. L'ordre dans l'attribut ne pilote pas la cascade Tailwind ; `twMerge` était la seule voie, elle est fermée.

Effet de bord traité : le tri a disloqué l'ancre de la garde de focus (`peer h-4 w-4 shrink-0` non contigu dans `checkbox.tsx` après tri) → ancre passée à `h-4 w-4 shrink-0` + contrainte documentée dans `src/styles/__tests__/tsx-focus-utility.test.ts`. Rattrapé par le test d'existence d'ancre du S77 : garde-fou qui a fait son travail.

Isolation worktree partagé : commit par pathspec explicite, `scripts/test-quiet.sh` et `README.md` de #434 restent non commités et intacts.

## Tests
`rtk proxy npx prettier --check .` (base) → EXIT=1 → 119 fichiers non conformes
`npx vitest run` (1re passe) → EXIT=1 → 7 échecs / 1 fichier (ancre de focus disloquée)
`npx vitest run` (après fix ancre) → EXIT=0 → **1313/1313**, 113 fichiers
`npx tsc --noEmit` → EXIT=0 → 0 erreur (couvre `e2e/**` : include `**/*.ts`)
`npx next lint` → EXIT=0 → No ESLint warnings or errors
`npx next build` → EXIT=0 → Compiled successfully, **52 pages**, 75 lignes de routes (pas le faux « 2 routes » de PIT-S75-002)
`npm run format:check` à HEAD → EXIT=0 → All matched files use Prettier code style
`node` audit twMerge → EXIT=0 → 1354 littéraux, 1 auto-conflictuel (intact)
`node` audit multi-ensemble classes → EXIT=0 → 0 classe modifiée sur 119 fichiers
E2E Playwright → **NON LANCÉ** (voir Recommandations)

## Signaux mémoire
[MEMORY:decision] DEC-S78-001 — `format:check` câblé en CI + 119 fichiers reformatés dans le même commit ; innocuité du tri de classes prouvée par empreinte de multi-ensemble + audit twMerge, pas par principe.
[MEMORY:pitfall] `prettier-plugin-tailwindcss` disloque les ancres littérales de tests : une ancre doit être contiguë **dans l'ordre trié**, pas dans l'ordre d'écriture humain (`peer h-4 w-4 shrink-0` → dispersé). Tout test à `toContain` sur une chaîne de classes est fragile dès que le gate de formatage est actif.
[MEMORY:pitfall] Le mini-plan architect a sous-estimé la dette de 15 fichiers en mesurant `src e2e` au lieu du périmètre `.` du script `format:check` : mesurer ce que la CI mesurera, pas ce qui semble être le périmètre.
[MEMORY:pattern] Prouver qu'un reformatage massif est inerte au rendu : comparer le multi-ensemble de classes par fichier HEAD vs après (détecte toute altération) + auditer les littéraux auto-conflictuels vis-à-vis de `twMerge` (seule voie par laquelle l'ordre d'attribut peut compter). Plus fort et moins cher qu'un run de diff visuel.
[MEMORY:bug] BUG-S71-002 est **clos** par ce commit ; l'arbitrage laissé ouvert aux S71/S75/S77 est tranché dans DEC-S78-001.

## Recommandations suite
RECOMMAND_TEST_RUNNER : E2E non lancé ici, pour deux raisons mesurées et non par renoncement. (1) Les 10 références de `toHaveScreenshot` sont suffixées `-chromium-linux` ; sur ce poste darwin Playwright chercherait `-chromium-darwin`, ne trouverait rien et **écrirait de nouvelles références** — aucun signal et pollution du dépôt (PIT-S77-019). (2) Le backend est éteint (`curl :8080` → 000) et le lever dans un worktree partagé où #434 travaille risquait de corrompre `.next` pour l'autre agent (PIT-S73-008). Les specs `e2e/**` reformatées sont couvertes par `tsc --noEmit` (EXIT=0) et eslint. À rejouer en Phase 6 sur Linux, où les références sont valides.
Pas de RECOMMAND_DB_EXPERT car aucune migration ni requête SQL touchée.
Pas de RECOMMAND_SECURITY_EXPERT car aucun changement d'auth, de données personnelles ni d'API externe.
RECOMMAND_FOLLOWUP: `husky` + `lint-staged` sont dans les devDependencies mais `.husky/` n'existe pas et il n'y a pas de script `prepare` — soit installer le hook pre-commit (qui rendrait le nouveau gate `format:check` indolore), soit retirer les deux dépendances mortes. [triage XS | domaine frontend]

STATUS: COMPLETED
