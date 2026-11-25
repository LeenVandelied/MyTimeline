---
pack: migrations
kind: technical
name: Migrations de base
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: 3bd9bb6bb28b4ab74b570b812508347517ac257ecf5cf3b24bc17ee5bc03d9d4
facts_in_base: 26
facts_in_pool: 26
facts_cited: 19
sections: migrations.sections.json
details: [migrations.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: migrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : migrations
- Chemins : `^backend:src/main/resources/db/migration/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de V5, une migration déjà appliquée n'est jamais éditée (checksum Flyway), tout changement de schéma passe par un nouveau fichier V{N}. [#b4c3437f3d5ac7fd-1]
- Selon le commentaire de V10, le schéma d'une nouvelle table reflète exactement l'entité JPA, car ddl-auto=validate est actif en dev, test et prod. [#8fb5ac9e1a1bd779-1]
- Selon le commentaire de V13, les fichiers se nomment V{N}__description_en_snake_case.sql et s'ouvrent par un en-tête (version, issue, objet). [#6c3f33bf03f6d301-1]
- Les migrations qui suivent les trois premières se terminent par un bloc ROLLBACK manuel en commentaire, car Flyway Community ne rejoue pas les undo, mais les trois premières n'en ont pas [#ea5494905e3041ae-1]
### Contraintes
- Un CHECK se nomme ck_{table}_{colonne} et est précédé d'un drop constraint if exists, ce qui rend la migration rejouable. [#0bf834cf43bcb2f4-1]
- Dans un create table, les CHECK sont des constraint nommées dans la définition. [#a90b094c8792fdd0-1]
- Un CHECK conditionnel sur un booléen nullable s'écrit avec is not true, ce qui laisse passer NULL. [#40c035e935fae1d6-1]
- Un UNIQUE se pose par add constraint uq_{table}_{colonne}. [#51d3cbc0f484b438-1]
- Une clé étrangère se nomme fk_{table}_{...} et déclare on delete cascade pour une table rattachée à un compte. [#391e17b474f53011-1] [#a56e52c557fc0098-1]
### Table existante
- Une migration pose set local lock_timeout = '5s' avant son ALTER TABLE. [#60d03ad1ee427f99-1]
- Sur une base peuplée, un bloc do $$ contrôle les lignes non conformes et lève raise exception avant tout ALTER. [#6368ffc6f56a88a7-1]
- Durcir une colonne se fait dans l'ordre update d'assainissement, set not null, puis CHECK nommé. [#f577509d29c8efd4-1]
- Une colonne ajoutée utilise add column if not exists, avec le CHECK dans le même alter table. [#ed0a32438c043501-1]
- Une valeur texte se normalise par case lower(trim(...)) avec else conservant la valeur, puis un second update neutralise à null. [#b7719716a7380b00-1]
### Tables et colonnes
- Les tables auditées ont created_at, updated_at (timestamp not null default now()) et version integer not null default 0 pour @Version. [#cc18856949ee1abb-1] [#20d423176902d752-1]
- Une table est au pluriel en snake_case avec id uuid not null et primary key (id). [#36e3dcb5b8dc6e04-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (7 sur 15), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/resources/db/migration/V10__create_sessions.sql` | 4 | convention 2, other 1, suspicious 1 |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql` | 3 | convention 2, suspicious 1 |
| `backend:src/main/resources/db/migration/V5__fk_indexes.sql` | 3 | convention 2, db_change 1 |
| `backend:src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V16__user_theme_preference.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql` | 1 | suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

- Faits du pool par pack d'origine : migrations 26

## 8. Tests attendus {#tests}

Aucun fait de la base ne relève de cette section.

## 9. Questions ouvertes {#questions}

- Le préfixe d'index à suivre pour une nouvelle clé étrangère est-il idx_{table}_{colonne} ou ix_ ? La migration V8 nomme l'index sur owner_id avec le préfixe ix_ (`backend:src/main/resources/db/migration/V8__category_ownership.sql:43`), alors que les autres migrations suivent idx_ [#5d29ca418c49ce28-1].

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 16 ; avec au moins un fait en base : 15 ; sans fait après remise en file : 0.
- Faits en base : 26, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 26 dans le pool.
- Faits du pool venus d'un autre pack : 0 (par pack : section Relations).
- Destination des 26 faits du pool : Conventions 19 ; Alertes / Questions ouvertes 1 ; annexe seule 4 ; écartés (sorte `other` ou inconnue) 2.
- Passe technique : scope 16 fichiers, lus 15 (93 %), non lus 1 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 3bd9bb6bb28b…, générée le 2026-11-20.
