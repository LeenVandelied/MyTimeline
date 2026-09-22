# #764 — Mesurer à 375 px les cibles tactiles de la frise mobile, de la fenêtre de lecture et des CTA d'état vide

## Résumé
Commit `a535a960`. Nouvelle spec `frontend/e2e/sprint-102-touch-targets.spec.ts`. Elle reprend `measureControls`/`expectAllTouchable` de sprint-101 : même sélecteur, mêmes exemptions (`sr-only`, `aria-hidden`, `*-grabber`), garde anti-vacuité par surface. Chaque zone mesure au moins 44 px, donc **aucune correction de production** (mesurer d'abord : PAT-S99-001, PAT-S101-001). Un seul commit, parce qu'aucun correctif n'était nécessaire.

La fenêtre de lecture montée à 375 px quand on touche un événement de la frise est **`components/timeline/TimelineBottomSheet.tsx`** (monté par `TimelineMobilePortrait.tsx:434`). `EventDrawer.tsx` n'est monté que par `TimelineView.tsx:1923` (desktop) ; la spec asserte `timeline-view` à 0.

## Mesures (375×812, chromium, dpr 1)
| Surface | Contrôle | L×H px | Verdict |
|---|---|---|---|
| Fenêtre de lecture (`TimelineBottomSheet`) | `timeline-sheet-close` | 44.0×44.0 | conforme |
| Fenêtre de lecture | poignée `timeline-sheet-grabber` | non mesurée | exemptée (DEC-S99-002, div sans rôle + croix + Escape) |
| Feuille d'actions (`TimelineActionSheet`) | `timeline-actionsheet-edit` | 351.0×48.0 | conforme |
| Feuille d'actions | `timeline-actionsheet-delete` | 351.0×48.0 | conforme |
| Feuille d'actions | `timeline-actionsheet-cancel` | 351.0×48.0 | conforme |
| Feuille d'actions | poignée `.mt-actionsheet__grabber` | non mesurée | exemptée (`aria-hidden`, DEC-S99-002) |
| Dashboard, aucun produit | `dashboard-product-carousel-empty-cta` (`<a>`) | 143.4×44.0 | conforme |
| Dashboard, 1 produit sans événement | `dashboard-compact-agenda-empty-cta` | 174.0×44.0 | conforme |
| Dashboard | `dashboard-week-agenda-empty-cta` | absent | non rendu à 375 px (branche desktop `dashboard/page.tsx:245`), absence assertée |
| Dashboard | `dashboard-product-list-empty-cta` | absent | non rendu à 375 px (branche desktop `dashboard/page.tsx:253`), absence assertée |

Remarque : `WeekAgenda` et `ProductList` ne sont montés qu'au-dessus de 768 px, où leur `max-md:h-11` (posé au S101) est inerte. Leur classe mobile est donc du code mort en l'état. Ce n'est pas un défaut : aucune cible n'est visible sous 768 px.

## Fichiers
- `frontend/e2e/sprint-102-touch-targets.spec.ts` (nouveau, 250 lignes)

## Tests
- `cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/sprint-102-touch-targets.spec.ts --project=chromium --ignore-snapshots`
  - Run 1 : 7 passed, 1 failed. Le test frise a échoué avec `timeline-host` introuvable en 30 s, page bloquée sur « Chargement… ». C'était la première compilation de `/[locale]/timeline` sous `next dev`, suivie de 4 recompilations HMR pendant le test (probablement les éditions de l'agent A dans le working tree partagé).
  - Run 2 à chaud : **8 passed**. Run 3 `--repeat-each=3` : **14 passed** (5 setup + 9).
- Specs qui citent ce qui est modifié : aucun code de production modifié, aucun testid ni classe créés (tous les testids cités existent déjà). Specs voisines jouées en contrôle de cohérence du harnais : `sprint-101-touch-targets.spec.ts` + `timeline-mobile.spec.ts` → **26 passed**.
- `npx tsc --noEmit` OK · `npx eslint` OK · `rtk proxy npx prettier --check` EXIT=0 · `git status --porcelain | grep darwin` vide.
- Serveur `next dev` :3000 arrêté par PID (16292), port vérifié libre. Backend :8087 laissé actif.

## Écarts d'énoncé
- Briefing, contre-vérification : « Il n'existe PAS de testids `timeline-actionsheet-*` hormis l'overlay ». C'est **faux** : `TimelineActionSheet.tsx` porte `timeline-actionsheet`, `-edit`, `-delete` et `-cancel` (déjà utilisés par `sprint-101-touch-targets.spec.ts:238`). La spec les utilise.
- La feuille d'actions mesure 48 px, comme le prévoyait le lead d'après la CSS (`min-height:48px`). C'est désormais mesuré, plus seulement déclaré.
- Hors périmètre, non mesurés : le bouton déclencheur `⋯` (`timeline-event-more`), ainsi que `products-empty-cta`, `categories-empty-cta` et le « désarchiver » de `ProductDetailView`. Le point 6 de `issue-754-done.md` les cite aussi comme non mesurés.

fichiers de contexte lus:
- `docs/memory/patterns.md` : PAT-S99-001 (l.962, « requête DOM générique + seuil anti-vacuité »), PAT-S101-001 (l.968)
- `docs/memory/decisions.md` : DEC-S99-002 (l.1093, poignée exemptée), DEC-S101-003 (l.1108, `lib/touchTarget.ts` source unique) (titres)
- `docs/memory/sprints/sprint-101/issue-754-done.md` : l.67 (point 6, CTA d'état vide « NON mesurée en E2E »)
- `docs/memory/sprints/sprint-101/issue-758-done.md` : NON LU ; `arbitrage-ui-design-754-757.md` : NON LU
- `.ai-env/context-packs/pit-frontend.md` : PIT-S101-001..005 (titres l.1675-1691), PIT-S99-001..003 (titres)
- `frontend/e2e/sprint-101-touch-targets.spec.ts`, `sprint-90-first-contact.spec.ts` (stubs l.80-120, portrait l.330-380), `timeline-mobile.spec.ts` (l.55-115), `support/timeline-lanes.ts`
- `frontend/src/lib/touchTarget.ts`, `app/[locale]/(app)/dashboard/page.tsx` (branches l.190-253), `TimelineBottomSheet.tsx`, `TimelineActionSheet.tsx`, `styles/ds/components/timeline.css` l.881-898

## Signaux mémoire
- [MEMORY:pitfall] Context: spec E2E lancée sous `next dev` pendant qu'un autre agent édite des fichiers du même working tree. Solution: rejouer à chaud ; un échec « Chargement… » avec des lignes `✓ Compiled in …` intercalées dans le log Next vient du HMR, pas du code testé. Prevention: dans un fan-out, lire le log Next avant de diagnostiquer, ou jouer contre `next build`+`next start` (sans HMR).
- [MEMORY:decision] Context: #764, CTA d'état vide `WeekAgenda`/`ProductList`. Decision: non mesurés à 375 px, leur absence est assertée. Why: branche desktop seulement (`dashboard/page.tsx`) ; si elle apparaît un jour en mobile, la spec rougit et force la mesure.

## Recommandations suite
- RECOMMAND_FOLLOWUP: mesurer à 375 px `products-empty-cta`, `categories-empty-cta`, le « désarchiver » de `ProductDetailView` et le déclencheur `⋯` (`timeline-event-more`) de la frise portrait, avec la même spec (même motif de stub). Ce sont les restes du point 6 de `issue-754-done.md`.
- RECOMMAND_FOLLOWUP (mineur) : factoriser `measureControls`/`expectAllTouchable` dans `e2e/support/touch-targets.ts` (3 copies).
- Pas de RECOMMAND_UI_DESIGN car aucune correction visuelle de production (toutes les zones mesurent au moins 44 px).
- Pas de RECOMMAND_DB_EXPERT car aucun schéma ni aucune donnée persistée (les listings sont stubbés, les semis sont purgés par la fixture).
- Pas de RECOMMAND_TEST_RUNNER car la spec a été jouée ici, 3 passes répétées vertes.
- Pas de RECOMMAND_SECURITY car la spec ne fait que des mesures, sans surface d'authentification ni de données sensibles.

STATUS: COMPLETED
