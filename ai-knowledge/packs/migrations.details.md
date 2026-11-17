# Annexe : migrations

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql` | 5 | convention 5 |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql` | 5 | convention 4, config 1 |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql` | 4 | config 1, convention 1, other 1 |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 2 | convention 1, other 1 |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V1__baseline.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V2__unique_constraints.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql` | 1 | convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V15__password_reset_tokens_version.sql` | 1 | convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V3__add_audit_columns.sql` | 1 | convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V5__fk_indexes.sql` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Sur une base peuplée, un bloc DO compte les lignes non conformes et lève une exception avant tout ALTER, sans coercition silencieuse [#a3f563bc2f9587a4-1]. | rediscovered (13 appels) |
| rules | - Avant d'ajouter un CHECK ou un not null, les lignes incohérentes sont neutralisées par UPDATE ciblé, vers ROLE_USER pour le rôle ou vers NULL pour une unité de récurrence invalide [#6d2386c8809cdfd6-1] [#1c7402a0f5b734f9-1] [#0049acf39aaa5953-1]. | rediscovered (9 appels) |
| rules | - Un CHECK se rejoue par drop constraint if exists puis add constraint, et les index de clé étrangère par create index if not exists [#333e76b9ff028bb8-1] [#b3fc78ae062be38b-1]. | rediscovered (10 appels) |
| rules | - Les index se nomment idx_<table>_<colonne>, aussi pour une colonne de purge temporelle [#e7d8e73c2ca02741-1]. | rediscovered (15 appels) |
| rules | - Les colonnes d'audit sont created_at et updated_at en timestamp not null default now() [#87c989e06096a13a-1], et le verrou optimiste est version integer not null default 0 [#d3007a27b545f1b8-1]. | rediscovered (11 appels) |
| rules | - Les opérations d'une même table sont regroupées dans un seul ALTER TABLE avec if not exists [#61b42db9757c6a8e-2]. | rediscovered (4 appels) |
| alerts | - La FK owner_id de la table categories n'a pas de on delete, donc RESTRICT, alors que les autres FK vers users du lot utilisent on delete cascade, donc supprimer un utilisateur qui possède des catégories échoue : avant de toucher à la suppression d'utilisateurs, aligner la FK par une nouvelle migration ou supprimer les catégories d'abord `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:37-39` [#dbca7a316c0c1c8c-1]. | rediscovered (6 appels) |
| alerts | - Selon le commentaire de V9, la V10 est réservée (#158), mais V10__create_sessions.sql existe dans le lot, donc le commentaire est périmé : ne pas se fier à ce texte de réservation pour numéroter une migration et vérifier les fichiers présents `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:28` [#dbd260bc254e104d-1]. | rediscovered (8 appels) |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:30` | Le commentaire réserve V11 pour #78 alors que V11__events_conditional_check_constraints.sql existe dans le lot, le commentaire est donc périmé. | [#ae627bc6d9b7fdcd-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:37-39` | La clé étrangère owner_id est déclarée sans on delete, donc RESTRICT par défaut, alors que les FK vers users des autres tables du lot utilisent on delete cascade. | [#dbca7a316c0c1c8c-1] |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:28` | Le commentaire réserve V10 (#158) alors que V10__create_sessions.sql existe dans le lot, le commentaire est donc périmé. Le fichier contient un texte de réservation de numéro de migration. | [#dbd260bc254e104d-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:10` | Commentaire : Le schéma est déclaré comme miroir exact de l'entité JPA, avec ddl-auto=validate sur dev, test et prod, de sorte qu'un écart casse le démarrage. | [#3123c3d1981e2538-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:33` | Commentaire : Le fichier indique que spring.flyway.baseline-on-migrate vaut true, ce qui fait que les migrations s'appliquent aussi à la base dev et à la future prod. | [#1a952d5c5bf6fad7-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:46-47` | Un identifiant de recherche unique est porté par un index unique nommé uq_<table>_<colonne>, créé avec create unique index. | [#dabdaea8fe1fb4ca-1] |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql:55-64` | Avant d'ajouter un CHECK, les lignes incohérentes sont neutralisées par UPDATE ciblés, ce qui rend la migration sans effet sur une base propre. | [#6d2386c8809cdfd6-1] |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql:75-80` | Un CHECK conditionnel est nommé ck_<table>_<colonne>_required et compare avec is not true pour traiter NULL comme absence de condition. | [#b835f993630cd219-1] |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:35-52` | Une colonne durcie est d'abord assainie par UPDATE vers la valeur de moindre privilège ROLE_USER, puis passe en set not null, puis reçoit un CHECK nommé ck_<table>_<colonne>. | [#1c7402a0f5b734f9-1] |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql:27-44` | Les clés étrangères et les CHECK d'une table sont déclarés dans create table sous forme de constraint nommé fk_<table>_<reference> ou ck_<table>_<colonne>. | [#9a99540b375d30ed-1] |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql:41` | Une colonne d'énumération est un varchar de longueur fixe, not null, dont les valeurs sont bornées par un CHECK in (...) listant les valeurs en majuscules. | [#145dc0442b68f3c1-1] |
| `mytimeline:backend/src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql:18` | Un index dédié à une colonne de purge temporelle est nommé idx_<table>_<colonne> et créé par create index simple. | [#e7d8e73c2ca02741-1] |
| `mytimeline:backend/src/main/resources/db/migration/V15__password_reset_tokens_version.sql:28-29` | La colonne de verrou optimiste version est en integer not null default 0 et correspond à un champ @Version de type Integer. | [#d3007a27b545f1b8-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:9-14` | Commentaire : Une colonne ajoutée à une table peuplée est nullable, sans DEFAULT et sans backfill, et l'en-tête du fichier documente ce choix. | [#14f284dd9bda2ed0-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:17-19` | Commentaire : La colonne est mappée par UserEntity.themePreference avec un ThemePreferenceConverter entre l'enum domaine et les valeurs en minuscules, avec @Column(name = "theme_preference", length = 16). | [#081c93026e52e9f2-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:21-23` | Commentaire : Les CHECK sont toujours nommés, car un CHECK anonyme reçoit un nom automatique que drop constraint if exists ne retire pas, et NULL satisfait le CHECK. | [#61b42db9757c6a8e-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:35` | Une migration sur une table peuplée pose set local lock_timeout à 5 secondes en tête, pour échouer vite plutôt que bloquer les lectures. | [#58bbdf47e30dcfc8-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:37-41` | Plusieurs opérations sur une même table sont regroupées dans un seul ALTER TABLE, avec add column if not exists, drop constraint if exists puis add constraint nommé. | [#61b42db9757c6a8e-2] |
| `mytimeline:backend/src/main/resources/db/migration/V1__baseline.sql:8-13` | Commentaire : Le baseline ne pose pas les UNIQUE générées par Hibernate, elles sont créées avec un nom stable dans V2 pour que Flyway reste la seule source des contraintes nommées. | [#211589e73053149d-1] |
| `mytimeline:backend/src/main/resources/db/migration/V1__baseline.sql:19-23` | Les tables sont créées avec create table, une colonne id uuid not null et primary key (id) en fin de définition, les String en varchar(255) et les LocalDateTime en timestamp. | [#cfec8c62cdded2b8-1] |
| `mytimeline:backend/src/main/resources/db/migration/V2__unique_constraints.sql:1-2` | Commentaire : Chaque fichier de migration commence par un bloc de commentaires encadré de lignes de signes égal, qui donne le nom du fichier, un titre suivi du numéro d'issue, puis le contexte. | [#40eb238b512fd73b-1] |
| `mytimeline:backend/src/main/resources/db/migration/V2__unique_constraints.sql:13-17` | Les contraintes UNIQUE sont posées après coup par ALTER TABLE ADD CONSTRAINT avec un nom stable de la forme uq_<table>_<colonne>. | [#c40a4f8b041c44a5-1] |
| `mytimeline:backend/src/main/resources/db/migration/V3__add_audit_columns.sql:16-19` | Les colonnes d'audit sont ajoutées par ALTER TABLE avec created_at et updated_at en timestamp not null default now(), mappées @CreatedDate et @LastModifiedDate. | [#87c989e06096a13a-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:28` | Commentaire : Une migration déjà appliquée n'est jamais éditée : chaque changement passe par un nouveau fichier VN__description.sql qui ne touche que sa propre version. | [#ad7b571da89bac44-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:54` | Sur une base peuplée, un bloc DO compte les lignes non conformes puis lève raise exception using message avant tout ALTER, sans coercition silencieuse des données. | [#a3f563bc2f9587a4-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:83-88` | Un CHECK est rejoué de façon idempotente par drop constraint if exists suivi de add constraint, avec un nom ck_<table>_<colonne>. | [#333e76b9ff028bb8-1] |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:88` | Un CHECK d'énumération sur une colonne nullable accepte NULL par la clause is null or placée devant le IN. | [#333e76b9ff028bb8-2] |
| `mytimeline:backend/src/main/resources/db/migration/V5__fk_indexes.sql:25-29` | Chaque colonne de clé étrangère reçoit un index nommé idx_<table>_<colonne>, créé avec create index if not exists pour rester rejouable. | [#b3fc78ae062be38b-1] |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql:40-42` | Une clé étrangère vers users est nommée fk_<table>_<reference> et déclare on delete cascade lorsque les lignes dépendent du compte. | [#565bd4a0b8a73ce3-1] |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql:46-53` | Commentaire : Chaque migration se termine par un bloc de commentaires ROLLBACK manuel, qui précise que Flyway Community ne rejoue pas les undo, avec les drop if exists commentés. | [#b8094cb25528839b-1] |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:52` | Une unicité par propriétaire est posée comme UNIQUE composite (owner_id, name) avec un nom uq_<table>_<colonne>_<colonne>. | [#a8c81be131bb88ff-1] |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:31-68` | Une normalisation de données suit l'ordre drop check, UPDATE avec CASE sur lower(trim()) vers la valeur d'enum, neutralisation à NULL du reste, puis add constraint. | [#0049acf39aaa5953-1] |
