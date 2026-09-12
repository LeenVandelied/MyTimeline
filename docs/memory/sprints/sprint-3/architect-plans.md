# Mini-plans architect — Sprint 3

issue_34:
  fichiers_cles:
    - "backend/src/main/resources/application.properties"
    - "backend/src/main/resources/application-{dev,prod}.properties (nouveaux)"
    - ".gitignore (corriger la règle qui ne matche pas le vrai chemin)"
    - "frontend/.env.example (nouveau)"
  couches_touchees: ["infrastructure (config)"]
  strategie_test: "smoke (boot avec variables d'env)"
  risque_regression: "la rotation de jwt.secret invalide tous les tokens existants (déconnexion globale)"
  ordre_ecriture: "externaliser -> profils dev/prod -> rotation secret"
  zod_dto_sync: "NON"
  possibly_done: false

issue_42:
  fichiers_cles:
    - "backend/pom.xml (flyway-core + flyway-database-postgresql)"
    - "backend/src/main/resources/db/migration/V1__baseline.sql (nouveau)"
    - "backend/src/main/resources/db/migration/V2__unique_constraints.sql (username/email)"
    - "backend/src/main/resources/application.properties (ddl-auto=validate)"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (boot + migrate sur base de test)"
  risque_regression: "la baseline DOIT refléter exactement le schéma généré par Hibernate ; ddl-auto=validate bloque au boot si divergence"
  ordre_ecriture: "dep Flyway -> baseline SQL -> contraintes uniques -> bascule ddl-auto validate"
  zod_dto_sync: "NON"
  possibly_done: false
  depend_intra: "V2 après #34 (application.properties partagé)"

issue_43:
  fichiers_cles:
    - "backend/.../infrastructure/entities/*.java (toutes les entités)"
    - "backend/src/main/resources/db/migration/V3__audit_columns.sql (created_at/updated_at/version)"
    - "backend/.../config @EnableJpaAuditing"
  couches_touchees: ["infrastructure"]
  strategie_test: "unit (equals/hashCode) + integration (auditing)"
  risque_regression: "equals/hashCode mal défini -> détachement JPA ; @Version change la sémantique de save"
  ordre_ecriture: "migration colonnes -> annotations entités + EnableJpaAuditing -> equals/hashCode"
  zod_dto_sync: "NON"
  possibly_done: false
  depend_intra: "V3 après #42 (migration Flyway requise)"
