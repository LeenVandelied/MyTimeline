# Annexe : migrations

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/resources/db/migration/V10__create_sessions.sql` | 4 | convention 2, other 1, suspicious 1 |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql` | 3 | convention 2, suspicious 1 |
| `backend:src/main/resources/db/migration/V5__fk_indexes.sql` | 3 | convention 2, db_change 1 |
| `backend:src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V16__user_theme_preference.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V1__baseline.sql` | 2 | convention 1, other 1 |
| `backend:src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V11__events_conditional_check_constraints.sql` | 1 | convention 1 |
| `backend:src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql` | 1 | db_change 1 |
| `backend:src/main/resources/db/migration/V15__password_reset_tokens_version.sql` | 1 | convention 1 |
| `backend:src/main/resources/db/migration/V2__unique_constraints.sql` | 1 | convention 1 |
| `backend:src/main/resources/db/migration/V3__add_audit_columns.sql` | 1 | convention 1 |
| `backend:src/main/resources/db/migration/V4__reconcile_events_constraints.sql` | 1 | convention 1 |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql` | 1 | suspicious 1 |
| `backend:src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` | 1 | convention 1 |

## Lignes hors budget {#t-cut_lines}

| Section | Ligne |
|---|---|
| rules | - Selon le commentaire de V1, PK et FK sont en uuid et les String non bornés en varchar(255) [#fd36df130202be28-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:30` | Le commentaire de V10 réserve V11 à #78, alors que le fichier V11 existant porte l'issue #128. L'écart de numérotation n'est pas expliqué dans les fichiers du lot. | [#74d577652399ad7c-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:16` | Le commentaire de V13 indique que la purge des fichiers générés sur disque reste une dette, sans scheduler de nettoyage dans les fichiers du lot. | [#7d39e13db0dba6c7-1] |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql:43` | L'index sur owner_id est nommé ix_categories_owner_id, alors que les index de clés étrangères des autres migrations suivent le préfixe idx_{table}_{colonne}. | [#5d29ca418c49ce28-1] |

## Changements de base {#t-db_change}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql:18` | Un index sur une colonne sans clé étrangère suit le même modèle create index idx_{table}_{colonne} on {table} ({colonne}), sans clause if not exists. | [#cd42ade2a009e3d8-1] |
| `backend:src/main/resources/db/migration/V5__fk_indexes.sql:25` | Chaque colonne de clé étrangère reçoit un index nommé idx_{table}_{colonne}, créé avec create index if not exists pour rester rejouable. | [#23e6ccafd3906cf1-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:10` | Commentaire : Le schéma d'une nouvelle table reflète exactement l'entité JPA correspondante, car ddl-auto=validate est actif en dev, test et prod. | [#8fb5ac9e1a1bd779-1] |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:49-51` | La contrainte de clé étrangère user_id d'une table de sessions utilise add constraint fk_sessions_user avec on delete cascade, comme V6 et V13. | [#a56e52c557fc0098-1] |
| `backend:src/main/resources/db/migration/V11__events_conditional_check_constraints.sql:80` | Un CHECK conditionnel sur un booléen nullable s'écrit avec is not true, ce qui laisse passer les valeurs NULL. | [#40c035e935fae1d6-1] |
| `backend:src/main/resources/db/migration/V12__users_role_not_null_check.sql:37-52` | Pour durcir une colonne existante, la migration assainit d'abord les valeurs par update, puis pose set not null, puis ajoute le CHECK nommé. | [#f577509d29c8efd4-1] |
| `backend:src/main/resources/db/migration/V12__users_role_not_null_check.sql:48` | Une contrainte CHECK se nomme ck_{table}_{colonne} et est précédée d'un drop constraint if exists du même nom, ce qui rend la migration rejouable. | [#0bf834cf43bcb2f4-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:2` | Commentaire : Les fichiers de migration suivent le nommage V{N}__description_en_snake_case.sql et commencent par un en-tête de commentaire qui indique la version, l'issue et l'objet. | [#6c3f33bf03f6d301-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:40-43` | Dans un create table, les CHECK sont déclarés comme constraint nommée ck_{table}_{colonne} à l'intérieur de la définition de la table. | [#a90b094c8792fdd0-1] |
| `backend:src/main/resources/db/migration/V15__password_reset_tokens_version.sql:28-29` | Un verrou optimiste @Version est porté par une colonne version integer not null default 0, de même type Integer que les autres entités auditées. | [#20d423176902d752-1] |
| `backend:src/main/resources/db/migration/V16__user_theme_preference.sql:35` | Une migration sur une table existante pose set local lock_timeout = '5s' avant son ALTER TABLE. | [#60d03ad1ee427f99-1] |
| `backend:src/main/resources/db/migration/V16__user_theme_preference.sql:37-41` | Une colonne ajoutée à une table existante utilise add column if not exists, et le CHECK nommé est regroupé dans le même alter table avec drop constraint if exists. | [#ed0a32438c043501-1] |
| `backend:src/main/resources/db/migration/V1__baseline.sql:15` | Commentaire : Les clés primaires et étrangères sont en uuid, les String non bornés en varchar(255) et les LocalDateTime en timestamp. | [#fd36df130202be28-1] |
| `backend:src/main/resources/db/migration/V2__unique_constraints.sql:14` | Une contrainte UNIQUE se pose par add constraint nommé uq_{table}_{colonne}, et la nomination est stable pour que Flyway reste la source de vérité. | [#51d3cbc0f484b438-1] |
| `backend:src/main/resources/db/migration/V3__add_audit_columns.sql:16-19` | Les tables auditées reçoivent created_at et updated_at en timestamp not null default now(), et version en integer not null default 0 pour le mapping @Version. | [#cc18856949ee1abb-1] |
| `backend:src/main/resources/db/migration/V4__reconcile_events_constraints.sql:55-62` | Une migration qui durcit des données sur base peuplée contrôle d'abord les lignes non conformes dans un bloc do $$ et lève raise exception avant tout ALTER. | [#6368ffc6f56a88a7-1] |
| `backend:src/main/resources/db/migration/V5__fk_indexes.sql:22` | Commentaire : Une migration déjà appliquée n'est jamais éditée : tout changement de schéma est posé dans un nouveau fichier V{N}, et l'en-tête le rappelle. | [#b4c3437f3d5ac7fd-1] |
| `backend:src/main/resources/db/migration/V5__fk_indexes.sql:32-37` | Commentaire : Chaque migration se termine par un bloc de commentaire ROLLBACK manuel qui liste les instructions inverses, Flyway Community ne rejouant pas les undo. | [#ea5494905e3041ae-1] |
| `backend:src/main/resources/db/migration/V6__create_password_reset_tokens.sql:28-35` | Une table se déclare par create table au nom pluriel en snake_case, avec une colonne id uuid not null et primary key (id). | [#36e3dcb5b8dc6e04-1] |
| `backend:src/main/resources/db/migration/V6__create_password_reset_tokens.sql:40-42` | Une clé étrangère vers users se nomme fk_{table}_{colonne ou entité} et, pour une table rattachée à un compte, déclare on delete cascade. | [#391e17b474f53011-1] |
| `backend:src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:37-55` | La normalisation d'une valeur texte se fait en update avec case lower(trim(...)) et une branche else qui conserve la valeur, neutralisée ensuite à null par un second update. | [#b7719716a7380b00-1] |
