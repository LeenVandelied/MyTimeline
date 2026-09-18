# Issue #300 — Flux de création d'événement réel (drawer 452px)

commits: [de5e147]

resume:
- Objectif: remplacer le Dialog placeholder du shell par un vrai flux de création d'événement.
- `AppShell.tsx` : Dialog → `NewEventDrawer` (452px). Chemin data CRÉÉ : `eventService.createEvent`
  (POST /api/events) + `useCreateEvent` (invalidation PRÉFIXE `products.all` → couvre
  `products.withEvents` = source de la frise #301, sans threader userId — PAT-S40-001 respecté).
- `EventEditForm` RÉUTILISÉ via nouveau prop `mode` (défaut `'edit'` → zéro régression sur l'édition).
- Fichiers: `src/components/events/NewEventDrawer.tsx` (NEW, +.test 339 l.), `src/hooks/useCreateEvent.ts` (NEW),
  `src/services/eventService.ts`, `src/types/event.ts` (`toEventCreationPayload`), `src/components/EventEditForm.tsx`,
  `src/components/layout/AppShell.tsx`, `ds/tokens/spacing.css` (`--drawer-width-form: 452px`),
  `ds/components/timeline.css` (`.mt-drawer--form` ; `.mt-drawer` 420px INTACT), 4× `locales/*/shell.json`.
- BR touchées: BR-EVE-014 (répercussion FRONT de `color` au create, dette #150 soldée sur ce chemin),
  BR-EVE-013 (`archived` non exposé au create), BR-EVE-006 (récurrence conditionnelle), BR-EVE-002 (productId requis).

## Corrections ui-design (REJET initial) — TOUTES appliquées, vérifiées par le lead
1. ✅ Token `--drawer-width-form: 452px` (spacing.css:57) + variante `.mt-drawer--form` (timeline.css:172).
   **`.mt-drawer` 420px INTACT (timeline.css:145)** → aucune régression du drawer détail. Vérifié par le lead.
2. ✅ Aperçu simple (scope réduit acté dev) — mini-frise §6 → follow-up.
3. ✅ `productId` requis create-only dans la source unique `types/event.ts`.
4. ✅ `Select` shadcn existant (aucun combobox introduit).
5. ✅ Bottom sheet `.mt-sheet` < lg + fermer 44×44.
6. ⚠ Focus-trap partagé : `NewEventDrawer` consomme `useFocusTrap` (#63) ; `EventDrawer.tsx` conserve son
   trap inline (non-refactor VOLONTAIRE documenté en docstring, anti-régression desktop) → follow-up XS.
7. ✅ Récurrence : parité WEEK/MONTH/YEAR avec l'édition (divergence assumée vs mock §6, cf. décision).
8. ✅ Convention testids respectée ; `shell-new-event-dialog` supprimé/remplacé.
9. ✅ i18n 4 locales, parité des clés vérifiée.

data-testids nouveaux: `shell-new-event-drawer`, `-overlay`, `-close`, `-product-trigger`, `-product-error`,
`-loading`, `-empty`, + `event-form-preview-recurrence`. SUPPRIMÉ : `shell-new-event-dialog`.
⚠ Aucun n'est couvert par une spec Playwright → Phase 8 / triage.

tests:
- Suite frontend COMPLÈTE: **496 passed / 0 failed** (184 fichiers) — baseline 477 (#301) + 19. Re-vérifié par le lead.
- `npx tsc --noEmit` OK, `npx eslint` OK (garde-fou PIT-S41-005).
- E2E: NON exécuté (gate CI only).

[MEMORY:pitfall] **PIT-S44-001 — `EventCreationRequest.durationValue` (`@NotNull`) et `durationUnit`
(`@NotBlank`) sont INCONDITIONNELS**, y compris pour `type='single'` où `Utils.calculateEndDate` les
IGNORE (branche `if` non prise). Les omettre sur `POST /api/events` = **400**. Contrairement à
`recurrenceUnit` qui a, lui, une validation CONDITIONNELLE (`@AssertTrue isRecurrenceUnitConsistent`).
Contournement retenu : envoyer des valeurs neutres (`durationValue: 0`, `durationUnit: 'days'`) pour
`type='single'` — sans effet métier. **VÉRIFIÉ à la source par le lead** (`EventCreationRequest.java:21-25`).
Le pack `br-events.md` ne documente PAS cette asymétrie (BR-EVE-003/004 à compléter).

[MEMORY:pattern] **PAT-S44-001 — Formulaire partagé create/edit via prop `mode` explicite** : le prop
gouverne UNIQUEMENT les champs dont l'existence dépend de l'asymétrie DTO create/update (ici
`archived`/`endDate`/`recurrenceEndDate` masqués ET jetés du payload create). Défaut = mode historique
(`'edit'`) → migration non-cassante, zéro régression sur les call sites existants.

[MEMORY:bug] **BUG-S44-001 — `useFocusTrap` (#63) a `onEscape` en dépendance d'effet** : un callback
instable (recréé à chaque rendu) provoque re-trap + **vol de focus pendant la saisie**. L'appelant DOIT
stabiliser `onClose`/`onEscape` en `useCallback`. Symptôme trompeur : « le champ perd le focus à chaque frappe ».

[MEMORY:decision] **DEC-S44-002 — Scope aperçu réduit S44** (arbitrage dev) : aperçu = bloc coloré simple
(couleur/durée/récurrence). Mini-frise handoff §6 (ruler/TODAY/occurrence fantôme/légende) HORS sprint.

[MEMORY:decision] **DEC-S44-003 — Récurrence au create = parité WEEK/MONTH/YEAR avec l'édition.**
DIVERGENCE ASSUMÉE vs mock handoff §6 (Aucune/Mensuelle/Annuelle) : omettre l'hebdo retirerait une unité
supportée par le backend (enum `RecurrenceUnit`) et créerait une asymétrie create/edit injustifiée.

## ⚠ Follow-up « chemin création couplée » — VÉRIFIÉ PAR LE LEAD → **FAUX POSITIF, ne pas corriger**
Le subagent signalait : « `eventCreationSchema` a `durationValue`/`durationUnit` en `.optional()` → un event
`single` créé par le chemin couplé produit partirait sans durée = **400 probable** » (non vérifié par lui).
**Vérification lead : la prémisse est FAUSSE, il n'y a PAS de 400.** Mécanisme exact :
- `ProductController.createProduct` porte bien `@Valid @RequestBody ProductCreationRequest` (l.52),
- MAIS `ProductCreationRequest.events` est déclaré `private List<EventCreationRequest> events;` **SANS `@Valid`**
  (l.32) → **Bean Validation NE CASCADE PAS** dans la liste imbriquée. Les contraintes `@NotNull durationValue` /
  `@NotBlank durationUnit` ne sont donc jamais évaluées sur ce chemin.
- `ProductDrawer.tsx:214` envoie `events: [{name, type:'single', date}]` → passe, et `Utils.calculateEndDate`
  ignore la durée pour `single`. Chemin fonctionnel (corrigé #163, commentaire en place).

⛔ **PIÈGE POUR PLUS TARD : ajouter `@Valid` sur cette liste imbriquée CASSERAIT la création couplée.**
`EventCreationRequest.productId` est `@NotNull`, or un event imbriqué dans la création d'un produit **ne peut
pas** porter de `productId` (le produit n'existe pas encore — il est créé dans la même transaction, cf.
`ProductServiceImpl:69`). L'absence de `@Valid` est donc STRUCTURELLE, pas un oubli. Aucune issue créée.

recommandations suite:
- RECOMMAND_FOLLOWUP: aperçu live mini-frise conforme handoff §6 (ruler/TODAY/fantôme/légende) [triage M | events]
- RECOMMAND_FOLLOWUP: spec E2E couvrant les 8 testids `shell-new-event-drawer-*` + les 4 de `/timeline` (#301)
  — non écrite ici (stack down, gate CI only, budgéter 2-3 itérations) [triage S | events]
- RECOMMAND_FOLLOWUP: `EventDrawer.tsx` duplique le focus-trap inline que `useFocusTrap` (#63) a extrait ;
  consolidation hors périmètre #300 [triage XS | timeline]
- RECOMMAND_FOLLOWUP: documenter PIT-S44-001 dans `br-events.md` (BR-EVE-003/004 : durée requise même en
  `single` sur POST /api/events) [triage XS | events]
- Pas de RECOMMAND_DB_EXPERT (aucune migration), pas de RECOMMAND_SECURITY (aucune surface auth nouvelle),
  pas de RECOMMAND_TEST_RUNNER (suite complète déjà verte, lancée par le lead).
- Aucun glissement L constaté (M tenu).

STATUS: COMPLETED
