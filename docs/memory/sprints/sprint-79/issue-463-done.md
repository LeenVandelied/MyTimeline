# Issue #463 — Le compte `PROD` partagé rend les specs E2E dépendantes de l'ordre

Sprint 79, vague 2. Agent : fullstack-dev.

fichiers de contexte lus : briefing (cp-frontend.md, cp-backend.md inlinés),
`frontend/e2e/support/accounts.ts`, `frontend/e2e/support/products.ts`,
`frontend/e2e/support/timeline-lanes.ts`, `frontend/playwright.config.ts`,
`docker-compose.yml`, `backend/.../CategoryController.java`,
`backend/.../CategoryServiceImpl.java`, `backend/.../ProductRepositoryJpaImpl.java`,
`backend/.../ProductController.java`, `frontend/src/__tests__/e2e-register-budget.test.ts`.
(`pit-frontend.md` / `br-events.md` NON ouverts — les pièges cités par le briefing
étaient déjà repris in extenso dans les en-têtes de `playwright.config.ts` et
`accounts.ts`.)

## 1. Inventaire (critère 1)

16 specs consommatrices de `PROD` (mesure du lead reprise et vérifiée), dont **15**
sèment réellement via `seedCategory`/`seedProduct` ; `golden-path.spec.ts` cite `PROD`
en commentaire mais s'auto-inscrit et sème en API brute — hors périmètre.

Comptage `test(` de premier niveau : 4+3+3+6+5+5+1+3+2+3+3+1+3+15+29 = **86 tests**
sur les 15 specs migrées (le briefing annonçait ~88 : l'écart vient des `test(`
imbriqués dans des boucles de `describe`).

## 2. Stratégie retenue et rejets (critère 2)

**RETENUE — nettoyage systématique post-test.** Seule des trois à borner l'état VU
par le test suivant. Le compte `PROD` d'un run est neuf (identités dérivées de
`E2E_RUN_ID`), donc purger après chaque test ramène le compte à son état initial.

**ÉCARTÉE — un compte dédié par fichier.** Ne corrige pas le défaut décrit : la
dépendance est intra-fichier (29 tests dans `timeline.spec.ts`, 15 dans
`timeline-mobile.spec.ts`), des comptes par fichier la laisseraient intacte.
(Le rate-limit n'est PAS l'argument : plafond `e2e` à 20/min depuis #475, et le job
CI pose `RATE_LIMIT_ENABLED=false`.)

**ÉCARTÉE — espace de noms unique par test : ELLE EST DÉJÀ EN PLACE et n'a rien
empêché.** `unique()` suffixe déjà 89 semis d'un horodatage. Elle n'a évité ni le
débordement de lanes de #467 (76/77/99 lanes mesurées) ni l'incident du S73. Raison :
le namespacing supprime les COLLISIONS DE NOM, pas la VISIBILITÉ — une lane au nom
unique reste une lane de plus dans la frise, un produit unique une option de plus
dans le `<Select>`. #463 est un défaut de visibilité.

## 3. Implémentation

- `frontend/e2e/support/seed-cleanup.ts` (NEW) — registre de semis + purge.
- `frontend/e2e/support/fixtures.ts` (NEW) — `test` étendu, fixture `auto`.
- `frontend/e2e/support/products.ts` — `seedCategory`/`seedProduct` appellent `trackSeed`.
- 15 specs — **une ligne d'import chacune**, aucun corps de test touché.
- `frontend/e2e/support/timeline-lanes.ts` — retrait d'un blocage périmé (voir §6).

## 4. Les deux runs, en chiffres (critère 3)

Recette : backend conteneur `mt79-463` sur `:8086` (`RATE_LIMIT_ENABLED=false`),
`npx next dev -p 3000` (webpack), oracle `curl /api/auth/me` -> **401**.
Chaque log ne contient qu'UN bloc `Running 318 tests using 2 workers` (contrôle
anti-run-concurrent de #469).

| run                       | ordre                         | passed  | failed | skipped | durée    |
| ------------------------- | ----------------------------- | ------- | ------ | ------- | -------- |
| 0 — BASELINE (fix stashé) | nominal                       | 297     | **12** | 9       | 5 min 49 |
| 1 — avec correctif        | nominal                       | **299** | 10     | 9       | 5 min 30 |
| 2 — avec correctif        | **fichiers en ordre inversé** | **299** | 10     | 9       | 5 min 57 |

Les **10 échecs communs aux trois runs** sont `sprint-77-theme-visual.spec.ts:519`
« capture de référence » : références visuelles absentes pour `chromium-darwin`
(elles n'existent que pour la plateforme CI). Pré-existants, hors périmètre, et
identiques avant/après.

Les **2 échecs qui DISPARAISSENT** entre run 0 et runs 1-2 :
`sprint-62-select-focus-indicator.spec.ts:551` (dark) et
`sprint-77-theme-visual.spec.ts:559`.

Runs 1 et 2 : **jeu d'échecs strictement identique**.

⚠ **Limite de méthode, assumée.** Playwright 1.61.1 n'expose aucun ordonnanceur
(`--shuffle` n'existe pas, et l'ordre des fichiers passés en CLI est ignoré : vérifié
par contrôle négatif). Le run 2 inverse l'ordre des **fichiers** (37 specs renommées
par préfixe numérique inverse le temps du run, puis restaurées). L'ordre **intra**-fichier
n'a PAS été permuté — c'est la dimension que le §5 couvre structurellement.

## 5. Prémisse de l'énoncé : **CONFIRMÉE**

Deux mesures indépendantes, pas une impression.

**(a) L'accumulation, comptée en base** (`psql` sur la DB e2e, en fin de run) :

| run           | produits total | produits VISIBLES | catégories |
| ------------- | -------------- | ----------------- | ---------- |
| 0 — baseline  | 84             | **81**            | **88**     |
| 1 — correctif | 84             | **0**             | 7          |
| 2 — correctif | 84             | **0**             | **2**      |

(7 -> 2 : la poubelle de purge portait d'abord `TEST_WORKER_INDEX`, qui grimpe quand
Playwright recycle un worker — 6 poubelles pour 2 workers. Nom fixe depuis.)

**(b) Le test sensible à l'ordre, isolation vs suite** —
`sprint-62-select-focus-indicator.spec.ts` (25 tests) :

| arbre     | isolation     | suite complète             |
| --------- | ------------- | -------------------------- |
| baseline  | **25 passed** | **1 failed** (`:551` dark) |
| correctif | 25 passed     | 25 passed (runs 1 ET 2)    |

C'est exactement la signature décrite par l'issue : vert seul, rouge en suite.

⚠ **Piège de méthode du S73, traité explicitement.** Un run isolé retire la charge
POLLUANTE (les semis des 15 autres specs), pas seulement la charge — donc à lui seul
il ne prouverait rien. C'est la mesure (a) qui tranche : 81 produits visibles laissés
en fin de run baseline contre 0 avec le correctif. Le mécanisme est nommé et compté,
pas déduit d'un vert.

`timeline.spec.ts:1616` (#451, 6 tests) : **passe dans les 3 runs et en isolation**.
Il n'a jamais été rouge sur cette machine — la spec liée à #451 n'est donc pas
l'instance qui démontre le défaut ici ; `sprint-62-select-focus-indicator` l'est.

## 6. Découvertes de mesure

**(A) Un produit archivé bloque encore la suppression de sa catégorie.**
La première version du module archivait les produits puis supprimait les catégories,
en s'appuyant sur `@SQLRestriction("archived = false")`. **4 tests rouges au premier
run** : `DELETE /api/categories/{id}` rend **409**. Cause : `CategoryServiceImpl`
compte via `ProductRepositoryJpaImpl.countByCategoryId`, une requête **SQL NATIVE**
(`SELECT count(*) FROM products WHERE category_id = :cat`) à laquelle le
`@SQLRestriction` ne s'applique pas. Une catégorie ayant un jour porté un produit
n'est donc PLUS supprimable par l'API. Parade : `?reassignToCategoryId=<poubelle>`
(`updateCategoryForProducts`, native elle aussi, déplace les archivés).

**(B) Un blocage périmé recopié dans `timeline-lanes.ts`.** Son en-tête annonçait le
semis isolé « bloqué par le rate-limit register (5/min/IP) ». Faux deux fois depuis
#475 (plafond `e2e` 20/min) et `RATE_LIMIT_ENABLED=false` en CI. Corrigé.

## 7. Ce que je n'ai PAS vérifié

- **La CI.** Zéro run CI. Les 3 runs sont locaux, `workers: 2` ; la CI tourne à
  `workers: 1` sur un autre OS. Les 10 échecs `sprint-77` sont d'ailleurs un artefact
  de plateforme locale.
- **Firefox.** Les 3 runs sont `chromium` (projet `firefox` non exécuté).
- **L'ordre intra-fichier.** Non permuté (impossible sans réécrire les specs) — voir §4.
- **Le résidu `Cat Create …`** : les catégories créées à la SOURIS ne sont pas tracées
  (1 par run). Documenté dans `seed-cleanup.ts`, non corrigé.
- **La cause racine de la mort du `next dev`** héritée de #465 : non cherchée.
- **Les tests backend** : non lancés (aucun fichier backend modifié).
- **La stabilité du garde-fou de purge** : il n'a rougi qu'une fois (le 409 du §6A) ;
  je n'ai pas construit de contrôle négatif dédié qui l'arme volontairement.

## 8. Signaux mémoire

[MEMORY:pitfall] Context: E2E #463 — purge post-test des catégories semées sur le compte partagé.
Solution: `DELETE /api/categories/{id}?reassignToCategoryId=<poubelle>` au lieu du DELETE nu.
Prevention: `@SQLRestriction("archived = false")` NE protège PAS d'une requête SQL NATIVE.
`CategoryServiceImpl.deleteCategory` compte les produits via `countByCategoryId`, native :
les produits ARCHIVÉS y comptent encore, donc une catégorie ayant porté un produit rend 409
pour toujours. Soft delete + comptage natif = suppression parente impossible ; le vérifier
sur la requête, pas sur l'annotation.

[MEMORY:decision] Context: #463, trois stratégies d'isolation proposées par l'énoncé.
Decision: nettoyage post-test, branché sur `seedCategory`/`seedProduct` + fixture Playwright
`auto` (`e2e/support/fixtures.ts`), 1 ligne d'import par spec.
Why: les comptes par fichier ne corrigent pas la dépendance INTRA-fichier (29 tests dans
`timeline.spec.ts`) ; le namespacing par test était DÉJÀ en place (89 appels à `unique()`)
et n'a empêché ni #467 ni l'incident du S73, parce qu'il supprime les collisions de NOM et
non la VISIBILITÉ. Mesure : 81 produits visibles + 88 catégories laissés en fin de run
baseline -> 0 + 2 avec le correctif.

[MEMORY:pattern] Problem: instrumenter ~86 tests E2E sans réécrire 86 corps de tests.
Solution: quand tout le semis passe par 2 ou 3 helpers, instrumenter les helpers et brancher
un registre de module sur une fixture `auto` d'un `test` étendu. Playwright n'exécute qu'UN
test à la fois par worker (process distinct) : une variable de module est un registre par-test
sûr, y compris à `workers: 2` — chaque worker ne purge que SES entrées sur le compte partagé.
Anti-pattern: `afterEach` recopié dans chaque spec (86 emplacements à maintenir), ou purge
« tout le compte » qui détruirait les données du test concurrent de l'autre worker.

[MEMORY:pitfall] Context: prouver la correction d'une dépendance à l'ordre sous Playwright 1.61.
Solution: l'ordre n'est pas pilotable (`--shuffle` inexistant, ordre des fichiers en CLI ignoré —
Playwright trie par chemin) ; inverser l'ordre des FICHIERS se fait en les renommant par préfixe
numérique inverse le temps du run. L'ordre intra-fichier reste hors de portée.
Prevention: ne pas promettre un « run en ordre inversé » comme si un flag l'offrait ; adosser la
preuve à une mesure d'ÉTAT (comptage en base de ce que la suite laisse derrière), qui couvre
l'intra-fichier que la permutation n'atteint pas.

## 9. Recommandations

- **RECOMMAND_FOLLOWUP** — tracer les catégories créées à la SOURIS (résidu
  `Cat Create …`, 1/run). Demande de toucher les corps de tests : hors périmètre de #463.
- **RECOMMAND_FOLLOWUP** — `sprint-77-theme-visual.spec.ts` n'a de références que pour
  la plateforme CI : 10 échecs systématiques sur tout run local macOS. Soit `skip` hors
  CI, soit références par plateforme committées.
- **Pas de RECOMMAND_DB_EXPERT** : aucun fichier backend ni migration touché ; le 409
  du §6A est un comportement backend CORRECT, contourné côté test.
- **Pas de RECOMMAND_TEST_RUNNER** : les 3 runs complets + 3 runs ciblés ont été
  exécutés ici, chiffres au §4.
- **Pas de RECOMMAND_SECURITY** : aucune surface d'auth/permission modifiée (le
  nettoyage passe par les endpoints existants, avec les cookies du compte de test).

STATUS: COMPLETED
