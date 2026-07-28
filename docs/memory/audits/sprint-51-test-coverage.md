# Audit tests — Sprint 51

> Généré en fin de Phase 6, complété après la review batch (Phase 7) et le contrôle de couverture
> E2E (Phase 8). Sprint 100 % frontend : aucune migration Flyway, aucun DTO, aucun schéma Zod.

## Couverture par règle métier

**Aucune BR n'est impactée par ce sprint.** Les trois issues planifiées (#328, #349, #351) et
l'issue absorbée (#350) déclarent explicitement « BR impactées : aucune » — ce sont un correctif de
comportement de défilement, une optimisation de rendu, deux défauts relevés en review et une
suppression de code mort. Aucun flux cross-system, aucun changement de contrat d'API, aucun rôle.

Le tableau de couverture par BR est donc **sans objet** pour ce sprint, et aucune exigence d'E2E
métier n'en découle. La couverture est évaluée ci-dessous **par critère d'acceptation d'issue**.

## Couverture par critère d'acceptation

| Issue | Critère | Couvert par | État |
|---|---|---|---|
| #328 | `scrollLeft` restauré après rotation | `TimelineResponsive.rotation.test.tsx` (4 tests) | ✅ unit |
| #328 | Minimap resynchronisée après rotation | idem (`aria-valuenow`) | ✅ unit |
| #328 | Zoom et sélection conservés | idem | ✅ unit |
| #328 | **E2E de rotation assertant `scrollLeft`** | `frontend/e2e/timeline-mobile.spec.ts:256-293` — **spec écrite (+47 l.), jamais exécutée** | ⛔ **NON EXÉCUTÉ** |
| #349 | ≤ 2 frames /89 > 16,7 ms | banc Storybook + pilote Playwright — **1/89** | ✅ mesuré |
| #349 | Frame max ≤ 33,4 ms | **18,9 ms** | ✅ mesuré |
| #349 | Coût zoom 1 000 év. mesuré avant/après | 39,5 → 33,7 ms (JS pur 1,55 → 0,05 ms) | ✅ mesuré |
| #349 | Aucun événement manqué/doublon en bord de bande | vérif navigateur + confirmé en review (`expandBand`/`bandCovers`/`OVERSCAN_*` intacts) | ✅ |
| #349 | Clavier et `aria-setsize` inchangés | vérif navigateur (`aria-setsize`=10, modèle complet) | ✅ |
| #349 | Aucune fuite (rAF, écouteurs, timer) | confirmé en review — `useTimelineViewport.ts:225-250` | ✅ |
| #351 | `role="presentation"` sur les 2 cales | changement statique, **non couvert par un test** (jsdom `clientWidth=0` → cales jamais rendues) | ⚠ lecture seule |
| #351 | Audit a11y ne signale plus `aria-required-children` | **aucun outil a11y dans `frontend/package.json`** (ni axe, ni pa11y, ni lighthouse) | ⛔ **NON TENU** |
| #351 | Scroll tiroir/dialogue ne déclenche plus le rappel | `useTimelineViewport.scroll.test.tsx` — **preuve par discrimination** (rouge avec l'ancien comportement : 3 scrolls → 3 rAF ; vert après : 0 rAF) | ✅ unit |
| #351 | Scroll de la frise reste correct | idem (« scroller frise → 1 rAF ») | ✅ unit |
| #351 | Aucune fuite au démontage | confirmé en review (même référence + `capture: true`, `cancelAnimationFrame` conservé) | ✅ |
| #350 | Fichier supprimé, 4 réfs nettoyées | `git grep TimelineCalendar -- frontend` → **vide** | ✅ |
| #350 | Build + suites vertes, aucun test modifié | `next build` OK, 814/814, confirmé en review | ✅ |

## Tests créés pendant le sprint

- `frontend/src/components/timeline/TimelineResponsive.rotation.test.tsx` — 229 lignes, 4 tests (#328)
- `frontend/src/components/timeline/zoom-incremental.test.ts` — 98 lignes, 4 cas d'équivalence stricte sur 1 000 év. × 5 niveaux (#349)
- `frontend/src/components/timeline/useTimelineViewport.scroll.test.tsx` — 120 lignes, 5 tests (#351)
- +2 tests sur la clé de cache composite (corrections post-review) — dont un qui **échoue avec l'ancienne clé**, vérifié par revert
- `frontend/e2e/timeline-mobile.spec.ts` — +47 lignes (#328), **écrites mais non exécutées**

## Résultats des runs

| Suite | Résultat | Mesuré par |
|---|---|---|
| Frontend unitaire | **821 / 821** verts | test-runner (819) + 2 ajoutés post-review |
| Backend unitaire | **452 / 452** verts — aucune régression | test-runner |
| `tsc --noEmit` | OK | test-runner + agents |
| `next build` | succès (seul warning : lockfile multiple, **préexistant**) | agent #350 |
| **E2E Playwright** | **4 échecs de setup / 105, 100 non lancés** | test-runner |

### Couverture E2E des nouveaux `data-testid` (Phase 8)
**Aucun `data-testid` réellement nouveau.** Les 10 identifiants apparaissant en ligne `+` du diff
apparaissent **aussi en ligne `-`** : ils ont été déplacés par la réécriture de `TimelineView.tsx`
en #349, pas créés. Aucun trou de couverture de ce côté.

## ⛔ Réserve bloquante pour le déploiement — E2E non exécuté

**Cause : environnement, pas code.** Le backend ne démarre pas sur `:8080` → les 4 fixtures
`auth.setup.ts:91` expirent (30 s, formulaire de login jamais visible, API en 404), ce qui empêche
les 100 specs suivantes de tourner.

Deux obstacles distincts, mesurés :

1. **Build docker impossible** — échec de chargement des métadonnées pour `eclipse-temurin:21-jre`
   et `node:20-alpine` (absentes du cache local, pull en échec). Les images `mytimeline-*` présentes
   datent du **2026-07-11**, soit **antérieures au passage RS256 du Sprint 50** — inutilisables même
   si le build passait.
2. **Base locale désynchronisée** — PostgreSQL natif répond bien sur `:5432` (base `eventmanager`,
   utilisateur `eventuser`), mais `flyway_schema_history` s'arrête à **V6** alors que le dépôt est à
   **V15**. Démarrer le backend hors docker appliquerait **9 migrations** (V7 → V15) à la base de
   développement.

**Conséquence directe :** le critère d'acceptation n°4 de #328 — *« un test E2E de rotation vérifie
explicitement la conservation du `scrollLeft` »* — **n'est pas validé**. La spec existe et est prête ;
elle n'a jamais tourné.

La review batch a de plus identifié quatre points **démontrables uniquement par E2E** :
- `useTimelineMobileState.ts:236-245` — la restauration réelle de `scrollLeft` : **jsdom ne clampe pas** (`scrollWidth = 0`), donc le test unitaire passe **trivialement** sans rien prouver ; seul l'E2E établit le clamp `min(position, maxScroll)` à la rotation ;
- `useTimelineViewport.ts:225-233` — le cas « ancêtre défilant (tiroir/plein écran) » : le test unitaire fabrique la hiérarchie à la main, aucun tiroir Radix réel ;
- `TimelineView.tsx:1013,1041` — le rendu effectif des cales `role="presentation"`, jamais montées en jsdom ;
- les gains de #349, mesurés en **Storybook dev** (React non minifié), non représentatifs d'un build de production.

## Review batch (Phase 7)

**0 CRITIQUE · 2 MAJEUR · 5 MINEUR.**

- **MAJEUR 1 — corrigé** (`8e5e2a8`) : clé de cache de zoom non injective. Le cache des graduations
  était clé sur `dayWidth` seul alors que `buildRulerTicks` consomme aussi `zoom.level` ; la
  justesse ne tenait qu'à un invariant tacite (valeurs de `DAY_WIDTH_PX` deux à deux distinctes).
  Deux niveaux à même px/jour auraient rendu une règle **silencieusement fausse**. Clé composite
  `${zoom.level}|${dayWidth}` + test qui échoue avec l'ancienne clé (vérifié par revert : 10
  graduations au lieu de 63).
- **MAJEUR 2 — non corrigé, en follow-up** : mutation de refs **pendant le rendu**
  (`cache.current`, `windowCacheRef.current`, `tRef.current`, `metricsRef.current`). Bénin
  aujourd'hui (caches d'identité, valeurs recalculables), fragile si React passe en mode concurrent
  réel. Corriger maintenant sans banc de mesure aurait été plus risqué que le laisser.
- **5 MINEUR** — 1 corrigé (test de présence dans le cache : valeur boîtée), 4 en follow-up.

## Conclusion

**Prêt pour PR, pas pour déploiement.**

Couverture unitaire complète et verte (821 frontend + 452 backend), review batch sans CRITIQUE,
MAJEUR corrigible corrigé et démontré par test, aucun trou de couverture de testid.

La réserve E2E est **assumée et documentée**, pas ignorée : elle relève d'un blocage
d'environnement introduit par le Sprint 50 (chaîne RS256) et non d'un défaut du code de ce sprint.
Elle doit être levée avant tout déploiement — et l'exécution de `timeline-mobile.spec.ts` reste la
seule preuve possible du critère n°4 de #328.
