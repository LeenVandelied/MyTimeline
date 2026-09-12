# Issue #67 — Hint frontend plafond 4000 occurrences récurrentes

commits: [SEE_COMMIT_LINE]

## resume
Objectif : afficher un hint NON bloquant sous `recurrenceEndDate` quand la preview
backend (#439) renvoie `capped=true` (série tronquée : horizon 5 ans sans borne, ou
plafond 4000 avec borne).

Fichiers clés :
- `frontend/src/types/event.ts` — `RecurrencePreviewRequest` (type) +
  `recurrencePreviewResponseSchema`/`RecurrencePreviewResponse` ({count,capped}).
  Typage frontend seul, aucune sync DTO backend.
- `frontend/src/services/eventService.ts` — `previewRecurrence(payload)` →
  `apiClient.post('/events/recurrence-preview', ...)`. Unit MAJUSCULE conservée.
- `frontend/src/lib/query-keys.ts` — `queryKeys.events.recurrencePreview(params)`.
- `frontend/src/hooks/useRecurrencePreview.ts` (NEW) — useQuery v5, `enabled` STRICT
  (isRecurring && startDate && recurrenceUnit), keyé sur params débouncés.
- `frontend/src/components/EventEditForm.tsx` — watch débouncé `recurrenceEndDate`
  ajouté ; hook branché sur les previews débouncés existants ; hint rendu sous le
  champ `recurrenceEndDate` (voisin de `recurrenceEndHint`).
- `frontend/public/locales/{fr,en,de,es}/products.json` — clé
  `products.add.event.form.recurrenceCappedHint` (4 locales).

Hint : `data-testid="event-form-recurrence-capped-hint"`,
`<p role="status" aria-live="polite" class="text-ink-muted text-xs">` (ton neutre,
pas d'erreur/rouge). Wording imposé posé dans les 4 locales (fr/en/de/es OK).

Pilotage : hook TanStack réactif débouncé (réutilise `useDebounced` existant, pas de
nouveau debounce). Le hint s'affiche uniquement si `capped===true` ; false / réponse
absente / query désactivée / isRecurring=false / champ recurrenceEndDate absent (create)
→ aucun hint. Il disparaît dès qu'une borne ramène `count` sous 4000 (query réactive).
Soumission jamais bloquée (aucun champ requis, aucun refine).

Tests ajoutés : 5 dans `EventEditForm.test.tsx` (describe « #67 hint plafond 4000 ») —
mock du hook `useRecurrencePreview` (pas de QueryClientProvider dans ces tests) :
1. capped=true → hint visible + role=status/aria-live=polite + clé i18n
2. capped=false → hint absent
3. réponse absente → hint absent
4. récurrence désactivée → ni champ ni hint (même capped=true)
5. hint ne bloque PAS la soumission (capped=true → onSubmit appelé)

Résultat test-quiet : `./scripts/test-quiet.sh frontend` bloqué par son PRÉFLIGHT
(paquet `eslint-plugin-storybook` absent du node_modules partagé — gap d'env, hors #67).
Contourné en lançant vitest directement : fichier ciblé **45/45 PASS**, suite complète
**1040/1040 PASS** (102 fichiers ; seul `console-error-guard.test.ts` exclu car il
charge la vraie config ESLint qui exige le paquet manquant — pré-existant, non lié).
Typecheck `tsc --noEmit` : No errors. (⚠ le worktree n'a pas de node_modules : symlink
temporaire vers `frontend/node_modules` du dépôt principal, retiré après les tests.)

## couverture E2E
Aucune spec Playwright ajoutée (harnais E2E nécessite la stack complète + backend #439
tournant ; hors périmètre exécutable ici). SIGNALEMENT /create-e2e post-merge :
nouveau testid `event-form-recurrence-capped-hint` à couvrir (activer récurrence sans
borne de fin → série longue → hint visible ; poser une borne courte → hint disparaît).
Le check coverage-E2E Phase 8 relèvera ce testid.

## [MEMORY:*]
[MEMORY:pitfall] Context: ajouter un useQuery dans EventEditForm casse TOUS ses tests
unitaires (aucun QueryClientProvider dans EventEditForm.test.tsx). Solution: mocker le
HOOK (`vi.mock('@/hooks/useRecurrencePreview')`) plutôt que d'envelopper d'un provider ;
+ reposer le `mockReturnValue` par défaut dans `beforeEach` car `clearAllMocks` ne
réinitialise PAS les valeurs de retour (fuite `capped:true` entre tests). Prevention:
tout hook TanStack ajouté à un composant déjà testé sans provider = mock du hook.
[MEMORY:pitfall] Context: `./scripts/test-quiet.sh frontend` échoue en worktree si le
node_modules partagé (dépôt principal) manque une devDep récente (`eslint-plugin-storybook`) ;
le préflight le nomme mais bloque toute la suite. Prevention: worktree sans node_modules
→ symlink vers `frontend/node_modules` principal, et si une devDep manque, lancer vitest
en excluant `console-error-guard.test.ts` (seul à charger la config ESLint réelle).

## recommandations suite
RECOMMAND_FOLLOWUP #439 : le hint n'affiche PAS le compte exact `count` quand `capped`
(par design : borné = compte non fiable). Si un jour on veut afficher `count` quand
`capped=false`, la donnée est déjà là (`recurrencePreview.count`).
RECOMMAND_FOLLOWUP /create-e2e : couvrir `event-form-recurrence-capped-hint` (cf. supra).
Pitfall subtil : le hook `useRecurrencePreview` s'active aussi en mode `create` (isRecurring
+ startDate + unit suffisent), mais le champ `recurrenceEndDate` — donc le hint — n'existe
qu'en mode edit ; l'appel réseau en create est sans effet visible (léger gaspillage assumé,
conforme au plan). Si on veut l'éviter : passer `isRecurring: previewIsRecurring && !isCreate`.

STATUS: COMPLETED
