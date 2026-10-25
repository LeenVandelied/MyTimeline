# Audit tests — Sprint 115

> Écrit par le lead en fin de Phase 6. Toutes les mesures ci-dessous ont été rejouées par le lead depuis le worktree
> (`sprint/115`), aucune n'est reprise d'un rapport de subagent.

## Couverture par issue

Aucune BR métier touchée : textes de la landing, mise en page à texte agrandi, harnais E2E. Frontend seul, pas de flux inter-systèmes.

| Issue | Sujet | Cross-system flow | Vitest | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|
| #797 | La frise ne promet plus de rappels (décision dev : reformuler) | NON | ✅ `HowItWorksSection.test.tsx` +4 (1 par locale, rouge sur l'ancien texte) | ✅ `sprint-103-use-case-frieze` vert | N/A |
| #799 | Pas de débordement horizontal à texte ×2 (WCAG 1.4.4) | NON | — | ✅ `sprint-115-landing-text-200` 4/4 (fr/de × 375/1024), armé : 4/4 rouges sans les correctifs | N/A |
| #840 | Sessions E2E par `sessionState(X)` | NON | ✅ garde textuelle `e2e-rate-limit-budget.test.ts` (armée par mutation) ; bloc #832 couvre le message explicite | ✅ 8 lots rejoués par l'agent ; suite complète par le lead | N/A |

## Tests créés ou modifiés
- frontend/src/components/landing/HowItWorksSection.test.tsx (#797)
- frontend/e2e/sprint-115-landing-text-200.spec.ts, frontend/e2e/support/text-zoom.ts, frontend/e2e/sprint-104-landing-sticky-nav.spec.ts (#799)
- frontend/src/__tests__/e2e-rate-limit-budget.test.ts — bloc #840 ; 72 specs migrées (#840)

## Résultats runs (lead)
- Rejeu de fin de vague 1 (`next dev`) : `sprint-103-use-case-frieze` + `sprint-115-landing-text-200` + `sprint-104-landing-sticky-nav` → 33/33.
- `next build` (NEXT_PUBLIC_API_URL=/api, lint bloquant inclus) : OK.
- Vitest : 177 fichiers, 2328/2328. `npx tsc --noEmit` : 0. `npm run format:check` : OK.
- E2E suite complète contre `next build` + `next start` (backend e2e :8086, `--ignore-snapshots`, 2 workers) : 667 tests → 657 passés / 1 échec / 8 sautés / 1 non exécuté en 5,3 min.
  - L'unique échec est `sprint-77-theme-visual:620` (armement de la comparaison de captures, « Référence absente … chromium-darwin.png ») : attendu sur darwin, la comparaison est jugée par la CI Linux. Le test non exécuté appartient au même bloc.
  - Les 8 sautés = `auth-signature` (clé de forge absente localement, déjà le cas avant le sprint) : la migration de ce fichier n'est pas exercée en local.
  - Aucune référence de capture darwin écrite (`git status` propre).
- Coverage E2E : aucun `data-testid` ajouté par le sprint.

## Conclusion
Prêt pour PR. Pas de backend ni de migration : backend e2e réutilisé depuis l'image S113 (0 commit `backend/` depuis sa création).
