# Issue #44 — Alignement modèle métier sur design v3

**Sprint :** 9 | **Vague :** 1 | **Taille :** L | **Domaine :** events

## Commits
- `eb3621b`

## Résumé
Aligner le modèle métier backend sur le design v3.
- **Migration réelle : V7** (dernière existante = V6, plan confirmé).
- Enum `domain/models/RecurrenceUnit.java` (WEEK/MONTH/YEAR + `fromString` tolérant casse/pluriel legacy).
- Domain models : `Event` (3 couleurs→`color`, `recurrenceUnit`→enum, +`recurrenceEndDate`+`archived`), `Category` (+color/description), `Product` (+archived/color), `User` (+avatar).
- Entities JPA : `EventEntity` (`@Enumerated(STRING)` recurrence_unit, `archived` NOT NULL), `CategoryEntity`, `ProductEntity`, `UserEntity`.
- Migration `V7__design_v3_schema.sql` : pré-vol recurrence_unit, consolidation couleurs, DROP CHECK V4 → conversion `weeks/months/years`→`WEEK/MONTH/YEAR` → nouveau CHECK, DROP border/text_color, backfill archived=false.
- Mappers (Event/Category/Product/User) + `EventServiceImpl`/`ProductServiceImpl` (`RecurrenceUnit.fromString`) + DTO `EventUpdateRequest` (color/recurrenceEndDate/archived).
- ADR : `docs/adr/ADR-001-migration-couleurs-v3.md`.

## BR impactées
- BR-EVT-001 (propriété événement inchangée — `archived` ne contourne pas l'ownership, aucun endpoint modifié).
- BR-CAT-001 (unicité nom catégorie par user inchangée).
- BR-EVE-006 (enum RecurrenceUnit introduit), BR-EVE-011 (`archived` = base "actif = non archivé").

## Pitfalls gérés
1. **V4 posait `ck_events_recurrence_unit CHECK IN ('weeks','months','years')`** bloquant la conversion vers l'enum → V7 le DROP avant conversion et repose un CHECK aligné.
2. `ddl-auto=validate` (test/dev) : colonnes V7 matchées exactement au mapping JPA — validé au boot Testcontainers.
3. **Data-loss avatar** : 3 reconstructions `new User` (changePassword, resetPassword, updateProfile) écrasaient l'avatar à null → corrigées via constructeur 7-arg préservant `caller.getAvatar()`.
4. `durationUnit` (String libre) NON touché — distinct de `recurrenceUnit` (enum).

## Tests
- **84 passed / 0 failed** (`./scripts/test-quiet.sh backend`, inclut intégration Flyway V1→V7 + validate sur Postgres jetable). Domain sans import framework (hexagonal OK).

## Signaux mémoire
- `[MEMORY:decision]` ADR-001 : `backgroundColor` = couleur survivante dans `color` ; `borderColor`+`textColor` SUPPRIMÉS définitivement (irréversible). Backfill `archived=false`.
- `[MEMORY:pitfall]` CHECK legacy V4 bloque conversion enum → `DROP CONSTRAINT IF EXISTS` avant l'UPDATE puis reposer le CHECK aligné. Grep `ck_` avant de migrer une colonne enum-isée.
- `[MEMORY:pattern]` Ajouter un champ à un domain model immuable reconstruit par `new X(...)` en plusieurs sites → auditer TOUS les `new X(` (grep) pour propager le champ dans les reconstructions read-modify-persist, sinon data-loss silencieuse au save.

## Recommandations suite
- **RECOMMAND_FOLLOWUP (S10/S11)** : sync Zod frontend — contrat DTO events changé (`backgroundColor`+`borderColor`+`textColor` → `color`), `EventUpdateRequest` expose `recurrenceEndDate`/`archived`. `recurrenceUnit` reste `String` côté wire (tolérant via `fromString`) mais frontend devra migrer vers `WEEK/MONTH/YEAR`. `UserResponse` n'expose PAS encore `avatar` (S13).
- Note : `EventCreationRequest` non modifié — le create ne set pas `color`/`archived`/`recurrenceEndDate`, à enrichir S10/S11 si le design le requiert au create.
- **RECOMMAND_DB_EXPERT** (implicite, migration IRRÉVERSIBLE avec manip CHECK constraint) : review V7 par db-expert avant PR.

STATUS: COMPLETED
