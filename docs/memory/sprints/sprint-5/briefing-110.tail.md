
## Dependances intra-sprint
- V4 (#108) déjà mergée sur HEAD (sprint/5). Ta migration est V5 — numéro suivant libre.
- AUCUNE autre dépendance.

## Designer
Non applicable (migration SQL pure).

## Contraintes
- Branche sprint/5 déjà checkout. 1 commit gitmoji français (ex: ":card_file_box: #110 — V5 index FK").
- Tests OBLIGATOIRES : ./scripts/test-quiet.sh unit (Testcontainers V1->V5 + vérifier pg_indexes).
- INTERDIT d'éditer : V1/V2/V3/V4 (checksum Flyway), application*.properties, SecurityConfig.java, AuthController.java, fichiers de test auth.
- CREATE INDEX IF NOT EXISTS (base dev peut déjà avoir des index manuels). Rollback commenté.
- Migration SQL → signale RECOMMAND_DB_EXPERT.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA]
- resume: index créés (noms colonnes confirmés depuis V1) + tests
- [MEMORY:*] signaux
- recommandations suite: RECOMMAND_DB_EXPERT / RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en dernière ligne (ou PARTIAL + BLOQUE_SUR)
