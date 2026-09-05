# Mini-plans architect — Sprint 14

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

issue_0162:
  fichiers_cles:
    - "backend/pom.xml"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (Testcontainers ./scripts/test-quiet.sh backend) + démarrage Flyway base vide ET base existante"
  risque_regression: "Upgrade majeur Boot 3.3/3.4 : JPA/security/migrations — surface large. Ajouter flyway-database-postgresql (DEC-S3-001) car support PG quitte flyway-core en Flyway 10. Upgrade jjwt 0.11.5→0.13.x = API breaking sur signature/parsing JWT (BR-AUT-011 révocation jti)."
  ordre_ecriture: "infra (pom) → vérif compilation → tests non-régression complets"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Confirmé Boot 3.2.2 dans backend/pom.xml (grep 3.3 = FAUX POSITIF, commentaire migration future)"

issue_0161:
  fichiers_cles:
    - "frontend/package.json"
    - "frontend/package-lock.json"
  couches_touchees: ["frontend"]
  strategie_test: "build + npm audit"
  risque_regression: "Correctifs CVE dans ranges semver (axios/next/form-data) : npm update ciblé, vérifier non-régression build + tests Vitest. Fichiers isolés (lock), zéro conflit."
  ordre_ecriture: "frontend (npm update ciblé → commit lock)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "grep 'axios ^1.8.1' = dép courante (FAUX POSITIF), pas un correctif appliqué. Vérifier les ranges réels."

issue_0164:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java"
  couches_touchees: ["domain"]
  strategie_test: "unit (UtilsTest — durationUnit null)"
  risque_regression: "NPE calculateEndDate quand durationUnit null (BR-EVE-004). Null-guard sans changer le comportement nominal."
  ordre_ecriture: "domain (null-guard) → test"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_0168:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/application/.../EventCreationRequest (DTO création)"
    - "backend/src/main/java/com/matimeline/eventmanager/application/.../EventUpdateRequest (DTO update)"
    - ".ai-env/context-packs/br-events.md (source règles exactes)"
  couches_touchees: ["application"]
  strategie_test: "unit (validateurs custom @AssertTrue) + controller validation test"
  risque_regression: "BR-EVE-014 : ajouter color au DTO création change le contrat — coordonner avec #150 (S15) pour éviter désync. BR-EVE-006/012 nouvelles rejets 400 pourraient casser des tests existants tolérants."
  ordre_ecriture: "application (DTO+validateurs) → tests"
  zod_dto_sync: "OUI (color ajouté au DTO création — impacte #150 en S15)"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — checks non concluants)"

issue_0128:
  fichiers_cles:
    - "backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (rejet contrainte DB sur base vide ET base avec données)"
  risque_regression: "ADD CONSTRAINT échoue si données NULL non conformes préexistent (V9 a neutralisé recurrence_unit invalide — auditer duration_unit avant). Filet complémentaire à #164/#168, pas substitut."
  ordre_ecriture: "audit données → migration V11"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Dernière migration réelle = V10 (create_sessions). V11 est bien le prochain numéro libre."
