# Issue #28 — DONE

**Titre :** [REFACTOR] Refondre EventController.updateEvent avec DTO typé
**Vague :** V1 | **Modèle :** opus/high | **Commit :** 1c308ba

## Résumé
- Remplacé `Map<String,Object>` par DTO typé `EventUpdateRequest` (`@Valid`) sur `PATCH /api/events/{id}`.
- Introspection manuelle (containsKey/instanceof/casts) supprimée du controller (67→4 lignes), mapping déplacé en couche service `EventServiceImpl.updateEvent(UUID, EventUpdateRequest)`.
- Champs DTO (croisés code réel, pas l'issue) : title, type, durationValue, durationUnit, isRecurring, recurrenceUnit, backgroundColor, borderColor, textColor. productId préservé via originalProductId+setProduct.
- **Décision clé :** `@Size(min=1,max=100)` sur title (PAS `@NotBlank`) → rejette "" (400) mais tolère absence (null) car le path front `updateEventColor` envoie les couleurs seules sans title. Service applique chaque champ si `!= null`.
- 400 "titre vide" garanti via `@Valid` → `MethodArgumentNotValidException` → handler Spring défaut (pas besoin de GlobalExceptionHandler, qui arrive en #30).
- Frontend : AUCUNE modif nécessaire (contrat JSON identique).

## Fichiers
- `application/dtos/EventUpdateRequest.java` (créé)
- `infrastructure/adapters/controllers/EventController.java` (updateEvent réduit)
- `application/services/EventServiceImpl.java` (+updateEvent)
- `domain/ports/services/EventService.java` (+signature)
- `test/.../application/services/EventServiceImplTest.java` (créé, 5 tests)

## Tests
`mvn -Dtest=EventServiceImplTest test` → 5/5 verts. `mvn compile` OK.

## Signaux mémoire
- [MEMORY:pitfall] Avant de poser `@NotBlank` sur un DTO de PATCH, vérifier TOUS les call-sites front : un PATCH partiel légitime peut omettre le champ. Ici `@Size(min=1)` + application conditionnelle `if(!=null)`.
- [MEMORY:decision] Mapping introspectif déplacé controller→service (hexagonal, surface minimale avant #30/#31).

## Recommandations suite
- RECOMMAND_REVIEWER : contrat REST P0 modifié — review du diff (décision @Size vs critère "titre vide→400").
- Pas de RECOMMAND_DB_EXPERT (aucun schéma/migration).
- BR-EVE-008 (IDOR ownership) explicitement reporté à #30.

STATUS: COMPLETED
