# Audit tests — Sprint 118

> Généré par le lead (2026-11-10). Mesures rejouées par le lead depuis le worktree.

## Couverture par issue

Aucune règle métier `BR-*` modifiée : sprint de montées de dépendances et d'outillage (0 fichier `backend/`,
0 migration, 0 contrat API). Aucun flux inter-systèmes : pas d'E2E métier exigé. Le filet est la suite existante,
jouée sur les nouvelles versions.

| Issue | Changement | Cross-system flow | Unit (Vitest) | E2E |
|-------|------------|:---:|:---:|:---:|
| #882 | Montées mineures (Tailwind 4.3, prettier-plugin 0.8, radix popover, testing-library, storybook lint, follow-redirects) | NON | ✅ 2359/2359 ; `base-layer.test.ts` adapté (`@layer properties`) | ✅ suite CI complète |
| #883 | Node 22 (CI, image, engines) | NON | ✅ CI `frontend` sur Node 22 | ✅ job `e2e` sur Node 22 |
| #884 | vitest + coverage-v8 5.1.0 | NON | ✅ 177 fichiers / 2359 tests, identique à la base 3.2.7 ; `coverage/lcov.info` produit | — |
| #885 | Next 16.4.6, eslint flat, next-intl 4.14 | NON | ✅ 2359/2359 ; `middleware.test.ts` vert | ✅ `auth-guard`, `document-lang` (locale, garde d'auth, 404 global) ; specs de squelette/préchargement adaptées (`sprint-90`, `sprint-106`) |

## Tests modifiés
- `frontend/src/styles/__tests__/base-layer.test.ts` (#882)
- `frontend/src/components/timeline/TimelineView.{fullscreen-overlays,modal-shortcuts}.test.tsx` (#884, typage)
- `frontend/e2e/sprint-90-first-contact.spec.ts`, `frontend/e2e/sprint-106-product-detail.spec.ts` (#885, prefetch par segment)
- `frontend/e2e/sprint-117-period-zoom-no-drift.spec.ts` (oracle daté, rouge sur `dev` depuis le 2026-11-09)

## Résultats runs (lead)
- Backend : non concerné (0 fichier `backend/` dans `origin/dev..HEAD`).
- Vitest : 177 fichiers, 2359 passed, 0 failed (avant et après chaque montée, mesure JSON).
- `lint` (`eslint .`), `typecheck`, `format:check`, `next build` : verts. Table des routes identique à Next 15 (48 pages SSG).
- E2E locale ciblée contre `next build` + `next start` (:3100, backend e2e :8085) : `sprint-90` + `sprint-106` ×3 = 71/71 ;
  `sprint-117-period-zoom` 11/11 (oracle borné observé : maxScroll 2777 px). Un échec isolé de
  `sprint-90:457` (fiche produit, porte chunk inchangée) sur une passe ×3, non reproduit à la passe suivante ×3.
- E2E CI : `55a89660` → 672 passed / 2 failed / 1 flaky (les 3 specs de préchargement, corrigées depuis) ; `37b985dd` → CI 7/7 verte, e2e 676 passed / 0 failed / 0 flaky / 8 skipped (5,4 min).
- Suite E2E complète en local : NON jouée (la CI la joue sur Linux ; les références visuelles `-darwin` sont absentes sur macOS).
- Vérification navigateur (navigateur intégré, `next start` :3100) : connexion, tableau de bord, produits, création produit,
  détail produit, création d'événement, frise ; aucune erreur console hors le 401 attendu avant connexion.

## Conclusion
PR #887 prête : CI 7/7 verte sur `37b985dd` (contenu de code identique au HEAD final, qui n'ajoute que ce relevé).
