# Issue #434 — Aligner le scope `frontend` de test-quiet.sh sur la doc

## Commits
fb8c21a — :bug: fix(ci): aligne le scope `frontend` de test-quiet.sh sur ce qu'annonce la doc

## Résumé
Arbitrage : OPTION 1 (étendre). `frontend` = build → vitest → typecheck → lint, arrêt au 1er échec.
Option 2 (renommer `frontend-unit`) écartée : `test-quiet.sh frontend` cité dans ~60 fichiers, dont
~55 archives `sprint-N/issue-*-done.md` — les réécrire falsifie le journal, les laisser fait pointer
chaque archive vers un scope disparu. Et renommer déplace le piège sans le supprimer.
Mesure (cache .next chaud) : typecheck 7s, lint 5s, build 49s, vitest 27s ; scope complet enchaîné
53s vs 27s avant (x2 à chaud, plus à froid).
Ordre = celui du job CI, PAS « le moins cher d'abord » : tsconfig inclut `.next/types/**`, un
typecheck avant build lit des types périmés (PIT-S60-007).
Ajout `frontend-unit` (vitest seul) comme échappatoire : `next build` réécrit `frontend/.next`,
partagé en fan-out (PIT-S62-009). Documenté en en-tête du script et dans le README.
Fichiers : `scripts/test-quiet.sh`, `README.md`, `.ai-env/rules-jit/frontend.md`,
`.ai-env/rules-jit/backend.md`. Ces 2 derniers annonçaient aussi `unit` = « Backend + Frontend » —
FAUX, `unit` est un alias de `backend`. Archives de sprint non réécrites.
Pièges rencontrés : vitest rouge (7 tests, `tsx-focus-utility.test.ts`) au 1er run car `checkbox.tsx`
était `M` sous le reformatage #528 en vol ; vert au run suivant (PIT-S72-006). Pas mon diff.

## Tests
`npm run typecheck` → EXIT=0 (7s)
`npm run lint` → EXIT=0 (5s)
`npm run build` → EXIT=0 (49s, 103 lignes = vrai build, pas le résumé RTK)
`bash -n scripts/test-quiet.sh` → EXIT=0
`./scripts/test-quiet.sh nope` → EXIT=2, liste des scopes à jour
`./scripts/test-quiet.sh --help` → EXIT=0, en-tête complet (plage `2,45p` recalée)
`./scripts/test-quiet.sh frontend-unit` → EXIT=0 (113 fichiers / 1313 tests)
`./scripts/test-quiet.sh frontend` → EXIT=0 (53s, 4 étapes vertes)
`bash .ai-env/tools/gen-pit-packs.sh --check` → EXIT=0 (packs à jour)
PREUVE DE DÉTECTION : sonde `frontend/src/__tmp-434-typecheck-probe.ts` (TS2322) créée →
`./scripts/test-quiet.sh frontend` → EXIT=1 dès l'étape build (« Type error: Type 'string' is not
assignable to type 'number' ») → sonde supprimée, absence vérifiée (`ls` = No such file, `git status`
vide). CONTRÔLE NÉGATIF : même sonde → `frontend-unit` → EXIT=0, 0 mention. Ancien scope aveugle.
Tous les EXIT lus sans pipe, commandes préfixées `rtk proxy`.

## Signaux mémoire
[MEMORY:decision] #434 : scope `frontend` étendu (build+vitest+typecheck+lint, ordre CI) plutôt que renommé, car ~55 archives de sprint le citent et un renommage déplace le piège au lieu de le supprimer ; `frontend-unit` ajouté pour la boucle rapide et pour ne pas tuer un `next dev` voisin.
[MEMORY:pitfall] PIT-S60-009 est PÉRIMÉ depuis fb8c21a : `test-quiet.sh frontend` lance désormais build+vitest+typecheck+lint ; l'entrée de `docs/memory/pitfalls.md` doit gagner « corrigé au S78 (#434) », sinon elle redevient un verdict recopié faux (PIT-S67-001).
[MEMORY:pitfall] `.ai-env/rules-jit/{frontend,backend}.md` documentaient `unit` comme « Backend + Frontend » : c'est un alias de `backend` seul — une 3e description fausse du même script, non détectée par la CI (`check-rules-jit-drift.sh` est SKIP en CI).

## Recommandations suite
Pas de RECOMMAND_DB_EXPERT car aucune migration ni requête SQL touchée.
Pas de RECOMMAND_SECURITY_EXPERT car aucun code d'authentification ni de données personnelles touché.
Pas de RECOMMAND_TEST_RUNNER car les suites ont été exécutées ici et les codes de sortie sont cités.
Pas de RECOMMAND_PLAYWRIGHT_REVIEWER car aucun test E2E touché et l'exclusivité Playwright appartient à #528.
RECOMMAND_FOLLOWUP: reporter la correction des scopes dans les rules-jit AMONT du plugin ai-env (le dépôt ne porte que des copies ; `check-rules-jit-drift.sh` signalera la dérive au prochain bump) [triage XS | domaine ci]

STATUS: COMPLETED
