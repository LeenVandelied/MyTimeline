# Audit tests — Sprint 106

> Rédigé en fin de Phase 6. Base `fe3e0944`, HEAD `44c7dd75`.

## Couverture par issue / règle

| Issue | Règle | Flux multi-systèmes | Unit front | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|
| #606 | Fiche d'inventaire au motif DS `.mt-drawer__row/__k/__v`, valeurs longues (de) | NON | ✅ | ✅ | N/A |
| #607 | Événement passé (fin < jour civil local ; série bornée = dernière occurrence ≤ horizon ; sans fin = jamais) → ligne désaturée AA ; cumul avec archivé (BR-EVE-011/013 intacts) | NON | ✅ (`isPastEvent.test.ts`, dont cas hors cadence) | ✅ | ✅ (contraste mesuré clair/sombre, série bornée passée, série sans fin) |
| #698 | Squelette fiche (testid `product-detail-loading` conservé), squelette dashboard aligné `max-w-7xl`, `router.prefetch` au survol/focus | NON | ✅ | ✅ (largeur mesurée 968 = 968, requête `_rsc` au survol/focus) | N/A |

Décision `onSuccess` de #698 : aucun code (commentaire de décision sur l'issue).

## Tests créés / modifiés
- `frontend/src/components/products/isPastEvent.test.ts` (nouveau)
- `frontend/src/components/products/ProductDetailView.test.tsx`, `ProductsListView.test.tsx`
- `frontend/app/[locale]/(app)/dashboard/loading.test.tsx` (nouveau)
- `frontend/e2e/sprint-106-product-detail.spec.ts` (nouveau)

## Résultats runs
- Vitest : 2056/2056 (160 fichiers) ; tsc, lint, format:check : exit 0.
- E2E suite complète sur `9fbca3c4` (`next build` + `next start`) : 564 passés, 9 sautés, 11 rouges hors sprint (10 captures `sprint-77` darwin ; `sprint-101-fab-landscape:271`, déjà rouge sur la base, #769) — identique au S105.
- E2E ciblé sur `44c7dd75` après correctif de review (8 fichiers dont la spec du sprint, `sprint-61`, `sprint-89`, `sprint-91-edit-bounded-series`, `sprint-92`, `products`, `timeline`) : 61/61.
- Coverage testids : 5 nouveaux testids, tous cités en E2E.

## Conclusion
Prêt pour la PR. Non vérifié : Firefox/WebKit ; branches mobile du squelette dashboard (follow-up) ; gain de latence du préchargement chronométré.
