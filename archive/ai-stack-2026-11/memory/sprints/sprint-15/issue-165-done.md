# Issue #165 — DONE

**Titre :** [REFACTOR] Events : DTO EventResponse + port EventService sans DTO applicatif + adapter câblé sur le port
**Vague :** V1 | **Taille :** S | **Modèle :** opus-high
**Commits :** b9878cabac1a02beb3b1672f20b7edce107f2827

## Résumé
3 violations hexagonales du domaine events corrigées + POST /api/events renvoie 201.
- Port `EventService` : signatures = commandes domaine pures (`EventCreateCommand`/`EventUpdateCommand`, records dans `domain/models/`), plus aucun import `application.*` sous `domain/`.
- `EventController` : mappe DTO HTTP → commande, renvoie `EventResponse`, POST 201.
- `EventRepositoryJpaImpl` : couplage à `ProductRepositoryJpaImpl` supprimé → `entityManager.getReference(ProductEntity.class, id)`.
- `EventResponse` : ajout du champ `archived`.

## BR touchées
BR-EVE-013 (archived exposé en réponse), BR-EVE-008 (ownership PATCH/DELETE **préservée**), BR-EVE-014/012/006 (validations update inchangées).

## Contrat EventResponse (source pour #150 V2)
| champ JSON | type | notes |
|---|---|---|
| id | UUID (string) | |
| title | String | mappe `Event.title` ; create reçoit `name` |
| type | String | "duration"/"single"/autre |
| durationValue | Integer | nullable |
| durationUnit | String | nullable ; "days"/"weeks"/"months"/"years" |
| isRecurring | Boolean | |
| recurrenceUnit | enum RecurrenceUnit sérialisé NOM | "WEEK"/"MONTH"/"YEAR", nullable |
| recurrenceEndDate | LocalDate "YYYY-MM-DD" | nullable |
| startDate | LocalDate "YYYY-MM-DD" | |
| endDate | LocalDate "YYYY-MM-DD" | |
| productId | UUID (string) | |
| isAllDay | Boolean | **nom JSON `isAllDay`**, nullable |
| color | String | nullable, pas de validation hex backend |
| archived | boolean primitif | toujours présent ; false au create |

## Fichiers clés
- `domain/models/EventCreateCommand.java` (NEW)
- `domain/models/EventUpdateCommand.java` (NEW)
- `domain/ports/services/EventService.java`
- `application/services/EventServiceImpl.java`
- `application/dtos/EventResponse.java`
- `infrastructure/adapters/controllers/EventController.java`
- `infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java`

## Tests
Backend complet 238/0/0 (`./scripts/test-quiet.sh backend`). Ajout test POST 201 + assertions corps EventResponse (`EventControllerOwnershipTest`).

## [MEMORY:*] signaux
- [MEMORY:pattern] Port domaine important des DTOs applicatifs → records commande pure dans `domain/models` ; controller mappe DTO HTTP→commande.
- [MEMORY:decision] `entityManager.getReference(ProductEntity.class, id)` pour la FK plutôt qu'injecter le port `ProductRepository` (qui ne renvoie que du domaine, inutilisable comme FK gérée). Aligné sur `ProductRepositoryJpaImpl.save`, supprime le couplage infra-infra.

## Recommandations suite
- RECOMMAND_FOLLOWUP: `domain/ports/services/ProductService.java` importe TOUJOURS `application.dtos.ProductCreationRequest`/`ProductUpdateRequest` (même violation, domaine products — #123 apparemment non finalisé). Même pattern de correction applicable. [triage S | domaine products]
- GET liste events (`ProductController.getEventsByProductId`) renvoie DÉJÀ `EventResponse` — rien à faire (anti-pattern du pack déjà résolu).

STATUS: COMPLETED
