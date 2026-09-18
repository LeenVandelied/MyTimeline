# Issue #122 — Contrainte CHECK + NOT NULL sur users.role

**Vague :** V1 (∥ #93) · **Taille :** S · **Modèle :** opus/high
**Commit :** 2ce265c — `:card_file_box: #122 contrainte NOT NULL + CHECK sur users.role (V12)`

## Résumé
Durci `users.role` (drift baseline V1 : `role varchar(255)` NULLABLE, sans CHECK). Migration
`V12__users_role_not_null_check.sql` (self-safe sur base peuplée). Entité `UserEntity` :
`@Column(nullable=false)` sur `role` (miroir DB, cohérence `ddl-auto=validate`).

## Migration (3 étapes idempotentes)
1. `UPDATE users SET role='ROLE_USER' WHERE role IS NULL OR role NOT IN ('ROLE_USER','ROLE_ADMIN')`
   (assainit ; défaut ROLE_USER = moindre privilège, jamais de promotion silencieuse vers ADMIN).
2. `ALTER ... SET NOT NULL`.
3. `DROP CONSTRAINT IF EXISTS ck_users_role` puis `ADD CONSTRAINT ck_users_role CHECK (role IN ('ROLE_USER','ROLE_ADMIN'))`.
Rollback manuel commenté. Flyway rejoue 12 migrations → schema version=12 OK.

## Fichiers
- `db/migration/V12__users_role_not_null_check.sql` (nouveau, +61)
- `UserEntity.java` (+2, @Column nullable=false)
- `UserRoleConstraintIntegrationTest.java` (nouveau, +97, 5 tests)
- 6 fixtures corrigées : `setRole("USER")` → `"ROLE_USER"` (littéral invalide qui aurait cassé sous le CHECK)

## Tests
Suite worktree sprint/27 : **285/285 verts, 0 échec**.

## [MEMORY] signaux
- [MEMORY:decision] #122 coercition NULL/hors-enum → ROLE_USER (moindre privilège), à l'opposé du fail-fast de V4. Un downgrade est le pire cas sûr côté sécurité (jamais de promotion silencieuse ADMIN). Documenté dans l'en-tête V12.
- [MEMORY:pitfall] Subagent worktree : cwd Bash reset sur repo PRINCIPAL (dev) → Write/Edit en chemins absolus atterrissent sur dev. Préfixer par `$WT` worktree + garde-fou `git branch --show-current == sprint/27` avant CHAQUE écriture. (Confirme [[sprint-subagent-worktree-cwd]])
- [MEMORY:pitfall] `git diff > patch.diff` via hook RTK = sortie compactée non-parsable → `git apply` échoue. Utiliser `rtk proxy git diff` (raw) ou ré-appliquer les edits directement.

## Recommandations suite
- **Bascule PROD = décision humaine** : l'UPDATE + ALTER sur `users` réels sont sensibles (UPDATE non
  réversible). Auditer les lignes `role NULL`/hors-enum AVANT. Validé ici uniquement via Testcontainers.
- RECOMMAND_DB_EXPERT non requis (pas d'index/rollback complexe) — mais migration ALTER TABLE : à
  confirmer par db-expert en Phase 5 par prudence.

STATUS: COMPLETED
