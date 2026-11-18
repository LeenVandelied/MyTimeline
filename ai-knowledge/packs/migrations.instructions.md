---
pack: migrations
kind: technical
name: Migrations de base de données
generated_at: 2026-11-18T16:18:53Z
generator: synth/1
base_sha256: 97b9d56efbdded744270c8237af9a5384aaa74a3c75f0ff0789aa2686a136256
facts_in_base: 34
facts_in_pool: 32
facts_cited: 19
sections: migrations.sections.json
details: [migrations.details.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
curation: migrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:backend/src/main/resources/db/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de V10, le DDL d'une migration reflète exactement l'entité JPA, sinon ddl-auto=validate fait échouer le démarrage. [#3123c3d1981e2538-1]
- Selon le commentaire de V10, une migration déjà appliquée ne s'édite jamais (checksum Flyway), on crée la suivante. [#7d7f55ca4eff580f-1]
- Les migrations à partir de V4 se terminent par un bloc ROLLBACK manuel en commentaire, mais les migrations les plus anciennes (V1 à V3) n'en ont pas [#6d459d14ec7f191d-1]
- Selon le commentaire de V16, un CHECK est toujours nommé, jamais anonyme, pour pouvoir le retirer par drop constraint if exists. [#61b42db9757c6a8e-1]
### Migrations sur base peuplée
- Une migration qui modifie une table peuplée pose set local lock_timeout avant l'ALTER, pour échouer vite plutôt que bloquer les lectures. [#58bbdf47e30dcfc8-1]
- Selon le commentaire de V4, une réconciliation doit être rejouable, avec drop constraint if exists puis add constraint. [#5bf5a7c95c5d2f4e-1] [#61b42db9757c6a8e-2]
- Un durcissement de colonne suit l'ordre update d'assainissement, set not null, puis drop et add constraint ck_<table>_<colonne>. [#3605201ef7021a79-1]
- Les changements d'une même table se groupent dans un seul alter table. [#87c989e06096a13a-1] [#cfe9ab975c506d34-1]
### Nommage et types
- Les colonnes à valeurs fixes sont des varchar avec un check in (...) nommé ck_<table>_<colonne>, aligné sur l'enum du domaine. [#0d35a3f07d65299e-1] [#2ba364275f766ca5-1]
- Un check conditionnel sur booléen nullable s'écrit avec is not true. [#b835f993630cd219-1]
- Les index sont nommés uq_ (unique) ou idx_ (simple), chaque clé étrangère a son index, créé avec if not exists. [#dabdaea8fe1fb4ca-1] [#b3fc78ae062be38b-1]
- Les contraintes uniques sont nommées uq_ explicitement, pas par le nom automatique d'Hibernate. [#c40a4f8b041c44a5-1]
- Les tables ont une PK uuid nommée id et des dates en timestamp. [#1db02bb72eb663ff-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (9 sur 15), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql` | 5 | convention 5 |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` | 3 | suspicious 2, convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql` | 3 | convention 3 |
| `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql` | 2 | convention 1, suspicious 1 |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V13__export_jobs.sql` | 2 | convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V3__add_audit_columns.sql` | 2 | convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 27 | 17 |  |

- Faits du pool par pack d'origine : timeline 27, migrations 5

## 8. Tests attendus {#tests}

Aucun fait de la base ne relève de cette section.

## 9. Questions ouvertes {#questions}

- La casse des valeurs d'enum dans les checks est-elle voulue, sachant que le check de récurrence passe en majuscules alors que d'autres migrations du lot utilisent des minuscules ? La base montre WEEK, MONTH, YEAR en majuscules dans `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:68`. [#29933d39a46bb560-1]
- Le préfixe d'index ix_ est-il une exception ou une convention en transition, puisque les autres index simples du lot utilisent idx_ ? La base montre un index ix_ dans `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:43`. [#930e9c69d71916bc-1]

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 16 ; avec au moins un fait en base : 15 ; sans fait après remise en file : 0.
- Faits en base : 34, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -2, soit 32 dans le pool.
- Faits du pool venus d'un autre pack : 27 (par pack : section Relations).
- Destination des 32 faits du pool : Conventions 24 ; Alertes / Questions ouvertes 4 ; annexe seule 2 ; écartés (sorte `other` ou inconnue) 2.
- Passe technique : scope 16 fichiers, lus 15 (93 %), non lus 1 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 97b9d56efbdd…, générée le 2026-11-18.
