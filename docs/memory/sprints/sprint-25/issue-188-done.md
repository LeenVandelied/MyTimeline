# Issue #188 — done

commits: [dac7735b3bcfe75203c433e9ec5e4495d7e47362, 88d293782e8900a1a18ed550ff0c6e1077eb7fc7]

fix review MAJEUR archived defaultValues (88d2937):
- Cause: toggle toujours décoché en édition réelle — `archived` non porté par FullCalendarEvent, jeté par mapToFullCalendarEvent, absent des defaultValues EventContent.
- Fix: `archived?: boolean` ajouté à FullCalendarEvent.extendedProps (event.ts) + `archived: event.archived` dans mapToFullCalendarEvent + `archived: event.extendedProps?.archived ?? false` dans defaultValues EventContent.tsx:280. AJOUT frontend, contrat Zod/DTO inchangé (eventSchema.archived déjà l.32).
- Tests: mapToFullCalendarEvent propage archived (event.test.ts) + EventContent pré-remplit defaultValues.archived true/false (EventContent.test.tsx, mock EventEditForm étendu). `./scripts/test-quiet.sh frontend` → 344 passed / 0 failed. tsc clean.

resume:
- Scope: SEUL toggle `archived` exposé. `recurrenceEndDate` déjà livré (EventEditForm.tsx:330-349) — non touché.
- event.ts NON modifié : `archived: z.boolean().optional()` déjà présent dans buildEventEditSchema (l.179).
- Composant réutilisé: `ui/switch.tsx` (`Switch`, `.mt-switch`) — 1er usage réel. FormField/FormItem RHF (pattern isRecurring). `checked`/`onChange(e.target.checked)`.
- Placement: section `border-rule space-y-4 border-t pt-4` APRÈS bloc couleur/preview, AVANT submitState. Toujours visible (non conditionnel). testid `event-form-archived-toggle`.
- i18n: clé NOUVELLE `archived` sous `add.event.form` dans fr(Archivé)/en(Archived)/es(Archivado)/de(Archiviert). Pas de réutilisation `list.actions.archive`.
- Fichiers: EventEditForm.tsx, EventEditForm.test.tsx, public/locales/{fr,en,es,de}/products.json.
- Tests: `./scripts/test-quiet.sh frontend` → 328 passed (44 files), 0 failed. 3 nouveaux tests archived (visible+pré-rempli / togglable / PATCH transmet archived). tsc --noEmit clean sur fichiers touchés.

[MEMORY:pattern] Problem: exposer flag booléen soft-delete en form édition. Solution: DS `Switch` (role=switch natif) via FormField RHF `checked={field.value ?? false}` + `onChange={(e)=>field.onChange(e.target.checked)}`. Anti-pattern: réutiliser Checkbox (réservé isRecurring) ou label d'action i18n comme label d'état.

recommandations suite:
- RECOMMAND_FOLLOWUP: clarifier logique métier `archived=true` (BR-EVE-013 PATCH-only, BR-EVE-011 quota "actif"=non archivé). Le form n'implémente aucun effet de bord (pas de désactivation d'autres champs, pas de warning). À décider si UX doit signaler qu'archiver retire l'event des events actifs.
- NEGATIONS: pas de RECOMMAND_TEST_RUNNER (328 tests, 10.5s < 3min). pas de RECOMMAND_DB_EXPERT. pas de modif backend/event.ts. #77 (ConflictDialog) retouchera EventEditForm.tsx après — changements localisés section archived.

STATUS: COMPLETED
