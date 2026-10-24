# Review batch — Sprint 113

**Reviewers :** reviewer (code applicatif, opus) + playwright-reviewer (tests/E2E, opus), en parallèle sur `origin/dev..550b416d`.
**Bilan :** 0 CRITIQUE / 2 MAJEUR / 11 MINEUR.

## Corrigés (f558c5c6) — cycle 2 relu par le lead
- [MAJEUR] course `waitForResponse` armé après la touche (sprint-113-focus-return) → armé avant.
- [MAJEUR] ProductsListView / ProductDetailView / CategoriesView : opt-out sans test de chaîne réelle → 3 cas ajoutés, non-vacuité par mutation.
- [MINEUR] plus de cas non-403 sur la suppression d'événement → cas 500 (generic + toast).
- [MINEUR] repli de focus quand « Enregistrer » est désactivé à la fermeture du ConflictDialog → `<form tabIndex=-1>`.
- [MINEUR] `event-form-error` ambigu → `data-reason`.
- [MINEUR] purge d'un produit archivé / pagination : vérifiés, justifiés sans changement.

## Non corrigés (follow-ups ou acceptés)
- Focus après confirmation réussie quand le déclencheur disparaît (follow-up).
- sr-only « Close » anglais en dur dans ui/dialog.tsx (préexistant).
- Témoins appelant apiClient directement ; assertions `toHaveBeenCalledWith(HANDLES_FORBIDDEN_INLINE)` recopiant l'implémentation (acceptés, couverts par les tests de chaîne réelle).
- sprint-112 passe de 8 à 16 tests (budget à surveiller).

## Signaux
- [MEMORY:pitfall] Retour de focus visant un bouton désactivé pendant la soumission rate quand le dialogue se ferme sur `submitting` → repli focalisable.
- [MEMORY:pitfall] Vitest sous RTK résume la sortie sans noms de tests → `rtk proxy npx vitest run --reporter=verbose`.
- [MEMORY:pattern] Cible de repli `tabIndex={-1}` : ne pas poser `outline-none` (DEC-S58-001).
- RECOMMAND_FOLLOWUP: après 403/5xx du keep-mine, rendre le focus à « Enregistrer » quand il redevient actionnable (aujourd'hui il reste sur le form) [triage XS | events].

STATUS: COMPLETED
