# Audit tests — Sprint 121

> Suivis S120 + bugs P2 frontend. Aucune règle métier modifiée, aucun flux inter-systèmes nouveau.
> Couverture exigée : prouver les deux correctifs (#858, #898) et la non-régression des 9 appelants de `useFocusTrap`.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| — (#858) | Piège de focus installé une fois par ouverture ; saisie touche par touche ; Tab depuis `body` ramené dans le panneau ; focus sur le champ à l'étape 2 | NON | N/A | N/A | ✅ `useFocusTrap.test.tsx` (7), `AccountSection.test.tsx` (+2) — rouges contre l'ancien code | ✅ `sprint-121-bottom-sheet-focus` (2, 375×812, `focus-moves=aucun`) | N/A |
| — (#898) | Densité persistée appliquée avant la 1re peinture sur toutes les pages | NON | N/A | N/A | ✅ `density.test.ts`, `useDensity.test.tsx` (14) — contrôle négatif rouge | ✅ `sprint-121-density-persisted` (3 : compact/invalide/comfortable, font-size 15/16/17 px) | N/A |
| — (#899) | Commentaires `ci.yml` | NON | N/A | N/A | N/A | N/A (CI de la PR) | N/A |

## Tests créés
- `frontend/src/components/timeline/useFocusTrap.test.tsx` (nouveau)
- `frontend/src/components/settings/AccountSection.test.tsx` (+2 tests)
- `frontend/src/lib/density.test.ts`, `frontend/src/hooks/useDensity.test.tsx` (nouveaux)
- `frontend/e2e/sprint-121-bottom-sheet-focus.spec.ts`, `frontend/e2e/sprint-121-density-persisted.spec.ts` (nouveaux)

## Résultats runs (local, macOS, `next build` Turbopack + `next start`, backend profil `dev,e2e` sur base jetable)
- Frontend : build OK, Vitest 2380/2380 sans stderr, tsc 0, eslint 0, `format:check` OK (avant `802f8e35`) ; après correctifs de review : 63 fichiers / 854 tests des composants touchés verts.
- E2E run 1 (avant review, `6faaa4ef`) : 679 passés / 1 échec / 9 ignorés — échec = `sprint-77-theme-visual:620` (rouge darwin attendu, `--ignore-snapshots`).
- E2E ciblé après `802f8e35` (sprint-121, settings-mobile, settings-account, sprint-112/113-focus-return, landing-mobile-menu) : 62/62.
- E2E run 2 (après `802f8e35`) : 678 / 2 / 9 — `sprint-77-theme-visual:620` (attendu) + `sprint-90-first-contact:413`.
  - **`sprint-90-first-contact:413` est PRÉEXISTANT** (A/B sur build `origin/dev` `e63f284e`, même backend) : dev 4/5 échecs, branche 1/5, même erreur `apiResponse.text: Response has been disposed` dans `e2e/support/page-chunk-gate.ts:71` (helper de test introduit au S120 #890, inchangé par ce sprint). Non imputable au sprint ; suivi proposé.
- Backend : non touché, non rejoué.

## Conclusion
Prêt pour PR. Aucun `[MISSING]`. Suivi à arbitrer en clôture : flake `page-chunk-gate` (`route.fetch()` dont la réponse est libérée avant `text()`), préexistant sur dev.
