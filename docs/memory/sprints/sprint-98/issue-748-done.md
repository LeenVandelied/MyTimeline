## Objectif
Couvrir 3 cas limites non testés de `layoutLane` (widthPx=0, leftPx négatif, occurrences identiques) ; corriger si la règle « première rangée libre » casse.

## Fichiers modifiés
- `frontend/src/components/timeline/lane-layout.test.ts` (+38 lignes, describe `cas limites (#748)`)

## Décisions
- Aucun correctif à `layoutLane` : vérification manuelle de l'algorithme (`rowEnds.findIndex((rowEnd) => rowEnd + gapPx <= start)`) pour les 3 cas AVANT écriture des tests — tous respectent la règle « première rangée libre ». Confirmé par les 3 nouveaux tests, tous verts sans toucher `lane-layout.ts`. Pas de contrôle négatif requis (aucun correctif produit) — critère d'acceptation conditionnel non déclenché.
- `widthPx=0` : deux occurrences au même `leftPx` (gap non respecté, 100+8<=100 faux) → 2 rangées ; une 3e à `leftPx+gap` exact (108) réutilise la rangée 0.
- `leftPx<0` : tri stable gère les négatifs sans garde particulière ; testé voisin qui tient (58=50+8) et qui ne tient pas (57).
- Identiques : 2 rangées, ordre d'entrée conservé, + assertion de cohérence `lines[rowOf[i]][posInRow[i]] === i` pour chaque événement (non testée avant, même si le cas « début égal » existait déjà ligne 63 du fichier).

## Tests
`cd frontend && npx vitest run src/components/timeline/lane-layout.test.ts` → PASS (20) FAIL (0) (17 existants + 3 nouveaux).
Lint : `rtk proxy npx next lint --file src/components/timeline/lane-layout.test.ts` → "No ESLint warnings or errors" (le résumé RTK affichait "Errors: 1" trompeur, cf. PIT rtk — utilisé `rtk proxy` en clair pour vérifier).
Format : `rtk proxy npx prettier --check src/components/timeline/lane-layout.test.ts` → "All matched files use Prettier code style!"
`tsc --noEmit` non exécuté : `lane-layout.ts` non modifié (hors contrainte "SI correctif").
Contrôle négatif : sans objet (aucune correction de `layoutLane`).

## Écarts d'énoncé
Aucun.

## Non vérifié
- Impact du futur #746 (vague 2, modifie `lane-layout.ts`/`lane-layout.test.ts`) — non applicable ici, tests groupés dans un describe dédié comme demandé.
- E2E non joués (hors périmètre, Vitest seul selon contraintes).

## Signaux mémoire
[MEMORY:pitfall] Context: `next lint --file` sous RTK (worktree amazing-rubin-93b16e, S98 #748). Solution: le résumé filtré par le hook RTK affichait "Errors: 1 | Warnings: 0" alors que `rtk proxy npx next lint --file <f>` (sortie brute) donnait "No ESLint warnings or errors" — même fichier, même commande. Prevention: pour `next lint --file`, ne jamais conclure sur le résumé RTK seul ; toujours contre-vérifier via `rtk proxy` avant de qualifier un run de rouge.

## Recommandations suite
RECOMMAND_FOLLOWUP: aucune — pas de dette identifiée, correctif non nécessaire.

## Fichiers de contexte lus
- `.ai-env/context-packs/pit-frontend.md` — PIT-S97-002/S82-002 (principe contrôle négatif), section lue via grep `contrôle négatif` (ex. ligne 1137, 977) ; aucun PIT spécifique à `layoutLane`.
- `docs/memory/sprints/sprint-97/issue-709-done.md` — NON LU (contexte déjà suffisant via les commentaires source `lane-layout.ts` lignes 1-24, qui référencent #709 et la maquette).
- `.claude/rules/frontend-stack.md` et `conventions.md` — NON LU en détail (appliqué de mémoire : code EN, docs/commentaires FR, TS strict — respecté dans les tests ajoutés).

STATUS: COMPLETED
