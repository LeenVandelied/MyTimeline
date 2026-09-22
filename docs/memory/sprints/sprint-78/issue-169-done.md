# Issue #169 — Couverture de tests mesurable : JaCoCo + vitest --coverage en CI

## Commits
62a5b71 — :construction_worker: chore(ci): rend la couverture de tests mesurable (JaCoCo + vitest --coverage)

## Résumé
Backend : `jacoco-maven-plugin` 0.8.13 dans `backend/pom.xml`. Version ÉPINGLÉE en
`<properties>` — le parent `spring-boot-starter-parent` 3.5.16 ne la gère pas (vérifié :
zéro occurrence `jacoco` dans son pom). 2 exécutions : `prepare-agent` (phase défaut
`initialize`) + `report` liée explicitement à `verify`, la phase que lance déjà la CI.
AUCUN `<argLine>` littéral ajouté à surefire → l'agent reste attaché ET `-Dapi.version`
(Testcontainers) survit. Preuve : `argLine set to -javaagent:…` en ligne 9 du log, 566
tests verts.
Frontend : provider `v8` (pas istanbul — aucune transfo de bundle, aucun coût sur la
durée). Reporters `text-summary` + `lcov`. Script `test:coverage` = `vitest run --coverage` ;
`npm test` INCHANGÉ pour la boucle rapide.
CI : step `Tests (Vitest)` → `npm run test:coverage` (même suite, même exit code, suite
NON jouée 2 fois) + 2 steps `upload-artifact` sur le SHA v4 déjà épinglé par le job e2e.
Chemins `backend/target/site/jacoco/` et `frontend/coverage/` : relatifs à la RACINE du
dépôt, PAS au `working-directory` du job (`defaults.run` ne s'applique qu'aux steps `run:`).
`if-no-files-found: error` SANS `if: always()` — tranché : le step ne tourne qu'après une
suite verte, donc son échec ne peut vouloir dire qu'une chose (suite verte + aucun rapport
= câblage cassé). Avec `always()`, un test rouge déclencherait la même erreur et noierait
le signal.
NON FAIT délibérément : aucun seuil bloquant (pas de goal `check`, pas de `<limit>`/`<rule>`,
pas de `thresholds` vitest), aucun service externe, aucun test existant modifié, aucun
`<excludes>` JaCoCo (mesurer le module tel quel plutôt que choisir le chiffre qu'on veut lire).
Première mesure : backend 90,49 % instr. / 72,18 % branches (151 classes) ; frontend
70,77 % statements / 85,33 % branches.
Pièges : (1) le mini-plan architect ET l'issue nomment `vitest.config.ts` — le fichier est
`.mts`, aucun `.ts` n'existe. (2) le briefing annonçait vitest `^2.1.9` : l'installé est
**3.2.7**, provider aligné en `^3.2.7` (un `^2` aurait cassé le run). (3) `scripts/test-quiet.sh`
portait un commentaire périmé « pas de plugin jacoco à ce jour » — SEUL ce commentaire a été
retouché, le branchement arbitré par #434 est inchangé.

## Tests
`./mvnw --batch-mode --no-transfer-progress verify` → EXIT=0 → BUILD SUCCESS, Tests run: 566, Failures: 0, Errors: 0 (Docker 29.2.1 présent, Testcontainers OK)
`./mvnw --batch-mode --no-transfer-progress jacoco:report` (goal direct, après avoir écarté le rapport) → EXIT=0 → rapport régénéré : prouve que le scope `coverage` de test-quiet.sh fonctionne
`./mvnw help:effective-pom` → EXIT=0 → jacoco 0.8.13, 2 exécutions liées ; `grep -c argLine` sur l'effective-pom = **0** (aucun override littéral nulle part)
`npm run test:coverage` → EXIT=0 → 113 fichiers / 1313 tests passés + résumé de couverture
`./scripts/test-quiet.sh frontend` (build → vitest → typecheck → lint) → EXIT=0 → build réel 52/52 pages, 1313 tests, 0 warning ESLint
`npm run format:check` → EXIT=0 → All matched files use Prettier code style
`node js-yaml` sur ci.yml → EXIT=0 → 7 jobs intacts, les 2 steps artifact ont bien `path=backend/target/site/jacoco/` et `path=frontend/coverage/`, `if-no-files-found=error`
Toutes les commandes ci-dessus passées via `rtk proxy`, sans pipe, exit code lu immédiatement.

Preuve d'existence des rapports :
`-rw-r--r--@ 1 herrh staff  17111 Sep  6 13:01 backend/target/site/jacoco/index.html`
`-rw-r--r--@ 1 herrh staff 243085 Sep  6 13:00 frontend/coverage/lcov.info`
Les deux chemins sont déjà gitignorés (`git status --porcelain` sur les deux → vide).

## Non vérifié / assumé
Le TÉLÉCHARGEMENT effectif des 2 artefacts n'est PAS vérifié et ne peut pas l'être ici : aucune CI ne tourne sur les branches de sprint (PIT-S64-008), le premier run réel sera l'ouverture de la PR. Ce qui est prouvé : les rapports sont produits, les `path:` correspondent exactement aux chemins produits vus depuis la racine du dépôt, le YAML parse. Le 3e critère d'acceptation reste à constater sur le premier run de la PR.
Non mesuré : le comportement des 2 steps en cas d'échec (que `if-no-files-found: error` rende bien le step rouge) — raisonné depuis la doc de l'action, jamais déclenché.
Non mesuré : le surcoût en durée du job `frontend` dû à `--coverage` (mesure locale seule, machine chargée par le run Maven en parallèle : chiffre non comparable).
Le rapport frontend inclut des fichiers de config racine (`commitlint.config.cjs`, …) chargés pendant les tests : le 70,77 % est un chiffre BRUT de référence, pas une cible.
Laissé en place : `backend/target/site/jacoco-BAK-169/` (copie écartée pendant le test du goal direct) — dans `target/`, gitignoré, effacé par le prochain `mvn clean`.
E2E non lancés (réservés au lead, Phase 6).

## Signaux mémoire
[MEMORY:decision] Couverture = MESURE seule (aucun seuil JaCoCo `check` ni `thresholds` vitest) : l'issue #169 demande explicitement de mesurer avant d'imposer un plancher ; un seuil ajouté ici deviendrait un gate de merge surprise.
[MEMORY:decision] `upload-artifact` sans `if: always()` mais avec `if-no-files-found: error` : le step ne tourne qu'après une suite verte, donc son échec a un sens unique (câblage cassé) ; `always()` ferait rougir ce step sur tout simple test rouge et noierait le signal.
[MEMORY:pitfall] Le `path:` d'`actions/upload-artifact` est relatif à la RACINE du dépôt et IGNORE le `defaults.run.working-directory` du job (qui ne s'applique qu'aux steps `run:`) : un chemin relatif au working-directory produit un artefact VIDE sans faire rougir le job.
[MEMORY:pitfall] `jacoco:prepare-agent` pose la propriété Maven `argLine` ; tout `<argLine>` littéral ajouté à maven-surefire-plugin la remplace et détache l'agent (rapport 0 %) tout en pouvant priver le JVM forké de `-Dapi.version`, ce qui fait tomber toute la suite Testcontainers. Si un `<argLine>` devient nécessaire, il DOIT contenir `@{argLine}`.
[MEMORY:pitfall] `spring-boot-starter-parent` 3.5.16 ne gère PAS `jacoco-maven-plugin` (zéro occurrence dans son pom) : omettre `<version>` casse le build. Vérifier la gestion par le parent avant d'omettre une version, au lieu de la supposer depuis le style des autres plugins du pom.
[MEMORY:pitfall] Le briefing #169 annonçait vitest `^2.1.9` alors que `frontend/package.json` porte `^3.2.7` (installé 3.2.7) : un `@vitest/coverage-v8@^2` aligné sur l'énoncé aurait échoué avec un message ne parlant pas de version. Lire la version RÉELLE (`require('vitest/package.json').version`) avant d'aligner un plugin de provider — récurrence de PIT-S71-001 sur un chiffre plutôt que sur un inventaire.

## Recommandations suite
Pas de RECOMMAND_DB_EXPERT car aucune migration Flyway ni requête SQL n'est touchée par cette issue.
Pas de RECOMMAND_TEST_RUNNER car les deux suites ont été jouées intégralement ici, vertes, exit code lu (backend 566, frontend 1313).
Pas de RECOMMAND_SECURITY_EXPERT car aucune surface d'authentification, de donnée personnelle ni d'API externe n'est touchée.
Pas de RECOMMAND_UI_DESIGN car aucun composant ni token visuel n'est touché.
RECOMMAND_FOLLOWUP: constater sur le premier run de la PR que les 2 artefacts (`jacoco-coverage-report`, `vitest-coverage-report`) sont bien présents et NON vides, puis consigner les 2 valeurs de référence dans les `coverage-*.md` qui comptent encore les tests à la main [triage XS | domaine ci]
RECOMMAND_FOLLOWUP: restreindre le périmètre de mesure frontend (exclure les fichiers de config racine happés par le provider v8) une fois la valeur de référence brute consignée [triage XS | domaine frontend]

STATUS: COMPLETED
