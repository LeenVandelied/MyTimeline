---
pack: migrations
kind: technical
name: Migrations de base de données
generated_at: 2026-11-17T10:36:11Z
generator: synth/1
base_sha256: 7f22e3334fbc8cf51ee7e29c7a2aca43393878bf4bb3f017b69f4be4ab865faa
facts_in_base: 34
facts_in_pool: 34
facts_cited: 18
sections: migrations.sections.json
details: [migrations.details.md]
lang: fr
curated_at: 2026-11-17T10:45:42Z
curation: migrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:backend/src/main/resources/db/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Données existantes
- Voir `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:54` (pointeur, détail en annexe) [#a3f563bc2f9587a4-1].
- Voir `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql:55-64` (pointeur, détail en annexe) [#6d2386c8809cdfd6-1] [#1c7402a0f5b734f9-1] [#0049acf39aaa5953-1].
- Voir `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql:83-88` (pointeur, détail en annexe) [#333e76b9ff028bb8-1] [#b3fc78ae062be38b-1].
- Une migration sur table peuplée pose set local lock_timeout à 5 secondes en tête pour échouer vite [#58bbdf47e30dcfc8-1].
### Contraintes et index
- Un CHECK conditionnel se nomme ck_<table>_<colonne>_required et utilise is not true pour traiter NULL comme absence de condition [#b835f993630cd219-1].
- Un CHECK d'énumération sur colonne nullable place is null or devant le IN [#333e76b9ff028bb8-2], une énumération est un varchar borné et not null [#145dc0442b68f3c1-1].
- Les clés étrangères se nomment fk_<table>_<reference> et déclarent on delete cascade quand les lignes dépendent du compte [#565bd4a0b8a73ce3-1] [#9a99540b375d30ed-1].
- Voir `mytimeline:backend/src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql:18` (pointeur, détail en annexe) [#e7d8e73c2ca02741-1].
### Colonnes
- Voir `mytimeline:backend/src/main/resources/db/migration/V3__add_audit_columns.sql:16-19` (pointeur, détail en annexe) [#87c989e06096a13a-1] [#d3007a27b545f1b8-1].
- Voir `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:37-41` (pointeur, détail en annexe) [#61b42db9757c6a8e-2].

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
| timeline | 0 | 18 |  |

- Faits du pool par pack d'origine : timeline 28, migrations 6

## 8. Tests attendus {#tests}

Aucun fait de la base ne relève de cette section.

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Voir `mytimeline:backend/src/main/resources/db/migration/V8__category_ownership.sql:37-39` (pointeur, détail en annexe) [#dbca7a316c0c1c8c-1].
- Voir `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:28` (pointeur, détail en annexe) [#dbd260bc254e104d-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 16 ; cités par au moins un fait : 15 ; non cités définitifs : 0.
- Faits en base : 34 ; dans le pool après déduplication : 34 (dont 0 repris d'autres packs) ; cités dans ce pack : 18 ; en annexe : 32 ; ni cités ni en annexe : 0 ; écartés (sorte `other`) : 2.
- Fichiers dont au moins un fait est cité ici : 12 sur 16.
- Passe technique : scope 16 fichiers, lus 15 (94 %), non lus 1 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 7f22e3334fbc…, générée le 2026-11-17.
