fichiers de contexte lus: cp-frontend.md (injecté briefing), pit-frontend.md (grep ciblé PIT-S62-005), issue-627-done.md (non relu, référencé seulement)

## Résumé
Décision (b) appliquée : suppression de `frontend/app/[locale]/not-found.tsx` (+ son test) — écran 404 localisé jamais rendu (aucune page n'appelle `notFound()`).

Constat notFound() du layout : `app/[locale]/layout.tsx:44` appelle `notFound()` sur locale invalide. Un `notFound()` levé depuis un `layout.tsx` échappe au `not-found.tsx` du MÊME segment (PIT-S62-005, confirmé dans `.ai-env/context-packs/pit-frontend.md:537`) — donc ce cas remontait déjà à la racine, servi par `app/global-not-found.tsx`/`/_not-found`, jamais par le fichier supprimé. `app/global-not-found.tsx` est désormais l'unique écran 404, quelle que soit la cause.

Fichiers modifiés (commentaires mis à jour, plus de mention du fichier supprimé comme actif) :
- `frontend/app/global-not-found.tsx` (paragraphe PÉRIMÈTRE)
- `frontend/app/global-not-found-screen.tsx` (note ÉPHÉMÉRIDE)
- `frontend/e2e/sprint-110-not-found-ephemeris.spec.ts` (en-tête QUEL ÉCRAN)

Clés i18n : AUCUNE retirée. `errors.notFound.*` (fr/en/es/de) est PARTAGÉ — `global-not-found-screen.tsx` a sa propre copie inlinée `MESSAGES` (pas de provider next-intl hors `[locale]`), et `frontend/app/global-not-found.test.tsx` fait un test de parité qui IMPORTE `errors.json` → `notFound.*` et le compare à `MESSAGES`. Supprimer ces clés aurait cassé ce test. Vérifié : le test passe tel quel (`errors.json` inchangé).

Composants partagés (`EphemerisLeaf`, `StateScreen`, `stateActionPrimary`) : NON orphelins, tous ont un autre appelant (`global-not-found-screen.tsx`, `[locale]/error.tsx`, `global-error.tsx`). Aucun signalement nécessaire.

E2E : aucune spec ne référencait `not-found-home-link` (testid propre à l'écran supprimé) — `document-lang.spec.ts` et `sprint-110-not-found-ephemeris.spec.ts` ciblent déjà `global-not-found-screen`/`global-not-found-home-link`. Seul l'en-tête de commentaire de la seconde a été corrigé.

## Commits
2d9ac7d8f7bcf380fa5961516a2c2cb90ced5cf4 — 🔥 chore(errors): supprime l'écran 404 localisé inatteignable (#827)

## Tests
- `npx vitest run app/global-not-found.test.tsx app/global-error.test.tsx` → PASS (28) FAIL (0)
- `npx vitest run` (suite complète) → PASS (2214) FAIL (0)
- `npx tsc --noEmit` → No errors found
- `npm run lint` → No issues found
- `rtk proxy npx prettier --check app/global-not-found.tsx app/global-not-found-screen.tsx ../frontend/e2e/sprint-110-not-found-ephemeris.spec.ts` (depuis frontend/) → All matched files use Prettier code style!

## Specs E2E à jouer par le lead
- `frontend/e2e/document-lang.spec.ts` (cite global-not-found-screen, non modifiée mais dans le périmètre 404)
- `frontend/e2e/sprint-110-not-found-ephemeris.spec.ts` (modifiée : commentaire seulement, assertions inchangées)
Aucune autre spec ne référençait le fichier supprimé.

## Signaux mémoire
[MEMORY:decision] Contexte: #627 avait laissé 2 écrans 404 (global + [locale]) visuellement alignés mais un seul atteignable. Décision: suppression de `app/[locale]/not-found.tsx` au lieu de brancher `notFound()` sur `/products/[productId]` (option a) — le message "produit introuvable" existant dans le shell de l'app aurait été remplacé, shell compris, par l'écran 404 plein document. `app/global-not-found.tsx` reste l'unique écran 404.
[MEMORY:pattern] Problème: un `notFound()` levé dans un `layout.tsx` semble pouvoir être capté par le `not-found.tsx` du même segment mais NE L'EST PAS (PIT-S62-005). Solution: vérifier l'appelant réel de `notFound()` (page vs layout) avant de supposer qu'un `not-found.tsx` de segment est atteint ; un `notFound()` de layout remonte à la racine (`global-not-found`/`_not-found`). Anti-pattern: créer un `not-found.tsx` de segment en pensant qu'il couvre le `notFound()` du layout parent.

## Recommandations suite
Pas de RECOMMAND_FOLLOWUP car aucun composant orphelin, aucune clé i18n orpheline, aucune spec E2E cassée.

STATUS: COMPLETED
