# Mini-plans architect — Sprint 78

> Généré par `/sprint plan 5 -c "focus mvp"` (2026-09-06). Lu par `/sprint start` Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section « ## Plan d'implémentation »).

**Thème :** Les gates de vérification mentent — cohésion 0.28 (WARNING assumé, DEC-S57-003)
**Effort :** 5 points | **Migrations Flyway :** aucune | **Dépend de :** rien (racine)
**Vagues :** V1 = #528 ‖ #434 · V2 = #169
**Exclusivité Playwright :** #528 uniquement (le reformatage touche 10 specs e2e).

```yaml
issue_528:
  fichiers_cles:
    - ".github/workflows/ci.yml"
    - "frontend/package.json"
    - "frontend/src/**  (94 fichiers non conformes)"
    - "frontend/e2e/**  (10 fichiers non conformes)"
  couches_touchees: ["ci", "frontend"]
  strategie_test: "unit+E2E (non-régression après reformatage massif)"
  risque_regression: "prettier-plugin-tailwindcss réordonne les classes Tailwind — un ordre modifié peut changer la cascade et casser une comparaison visuelle (sprint-76-legal-visual, sprint-77-theme-visual)."
  ordre_ecriture: "décision → reformat → câblage CI → run des specs visuelles"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    MESURÉ (architect + contre-mesure lead, 2026-09-06).
    `grep -c format:check .github/workflows/ci.yml` = 0 → le gate n'existe pas en CI
    (jobs présents : backend, frontend, e2e, flyway-smoke, security, secret-scan, ai-env-packs).
    `rtk proxy npx prettier --check src e2e` → EXIT 1, « Code style issues found in 104 files ».
    La dette n'est PAS les 2-3 fichiers cités par le corps de l'issue : elle est de 104 fichiers.
    PIÈGE CONFIRMÉ EN DIRECT : un appel via `... | tail -15` affiche « All files formatted
    correctly » avec exit 0 — c'est le code de `tail`, et le hook RTK filtre la sortie.
    Mesurer via `rtk proxy` + `$?` immédiat, jamais derrière un pipe.
    #510 était le MÊME défaut : fermée comme doublon de celle-ci le 2026-09-06.

issue_434:
  fichiers_cles:
    - "scripts/test-quiet.sh  (run_frontend, ~L200-225 ; case SCOPE ~L250)"
    - "README.md"
  couches_touchees: ["ci"]
  strategie_test: "manuel (exécuter les 5 scopes) — pas de test automatisé du script"
  risque_regression: "Option 1 (étendre le scope) rallonge fortement `frontend` (build Next) et peut faire échouer les briefings de sprint qui l'appellent en boucle ; option 2 (renommer en frontend-unit) casse tous les appels existants du scope `frontend`."
  ordre_ecriture: "décision documentée → script → README/briefings"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ. `run_frontend()` n'exécute que `npm test --silent` (Vitest). Aucun typecheck,
    lint ni build.
    NUANCE NON DITE PAR L'ISSUE : le script a gagné depuis #308 un préflight substantiel
    (résolution des paquets importés par eslint.config.mjs, détection node_modules absent/vide)
    — le scope n'est pas « nu », il est incomplet au sens annoncé. Le README a été corrigé
    au S60 ; le script documente honnêtement son périmètre en en-tête (L18-20).
    Le scope `coverage` contient déjà un branchement conditionnel `grep -q jacoco backend/pom.xml`
    → il s'active tout seul quand #169 livre.
    CONTRAINTE DE VAGUE : ne PAS toucher `frontend/package.json`, sinon conflit avec #528.

issue_169:
  fichiers_cles:
    - "backend/pom.xml"
    - "frontend/vitest.config.ts"
    - ".github/workflows/ci.yml  (jobs backend + frontend)"
  couches_touchees: ["ci", "backend", "frontend"]
  strategie_test: "manuel (artefacts téléchargeables depuis un run CI)"
  risque_regression: "L'agent JaCoCo s'attache à argLine ; le backend utilise Testcontainers — un argLine surchargé sans concaténer l'existant casse TOUTE la suite backend. Mode d'échec classique."
  ordre_ecriture: "pom.xml → vitest.config.ts → ci.yml (upload artefacts)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ. `grep -n jacoco backend/pom.xml` → 0 match. Aucune option `coverage` dans
    frontend/vitest.config.ts.
    Le scope `coverage` de scripts/test-quiet.sh est déjà écrit pour ce jour-là (L~253 :
    si jacoco présent → `test jacoco:report`, sinon message ℹ).
    Pas de seuil bloquant demandé — NE PAS en ajouter.
    Conflit `ci.yml` + `frontend/package.json` avec #528, et `scripts/test-quiet.sh` avec #434
    → vague 2 obligatoire.
```
