# Audit tests — Sprint 117

> Généré en fin de Phase 6 par le lead (2026-10-25), HEAD `a49b2e2c`. Mesures rejouées par le lead depuis le worktree,
> pas reprises des agents.

## Couverture par issue

Aucune règle métier `BR-*` modifiée : le sprint ne touche que le rendu de la frise et la coque mobile (0 fichier backend,
0 migration, 0 contrat API). Aucun flux inter-systèmes, donc pas d'E2E métier exigé.

| Issue | Description | Cross-system flow | Unit (Vitest) | E2E |
|-------|-------------|:---:|:---:|:---:|
| #804 | Marges de recadrage F = emprise pin + libellé, réserve réelle du libellé de queue | NON | ✅ `zoom.test.ts` (#804, 8 tests), `label-reserve.test.ts` (+10), `TimelineView.fit-shortcut.test.tsx` | ✅ `sprint-105-fit-shortcut.spec.ts` (marges 40/135, 4 jeux « libellé entier », dont un titre long) |
| #805 | Plus de dérive sur `[`/`]` enchaînés à `+`/`-` | NON | — (jsdom ne clampe pas `scrollLeft` : pas de preuve possible en unit) | ✅ `sprint-117-period-zoom-no-drift.spec.ts` |
| #837 | Cibles tactiles du tiroir mobile et du ⋯ paysage, retrait de `BOX_ONLY` | NON | — | ✅ `sprint-117-touch-targets.spec.ts`, `sprint-99-touch-targets.spec.ts` (profil complet) |

Contrôles négatifs (mutations) consignés dans les `done.md` : #804 défaut 40/40 → 8 rouges unit, 5 rouges E2E, réserve
ignorée → jeu 4 rouge ; #805 retour à `scrollLeft =` → 6/6 rouges ; #837 rouge avant correctif sur la déconnexion et le ⋯
de durée.

## Tests créés
- `frontend/e2e/sprint-117-period-zoom-no-drift.spec.ts` (#805)
- `frontend/e2e/sprint-117-touch-targets.spec.ts` (#837)
- `frontend/src/components/timeline/zoom.test.ts`, `label-reserve.test.ts` (blocs #804)

## Résultats runs (lead)
- Backend : non concerné (0 fichier `backend/` dans `origin/dev..HEAD`).
- Frontend Vitest : 2359 passed, 0 failed (`npx vitest run`, suite complète).
- `format:check` : OK. `next build` (avec `NEXT_PUBLIC_API_URL=/api`, `E2E_API_PROXY_TARGET`) : OK, lint et types compris.
- E2E, suite complète `chromium` contre `next build` + `next start` (backend conteneur reconstruit sur ce HEAD) :
  673 tests, 654 passed, 8 skipped, 11 failed (5,2 min), dont :
  - 10 × `sprint-77-theme-visual` « doesn't exist » : références `-darwin` absentes, attendu sur macOS (la CI Linux
    tranche) ; les 10 PNG darwin générés ont été supprimés, aucun n'est commité.
  - 1 × `sprint-111-theme-account-preference:88` (timeout 5 s sur le PUT de préférence à la connexion) : rejoué
    isolément 3 fois, 6/6 à chaque run. Aucun fichier du diff ne touche le thème, l'auth ou cette spec : non imputé au
    sprint, la CI de la PR tranchera.

## Conclusion
Prêt pour PR, sous réserve de la review batch (Phase 7).
