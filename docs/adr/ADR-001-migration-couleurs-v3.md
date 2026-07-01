# ADR-001 — Migration des couleurs d'événement vers un champ unique (design v3)

- Statut : Accepté
- Date : 2026-07-01
- Contexte : Sprint 9, issue #44 (Alignement modèle métier sur design v3)
- Migration Flyway associée : `V7__design_v3_schema.sql`

## Contexte

`EventEntity` portait trois champs couleur distincts — `backgroundColor`,
`borderColor`, `textColor` (colonnes `background_color`, `border_color`,
`text_color`, `varchar(255)` nullables, aucune validation de format hex côté
backend, cf. BR-EVE-009). Le design v3 n'utilise plus qu'**une seule couleur**
par événement. Le modèle doit donc consolider ces trois champs en un unique
champ `color`.

## Décision

1. **Couleur survivante = `backgroundColor`.** La migration recopie
   `background_color` dans la nouvelle colonne `color`, puis **supprime** les
   trois colonnes legacy (`background_color`, `border_color`, `text_color`).
   `borderColor` et `textColor` sont **définitivement perdus** — ce sont des
   attributs de présentation secondaires, `backgroundColor` porte la couleur
   dominante de l'événement dans les vues v3.

2. **Migration irréversible.** Flyway Community ne rejoue pas d'undo, et même un
   rollback manuel ne peut PAS restaurer `border_color` / `text_color` (données
   effacées). Le bloc ROLLBACK documenté en fin de `V7` ne restaure que
   `background_color` depuis `color`.

3. **Backfill `archived = false`.** Les nouvelles colonnes `archived`
   (`events`, `products`) sont `NOT NULL DEFAULT false`. Les lignes existantes
   sont donc backfillées à `false` (BR-EVE-011 : « actif = non archivé »).

4. **`recurrence_unit` texte libre -> enum `RecurrenceUnit{WEEK,MONTH,YEAR}`.**
   Les anciennes valeurs (`weeks`/`months`/`years`, CHECK posé en V4) sont
   converties vers les noms de constantes (`WEEK`/`MONTH`/`YEAR`,
   `@Enumerated(EnumType.STRING)`). Le CHECK V4 est remplacé par un CHECK aligné
   sur l'enum. Un pré-vol échoue tôt si une valeur non convertible subsiste.

## Garde-fous

- **Pré-vol sur base peuplée** (pattern V4/#121) : la migration compte les
  `recurrence_unit` hors `{week(s)/month(s)/year(s)}` et lève une exception
  actionnable avant toute conversion.
- **Ne PAS exécuter contre une base de prod** sans validation métier de la perte
  de `border_color` / `text_color`.
- `ddl-auto=validate` : les colonnes ajoutées matchent exactement le mapping JPA
  (nullability, types varchar/boolean/date).

## Conséquences

- Le contrat des DTO events change de forme couleur (`backgroundColor` +
  `borderColor` + `textColor` -> `color`) : `EventUpdateRequest` expose désormais
  `color`, `recurrenceEndDate`, `archived`. La synchronisation Zod frontend est
  **reportée aux sprints S10/S11** (issue #44 = backend only).
- `recurrenceUnit` côté DTO reste une `String` (tolérante casse/pluriel via
  `RecurrenceUnit.fromString`) pour rester rétro-compatible avec le contrat
  frontend actuel en attendant le réalignement Zod.
- Débloque S10 (#50 `archived`), S12 (#54 enum + `recurrenceEndDate`),
  S13 (#73/#78 `avatar`).
