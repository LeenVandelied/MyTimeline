# Audit tests — Sprint 41

> Généré en fin de Phase 6 (test-runner). Un marqueur de gap non couvert bloquerait la Phase 9 PR.
> Sprint UX & a11y Timeline — **aucune BR métier nouvelle** (complète BR-EVE d'affichage, cf. issues). La matrice porte donc sur les **critères d'acceptation a11y/UX** plutôt que des BR-XX.

## Couverture par critère (a11y/UX Timeline)

| Issue | Critère | Cross-system flow | Unit frontend | E2E parcours | E2E métier |
|-------|---------|:---:|:---:|:---:|:---:|
| #226 | Cible tactile `.mt-zoom__btn` ≥44×44px mobile, desktop inchangé | NON | ⚠ N/A (pseudo `::before` non testable jsdom, PAT-S24-002) — vérif inspection CSS | ⊘ non requis | N/A |
| #228 | `aria-hidden` conditionnel EventPill (retiré si `readableInside`) | NON | ✅ EventPill.test.tsx (+2 : démasque si contraste AA, garde sinon) | ⊘ | N/A |
| #228 | Couverture clavier §9 (←/→ inter-lanes, trap Tab drawer + restauration focus, `T`/`[`/`]`/`-`) | NON | ✅ TimelineView.test.tsx (+5, §9) | ⊘ | N/A |
| #195 | Accordéon collapse par produit (indépendance, scroll conservé, clavier/focus cohérent) | NON | ✅ TimelineView.test.tsx (+3 : indépendance, scroll, clavier) | ⚠ nouveau testid `timeline-resource-head` sans spec E2E → Phase 8 | N/A |
| #227 | Option B actée : `?` retiré du référentiel, aide hover/focus-only | NON | ⊘ (doc-only) | ⊘ | N/A |

Cross-system flow=NON pour tout le sprint (100% frontend/doc, aucun flux 2+ systèmes/rôles) → **E2E métier non requis** (règle : obligatoire seulement si cross-system flow=OUI).

## Tests créés
- `frontend/src/components/timeline/EventPill.test.tsx` — +2 tests (aria-hidden conditionnel, #228)
- `frontend/src/components/timeline/TimelineView.test.tsx` — +5 tests clavier §9 (#228) + 3 tests accordéon produit (#195)
- #226 : pas de test unitaire (pseudo-élément non testable jsdom, PAT-S24-002 — vérif par inspection CSS)
- #227 : aucun test (doc-only)

## Résultats runs (test-runner Phase 6, depuis worktree sprint/41)
- Frontend (Vitest) : **62 fichiers / 456 tests, 456 passed, 0 failed**, 0 erreur TypeScript
- Backend : non lancé (aucun changement backend ce sprint)
- E2E Playwright : non lancé (nécessite stack complète ; couverture des nouveaux testid → Phase 8 post-merge)
- Régression ciblée : tests clavier §9 (#228) = 31/31 ✓ ; accordéon produit (#195) ✓
- Warning stderr non bloquant : `Missing aria-describedby on DialogContent` — pré-existant, hors scope Sprint 41.

## Conclusion
**Prêt pour PR.** Suite frontend verte, aucune BR métier impactée, aucun gap de couverture bloquant.
Follow-up non bloquant : couverture E2E du nouveau `data-testid="timeline-resource-head"` (#195) → `/create-e2e` post-merge (Phase 8).
