[BRIEFING ISSUE #207 + #133 — FUSIONNÉES (même fichier scripts/test-quiet.sh)]

## Contexte worktree (garde-fou HEAD — LIRE EN PREMIER)
- Le repo de travail est `/Users/herrh/VSProjects/MyTimeline` (PAS le cwd par défaut si tu es lancé ailleurs).
- **PREMIÈRE ACTION** : `cd /Users/herrh/VSProjects/MyTimeline` puis `git branch --show-current` → DOIT afficher `sprint/28`. Si ce n'est pas le cas, STOP et signale-le (ne code pas à l'aveugle).
- Tous les chemins ci-dessous sont relatifs à ce repo.

## Issue #207 — [BUG] test-quiet.sh : l'alias e2e lance vitest au lieu de Playwright
`scripts/test-quiet.sh` a un mode `e2e` censé exécuter Playwright, mais il lance en réalité `npm test` (Vitest unitaires) au lieu de `npm run test:e2e`. Conséquence : `frontend/e2e/golden-path.spec.ts` n'est JAMAIS exécuté ; les sprints croient tester les parcours E2E alors qu'ils ne le font pas.

À faire : corriger le mode `e2e` pour invoquer `npm run test:e2e` (Playwright).

Critères d'acceptation :
- `./scripts/test-quiet.sh e2e` exécute effectivement `npm run test:e2e` (Playwright).
- Les autres modes (unitaires, etc.) continuent de fonctionner sans régression.
- `frontend/e2e/golden-path.spec.ts` est bien exécuté lors d'un appel à `./scripts/test-quiet.sh e2e`.

Risque : l'environnement Playwright (navigateurs installés, serveur de dev) doit être dispo là où `test-quiet.sh e2e` est appelé (local + CI), sinon le correctif fera échouer un gate qui « passait » silencieusement.

## Issue #133 — [CHORE] Câbler vitest dans test-quiet.sh frontend + vérifier la CI
`scripts/test-quiet.sh frontend` est actuellement un no-op : aucun runner vitest câblé. Les 12 tests frontend existants ne sont exécutés ni par l'outillage de sprint, ni de façon fiable par la CI (seul un job CI séparé les couvre).

À faire :
- Câbler `vitest run` dans la branche `frontend` (et/ou `e2e`) de `scripts/test-quiet.sh`.
- Vérifier que le job CI frontend exécute bien la suite vitest complète.
- S'assurer que l'échec d'un test vitest fait échouer le script (exit code propagé).

Critères d'acceptation :
- `scripts/test-quiet.sh frontend` exécute `vitest run` et affiche un résumé pass/fail.
- Un test vitest en échec fait sortir le script avec un code non-zéro.
- Le job CI frontend est vérifié pour confirmer qu'il exécute bien l'intégralité des tests existants.
- Documentation du wrapper de tests mise à jour si elle existe (HELP.md éventuel).

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_0207_0133:
  fichiers_cles: ["scripts/test-quiet.sh", ".github/workflows/ (CI frontend)", "frontend/package.json"]
  couches_touchees: ["devops"]
  strategie_test: "meta (run_frontend scope=frontend -> vitest ; scope=e2e -> playwright ; CI verte)"
  risque_regression: "séparer les 2 scopes SANS casser le skip explicite existant (test-quiet.sh:96-97) quand aucun runner ; la CI ne doit pas bloquer si e2e a besoin d'un backend up"
  ordre_ecriture: "devops (test-quiet.sh: scope frontend=npm test/vitest, scope e2e=npm run test:e2e -> CI)"
  etat_reel_du_code: |
    run_frontend (test-quiet.sh:87-100) lance 'npm test'=vitest pour scopes 'e2e|frontend' (l.116).
    package.json a bien test:e2e=playwright (l.13) mais JAMAIS appelé. Bug alias confirmé.
    #207 et #133 touchent le MÊME script -> fusionner le fix (séquentiel).
```

Point clé : aujourd'hui les scopes `e2e` ET `frontend` retombent tous deux sur `npm test` (vitest). Il faut les DISSOCIER :
- scope `frontend` → `vitest run` (unitaires frontend).
- scope `e2e` → `npm run test:e2e` (Playwright).
Ne PAS casser le comportement de skip explicite quand un runner est absent (voir test-quiet.sh:96-97). Vérifie les vrais numéros de ligne (le mini-plan peut avoir dérivé).

## Triage
Taille: S (fusion #207 S + #133 S)
Modèle: opus
Effort: high
