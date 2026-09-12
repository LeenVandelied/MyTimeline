# Mini-plans architect — Sprint 79

> Généré par `/sprint plan 5 -c "focus mvp"` (2026-09-06).

**Thème :** Causes racines du harnais E2E — cohésion 0.34
**Effort :** 8 points | **Migrations Flyway :** aucune
**Dépend de :** S78 (le reformatage prettier de #528 touche 10 specs e2e — l'absorber avant de réécrire les specs)
**Vagues :** V1 = #428 ‖ #475 · V2 = #463
**Exclusivité Playwright :** #475 en V1, #463 en V2. #428 se valide par test d'intégration, PAS par un run E2E.

```yaml
issue_428:
  fichiers_cles:
    - "backend/src/main/resources/application-dev.properties:35"
    - "backend/src/main/resources/application-prod.properties:47  (modèle à copier)"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (test Spring : résolution du placeholder + liste multi-origines)"
  risque_regression: "Élargir la liste au-delà du profil dev ouvrirait le CORS en prod. Le profil prod lit déjà ${CORS_ALLOWED_ORIGINS:} — NE PAS y toucher."
  ordre_ecriture: "application-dev.properties → test d'intégration → doc (.env.example / playwright.config.ts)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ, littéralement. application-dev.properties:35 =
    `app.cors.allowed-origins=http://localhost:3000` — valeur unique, aucun placeholder.
    Le profil prod utilise DÉJÀ la forme cible (`${CORS_ALLOWED_ORIGINS:}`,
    application-prod.properties:47) : le correctif consiste à transposer ce motif en dev
    avec un défaut non vide.
    PIT-S55-001 s'applique en sens inverse : le défaut DOIT rester `http://localhost:3000`
    pour ne rien casser, mais le placeholder doit permettre la surcharge.

issue_475:
  fichiers_cles:
    - "frontend/e2e/support/accounts.ts:294-311  (SHARED, PWD, DEL, PROD → ALL_ACCOUNTS)"
    - "frontend/e2e/auth.setup.ts"
    - "frontend/e2e/golden-path.spec.ts:69  (self-register, le 5e)"
    - "backend/.../infrastructure/security/RateLimitingFilter.java:108"
  couches_touchees: ["frontend", "infrastructure"]
  strategie_test: "E2E (run complet) + integration backend si la piste retenue est un seuil dédié au profil e2e"
  risque_regression: "Mutualiser SHARED et PROD réintroduirait exactement l'entrelacement que le commentaire d'accounts.ts:306 dit avoir voulu éviter — et casserait #463 avant même de l'avoir traitée."
  ordre_ecriture: "décider la piste → backend (si seuil e2e) → accounts.ts/auth.setup.ts → run E2E complet"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ, les deux moitiés du calcul.
    - RateLimitingFilter.java:108 : Map.entry("POST /api/auth/register", 5).
    - accounts.ts:311 : ALL_ACCOUNTS = [SHARED, PWD, DEL, PROD] → 4, plus le self-register
      du golden-path (golden-path.spec.ts:69) = 5.
    Budget consommé à 100 % EXACTEMENT, comme annoncé. L'en-tête d'accounts.ts (L11-19)
    porte déjà l'avertissement « ne pas en ajouter sans recompter ».
    PISTE À ÉCARTER D'OFFICE : « exempter l'IP du runner » — le job e2e tourne déjà sur une
    IP unique, l'exemption désarme le filtre qu'on prétend tester.

issue_463:
  fichiers_cles:
    - "frontend/e2e/support/accounts.ts:308  (PROD)"
    - "16 specs consommatrices, liste MESURÉE : categories, golden-path, products,
       sprint-42-events, sprint-61-archived-events, sprint-62-control-focus-contrast,
       sprint-62-select-focus-indicator, sprint-63-de-overflow-audit,
       sprint-66-mobile-create-event, sprint-66-mobile-keyboard,
       sprint-70-create-preview-pinned, sprint-70-preview-visual,
       sprint-71-edit-preview-pinned, sprint-73-model-vs-rendered,
       timeline-mobile, timeline"
  couches_touchees: ["frontend"]
  strategie_test: "E2E — run complet PLUS un run en ordre inversé, sinon la correction n'est pas prouvée"
  risque_regression: "Un compte par fichier de test multiplierait les register par 16 → collision frontale avec #475, traité juste avant dans le même sprint. La piste viable est le namespacing par test ou le nettoyage post-test, PAS la multiplication des comptes."
  ordre_ecriture: "inventaire (déjà fait ci-dessus) → stratégie → accounts.ts/support → migration des 16 specs → 2 runs (nominal + inversé)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ et ÉLARGI. Le corps de l'issue cite 4 specs « et probablement d'autres » ;
    la mesure (`grep -rln PROD frontend/e2e/*.ts`) en donne 16. Ampleur réelle = 4×
    l'estimation. Le Size M ne tient que si la piste retenue est un préfixe unique par test
    (changement mécanique) et non un compte par fichier.
    NE PAS CONFONDRE AVEC #469 (S65) : celle-là a résolu la course d'IDENTITÉ entre workers
    (graine E2E_RUN_ID posée par global-setup.ts). #463 porte sur l'état MÉTIER laissé en
    base par un test pour le suivant. Problèmes voisins, causes différentes.
    CONFLIT DE VAGUE : accounts.ts et auth.setup.ts partagés avec #475 → vague 2 obligatoire.
```
