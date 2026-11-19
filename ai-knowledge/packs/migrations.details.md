# Annexe : migrations

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql` | 5 | convention 5 |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql` | 3 | convention 3 |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` | 3 | suspicious 2, convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V3__add_audit_columns.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql` | 1 | other 1 |
| `mytimeline:backend/src/main/resources/db/migration/V15__password_reset_tokens_version.sql` | 1 | convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V1__baseline.sql` | 1 | convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V2__unique_constraints.sql` | 1 | convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V5__fk_indexes.sql` | 1 | convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Avant un durcissement, un bloc do $$ compte les lignes non conformes et lève une exception actionnable, sans coercition silencieuse. [#a3f563bc2f9587a4-1] | deducible |
| rules | - Une entité @Version a une colonne version integer not null default 0. [#d3007a27b545f1b8-1] | deducible |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:30-32` | Le commentaire signale un piège : cette migration ne doit pas être exécutée contre une base de production sans décision humaine, et n'est validée que par Testcontainers ou une base de test. | [#6a8051ac54db4ae0-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:43` | Cet index utilise le préfixe ix_ alors que les autres index du lot utilisent idx_ pour un index simple, ce qui fait deux nommages différents pour le même type d'objet. | [#930e9c69d71916bc-1] |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:28` | Le commentaire d'en-tête interdit de créer une V10 et la dit réservée à #158, alors que V10__create_sessions.sql existe dans le lot, donc le commentaire est périmé. | [#dbd260bc254e104d-1] |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:68` | Les valeurs d'enum en majuscules de ce check (WEEK, MONTH, YEAR) diffèrent de la casse minuscule des check de V4 (weeks, months, years) et de ceux de V11 (duration, single), donc la casse des valeurs n'est pas uniforme dans le lot. | [#29933d39a46bb560-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:10-11` | Commentaire : Le DDL d'une migration reflète exactement l'entité JPA correspondante, car ddl-auto=validate fait échouer le démarrage à tout écart entre entité et DDL. | [#3123c3d1981e2538-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:29` | Commentaire : Une nouvelle migration porte le numéro suivant et n'édite jamais une migration déjà appliquée (V1 à V9 ici), car Flyway détecterait un checksum modifié. | [#7d7f55ca4eff580f-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:33-44` | Les tables se créent avec une clé primaire uuid nommée id, déclarée en primary key (id) en fin de create table, et les colonnes temporelles sont en timestamp. | [#1db02bb72eb663ff-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:46-53` | Les index suivent le nommage uq_ pour un index unique et idx_ pour un index simple, et chaque colonne de clé étrangère reçoit son propre index idx_ explicite. | [#dabdaea8fe1fb4ca-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:56-62` | Commentaire : Chaque migration se termine par un bloc de commentaire ROLLBACK manuel, listant les instructions drop if exists inverses, car Flyway Community ne rejoue pas les undo. | [#6d459d14ec7f191d-1] |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql:55-59` | Commentaire : Une neutralisation défensive de données (update ... where ...) précède l'ajout d'un constraint, et est conçue pour ne rien toucher sur une base propre. | [#6d2386c8809cdfd6-1] |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql:78-80` | Un check conditionnel sur une colonne booléenne nullable s'écrit avec is not true, pour n'exiger la valeur que lorsque la condition vaut strictement TRUE. | [#b835f993630cd219-1] |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:46-52` | Un durcissement de colonne suit l'ordre update d'assainissement, puis set not null, puis drop constraint if exists suivi de add constraint ck_<table>_<colonne>. | [#3605201ef7021a79-1] |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql:27-44` | Une table créée avec des contraintes déclare dans le create table les clés et contraintes nommées par le mot clé constraint (fk_, ck_), sans alter table séparé. | [#9a99540b375d30ed-1] |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql:40-43` | Les colonnes à valeurs fixes sont des varchar contrôlées par un check (col in (...)) nommé ck_<table>_<colonne>, dont les valeurs suivent l'enum du domaine. | [#0d35a3f07d65299e-1] |
| `mytimeline:backend/src/main/resources/db/migration/V15__password_reset_tokens_version.sql:28-29` | Une entité annotée @Version reçoit une colonne version integer not null default 0, ce qui doit correspondre exactement au mapping JPA. | [#d3007a27b545f1b8-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:21` | Commentaire : Un CHECK est toujours nommé, jamais anonyme, afin de pouvoir le retirer avec drop constraint if exists. | [#61b42db9757c6a8e-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:32-35` | Une migration qui modifie une table peuplée pose set local lock_timeout avant l'ALTER, pour échouer vite plutôt que de bloquer les lectures. | [#58bbdf47e30dcfc8-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:32-34` | Commentaire : Plusieurs changements sur une même table se regroupent dans un seul alter table, pour ne prendre qu'un verrou. | [#cfe9ab975c506d34-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:37-41` | L'ajout d'une colonne et de sa contrainte se fait avec add column if not exists suivi de drop constraint if exists puis add constraint dans le même alter table. | [#61b42db9757c6a8e-2] |
| `mytimeline:backend/src/main/resources/db/migration/V1__baseline.sql:4-6` | Commentaire : La migration baseline reflète le schéma généré depuis les métadonnées Hibernate, en tables create table avec uuid pour les PK et FK, varchar(255) pour les String et timestamp pour les dates. | [#4440982ba6d3d214-1] |
| `mytimeline:backend/src/main/resources/db/migration/V2__unique_constraints.sql:13-17` | Les contraintes uniques sont nommées de façon stable dans une migration dédiée (alter table ... add constraint uq_... unique), et non laissées au nom automatique généré par Hibernate. | [#c40a4f8b041c44a5-1] |
| `mytimeline:backend/src/main/resources/db/migration/V3__add_audit_columns.sql:5-7` | Commentaire : Les tables auditées reçoivent created_at et updated_at en timestamp not null default now(), et version en integer not null default 0, mappés par les annotations d'audit JPA. | [#26663bf301806f87-1] |
| `mytimeline:backend/src/main/resources/db/migration/V3__add_audit_columns.sql:16-19` | L'ajout de plusieurs colonnes d'audit se fait en un seul alter table avec des add column séparés par des virgules. | [#87c989e06096a13a-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:18-21` | Commentaire : Les valeurs d'enum des CHECK sont reprises du code applicatif et non devinées, avec la liste indiquée en commentaire de l'en-tête. | [#2ba364275f766ca5-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:23-24` | Commentaire : Une migration de réconciliation rejouable fait drop constraint if exists puis add constraint pour le même nom, afin de ne pas échouer sur une contrainte déjà présente. | [#5bf5a7c95c5d2f4e-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:40-64` | Avant un durcissement sur base peuplée, un bloc do $$ compte les lignes non conformes et lève une exception avec un message actionnable, sans coercition silencieuse des données. | [#a3f563bc2f9587a4-1] |
| `mytimeline:backend/src/main/resources/db/migration/V5__fk_indexes.sql:25-29` | Les index sur clés étrangères s'écrivent create index if not exists idx_<table>_<colonne> on <table> (<colonne>) pour rester rejouables. | [#b3fc78ae062be38b-1] |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql:28-44` | Les clés étrangères se déclarent par alter table add constraint fk_<table>_<cible> foreign key ... references ... on delete cascade pour les données qui appartiennent à un utilisateur. | [#42402699aca2e855-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:37-39` | Une clé étrangère vers users sans propagation de suppression se déclare sans on delete cascade, la base gardant son comportement RESTRICT par défaut. | [#dbca7a316c0c1c8c-1] |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:31-32` | Commentaire : Pour réécrire des données sous contrainte, la migration retire d'abord le check, réécrit les valeurs, puis le repose aligné sur l'enum. | [#0049acf39aaa5953-1] |
