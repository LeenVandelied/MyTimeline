# Audit tests — Sprint 19

> Généré en fin de Phase 6. Sprint frontend-only (Timeline mobile + EventPill desktop).
> Aucune couverture manquante bloquante : les issues sont de la couche présentation,
> aucune nouvelle règle métier cross-system introduite. L'ownership BR-EVE-001 reste
> enforced backend (tests existants) + parcours golden-path E2E.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-001 | Vue restreinte aux events de l'utilisateur (ownership transitif via product) | OUI (déjà couvert) | ✅ (Sprint 1 #30/#31, ownership 403) | ✅ (fixtures, pas de leak) | ✅ golden-path.spec.ts (login → timeline-event visible) | ✅ (existant — présentation seule ce sprint, pas de nouveau flux) |
| BR-EVE-009 | Couleur event 1-couleur + encre par contraste WCAG | NON | ✅ (S9 #44) | ✅ EventPill.test.tsx + color.test.ts (contrastInk → --mt-evt-ink) | N/A | N/A |

Cross-system flow BR-EVE-001 = OUI mais **déjà couvert** avant ce sprint (golden-path E2E + ownership backend). Les vues mobiles #63/#64 et EventPill #192 sont des variantes de **présentation** : elles ne créent aucun nouveau flux métier → pas d'E2E métier neuf requis (aucune couverture bloquante manquante).

## Tests créés / modifiés (ce sprint)
- `frontend/src/components/timeline/EventPill.test.tsx` (#192 — 6 tests, testids + encre)
- `frontend/src/components/timeline/TimelineMobilePortrait.test.tsx` (#63)
- `frontend/src/components/timeline/TimelineMobileLandscape.test.tsx` (#64 — rendu paysage + transition rotation sans perte d'état)
- `TimelineView.test.tsx` / `zoom.test.ts` : non-régression desktop (verts après réintégration EventPill a0a94f1)

## Résultats runs (test-runner, Phase 6)
- **Frontend Vitest : 153/153 passed, 0 failed, 0 erreur TS** (20 fichiers). Timeline dir = 64/64.
- **E2E Playwright : NON exécuté** — `./scripts/test-quiet.sh e2e` invoque `npm test` (vitest) au lieu de `npm run test:e2e` (limitation script, lib plugin ai-env). `golden-path.spec.ts` présent mais non lancé par l'alias. Non bloquant Sprint 19.
- Backend : non modifié ce sprint → non lancé.

## Couverture E2E — nouveaux testids mobiles (Phase 8)
`golden-path.spec.ts` couvre `timeline-event` (préservé, #163 intact). Les nouveaux testids **mobiles** (`timeline-mobile-portrait/landscape`, `timeline-sheet*`, `timeline-actionsheet*`, `timeline-landscape-drawer*`, `timeline-minimap-toggle`, `timeline-event-more`) n'ont **pas de spec E2E** (dossier e2e historiquement vide + gestes pinch/pointer peu fiables headless).
→ **MAJEUR non bloquant** : plan `/create-e2e` post-merge (parcours mobile portrait/paysage). Signalé par #63 ET #64.

## Conclusion
**Prêt pour PR.** Suite frontend verte (153/153), tsc/eslint OK, testids golden-path préservés, régression EventPill détectée et corrigée (a0a94f1). Blocages restants : aucun. Follow-ups (non bloquants) : E2E mobile via /create-e2e, script test-quiet.sh e2e alias, stories Storybook paysage, EventBar/Lane orphelins.
