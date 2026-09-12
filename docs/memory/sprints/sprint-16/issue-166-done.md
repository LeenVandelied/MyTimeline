# Issue #166 — Test ArchUnit règles hexagonales + baseline gelée

commits: [a5ccb6d]

## Résumé
Objectif : verrou ArchUnit 4 règles hexagonales + baseline gelée (#166).

Fichiers clés :
- `backend/pom.xml` (dep `archunit-junit5:1.3.0` scope test)
- `backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java` (nouveau, 4 @Test)
- `backend/src/test/resources/archunit.properties` (store path + `allowStoreCreation=false`)
- `backend/src/test/resources/archunit_store/` (5 fichiers baseline versionnés)

Règles :
1. `domain/` n'importe ni `org.springframework` ni `jakarta.*` (sauf `jakarta.validation`)
2. `domain/` + `application/` n'importent pas `infrastructure/`
3. controllers → ports, pas `*ServiceImpl` concrets
4. adaptateurs JPA → pas d'autre `*RepositoryJpaImpl` concret (baseline VIDE sur sprint/16 = enforce live)

Gelées baseline : Role→GrantedAuthority, @Repository sur ports repo, ProductService→DTOs application, 5 mappers→infra.entities, Product/User/Auth Controller→*ServiceImpl, EventRepositoryJpaImpl→ProductRepositoryJpaImpl.

Tests :
- ArchitectureTest : 4/4 passed (worktree)
- suite backend complète : 242/242 passed, BUILD SUCCESS
- validation violation volontaire : Category @Component → build KO sur règle 1 (confirmé), puis retirée

Critères d'acceptation : 4/4 OK

## Pitfalls
- Bash `cd <chemin>` a résolu sur le repo PRINCIPAL (dev) au lieu du worktree sprint/16 → fichiers écrits au mauvais endroit, migrés manuellement + revert main. Pitfall connu (mémoire subagent-worktree).
- FreezingArchRule : 1er run échoue "allowStoreCreation disabled" → générer baseline via `-Darchunit.freeze.store.default.allowStoreCreation=true` UNE fois, puis commiter le store, garder `false` en CI.
- store path relatif au cwd=backend (pas classpath) → `src/test/resources/archunit_store` OK.
- baseline dépend de la branche : JpaImpl→JpaImpl coupling existe sur dev mais PAS sur sprint/16 (déjà refactoré) → baseline régénérée dans le worktree reflète le vrai code sprint/16.

[MEMORY:pattern] Verrouiller archi hexagonale sans casser sur l'historique : ArchUnit `noClasses().should().dependOnClassesThat()` + `FreezingArchRule.freeze(rule)`, baseline versionnée sous `src/test/resources/archunit_store/`, `allowStoreCreation=false` en CI, régénération volontaire via `-Darchunit.freeze.store.default.allowStoreCreation=true`. Anti-pattern : exclusions manuelles silencieuses.
[MEMORY:pitfall] Subagent worktree — Bash `cd <chemin>` résout sur le repo principal (dev) et non le worktree → fichiers au mauvais endroit. Solution : `git -C <worktree>` + chemins absolus worktree, vérifier `git branch --show-current` AVANT chaque écriture, pas seulement avant commit.

## Recommandations suite
- RECOMMAND_FOLLOWUP : dégel progressif de la baseline au fil de l'hygiène hexagonale — corriger chaque violation gelée (Role→GrantedAuthority, @Repository sur ports, ProductService→DTOs, mappers→entités infra, controllers→*Impl) retire l'entrée du store automatiquement, sans modif du test.
- RECOMMAND_FOLLOWUP : nettoyer les artefacts archunit dupliqués créés par erreur dans le repo principal (dev) — résidu untracked (`backend/src/test/java/.../architecture/`, `archunit.properties`, `archunit_store/`), à nettoyer manuellement par le dev (NON exécuté par le lead — `git clean` gated).

## Suite review (CRITIQUE résolu)
Le reviewer batch (Phase 7) a relevé un CRITIQUE sur la Règle 1 : le chaînage `andShould().dependOnClassesThat().resideOutsideOfPackage("jakarta.validation..")` neutralisait l'exception (2 conditions ET, la 2e triviale) → exception jakarta.validation non effective + baseline polluée (java.lang.Enum/UUID). **Corrigé en d38aef0** (issue-166fix-done.md) : prédicat unique `resideInAnyPackage(spring,jakarta).and(not(resideInAPackage(jakarta.validation)))`, 2 validations (jakarta.validation toléré / spring rejeté) OK, baseline nettoyée (Role→GrantedAuthority + ProductRepository @Repository), backend 242/242.

STATUS: COMPLETED
