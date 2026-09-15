# Issue #646 — [BUG] Le hint de plafond de récurrence annonce un seuil faux

## Résumé

Libellé `products.add.event.form.recurrenceCappedHint` réécrit dans les 4 locales : il ne parle plus de « 4 000 occurrences » et décrit l'horizon réel de 5 ans. Libellé statique, sans interpolation : `EventEditForm.tsx` n'est pas touché (#618 le modifie en parallèle). Ancre E2E de `sprint-82-recurrence-capped-hint.spec.ts` rebasée sur le nouveau texte FR, avec en plus une négation sur `4 000`. Un seul commit.

## Règle backend vérifiée

- `backend/src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java:48-51` : sans `recurrenceEndDate`, la fin effective est `startDate.plusYears(5)` (`RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS = 5`, `RecurrenceExpansion.java:57`).
- `:57-66` : la boucle s'arrête dans tous les cas à `MAX_OCCURRENCES = 4000` (`RecurrenceExpansion.java:35`). `capped` passe à true seulement s'il reste une occurrence dans la fenêtre.
- `:71-73` : sans date de fin, `capped = true` quoi qu'il arrive (MONTH 61, WEEK 261, YEAR 6 : l'horizon est atteint bien avant 4000).
- **Date de fin explicite au-delà de 5 ans** : elle est honorée telle quelle, l'horizon ne s'applique pas. Le plafond 4000 s'applique ENCORE : `capped = true` si la date dépasse environ 77 ans (WEEK), 333 ans (MONTH) ou 3 999 ans (YEAR) après le début. Le front ne borne pas la date (`types/event.ts:315`, seulement `>= startDate`). Ce second cas peut donc afficher le hint, mais il reste marginal.
- Seul appelant de `expand` : `RecurrencePreviewController.java:67` (`POST /api/events/recurrence-preview`), qui recopie `capped` sans le recalculer.
- **La frise n'étend pas les occurrences** : `frontend/src/components/timeline/lib.ts:50-52` n'affiche la récurrence que comme un libellé de fréquence. L'horizon de 5 ans ne borne donc que le CALCUL de la preview. Le libellé dit « les occurrences ne sont calculées que sur… » et non « la série s'arrête », qui serait faux.

## Libellés

Registre : tutoiement en FR et « du » en DE, comme le libellé voisin `archivedLockNote` du même objet `form`. Le fichier FR mélange vous et tu, et les libellés récents tutoient. ES garde le « tú », comme avant.

- fr : « Sans date de fin, les occurrences ne sont calculées que sur les 5 ans qui suivent la date de début. Définis une date de fin pour borner la série (une date très lointaine reste plafonnée). » (187 car.)
- en : « Without an end date, occurrences are only calculated over the 5 years following the start date. Set an end date to bound the series (a very distant date is still capped). » (170)
- es : « Sin fecha de fin, las repeticiones solo se calculan durante los 5 años siguientes a la fecha de inicio. Define una fecha de fin para limitar la serie (una fecha muy lejana también tiene un tope). » (195)
- de : « Ohne Enddatum werden die Vorkommen nur für die 5 Jahre ab dem Startdatum berechnet. Lege ein Enddatum fest, um die Serie zu begrenzen (auch ein sehr weit entferntes Datum wird gedeckelt). » (187)

La parenthèse couvre le cas « date de fin explicite supérieure à 4000 occurrences » sans avancer de chiffre. Le libellé ne cite aucune unité, il est donc vrai pour MONTH comme pour WEEK.

## Fichiers

- `frontend/public/locales/fr/products.json` (l.41 ; indentation remise à 8 espaces)
- `frontend/public/locales/en/products.json`
- `frontend/public/locales/es/products.json`
- `frontend/public/locales/de/products.json`
- `frontend/e2e/sprint-82-recurrence-capped-hint.spec.ts` : l.193 remplacée par `toContainText(/5\s*ans qui suivent la date de début/)` et `not.toContainText(/4\s*000/)`. Commentaire d'en-tête l.27-29 mis à jour. La spec navigue sur `/fr/products/…`, l'ancre vise donc le texte FR rendu.
- `frontend/src/components/EventEditForm.test.tsx` : **non modifié, choix délibéré**. Aucune des 7 assertions du bloc #67 ne dépend du texte. La seule qui touche au libellé (l.564) vérifie la CLÉ via le mock `ns.key` (PIT-S63-006). Les `count: 4000` des mocks sont des valeurs fabriquées, sans lien avec le libellé. Le titre du `describe` (« plafond 4000 ») et les commentaires de `EventEditForm.tsx:786-790` et `useRecurrencePreview.ts:10` restent périmés, car ils sont hors des fichiers autorisés.

## Tests

- Base avant modification : `npx vitest run src/components/EventEditForm.test.tsx` → 59/59.
- `./scripts/test-quiet.sh frontend-unit` → 127 fichiers, 1511 tests, OK. **Écart au briefing** : `test-quiet.sh frontend` n'a PAS été lancé. Ce scope exécute `next build` (script l.17-36), or un `next dev` écoute sur :3000 (pid 31014, a priori celui de #618) : le lancer aurait réécrit `.next` (PIT-S81-022), et le briefing interdit lui-même `next build`.
- `npx tsc --noEmit` → exit 0.
- `rtk proxy npx prettier --check e2e/sprint-82-recurrence-capped-hint.spec.ts` → conforme. `public/locales` est dans `.prettierignore`.
- `npx eslint e2e/sprint-82-recurrence-capped-hint.spec.ts` → exit 0.
- JSON : les 4 fichiers se chargent (`require`), la clé est trouvée à `add.event.form.recurrenceCappedHint` et aucune ne contient `4.?000`.
- Tests i18n transverses : `src/__tests__/i18n-namespaces.test.ts` ne vérifie que les namespaces et la parité de premier niveau, pas les valeurs. `language-selector.i18n.test.ts` et `theme-toggle.i18n.test.ts` ne portent pas sur `products`. Tous verts dans le run ci-dessus.
- **NON exécuté** : la spec E2E (exclusivité Playwright donnée à #618). Le lead doit la jouer.
- **NON couvert** : aucun E2E ni test unitaire ne vérifie le texte pour WEEK (la spec ne teste que MONTH). Le libellé ne dépend pas de l'unité, mais cela n'est pas prouvé par un test.

## Signaux mémoire

- `[MEMORY:pitfall]` Contexte : l'horizon de 5 ans (#452) ne borne QUE le calcul de la preview. La frise n'étend aucune occurrence (`timeline/lib.ts:50-52`). Solution : le libellé dit « calculées sur 5 ans » et pas « la série s'arrête ». Prévention : avant de décrire l'effet d'une borne backend, grepper ses appelants (`expand` n'en a qu'un : `RecurrencePreviewController`).
- `[MEMORY:pitfall]` Contexte : le plafond 4000 n'a pas disparu. Il mord encore sur une date de fin explicite très lointaine (WEEK à plus de 77 ans environ), qui affiche aussi le hint. Prévention : un libellé de hint piloté par `capped` doit rester vrai dans LES DEUX cas de troncature.
- `[MEMORY:pitfall]` Contexte : le briefing exige `test-quiet.sh frontend` et interdit `next build`, mais ce scope contient `next build`. Solution : `frontend-unit` + `tsc` quand un `next dev` tourne. Prévention : écrire `frontend-unit` dans le gabarit de briefing des vagues parallèles.

## Recommandations suite

- RECOMMAND_FOLLOWUP : `TimelineEditHost.tsx:104-107` pré-remplit `recurrenceEndDate: null`. Une série déjà bornée, éditée depuis la frise, affiche donc le hint à tort et pourrait perdre sa borne au submit (non vérifié). Hors périmètre (fichier de #618).
- RECOMMAND_FOLLOWUP : commentaires et titres périmés « plafond 4000 » dans `EventEditForm.tsx:786-790`, `EventEditForm.tsx:326`, `useRecurrencePreview.ts:10`, `EventEditForm.test.tsx:548-552`, `EventEditForm.debounce.test.tsx:46`, `types/event.ts:27`, `services/eventService.ts:17`.
- RECOMMAND_FOLLOWUP : ajouter une assertion sur le libellé TRADUIT (NextIntlClientProvider + vrais messages, PIT-S63-006). Aujourd'hui aucun test unitaire ne verrait un libellé faux.
- RECOMMAND_TEST_RUNNER : le lead joue `e2e/sprint-82-recurrence-capped-hint.spec.ts` une fois le `next dev` de #618 libéré.
- Pas de RECOMMAND_DB_EXPERT (aucun schéma touché).
- Pas de RECOMMAND_SECURITY_EXPERT (libellé i18n seul).
- Pas de RECOMMAND_UI_DESIGN (aucun style ni composant ; la longueur DE de 187 caractères n'a pas été mesurée dans le bloc de 452 px, non vérifié visuellement).

fichiers de contexte lus:
- `docs/memory/sprints/sprint-86/pit-subset-frontend.md` : LU (PIT-S63-006, S67-004, S74-008, S76-007, S77-014, S78-001, S81-022, S82-002, S83-005, S83-009)
- `.ai-env/context-packs/br-events.md` : LU par grep (BR-EVE-006 l.73, BR-EVE-012 l.112-115)
- `docs/memory/sprints/sprint-82/issue-491-done.md` : LU l.1-60
- `docs/memory/sprints/sprint-86/maquette-formulaire-evenement.md` : NON LU
- `backend/.../RecurrenceExpansion.java`, `RecurrenceExpansionServiceImpl.java`, `RecurrencePreviewController.java:50-80` : LUS
- `frontend/src/components/EventEditForm.tsx:320-345,780-805`, `EventEditForm.test.tsx:540-610`, `timeline/lib.ts` (grep), `TimelineEditHost.tsx:95-110`, `scripts/test-quiet.sh` (grep) : LUS

## Vérification du lead (2026-09-12) — RECOMMAND_FOLLOWUP `recurrenceEndDate: null`
- PAS de perte de données : `EventServiceImpl.java:114` n'applique `recurrenceEndDate` que s'il est non nul (PATCH partiel, null = inchangé).
- Reste un défaut d'AFFICHAGE préexistant : le view-model frise ne porte pas `recurrenceEndDate` (`TimelineEditHost.tsx`, commentaire « reste absent du view-model frise »), donc une série bornée éditée depuis la frise n'affiche pas sa borne et montre le hint de plafond à tort.
- Triage proposé pour `/sprint end` : follow-up S, domaine events, P2 (pas P1 : aucune donnée perdue).

STATUS: COMPLETED
