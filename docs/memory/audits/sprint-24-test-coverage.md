# Audit tests — Sprint 24 (a11y Timeline)

> Généré en fin de Phase 6. Un marqueur de couverture manquante (MISSING entre crochets) bloquerait la Phase 9 PR — aucun présent ici.
> Sprint 100% frontend (aucun code backend touché — `git diff --stat origin/dev..HEAD` = frontend + doc only).

## Couverture par critère a11y (issues #81 / #82 / #197)

| Critère | Description | Cross-system flow | Unit vitest | a11y assertion | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| #81-1 | Region landmark (`role=region` + aria-label/describedby) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A |
| #81-2 | Roving tabindex resource-keyé (PAT-S24) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A |
| #81-3 | Nav flèches ←→↑↓ / Home/End / Enter-Espace | NON | ✅ (partiel*) | ✅ | ⚠ N/A | ⚠ N/A |
| #81-4 | aria-live polite (annonces zoom/sélection) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A |
| #81-5 | aria-label agrégé (`buildEventAriaLabel`) | NON | ✅ (8 tests lib-a11y) | ✅ | ⚠ N/A | ⚠ N/A |
| #81-6 | Garde-fou contraste (libellé hors barre si <4.5:1) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A |
| #81-7 | Focus ring `outline 2px accent` (token DS, theme-aware) | NON | ⚠ jsdom N/A** | — | ⚠ N/A | ⚠ N/A |
| #82 | Hitbox close EventDrawer ≥44px (::before) | NON | ⚠ jsdom N/A** | — | ⚠ N/A | ⚠ N/A |
| #197 | Référentiel `ux-patterns.md` + re-validation ui-design | NON | — (doc) | ✅ verdict ui-design | ⚠ N/A | ⚠ N/A |

Cross-system flow = NON pour toutes : sprint a11y front-only, aucune règle métier P0/P1 multi-système → **pas d'E2E métier requis** (gate Phase 6 non bloquante sur ce point).

\* #81-3 : Home/End/↑↓/Enter/Échap + raccourcis testés (`TimelineView.test.tsx`) ; couverture ←→ inter-lanes + cyclage Tab/Shift+Tab drawer **incomplète** — tracée non bloquante dans `ux-patterns.md §9` (RECOMMAND_FOLLOWUP).
\*\* jsdom ne calcule ni layout ni pseudo-éléments → un assert de dimension (focus ring width, hitbox 44px) serait un faux-vert. Validé visuellement/statiquement (token DS + `::before` 44×44) + verdict ui-design GO.

## Tests créés
- `frontend/src/components/timeline/lib-a11y.test.ts` (8 tests — `buildEventAriaLabel` agrégation titre/dates/récurrence/statut BR-EVE-006 + `eventLabelReadableInside` contraste).
- `frontend/src/components/timeline/TimelineView.test.tsx` (+195 lignes — roving, flèches, Home/End, aria-live silencieux au montage, **remap collapse resource-keyé** (non-régression MAJEUR-2), raccourcis T/[/]/+/-/F/Échap).

## Résultats runs (vérifiés indépendamment par le lead — `npx vitest run`)
- **Frontend : 44 fichiers, 325/325 tests passés, 0 failed** (8.99s). `lib-a11y.test.ts` collecté et vert.
- Backend : N/A (0 fichier backend modifié ce sprint).
- E2E Playwright : NON exécuté (bug connu #207 — l'alias `e2e` de test-quiet.sh lance vitest ; `frontend/e2e/` sans spec Timeline a11y). Nouveaux testids (`timeline-view`, `timeline-event`, `timeline-event-outside-label`, `timeline-live-region`) → couverture E2E à créer post-merge (`/create-e2e`), tracée Phase 8.
- Note : le test-runner Haiku isolé a rapporté 306 (misread) ; run direct du lead = 325/325 (vérité terrain).

## Validation ui-design (#197 critère 2+3)
Verdict **GO PR** — conformité 100 % des 10 points de `ux-patterns.md §10`. 2 écarts consignés acceptables (raccourci `?` hover-only ; span titre aria-hidden). Détail : `docs/memory/sprints/sprint-24/ui-design-validation.md`.

## Conclusion
**Prêt pour PR.** Suite verte (325/325), a11y patterns vérifiés (roving/aria-live/collapse-remap), ui-design GO. Aucune couverture manquante bloquante (pas de flux cross-système → pas d'E2E métier requis). Gap E2E parcours Timeline a11y = follow-up post-merge non bloquant (nouveaux testids sans spec).
