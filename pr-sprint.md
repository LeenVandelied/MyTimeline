## Sprint 25 — Finalisation Events (conflit 409 + contrat DTO dates + form)

Câble le conflit d'édition concurrente (optimistic locking) de bout en bout, aligne le contrat `startDate`/`endDate` entre le formulaire et le backend, et complète le formulaire d'événement. Cohésion **0.82**, base `dev`, **aucune migration**.

### Issues livrées (4)

| # | Titre | Size |
|---|-------|------|
| #201 | Aligner le contrat `startDate`/`endDate` du formulaire avec les DTO create/PATCH | S |
| #200 | Câbler l'état conflit (409) — handler `ObjectOptimisticLockingFailureException` | S |
| #188 | EventEditForm : exposer le toggle UI `archived` | S |
| #77 | Modale de résolution de conflit (409 — optimistic locking) partagée | M |

**Vagues** : V1 = #201 ∥ #200 ∥ #188 (fichiers disjoints) → V2 = #77 (dépend du contrat 409 de #200 + EventEditForm de #188).

### Changements clés

- **#201 — Contrat dates** : `EventUpdateRequest` câble enfin `startDate`/`endDate` (avant : envoyés par le front mais **silencieusement ignorés** = faux contrôle). Décision de contrat : `type=duration` → la durée reste source de vérité (endDate re-dérivée, BR-EVE-003) ; `type=single` → endDate explicite persistée. Garde `endDate ≥ startDate` montée backend : `@AssertTrue` DTO (paire du payload → 400) **+ garde service sur l'état fusionné** (`EndDateBeforeStartException` → 422) qui ferme le cas d'un PATCH `endDate` seul passant sous le `startDate` en base (miroir de BR-EVE-012).
- **#200 — Handler 409** : `@ExceptionHandler(ObjectOptimisticLockingFailureException)` scopé au **type précis** (pas de fourre-tout `DataIntegrityViolation`, cf. convention backend #3) → **HTTP 409**, corps `{"error":"resource was modified concurrently, please retry"}`. Nouvelle **BR-EVE-015** (édition concurrente `@Version` → 409). Contrat consommé par #77.
- **#188 — Toggle `archived`** : composant DS `Switch` (1er usage réel) via FormField RHF, i18n 4 locales, pré-rempli depuis l'état réel de l'event (`archived` propagé jusqu'aux `defaultValues` — corrigé en review). `recurrenceEndDate` était déjà livré (S15) → hors scope.
- **#77 — `ConflictDialog` partagé** : extraction de la gestion inline de conflit vers un composant accessible réutilisable (Dialog DS Radix, `role=dialog` + focus-trap + Échap). Interception du 409 **scopée au flux event** (pas dans le client axios global → aucun autre 409 name-conflict requalifié). `window.location.reload()` remplacé par une **invalidation ciblée** TanStack Query. `data-testid=event-form-conflict` préservé.

### BR impactées
- **BR-EVE-002** (endDate ≥ startDate) — garde montée backend (DTO + service état-fusionné).
- **BR-EVE-003** (dérivation endDate selon type) — étendue au PATCH (startDate déplacée re-dérive endDate en duration).
- **BR-EVE-013** (archived PATCH-only) — exposée dans l'UI.
- **BR-EVE-015 (nouvelle)** — édition concurrente → 409, corps `{"error":...}`.

### Review batch
Reviewers backend + frontend parallèles : **3 MAJEUR, tous RÉSOLU** :
- MAJEUR (backend) : PATCH `endDate` seul < startDate persisté échappait au `@AssertTrue` → garde service état-fusionné (422). ✅
- MAJEUR (backend) : flip `type` duration→single via `type` seul → comportement acté + testé. ✅
- MAJEUR (frontend) : toggle `archived` toujours décoché en édition réelle → `archived` propagé aux `defaultValues`. ✅
- MINEURS (rollback couleur optimiste sur dismiss, double-clic reload) : notés, non bloquants.

### Audit tests (`docs/memory/audits/sprint-25-test-coverage.md`)
- Backend : **280/280** vert, **stable sur 3 runs** (test optimistic-lock rendu déterministe — simulation de version stale sans threads, après une instabilité 2/4 détectée par le test-runner).
- Frontend : **344/344** vert.
- Chaque BR couverte par unit + integration + RTL.

### ⚠ Coverage E2E — plan post-merge
Nouveaux `data-testid` de production sans spec E2E : `event-form-archived-toggle`, `event-form-conflict`, `conflict-dialog`, `conflict-dialog-reload`.
→ **Plan : `/create-e2e` après merge** — spec Playwright « variante conflit 409 » (édition concurrente → dialog → recharger) + vérif toggle archived. Le comportement est déjà couvert par l'intégration déterministe + le slice handler + les tests RTL ; l'E2E 2-onglets est un complément différé.

### Follow-ups (à arbitrer en `/sprint end`)
- **Modale comparative complète** (« Garder mes modifications » vs « Prendre la version serveur » + diff des champs) — **bloquée** : nécessite que le backend enrichisse le corps du 409 (serverVersion + yourVersion). Enhancement backend d'abord, puis frontend. (#77)
- Spec E2E Playwright « variante conflit ». (#77)
- Clarifier l'UX de `archived=true` (effet sur le quota BR-EVE-011 « events actifs »). (#188)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
