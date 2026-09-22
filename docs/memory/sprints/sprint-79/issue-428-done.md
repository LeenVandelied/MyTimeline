# Issue #428 — CORS dev surchargeable (`app.cors.allowed-origins`)

Sprint 79 · vague 1 · taille S · agent fullstack-dev

## Prémisse de l'énoncé : **RÉFUTÉE**

L'énoncé pose que la valeur est « figée » et que l'E2E local est « impossible » quand `:3000`
est pris. **Faux sur le point technique central : la surcharge par `APP_CORS_ALLOWED_ORIGINS`
fonctionnait DÉJÀ, sans aucun placeholder.**

Mesure qui tranche : le test `CorsAllowedOriginsConfigIntegrationTest` a été écrit puis exécuté
**contre `application-dev.properties` INCHANGÉ** (valeur littérale `http://localhost:3000`).
Résultat : **6 tests verts sur 7**, dont les 3 cas de surcharge (mono-valeur, multi-ports,
espaces autour des virgules). L'unique rouge était une erreur d'attente de ma part sur le cas
« variable vide » (attendu liste vide, mesuré `[""]`), pas un défaut du code.

Cause : dans l'ordre de précédence Spring Boot, les variables d'environnement (rang 8) priment
sur les `application-<profil>.properties` (rang 11). Le relaxed binding mappe
`APP_CORS_ALLOWED_ORIGINS` → `app.cors.allowed-origins` sans déclaration.

Conséquence sur le correctif : le placeholder livré est **documentaire, pas fonctionnel**. Le
défaut réel de #428 était que le levier n'était **écrit nulle part** — d'où 3 sprints de
diagnostic faux (47, 56, 57). Le contournement « conteneur backend frère jetable sur :8090 »
n'était donc pas seulement un traitement du symptôme : il était **inutile**.

## Ce qui a changé

| Fichier | Changement |
|---|---|
| `backend/src/main/resources/application-dev.properties:60` | `app.cors.allowed-origins=${APP_CORS_ALLOWED_ORIGINS:http://localhost:3000}` + bloc de commentaire (mesure, mode d'emploi multi-ports, piège variable vide, décision assumée) |
| `backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | extraction de la constante `ALLOWED_ORIGINS_EXPRESSION` (le test résout l'expression RÉELLE du constructeur, pas une copie qui pourrait diverger) |
| `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | **nouveau**, 7 cas |
| `docs/runbook/cors-cookie-samesite.md` | ligne `dev` du tableau + section « Dev local — port 3000 déjà pris (#428) » |

Test : charge le vrai `application-dev.properties` (`ConfigDataApplicationContextInitializer`),
remplace la source `systemEnvironment` (position de précédence canonique + isolation du poste),
résout `SecurityConfig.ALLOWED_ORIGINS_EXPRESSION`, et assert sur la liste posée par la **vraie**
méthode `SecurityConfig.corsConfigurationSource()` — y compris `checkOrigin()`, qui est ce qui
décide réellement du 403. Aucun Testcontainers, aucun Playwright.

## Critères d'acceptation

- [x] Surchargeable sans éditer les properties — **déjà vrai**, désormais prouvé + découvrable.
- [x] Défaut inchangé `http://localhost:3000` (test `devSansEnv_utiliseLeDefaut` + assert sur le fichier).
- [x] Test d'intégration : résolution du placeholder + multi-origines appliquées au `CorsConfigurationSource`.
- [x] Profil `prod` non touché (`application-prod.properties` inchangé ; test asserte qu'il lit toujours `${CORS_ALLOWED_ORIGINS:}` et ne contient pas `APP_CORS_ALLOWED_ORIGINS`).

## Chiffres mesurés

- `CorsAllowedOriginsConfigIntegrationTest` : **7/7** verts (`tests="7"` dans le rapport surefire).
- Suite backend complète : **573 tests, 0 failure, 0 error** — `./scripts/test-quiet.sh backend`, BUILD SUCCESS.
- Run intermédiaire (avant correction du probe) : 573 run / **106 errors** — voir pitfall ci-dessous.
- Aucun run Playwright (contrainte de vague respectée).

## Décision assumée — variable exportée vide

`APP_CORS_ALLOWED_ORIGINS=` (vide) écrase le défaut et produit **une origine BLANCHE** `[""]`,
donc un CORS qui refuse tout : le 403 trompeur que l'issue veut supprimer. **Pas de garde-fou
« blanc → défaut » côté code** : il ferait diverger dev et prod, où le vide DOIT rester un
fail-fast (`ProfileSafetyGuard` #253). Le correctif est de **ne jamais déclarer cette variable
dans un fichier chargé automatiquement** (`.env`, `.env.example`, `docker-compose`) — aucun n'a
été modifié. Cas épinglé par le test et documenté aux deux endroits.

## Signaux mémoire

[MEMORY:pitfall] Context: écrire un test Spring avec une classe `@Configuration` imbriquée dans le fichier de test (`CorsProbeConfiguration`, méthode `@Bean corsConfigurationSource`). Les classes de test vivent sur le MÊME classpath que le code de prod : le component scan de TOUS les `@SpringBootTest` la ramasse, et le bean homonyme entre en collision avec celui de `SecurityConfig` → `BeanDefinitionOverrideException` sur **106 tests d'intégration** très loin du fichier modifié. Le message de surface (`ApplicationContext failure threshold (1) exceeded`) est une CASCADE qui ne nomme jamais la cause : il faut lire le `Caused by:` du log maven complet, pas la sortie de surefire. Solution: `@TestConfiguration` (exclu du scan par TypeExcludeFilter) + nom de méthode `@Bean` distinct comme seconde barrière. Prevention: toute config imbriquée dans un test porte `@TestConfiguration`, jamais `@Configuration` ; et un test « local » qui rougit >10 tests étrangers est presque toujours une collision de bean, pas une régression fonctionnelle.

[MEMORY:decision] Context: #428 demandait de rendre `app.cors.allowed-origins` surchargeable en dev. Decision: livrer le placeholder `${APP_CORS_ALLOWED_ORIGINS:http://localhost:3000}` bien qu'il soit fonctionnellement un no-op, et NE PAS élargir le défaut dev à `:3000,:3100`. Why: la surcharge marchait déjà (précédence env > properties, mesuré) ; le défaut multi-ports violerait le critère « le défaut reste http://localhost:3000 ». La valeur livrée est la DÉCOUVRABILITÉ du levier — c'est l'absence de trace écrite, pas une limite technique, qui a coûté 3 sprints.

[MEMORY:pattern] Problem: un test qui vérifie une valeur injectée par `@Value` recopie l'expression de placeholder, et reste vert après que le code de prod a changé la sienne. Solution: extraire l'expression en `static final String` sur la classe de prod (`SecurityConfig.ALLOWED_ORIGINS_EXPRESSION`) et l'utiliser dans les deux `@Value` — une constante de compilation est légale en valeur d'annotation. Anti-pattern: dupliquer `"${ma.property:defaut}"` dans le test.

[MEMORY:pitfall] Context: vérifier qu'une property est surchargeable par variable d'environnement dans un test Spring. Utiliser `withPropertyValues(...)` PROUVE le mauvais mécanisme (source « Inlined Test Properties », précédence différente d'une vraie variable d'env). Solution: REMPLACER la source `systemEnvironment` (`StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME`) par une `SystemEnvironmentPropertySource` peuplée à la main — `replace` (pas `addFirst`) conserve la position de précédence canonique ET isole le test des variables réellement exportées sur le poste. Prevention: avant de conclure « non surchargeable », mesurer AVANT de corriger — ici la mesure a réfuté l'énoncé.

## Recommandations suite

- **RECOMMAND_FOLLOWUP** — `ProdConfigStartupLogger` est `@Profile("prod")` STRICT : en dev, la
  liste CORS effective n'est journalisée **nulle part**. C'est la cause profonde du diagnostic
  faussé (le développeur ne peut pas voir la valeur appliquée). Un log INFO au boot en dev
  supprimerait la classe entière de bug. Hors périmètre des critères de #428 et touche une
  classe explicitement documentée « aucun log en dev/test » → issue dédiée.
- **RECOMMAND_FOLLOWUP** — `docs/runbook/cors-cookie-samesite.md` affirmait encore « le bean CORS
  échoue au boot (fail-fast) » pour la prod ; le fail-fast est en réalité dans `ProfileSafetyGuard`
  (#253) depuis. Formulation périmée laissée en l'état (hors périmètre), à corriger.
- Pas de RECOMMAND_TEST_RUNNER car la suite backend complète a été jouée ici (573/573, 0 échec) et
  tient en un seul run.
- Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma ni de migration (prochaine migration
  toujours V16).
- Pas de RECOMMAND_SECURITY car le profil `prod` est intact et le périmètre dev ne peut pas
  élargir le CORS de production ; test de non-régression prod inclus.
- Pas de RECOMMAND_E2E car la contrainte de vague interdit tout run Playwright (exclusivité #475),
  et la preuve exigée par les critères d'acceptation est un test d'intégration Spring.

## Fichiers de contexte lus

`.ai-env/context-packs/` : **aucun** (packs volumineux non ouverts — aucun besoin constaté ; les
entrées pertinentes PIT-S55-001 / PIT-S57-003 étaient déjà résumées dans le briefing).
Lus dans le dépôt : `application-dev.properties`, `application-prod.properties`,
`application-test.properties`, `SecurityConfig.java`, `ProfileSafetyGuard.java` (extraits),
`ProdConfigStartupLogger.java`, `docs/runbook/cors-cookie-samesite.md`.

STATUS: COMPLETED
