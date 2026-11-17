# Mini-plans architect — Sprint 80

> Généré par `/sprint plan 5 -c "focus mvp"` (2026-09-06).

**Thème :** Rendre le gate e2e crédible — cohésion 0.30
**Effort :** 10 points | **Migrations Flyway :** aucune
**Dépend de :** S79 — #476 exige explicitement #475 traité ; tout diagnostic de flake est confondu tant que #463 n'est pas livrée.
**Vagues :** V1 = #472 · V2 = #476 · V3 = #408 (trois vagues séquentielles : `playwright.config.ts` partagé + exclusivité Playwright)

```yaml
issue_472:
  fichiers_cles:
    - "frontend/e2e/sprint-62-select-focus-indicator.spec.ts  (28 Ko, SEULE spec du projet firefox)"
    - "frontend/e2e/categories.spec.ts"
    - "frontend/playwright.config.ts:247-249  (projet firefox, testMatch restreint)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E — plusieurs runs COMPLETS consécutifs ; un run vert isolé ne prouve rien"
  risque_regression: "PAT-S72-002 a une prémisse tacite (cf. mémoire « isolation verte ≠ flaky résolu ») : rejouer la spec seule retire la charge ET les specs polluantes. La preuve exige un run COMPLET répété, pas un rejeu ciblé."
  ordre_ecriture: "reproduire (runs répétés) → diagnostiquer → corriger → 3+ runs complets consécutifs"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    PRÉMISSE STRUCTURELLE CONFIRMÉE (pas les taux de flake, non mesurables sans run).
    playwright.config.ts:247-249 : projet `firefox` avec
    testMatch: /sprint-62-select-focus-indicator\.spec\.ts/ — restriction toujours en place.
    L'affirmation de l'issue « si cette spec est instable, TOUTE la couverture Gecko l'est »
    est donc exacte au 2026-09-06.
    Les deux specs existent (28,1 Ko et 6,9 Ko). Le job CI e2e installe bien chromium + firefox.
    NON VÉRIFIÉ : les taux 2/5 et 1/5 annoncés. Ils demandent des runs réels non joués.

issue_476:
  fichiers_cles:
    - "frontend/playwright.config.ts  (workers: process.env.CI ? 1 : 2)"
    - ".github/workflows/ci.yml  (job e2e, L118+)"
  couches_touchees: ["ci", "frontend"]
  strategie_test: "E2E en CI — 2 runs consécutifs verts minimum, durées consignées"
  risque_regression: "Passer la CI à 2 workers avec le budget register encore au plafond (#475) produit un 429 dont le SYMPTÔME est un timeout sur /login — diagnostic faux garanti. D'où la dépendance dure sur S79."
  ordre_ecriture: "vérifier que #475 est livrée → PR jetable workers:2 → 2 runs CI → décision documentée → merge ou abandon"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ. playwright.config.ts porte toujours `workers: process.env.CI ? 1 : 2`.
    Le commentaire #469 documente honnêtement une inconnue TOUJOURS OUVERTE :
    « LA CAUSE RACINE DE CETTE MORT [du next dev à workers élevés] N'EST TOUJOURS PAS CONNUE ».
    À traiter comme un risque du sprint, pas comme un acquis.
    Le critère « le budget register est traité en premier » est une dépendance inter-sprint,
    pas une case à cocher : la VÉRIFIER avant de briefer.
    INTERDICTION EXPLICITE : « rebaisser la valeur en silence » n'est pas une conclusion
    acceptable — l'issue demande une démonstration OU un écartement argumenté.

issue_408:
  fichiers_cles:
    - ".github/workflows/ci.yml  (job e2e)"
    - "branche jetable — AUCUN fichier du dépôt ne doit être modifié durablement"
  couches_touchees: ["ci"]
  strategie_test: "manuel (observation du mergeStateStatus GitHub)"
  risque_regression: "Aucun sur le code. Risque procédural : oublier de fermer la PR et de supprimer la branche jetable."
  ordre_ecriture: "branche jetable → casser une assertion existante → PR vers dev → constater le blocage → fermer PR + supprimer branche"
  zod_dto_sync: "NON"
  possibly_done: "à déterminer par fullstack-dev"
  etat_reel_du_code: |
    NON VÉRIFIABLE DEPUIS LE CODE — c'est une preuve d'exploitation GitHub, pas un défaut
    de fichier. Le job `e2e` existe bien (ci.yml:118). La liste des required checks n'est
    pas lisible dans le dépôt ; mémoire projet : 4 requis (backend / frontend / e2e / ai-env-packs).
    EXIGENCE DE PREUVE : capturer le `mergeStateStatus` bloquant, PAS une capture d'écran
    du bouton grisé (qui peut l'être pour une autre raison).
    Baseline verte stable requise → vague 3, après #472 et #476.
```
