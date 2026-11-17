# Issue #676 — Édition depuis la frise : date de fin de série pré-remplie, hint de plafond retiré

**Vague :** 1 (en parallèle de #594) · **Agent :** fullstack-dev (opus, high) · **Spawn ref :** `1c3f612`

## Commit (vérifié par le lead)
- `18c4176` — :bug: fix(timeline): pré-remplir la date de fin de série à l'édition depuis la frise (#676)
- `git show --stat` : 5 fichiers, +319/−3 — `frontend/src/types/event.ts` (+10), `event.test.ts` (+26),
  `components/timeline/TimelineEditHost.tsx` (11), `TimelineEditHost.test.tsx` (+91),
  `frontend/e2e/sprint-91-edit-bounded-series-end-date.spec.ts` (+184). Aucun fichier de #594.
- `git branch --contains 18c4176` = `sprint/91` ; dépôt principal non pollué (seul `docker-compose.override.yml` non suivi, préexistant).

## Résumé
- `mapToFullCalendarEvent` porte désormais `recurrenceEndDate` ; `TimelineEditHost` le pré-remplit au lieu de `null` (BR-EVE-012).
- **Champ exposé pour #595 :** `PositionedEvent.extendedProps.recurrenceEndDate` (`string | null | undefined`, `YYYY-MM-DD`).
- Prémisses vérifiées par l'agent :
  - le hint dépend de la valeur du formulaire (`EventEditForm.tsx:333-340`, `watch('recurrenceEndDate')` → preview `capped`) : pré-remplir suffit ;
  - le mobile passe par le même host (`TimelineMobilePortrait.tsx:361`, `TimelineMobileLandscape.tsx:374` → `onEditEvent`) ;
  - **correction du briefing du lead** : le mapper a 2 appelants (`ProductDetailView.tsx:118`, `useDashboardData.ts:77`), pas 3 — `TimelineEditHost` consomme le view-model, il n'appelle pas le mapper.
- Contrôle d'armement : `null` réintroduit dans le host → le test « série bornée » échoue (1 failed / 21 passed), puis correctif restauré.

## Tests (déclarés par l'agent)
- Vitest ciblé `event.test.ts` + `TimelineEditHost.test.tsx` : 51/51.
- `./scripts/test-quiet.sh frontend-unit` : 134 fichiers / 1655 tests verts.
- `tsc --noEmit` exit 0 ; `prettier --check` (5 fichiers) exit 0.
- `playwright test --list` sur la spec : 1 test chargé.
- **E2E NON exécuté par l'agent (exclusivité Playwright à #594) — à jouer par le lead après la vague.**

## Fichiers de contexte lus (déclaration de l'agent, lecture partielle avouée)
- `br-events.md` l.105-135 (BR-EVE-012 l.112) ; en-têtes BR-EVE-004 l.60 / 006 l.73.
- `pit-frontend.md` : grep ciblé — PIT-S82-002 l.1129, l.757, PIT-S46-001 l.1502. **`defaultValues`, `EventEditForm`, `jsdom` non cherchés.**
- `rules-jit/frontend.md` en entier (l.77).
- `sprint-47/e2e-local-runbook.md` l.57-66 seulement.

## Non vérifié
- Aucun E2E sur la route `/timeline` (même mapper et même host, couverts en unitaire).
- Aucun test sur le chemin d'édition mobile (vérifié par lecture de code seulement).

## Signaux mémoire
- [MEMORY:pitfall] Le gabarit de briefing du lead prescrivait `./scripts/test-quiet.sh frontend`, qui lance `next build`, alors que les contraintes interdisaient `next build` (harnais `.next` partagé). Parade : scope `frontend-unit`. Corrigé en cours de vague pour #594 (message du lead).
- [MEMORY:pitfall] `npx playwright test --list` refuse de charger la config sans `PLAYWRIGHT_BASE_URL` + `NEXT_PUBLIC_API_URL` + `E2E_API_PROXY_TARGET` (garde `assertWebServerEnv`).

## Recommandations suite
- RECOMMAND_FOLLOWUP (à absorber par #595, vague 2) : la spec `sprint-91-edit-bounded-series-end-date` cible `[data-testid="timeline-event"][data-event-title=…]` puis `.first()` ; si les fantômes de #595 portent le même testid/titre, elle peut cliquer un fantôme → à consigner dans le briefing de #595.
- Pas de RECOMMAND_DB_EXPERT car aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY car aucune surface auth ou donnée personnelle touchée.
- Pas de RECOMMAND_TEST_RUNNER car le lead exécute lui-même l'E2E après la vague.
- Pas de RECOMMAND_UI_DESIGN car aucun rendu nouveau.

STATUS: COMPLETED
