# Issue #150 — DONE

**Titre :** [FRONTEND] Sync Zod/types frontend sur le nouveau contrat DTO events v3
**Vague :** V2 | **Taille :** M | **Modèle :** opus-high
**Commits :** 874c757

## Résumé
Sync des schémas Zod / types frontend sur le contrat `EventResponse` v3 livré par #165.

## Champs Zod migrés (avant → après)
- `backgroundColor`+`borderColor`+`textColor` → `color` unique (nullable) [BR-EVE-009]
- `recurrenceUnit` enum(weeks/months/years) → enum(WEEK/MONTH/YEAR) MAJUSCULE [BR-EVE-006]
- `allDay` → `isAllDay` (nullable) dans eventSchema + mapToFullCalendarEvent [BR-EVE-010]
- ajout `recurrenceEndDate` (string nullable) + `archived` (boolean requis en read, optional en edit) [BR-EVE-012/013]
- `color` ajouté à eventCreationSchema [BR-EVE-014]
- `durationValue`/`durationUnit` passés nullable dans eventSchema

## Refines conditionnels
- `isRecurring===true` → `recurrenceUnit` requis (creation + edit) [BR-EVE-006]
- `recurrenceEndDate < startDate` rejeté (>= autorisé) [BR-EVE-012]

## BR touchées
BR-EVE-006, BR-EVE-009, BR-EVE-010, BR-EVE-012, BR-EVE-013, BR-EVE-014.

## Fichiers clés
- `frontend/src/types/event.ts` (source de vérité Zod + mapToFullCalendarEvent + FullCalendarEvent)
- `frontend/src/components/EventEditForm.tsx` (dédup schéma, picker couleur unique)
- `frontend/src/components/EventContent.tsx` (state couleur unique)
- `frontend/src/components/calendar/TimelineCalendar.tsx` (`event.borderColor`→`event.color`)
- `frontend/src/services/eventService.ts` (`updateEventColor` envoie `{color}`)
- `frontend/public/locales/{fr,en,es,de}/products.json` (clé `products.details.color`)
- `frontend/src/types/event.test.ts` (NEW, 15 tests)

## Tests
Vitest event.test.ts 15/0 ; suite complète 85 passed / 16 files. `tsc --noEmit` OK, `next build` OK.

## [MEMORY:*] signaux
- [MEMORY:pattern] commitlint header-max-length:100 (gitmoji config) — garder header ≤100 char, pas de liste de champs dans le header.
- [MEMORY:pattern] `next build` (ESLint strict) échoue là où vitest+tsc passent (ex. `no-unused-vars`) — utiliser `delete obj.key` plutôt que destructure `{key: _key, ...rest}` dans les tests. Ne pas se fier au vitest vert pour valider le build.

## Recommandations suite
- RECOMMAND_FOLLOWUP: anciennes clés i18n `products.details.{backgroundColor,borderColor,textColor}` désormais inutilisées (laissées en place). [triage XS | domaine events/i18n]
- RECOMMAND_FOLLOWUP: `EventEditForm` n'expose pas de widget UI pour `recurrenceEndDate`/`archived` (typés au schéma mais pas d'input) — design requis pour édition PATCH complète. [triage S | domaine events]
- Socle `data-testid`/formulaire event inchangé fonctionnellement pour #163 (E2E).

STATUS: COMPLETED
