
## Dependances intra-sprint
- AUCUNE dependance amont. Cette issue livre la migration V4.
- #110 (vague 2) ajoutera V5 APRES toi — ne cree PAS V5, ne reserve pas son numero autrement que par ta V4.

## Designer
Non applicable (migration SQL pure).

## Contraintes
- Branche cible : sprint/5 (deja checkout).
- Commit : 1 commit logique, gitmoji francais (ex: ":card_file_box: #108 — V4 reconcilier contraintes events").
- Tests OBLIGATOIRES via ./scripts/test-quiet.sh unit (Testcontainers Postgres applique V1->V4).
- Si volume tests > 500 OU temps > 3min : signaler RECOMMAND_TEST_RUNNER (ne lance pas e2e ici).
- INTERDIT d'editer : V1__baseline.sql, V2__unique_constraints.sql, V3__add_audit_columns.sql (checksum Flyway). Le futur V5 appartient a #110.
- INTERDIT de toucher : application*.properties, AuthController.java, SecurityConfig.java, GlobalExceptionHandler.java, fichiers de test auth.
- Recommande : signaler RECOMMAND_DB_EXPERT (migration -> review db-expert par le lead).

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA, ...]
- resume: objectif + contraintes posees + drift verifie (products/categories aussi ?) + tests
- [MEMORY:*] signaux (pitfall idempotence Flyway, decision V4 separee, etc.)
- recommandations suite: RECOMMAND_DB_EXPERT + tout RECOMMAND_FOLLOWUP (NON-XS)
- STATUS: COMPLETED en derniere ligne (ou PARTIAL + BLOQUE_SUR)
