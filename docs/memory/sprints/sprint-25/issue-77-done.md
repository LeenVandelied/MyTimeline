commits: [d8bd85fa570f32a65556786427e19163fc635b63]

resume:
- OBJECTIF: extraction+généralisation du conflit 409 optimistic → composant partagé. PAS de diff serveur/local (contrat #200 = corps plat `{"error":"resource was modified concurrently, please retry"}`, sans serverVersion/yourVersion).
- CRÉÉ: `frontend/src/components/shared/ConflictDialog.tsx` — Dialog DS Radix (role=dialog, focus-trap + Échap natifs, cf DeleteConfirmDialog). Présentationnel pur : title/description + 2 actions (annuler / recharger). `testId` paramétrable.
- REBRANCHÉ EventEditForm: bloc inline `submitState==='conflict'` (l.~439-459) → `<ConflictDialog open={submitState==='conflict'} testId="event-form-conflict">`. data-testid=event-form-conflict PRÉSERVÉ. Toggle archived #188 intact. Nouveaux props: onReload (recharger) + onConflictDismiss (fermer→parent reset submitState).
- INTERCEPTION 409: dans EventContent.onSubmit (`status===409 ? 'conflict' : 'error'`). Scopé au flux édition event → aucun autre 409 requalifié (name-conflict Category/Product/Profile gérés inline ailleurs, non touchés). apiClient global interceptor NON modifié (il ne traite pas le 409 → pas de risque).
- INVALIDATION: onReload = `invalidateQueries(products.withEvents(userId))` (ciblée TanStack) → REMPLACE `window.location.reload()`. Pas de hook query event isolé (event vient de prop parent hydratée par useProductsWithEvents) → invalidation de cette clé = re-fetch à jour.
- FICHIERS: ConflictDialog.tsx(+test), EventEditForm.tsx/.test.tsx, EventContent.tsx/.test.tsx, common.json fr/en/es/de (namespace `conflictDialog`).
- TESTS: 341/341 frontend PASSED (46 files). ConflictDialog 6, EventContent interception 409/400/404 5, EventEditForm 26. tsc noEmit clean, eslint clean.
- NOUVEAUX data-testid: `conflict-dialog` (défaut), `conflict-dialog-reload`. (event-form-conflict inchangé). Aucune spec E2E (frontend/e2e vide) → check coverage-E2E lead.

[MEMORY:pattern] Problème: gérer un 409 optimistic locking de façon réutilisable+accessible sans requalifier les autres 409. Solution: composant présentationnel ConflictDialog (Dialog DS partagé, testId paramétrable) piloté par l'appelant qui intercepte le 409 sur SON flux (submitState) + invalidation ciblée TanStack au reload. Anti-pattern: intercepter le 409 dans l'interceptor axios global (requalifierait les 409 name-conflict Category/Product) ; window.location.reload() (perte d'état, reload complet).

recommandations suite:
- RECOMMAND_FOLLOWUP (OBLIGATOIRE): modale comparative « garder mes modifications (force save) » vs « prendre la version serveur » avec diff des champs. BLOQUÉ: nécessite que le backend enrichisse le corps 409 avec serverVersion + yourVersion (+ payload serveur courant). Enhancement backend (#200/#201) d'abord, puis frontend diff. Non implémentable avec le contrat plat actuel.
- RECOMMAND_FOLLOWUP: ajouter une spec E2E Playwright « golden-path variante conflit » (2 onglets → 409 → ConflictDialog → recharger). frontend/e2e/ actuellement vide.
- PAS de RECOMMAND_UI_DESIGN (réutilisation Dialog DS existant, pas de nouvelle primitive).
- PAS de RECOMMAND_TEST_RUNNER (suite 8s, 341 tests).

STATUS: COMPLETED
