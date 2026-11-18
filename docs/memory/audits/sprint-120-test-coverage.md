# Audit tests — Sprint 120

> Sprint d'outillage frontend (suivis de la montée Next 16) : aucune règle métier modifiée, aucun flux inter-systèmes
> nouveau. La couverture exigée est la NON-RÉGRESSION de l'existant.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| — | Aucune BR touchée (montées de dépendances, renommage `proxy.ts`, règles de lint, bundler) | NON | N/A | N/A | ✅ 2359/2359 | ✅ suite complète | ✅ inchangés, rejoués |
| ADR-004 / BR-AUT (garde serveur) | `proxy.ts` (ex-`middleware.ts`), runtime Node | NON | N/A | N/A | ✅ `proxy.test.ts` | ✅ `auth-guard` (passe 1) | ✅ `auth-signature` RS256 (passe 2 CI) |

## Tests créés / modifiés
- `frontend/e2e/support/page-chunk-gate.ts` (porte chunk par contenu, #890) — utilisée par `sprint-90-first-contact`,
  `sprint-106-product-detail`.
- `frontend/proxy.test.ts` (renommé, #889).
- `frontend/app/global-error.test.tsx`, `frontend/app/global-not-found.test.tsx`, `frontend/src/hooks/useExportFlow.test.ts`
  (adaptés à React 19, #892).

## Résultats runs
- Vitest : 177 fichiers, 2359/2359, 0 stderr (identique à la base en nombre).
- Lint `eslint .` (5 règles react-hooks 7 actives) : 0 problème ; `tsc` ; `prettier --list-different .` vide.
- `next build` Turbopack : 48 pages SSG, table des routes identique ; `storybook build` OK.
- E2E locale (macOS, `next build` Turbopack + `next start` :3000, backend `dev,e2e` jetable, `--ignore-snapshots`) :
  **674 passés / 1 échec / 9 ignorés en 3,9 min**. Échec unique = contrôle d'armement de `sprint-77-theme-visual:620`,
  rouge par construction sur darwin avec `--ignore-snapshots` (références `-chromium-linux`). Aucune capture darwin écrite.
- Proxy mode vérifiant (:3001, `AUTH_JWKS_URL`) : cookie forgé → 307 ; mode dégradé (:3000) → 200 (attendu).
- Vérification navigateur : inscription, connexion, tableau de bord, frise (zoom +/−/T, sélection, formulaire
  d'édition), fiche produit, réglages (densité persistée).
- CI : voir PR #897.

## Conclusion
Prêt pour PR. Aucun `[MISSING]`.
