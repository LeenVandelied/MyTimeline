# Mini-plans architect — Sprint 5

> Généré par /sprint plan 4 (architect, 2026-06-25). Lu par /sprint start 5 Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section "## Plan d'implementation").
> Thème : DB & profils — follow-ups reviews S1-S3. Cohésion 0.50.
> Décision migrations : 2 fichiers séparés V4 (contraintes #108, P1) puis V5 (index #110) — checksum stable, rollback granulaire. Interdiction d'éditer V1/V2/V3.

```yaml
issue_111:
  fichiers_cles: ["backend/src/main/resources/application.properties", "backend/src/main/resources/application.properties.example"]
  couches_touchees: ["config"]
  strategie_test: "unit/integration — boot refuse profil dev si ENVIRONMENT=production (si garde-fou choisi) ; sinon doc-only"
  risque_regression: "retirer le default :dev casse le confort dev (tous les `mvn`/IDE doivent fixer SPRING_PROFILES_ACTIVE) — privilegier garde-fou prod (ApplicationListener refuse boot profil dev si ENVIRONMENT=production) plutot que suppression seche. Choix exact a determiner par fullstack-dev parmi les 3 options issue"
  ordre_ecriture: "option recommandee : garder ${SPRING_PROFILES_ACTIVE:dev} + ajouter check au demarrage + documenter .example + runbook"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "BUG CONFIRME — application.properties ligne `spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev}` (fallback silencieux). Faux positif Phase 0.5."

issue_108:
  fichiers_cles: ["backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql"]
  couches_touchees: ["infrastructure/db"]
  strategie_test: "integration Testcontainers — base vierge applique V1->V4 sans erreur ; base dev (contraintes deja la) applique V4 idempotent sans 'already exists'"
  risque_regression: "non-idempotence -> echec Flyway sur base dev qui a deja les contraintes legacy ; type events.type varchar(255)->varchar(20) echoue si donnees existantes >20 chars (verifier) ; NE PAS editer V1/V2/V3 (checksum mismatch)"
  ordre_ecriture: "creer V4 idempotent : DROP CONSTRAINT IF EXISTS puis ADD CHECK (type IN ('duration','single')) + NOT NULL + varchar(20) ; CHECK sur duration_unit, recurrence_unit ; rollback commente ; auditer products/categories/users via pg_dump vs V1 (a determiner par db-expert si autre drift)"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "DRIFT CONFIRME — V1__baseline.sql cree events.type en varchar(255) nullable, aucun CHECK sur type/duration_unit/recurrence_unit. Faux positif Phase 0.5."

issue_110:
  fichiers_cles: ["backend/src/main/resources/db/migration/V5__fk_indexes.sql"]
  couches_touchees: ["infrastructure/db"]
  strategie_test: "integration Testcontainers — V1->V5 sans erreur ; verifier index crees (pg_indexes)"
  risque_regression: "manque IF NOT EXISTS -> echec si index deja cree manuellement en dev ; NE PAS editer V1 (checksum)"
  ordre_ecriture: "V5 : CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) ; idx_products_user ON products(user_id) ; idx_events_product ON events(product_id) ; rollback commente"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "CONFIRME — V1__baseline.sql cree fk_products_category/fk_products_user/fk_events_product mais AUCUN CREATE INDEX (PG ne les cree pas auto). Faux positif Phase 0.5."
```
