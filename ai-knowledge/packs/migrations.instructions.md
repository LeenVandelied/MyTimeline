---
pack: migrations
kind: technical
name: Migrations de base
generated_at: 2026-11-24T17:40:00
generator: synth/1
base_sha256: fd0e93169b94b58b466bfc5fccfebb7fb198c35a780848766a5780aea8d69240
facts_in_base: 36
facts_in_pool: 36
facts_cited: 21
sections: migrations.sections.json
details: [migrations.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
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
- Selon les commentaires de V5 et V17, une migration appliquée n'est jamais éditée (checksum Flyway), tout changement passe par un nouveau fichier V{N}. [#b4c3437f3d5ac7fd-1] [#0561b3b3607e0fc6-1]
- Selon le commentaire de V10, le schéma reflète exactement l'entité JPA, car ddl-auto=validate est actif. [#8fb5ac9e1a1bd779-1] [#a41fd867e19b6713-1]
- Selon les commentaires de V5 et V17, le rollback est un bloc de commentaire manuel en fin de fichier, sans undo. [#ea5494905e3041ae-1] [#cb73ba0b5b893e48-1]
- Selon le commentaire de V13, les fichiers se nomment V{N}__description_snake_case.sql avec un en-tête (version, issue, objet). [#6c3f33bf03f6d301-1]
### Contraintes et nommage
- Un CHECK conditionnel sur booléen nullable s'écrit avec is not true pour laisser passer NULL. [#40c035e935fae1d6-1]
- Les UNIQUE sont nommés uq_{table}_{colonne} et les clés étrangères fk_{table}_{cible}, avec on delete cascade pour les tables de sessions, jetons de réinitialisation et jobs d'export rattachées à un compte, mais pas pour toutes [#51d3cbc0f484b438-1] [#391e17b474f53011-1] [#a56e52c557fc0098-1]
- Une table est au pluriel snake_case avec id uuid. [#36e3dcb5b8dc6e04-1] [#fd36df130202be28-1]
### Tables existantes
- Dans les migrations de préférence de thème et de niveau utilisateur, un lock_timeout local de 5s précède l'ALTER, les autres migrations ne le posent pas [#60d03ad1ee427f99-1] [#ed0a32438c043501-1]
- Pour durcir une colonne, update d'assainissement, puis not null, puis CHECK nommé. [#f577509d29c8efd4-1] [#b7719716a7380b00-1]
- Sur base peuplée, un bloc do $$ lève une exception avant tout ALTER si des lignes sont non conformes. [#6368ffc6f56a88a7-1]
- Les tables auditées ont created_at, updated_at et version integer default 0. [#cc18856949ee1abb-1] [#20d423176902d752-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (8 sur 16), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/resources/db/migration/V17__user_tier.sql` | 10 | db_change 6, convention 3, suspicious 1 |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql` | 4 | convention 2, other 1, suspicious 1 |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql` | 3 | convention 2, suspicious 1 |
| `backend:src/main/resources/db/migration/V5__fk_indexes.sql` | 3 | convention 2, db_change 1 |
| `backend:src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V16__user_theme_preference.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 2 | convention 2 |
| `backend:src/main/resources/db/migration/V8__category_ownership.sql` | 1 | suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

- Faits du pool par pack d'origine : migrations 36

## 8. Tests attendus {#tests}

Aucun fait de la base ne relève de cette section.

## 9. Questions ouvertes {#questions}

- Le préfixe d'index à suivre pour une nouvelle clé étrangère est-il idx_{table}_{colonne} ou ix_ ? La migration V8 nomme l'index sur owner_id avec le préfixe ix_ (`backend:src/main/resources/db/migration/V8__category_ownership.sql:43`), alors que les autres migrations suivent idx_ [#5d29ca418c49ce28-1].

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 17 ; avec au moins un fait en base : 16 ; sans fait après remise en file : 0.
- Faits en base : 36, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 36 dans le pool.
- Faits du pool venus d'un autre pack : 0 (par pack : section Relations).
- Destination des 36 faits du pool : Conventions 22 ; Alertes / Questions ouvertes 1 ; annexe seule 11 ; écartés (sorte `other` ou inconnue) 2.
- Passe technique : scope 17 fichiers, lus 16 (94 %), non lus 1 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 fd0e93169b94…, générée le 2026-11-24.
