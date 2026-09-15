# Issue #470 — `test:e2e` sans `--pass-with-no-tests`

## Inventaire appelants réels (grep large, scripts/**, Makefile/justfile inexistants)
- `.github/workflows/ci.yml:477` — job `e2e` passe 1 : `npm run test:e2e -- --output=...`, AUCUN filtre.
- `scripts/test-quiet.sh:232` — `run_e2e()` local : `npm run test:e2e`, AUCUN filtre. **Non listé par le lead, trouvé au grep.**
- Passe 2 CI (`ci.yml:513`) : `npx playwright test auth.setup.ts auth-signature.spec.ts` — binaire direct, PAS le script npm, non concernée.
- Mentions doc seules (pas d'exécution) : `playwright.config.ts` (commentaire, corrigé), `e2e/README.md:29`, `pr-sprint.md:81`, `docs/memory/**`.

Aucun appelant réel ne passe de filtre de sélection : le cas « 0 test sélectionné » ne se produit
nulle part aujourd'hui. Le cas légitime d'origine (#29, dépôt à 0 spec) n'a plus cours : 28 fichiers
`*.spec.ts`, 240 tests.

## Décision : drapeau RETIRÉ
`frontend/package.json:13` : `"test:e2e": "playwright test"` (sans `--pass-with-no-tests`).
Raison : aucun cas actuel ne le justifie, et il masquait exactement le risque de l'issue (suite vide
= vert silencieux). AC #3 l'exige explicitement.

`frontend/playwright.config.ts:1-17` — en-tête corrigé : ne dit plus « sans spec, Playwright sort 0 »
(faux depuis ce commit), documente #470 et le risque qu'il fermait.

## Preuve (pas de run complet, interdit par le briefing)
`SKIP_DELEGATION=1 NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 rtk proxy npx playwright test --list`
→ `Total: 240 tests in 29 files`. Confirme : sélection non vide, config valide, aucun test exécuté.

(Note : `rtk proxy npx playwright test --list` nécessaire — le wrapper RTK nu tronque/mal-parse la
sortie `--list` en `PASS (0) FAIL (0)`, à ne pas confondre avec une vraie suite vide — piège
tooling à signaler.)

## Fichiers touchés
- `frontend/package.json` (1 ligne)
- `frontend/playwright.config.ts` (en-tête, 1 bloc commentaire)

## Recommandations suite

- Aucun `RECOMMAND_*` : périmètre XS clos. Le drapeau est retiré, les appelants sont inventoriés
  (`ci.yml:477`, `scripts/test-quiet.sh:232` — aucun ne passe de filtre pouvant sélectionner
  0 test), et l'en-tête de `playwright.config.ts` ne prétend plus que la config doit tourner sans
  spec.
- Pas de `RECOMMAND_TEST_RUNNER` : la preuve demandée par l'issue est un **listing**
  (`Total: 240 tests in 29 files`, 0 exécution), pas un run. La suite complète a par ailleurs été
  jouée par le lead après ce commit (232 passed / 0 failed).
- Pas de `RECOMMAND_DB_EXPERT`, `RECOMMAND_SECURITY` ni `RECOMMAND_UI_DESIGN` : changement
  d'outillage, aucun schéma, aucune surface d'auth, aucune surface visuelle.
- **[MEMORY:pitfall]** signalé : un listing Playwright `--list` lancé sans `rtk proxy` sort en
  `PASS (0) FAIL (0)` — confondable avec une vraie suite vide, soit exactement le faux signal que
  cette issue élimine par ailleurs.

STATUS: COMPLETED
