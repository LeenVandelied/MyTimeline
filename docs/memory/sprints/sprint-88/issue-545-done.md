# Issue #545 — done (S88, fullstack-dev)

## Résumé
Commit `6cc9d73` (`git log --oneline -1 -- README.md`), non poussé. Doc seule : README piège n°5, PIT-S37-003 et PIT-S47-003 corrigés en place, packs pit-* régénérés. Aucun fichier `backend/**`, `.github/**`, `docker-compose.yml` touché. Aucune opération destructive sur une base du dev.

Cause **observée puis reproduite** : la base `eventmanager` (PostgreSQL 14.16 Homebrew, `127.0.0.1:5432`, atteinte par le `DB_URL` par défaut) porte des CHECK legacy à nom auto Postgres (`events_recurrence_unit_check`, `events_duration_unit_check`, `events_type_check`, `users_role_check`), créés hors Flyway ; schéma adopté par `baseline-on-migrate` (rang 1 = `<< Flyway Baseline >>`). V4 ne `drop if exists` que les noms `ck_*`. V7:85-97 retire `ck_events_recurrence_unit` puis passe `weeks`→`WEEK` : rejet par `events_recurrence_unit_check` (minuscules), rollback, base en V6. Données convertibles (weeks×1, years×2, NULL×16) → le pré-vol V7 passe ; V9 ne corrigerait rien (même drop limité à `ck_*`). PIT-S47-003 était donc faux sur deux points.

## Fichiers de contexte lus
- `backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql` — l.23-24 « IDEMPOTENCE… DROP CONSTRAINT IF EXISTS », l.91-96 `ck_events_recurrence_unit`
- `backend/src/main/resources/db/migration/V7__design_v3_schema.sql` — pré-vol l.32-47, drop l.85-86, update l.88-97, add l.99-101
- `backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` — l.32-33 drop `ck_events_recurrence_unit` seul
- `backend/src/main/resources/db/migration/V1__baseline.sql` — l.43-59 `create table events` (colonnes NOT NULL pour la repro)
- `backend/src/main/resources/db/migration/V11__*.sql`, `V12__*.sql` — grep `constraint` (V12:52 `role in ('ROLE_USER','ROLE_ADMIN')`)
- `backend/src/main/resources/application.properties` — l.13 `DB_URL` default `localhost:5432/eventmanager`, l.26 `baseline-on-migrate=true`
- `backend/pom.xml` — l.66/111 Flyway 11.7.2 (tag d'image choisi en conséquence)
- `.github/workflows/ci.yml` — job `flyway-smoke` l.649-770 : PG16 vierge, boot jar profil dev, vérif `applied == nb V*.sql` et première version = 1
- `README.md` — `## Pièges connus` l.103-203 (sections 1-4, ton et format)
- `docs/memory/pitfalls.md` — l.303-304 PIT-S37-003, l.405-406 PIT-S47-003
- `.ai-env/tools/gen-pit-packs.sh` — l.1-40 (usage, `--check`)
- `.ai-env/context-packs/pit-backend.md` — grep `Flyway|baseline|eventmanager_e2e` : l.213, 466 (PIT-S72-003 immutabilité des migrations), 745, 752-753, 787. Pas lu en entier.

## Preuves
**AC3 — base vierge** : conteneur jetable `s88-545-pg` (`postgres:16`, 16.15, `127.0.0.1:5499`), image `flyway/flyway:11.7.2`, migrations montées en `:ro`. Maven NON exécuté.
```
docker run --rm --network container:s88-545-pg -v "$PWD/backend/src/main/resources/db/migration:/flyway/sql:ro" flyway/flyway:11.7.2 -url=jdbc:postgresql://localhost:5432/eventmanager -user=eventuser -password=*** -locations=filesystem:/flyway/sql migrate
→ Successfully applied 15 migrations to schema "public", now at version v15 (execution time 00:00.080s)
flyway_schema_history : 15 succès, min=1, max=15
```
CI : `gh run view 34769112837` → conclusion success, headSha `77666e7e…`, job `flyway-smoke` success.

**AC1 — reproduction (REPRODUIT, pas déduit)** sur base `repro2` du même conteneur : `migrate -target=6` ; `alter table events add check (recurrence_unit in ('weeks','months','years'))` (nom auto obtenu = `events_recurrence_unit_check`) ; 1 user/category/product + 1 event `recurrence_unit='weeks'` ; `migrate` :
```
flyway exit=1
Migrating schema "public" to version "7 - design v3 schema"
ERROR: Migration of schema "public" to version "7 - design v3 schema" failed! Changes successfully rolled back.
SQL State  : 23514
Message    : ERROR: new row for relation "events" violates check constraint "events_recurrence_unit_check"
Location   : /flyway/sql/V7__design_v3_schema.sql   Line : 88
flyway_schema_history après : versions 1..6 seulement
```
Variante `repro2_empty` (même CHECK, aucune ligne récurrente) : V7..V15 passent (`Successfully applied 9 migrations`), la contrainte legacy survit, puis `insert … recurrence_unit='WEEK'` → `violates check constraint "events_recurrence_unit_check"`. Symptôme latent documenté dans le README.
Écart : la repro part de V1 exécutée (pas d'une ligne BASELINE) ; sans effet sur le comportement de V7. Les autres CHECK legacy (`events_duration_unit_check`, `events_type_check`, `users_role_check`) n'ont PAS été ajoutés à la repro → leur effet sur V8..V15 de la vraie base est NON VÉRIFIÉ.
Deux premières bases `repro`/`repro_empty` invalides (setup SQL non exécuté, `$P` non découpé par zsh) — écartées, détruites avec le conteneur. `docker rm -f s88-545-pg` fait (0 conteneur restant).

**AC2/AC5 — base réelle du poste, LECTURE SEULE** (`PGOPTIONS='-c default_transaction_read_only=on'`, `psql -h 127.0.0.1 -p 5432`, rôle `herrh`) :
- bases : `eventmanager`, `eventmanager_e2e`, `eventmanager_flywaytest`, `eventmanager_s79`
- `eventmanager` : rang 1 `<< Flyway Baseline >>` BASELINE (2026-06-25), V2-V3 (2026-06-25), V4-V6 (2026-07-13) ; contraintes `%recurrence_unit%` = `events_recurrence_unit_check` CHECK in (weeks,months,years) + `ck_events_recurrence_unit` ; valeurs NULL×16, weeks×1, years×2 ; colonnes `background_color/border_color/text_color` (pré-V7)
- `eventmanager_e2e` : V1..V15 (V1 type SQL, pas BASELINE), `ck_events_recurrence_unit` MAJ + `_required`
- `eventmanager_s79` : V1..V15 appliquées 2026-09-06, 11 events, contraintes propres
- `eventmanager_flywaytest` : V1-V2 seulement (base orpheline, hors scope, non documentée dans le README)
- Postgres Compose (`mytimeline_postgres-data`) : **NON OBSERVÉ** (pile non démarrée, conformément au briefing)

**gen-pit-packs** :
```
bash .ai-env/tools/gen-pit-packs.sh        → [gen-pit-packs] OK : pit-backend.md (§1+§2 = 142/79, 116309 o) · pit-frontend.md (§1+§2 = 261/97, 195934 o) ; exit 0
bash .ai-env/tools/gen-pit-packs.sh --check → [gen-pit-packs] OK : packs à jour ; exit 0
```
Diff commit : README +66, pitfalls.md 4 lignes modifiées, pit-backend.md/pit-frontend.md 2 lignes chacun (titres).

## Couverture des AC
- AC1 reproduire + message exact : **fait** — reproduit sur PG16 jetable, message capturé (SQLSTATE 23514, V7 l.88). Sur la vraie base : non rejoué (lecture seule imposée), mais contrainte et données observées cohérentes avec la repro.
- AC2 cause : **fait** — CHECK legacy à nom auto hors Flyway + V4/V7/V9 qui ne droppent que `ck_*`. Origine exacte de la contrainte (ancien `ddl-auto=update` ?) : **déduite, non prouvée**.
- AC3 chemin V1..V15 sur base vide : **fait** — 15 migrations appliquées localement + flyway-smoke vert (run 34769112837). Aucun code nécessaire : le chemin n'était pas cassé.
- AC4 écart CI/local : **fait** — flyway-smoke = base vierge, n'a jamais la contrainte legacy ; documenté README §5 et PIT-S47-003.
- AC5 `eventmanager_s79` : **fait (doc)** — observé V15 propre, documenté comme contournement jetable, non supprimé (pas d'accord dev). `eventmanager` du dev laissé intact.

## Signaux mémoire
[MEMORY:pitfall] Context: #545, V7 échoue sur `events_recurrence_unit_check` d'une base adoptée par baseline — une contrainte CHECK sans nom reçoit un nom auto `<table>_<col>_check` que `drop constraint if exists ck_*` ne touche jamais. Solution: diagnostiquer via `pg_constraint` par colonne, base neuve dédiée. Prevention: toute migration « de réconciliation legacy » cherche les contraintes par `conrelid`+définition, pas par nom supposé ; tester sur un schéma portant la contrainte sans nom, pas seulement sur base vierge.
[MEMORY:pitfall] Context: S88 repro #545 — `P="docker exec … psql"; $P <<SQL` ne s'exécute pas sous zsh (pas de word-splitting, `command not found`) et la suite du script continue : la migration a « réussi » sur une repro vide de sens. Solution: fonction shell `q() { docker exec … "$@"; }`. Prevention: jamais de commande dans une variable sous zsh ; vérifier l'état préparé (lister les contraintes) AVANT de lancer l'étape testée.
[MEMORY:bug] Cause: PIT-S47-003 attribuait l'échec V7 à des données invalides « que V9 nettoierait » sans lire `pg_constraint` ni les valeurs ; les données étaient convertibles. Solution: PIT corrigé en place S88. Rule: un diagnostic de migration cite la contrainte ET les valeurs lues, sinon il est marqué déduit.

## Recommandations suite
RECOMMAND_DB_EXPERT: non — aucune migration à écrire ; seule question ouverte = effet des CHECK legacy `events_duration_unit_check`/`events_type_check`/`users_role_check` sur V8..V15 de la vraie base, sans enjeu tant qu'elle n'est pas migrée.
RECOMMAND_TEST_RUNNER: non — doc seule, aucun test impacté.
RECOMMAND_DEV_DECISION: oui — sort de `eventmanager`, `eventmanager_s79`, `eventmanager_flywaytest` (suppression éventuelle = décision du dev, non faite).
RECOMMAND_README_FOLLOWUP: oui — README §3 affirme « La CI est déjà en `workers: 1` », périmé depuis S80 (CI en `workers: 2`), hors scope #545.

STATUS: COMPLETED
