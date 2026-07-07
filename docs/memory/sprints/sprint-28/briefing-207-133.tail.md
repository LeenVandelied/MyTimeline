## Dépendances intra-sprint
- **CRITIQUE** : #207 (scope e2e corrigé) débloque l'issue #218 (specs Playwright, Vague 2). Ton correctif du scope `e2e` DOIT rendre `./scripts/test-quiet.sh e2e` réellement exécutable via Playwright, sinon la Vague 2 est bloquée.
- Aucune dépendance backend. Fichiers disjoints de l'agent backend (#41+#124) qui tourne en parallèle — ne touche PAS à `backend/`.

## Designer
Non applicable (devops/tooling, aucun rendu UI).

## Contraintes
- Repo : `/Users/herrh/VSProjects/MyTimeline` — Branche cible : `sprint/28` (déjà checkout). Vérifie `git branch --show-current` avant tout commit.
- Commit : 1 à 2 commits logiques gitmoji français (ex: `:bug: #207 test-quiet.sh scope e2e lance Playwright` / `:white_check_mark: #133 câbler vitest scope frontend + CI`). Référence les numéros d'issue.
- **Tests inline OBLIGATOIRES** : après correction, valide toi-même :
  - `./scripts/test-quiet.sh frontend` → vitest s'exécute, résumé pass/fail, exit code propagé sur échec.
  - `./scripts/test-quiet.sh e2e` → invoque bien `npm run test:e2e` (Playwright). Si l'env Playwright (navigateurs/serveur) n'est pas disponible localement, NE force PAS un run complet : vérifie via `bash -x` ou dry-run que la bonne commande est appelée, et documente-le. Ne fais pas passer un faux vert.
- CI : inspecte `.github/workflows/` (job frontend). Confirme qu'il exécute la suite vitest complète. Si le job e2e a besoin d'un backend up, ne le rends pas bloquant à tort — documente le choix.
- Ne PAS toucher : `backend/**`, `frontend/src/**` (hors config test), aucune spec E2E nouvelle (c'est #218 en Vague 2).

## Livrable attendu (format strict, MAX 500 tokens caveman)
Écris `docs/memory/sprints/sprint-28/issue-207-133-done.md` avec :
- commits: [SHA1, ...]
- resume: <objectif + fichiers modifiés + comment scopes frontend/e2e dissociés + résultat des runs de validation>
- tests: <ce que tu as réellement lancé et le résultat ; distingue vitest réel vs vérification dry-run Playwright>
- [MEMORY:*] signaux: <si applicable — ex pitfall sur skip runner absent>
- recommandations suite: <RECOMMAND_* explicites, ou "Pas de RECOMMAND_X car ..." ; en particulier confirme si #218 peut lancer un vrai run Playwright>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR si bloqué).
