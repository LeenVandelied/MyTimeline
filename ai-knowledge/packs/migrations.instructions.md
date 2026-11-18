---
pack: migrations
kind: technical
name: Migrations de base de données
generated_at: 2026-11-18T12:00:00Z
generator: synth/1
base_sha256: 5c6c233df9a7f74143ac7de6f61b8b98877ea0aeafd0900431ed5ca050f96de2
facts_in_base: 34
facts_in_pool: 34
facts_cited: 18
sections: migrations.sections.json
details: [migrations.details.md]
lang: fr
curated_at: 2026-11-18T13:00:00Z
curation: migrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:backend/src/main/resources/db/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de V10, le schéma doit refléter exactement l'entité JPA, car ddl-auto=validate sur dev, test et prod casse le démarrage au moindre écart [#3123c3d1981e2538-1].
- Selon le commentaire de V4, une migration déjà appliquée n'est jamais éditée (checksum mismatch Flyway), tout changement passe par un nouveau fichier VN [#ad7b571da89bac44-1].
- Selon le commentaire de V1, les UNIQUE générées par Hibernate ne sont pas posées au baseline mais dans V2 avec un nom stable, pour que Flyway reste la source des contraintes nommées [#211589e73053149d-1].
### Nommage des objets
- Les contraintes UNIQUE s'appellent uq_table_colonne, et la composite sur categories s'appelle uq_categories_owner_name [#c40a4f8b041c44a5-1] [#a8c81be131bb88ff-1] [#dabdaea8fe1fb4ca-1].
- Les clés étrangères récentes vers users (V6, V13) s'appellent fk_table_reference avec on delete cascade, mais V1 et V8 ont des clés vers users sans cascade [#565bd4a0b8a73ce3-1] [#9a99540b375d30ed-1].
- Les index de clés étrangères sont nommés idx_table_colonne et créés avec if not exists dans V5, mais les migrations ultérieures ne suivent pas toujours cette forme [#b3fc78ae062be38b-1] [#e7d8e73c2ca02741-1].
### Contraintes et colonnes
- Un CHECK d'énumération sur colonne nullable commence par is null or, et un CHECK conditionnel utilise is not true pour que NULL ne bloque pas [#333e76b9ff028bb8-2] [#b835f993630cd219-1].
- Une colonne d'énumération est un varchar borné par un CHECK in, en majuscules pour les enums récents (V9, V13) mais en minuscules dans V4 et V16 [#145dc0442b68f3c1-1].
### Durcissement des données existantes
- Dans certaines migrations, les lignes incohérentes sont neutralisées par UPDATE avant le CHECK ou le not null. D'autres préfèrent échouer sur un contrôle préalable sans corriger les données [#6d2386c8809cdfd6-1] [#1c7402a0f5b734f9-1] [#0049acf39aaa5953-1].
### Vérifié dans le code
- Dans UserServiceImpl.deleteAccount, purger categoryRepository.deleteAllByOwnerId avant userRepository.deleteById, car fk_categories_owner (V8) n'a pas de on delete cascade [#timeline/7266d27459251abe-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:116-120`.

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (10 sur 15), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql` | 5 | convention 5 |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql` | 5 | convention 4, config 1 |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql` | 4 | config 1, convention 1, other 1 |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V1__baseline.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V2__unique_constraints.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 2 | convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 28 | 18 |  |

- Faits du pool par pack d'origine : timeline 28, migrations 6

## 8. Tests attendus {#tests}

Aucun fait de la base ne relève de cette section.

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Le commentaire de `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:28` réserve le numéro V10 (#158), alors que V10__create_sessions.sql existe dans le lot, donc qui s'y fie risque de mal numéroter ou de croire un numéro bloqué ⇒ Se fier à la liste réelle des fichiers de migration et non à ce commentaire périmé [#dbd260bc254e104d-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 16 ; avec au moins un fait en base : 15 ; sans fait après remise en file : 0.
- Faits en base : 34, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 34 dans le pool.
- Faits du pool venus d'un autre pack : 28 (par pack : section Relations).
- Destination des 34 faits du pool : Conventions 29 ; Alertes / Questions ouvertes 2 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 2.
- Passe technique : scope 16 fichiers, lus 15 (93 %), non lus 1 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 5c6c233df9a7…, générée le 2026-11-17.
