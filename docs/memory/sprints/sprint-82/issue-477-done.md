# Issue #477 — [TEST] Le zoom AVANT de la frise n'est épinglé par aucune spec

RETOUR :
- commits: 1 commit, sujet `:white_check_mark: test(e2e): épingler le zoom AVANT de la frise (#477)`
  (SHA non inscrit ici : toute amende du commit le change, la ligne serait périmée
  d’office — le retrouver par `git log --oneline --grep "#477"`)
- resume: `frontend/e2e/timeline.spec.ts` étendu (+239 l., bloc `#477` en fin de fichier).
  Fichier choisi et non un nouveau : l'en-tête #314 (L26-31) interdit explicitement un
  second `timeline-*.spec.ts` desktop, et 5 helpers module-locaux sont réutilisés tels
  quels (`settledScroll`, `pillOffsetFromViewportLeft`, `isoOffsetDate`,
  `stubProductsList`, `gotoTimeline`, `MONTH_PERIOD_STEP_DAYS`, `LANE_TRACK_OFFSET_PX`,
  `DAY_WIDTH_MONTH_PX`).
  Sens: zoom AVANT. Couples exercés: **Mois → Semaine** (12→34 px/j) et **Semaine → Jour**
  (34→96 px/j) — aucun n'est Mois → Trimestre.
  3 entrées produit couvertes: raccourci `+`, alias `=`, bouton `timeline-zoom-in`
  (aucune spec d'ancrage n'empruntait ce bouton avant).
  Oracle retenu = celui de #451, « le jour qu'on regardait est toujours celui qu'on
  regarde » : (1) pastille de l'oracle MONTÉE, (2) `scrollLeft === targetDay × dayWidth`
  exact, (3) `scrollLeft < maxScroll` (prouve que (2) n'est pas une borne), (4) offset
  pastille ↔ bord conteneur = 168 px (non-régression #392, repère PISTE).
  Position de départ posée par `]` ×4 (contrôle produit réel, pas une écriture de
  `scrollLeft` par la spec) → vaut aussi non-régression de `[` / `]`.
  Nouveau fixture `stubZoomInRangeFixture` : 731 j (J−630 → J+100), oracle au jour 120,
  aujourd'hui au jour 630. Étendue COURTE délibérément : `MAJOR_TICK_UNIT` vaut `'day'`
  aux niveaux Semaine ET Jour et `TimelineRuler` n'est PAS virtualisé — réutiliser le
  fixture 5501 j de #449/#451 aurait fait rendre ~5500 graduations + ~1570 segments
  week-end à chaque zoom avant.
  2 tests ajoutés. `frontend/src/` NON MODIFIÉ.

- arithmetique:
  Étendue 731 j, oracle jour 120, aujourd'hui jour 630 (510 j d'écart → un recentrage
  sur aujourd'hui, faux correctif documenté par #451, est exclu par construction).
  Bande de rendu ≈ [scrollLeft − 768, scrollLeft + 1432] (OVERSCAN_X_PX 600 +
  LANE_TRACK_OFFSET_PX 168, conteneur ~1000 px sur Desktop Chrome 1280).

  | niveau  | px/j | scrollLeft attendu | bande de rendu   | pastille à | état    |
  |---------|------|--------------------|------------------|------------|---------|
  | Mois    | 12   | 1440 (= 120 × 12)  | [  672,  2872]   | 1440       | MONTÉE  |
  | Semaine | 34   | 4080 (= 120 × 34)  | [ 3312,  5512]   | 4080       | MONTÉE  |
  | Jour    | 96   | 11520 (= 120 × 96) | [10752, 12952]   | 11520      | MONTÉE  |

  Contrôle négatif : `scrollLeft` RESTE à 1440 aux trois niveaux, bande figée à
  [672, 2872], pastille à 4080 px puis 11520 px → hors bande de 1208 px puis 8648 px
  → DÉMONTÉE (0). Prédiction VÉRIFIÉE à l'exécution (cf. « preuve ROUGE »).

  Point de fond noté dans le commentaire de la spec : au zoom AVANT la piste
  s'ÉLARGIT, donc **aucun rabattement n'est possible** — l'oracle géométrique de #449
  (« la frise n'a pas sauté au bord droit ») est STRUCTURELLEMENT AVEUGLE dans ce sens.
  Le symptôme est un glissement silencieux vers le passé, sans toucher aucune borne.

- preuve run: pile dédiée `mtl-s82` (backend-e2e 8087 / postgres 5437), front
  `npx next dev -p 3000` (webpack, pas turbopack). Oracle double AVANT tout run :
  `/api/auth/me` = 401, `/fr/login` = 200.
  Commande : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
    rtk proxy npx playwright test e2e/timeline.spec.ts --grep "#477" --reporter=line`
  - rejeu 1 (ciblé #477)  : **7 passed / 0 failed — 16.2 s** (5 setup + 2 tests)
  - rejeu 2 (ciblé #477, après restauration du source) : **7 passed / 0 failed — 10.2 s**
  - rejeu 3 (fichier ENTIER, sans `--grep`) : **36 passed / 0 failed — 39.1 s**
    → non-régression vérifiée sur #392 (L1263, L1300, L1341), #449 (L1460), #451 (L1616).
  `npx tsc --noEmit` : No errors. `eslint` : No issues. `prettier --check` : OK.

- preuve ROUGE (controle negatif):
  Neutralisation : insertion de `if (Date.now() > 0) return` en TÊTE du corps du
  `useLayoutEffect` sur `[dayWidth]` (`TimelineView.tsx:895`, la re-projection d'ancre
  de #449). Source sauvegardé avant (`cp` vers le scratchpad).
  Sortie rouge exacte, sur les DEUX tests :
  ```
  1) e2e/timeline.spec.ts:1886  › raccourcis « + » puis « = » : Mois → Semaine → Jour
  2) e2e/timeline.spec.ts:1910  › bouton « timeline-zoom-in » : Mois → Semaine
     Error: zoom avant vers Semaine : la pastille du jour 120 reste MONTÉE — sans
     re-projection elle sort de la bande de virtualisation et la frise paraît vide
     expect(locator).toHaveCount(expected) failed
     Expected: 1
     Received: 0
     14 × locator resolved to 0 elements
     at expectDayStillAnchored (e2e/timeline.spec.ts:1863:5)
  2 failed / 5 passed (14.8s)
  ```
  L'échec tombe sur l'assertion (1) du symptôme utilisateur, pas sur un nombre — ordre
  voulu. La prédiction arithmétique (pastille hors bande → démontée) est donc mesurée,
  pas supposée.
  RESTAURATION PROUVÉE : `rtk proxy git diff HEAD -- frontend/src/` rend une sortie
  **VIDE** (exécuté après restauration ; ré-exécuté avant le commit). Aucun fichier de
  `frontend/src/` n'est dans le commit.

- [MEMORY:*] signaux:
  [MEMORY:pattern] Problem: prouver qu'un E2E d'ancrage de zoom détecte vraiment une
  régression, alors que le sens AVANT n'a AUCUN clamp navigateur à déclencher.
  Solution: l'oracle doit être « le jour regardé est conservé » (pastille montée +
  `scrollLeft === jour × dayWidth` exact + `scrollLeft < maxScroll` + offset #392),
  jamais « la frise n'a pas sauté au bord ». Anti-pattern: transposer l'oracle
  géométrique de #449 au zoom avant — il y est structurellement toujours vrai (la piste
  ne fait que grandir), donc vert quoi qu'il arrive.
  [MEMORY:pitfall] Context: choisir le fixture d'un E2E de frise aux niveaux fins.
  `MAJOR_TICK_UNIT` (`zoom.ts`) vaut `'day'` aux niveaux **Semaine ET Jour**, et
  `TimelineRuler` (`TimelineView.tsx:220`) mappe `ticks` EN ENTIER — la règle n'est pas
  virtualisée, contrairement aux pastilles. Solution: dimensionner l'étendue du fixture
  (731 j ici, pas les 5501 j de #449/#451) au lieu de réutiliser par réflexe le fixture
  existant. Prevention: avant de réutiliser un fixture « large étendue » pour un test
  qui descend vers Jour/Semaine, calculer le nombre de graduations ET de segments
  week-end qui seront rendus (~5500 + ~1570 dans le cas écarté).
  [MEMORY:pitfall] Context: contrôle négatif sur working tree partagé/worktree.
  Solution: `cp` du fichier vers le scratchpad AVANT neutralisation, restauration par
  `cp` inverse, puis `rtk proxy git diff HEAD -- <dossier>` comme PREUVE de restauration
  (et non un simple `git status`, qui ne montre pas le contenu). `git stash` INTERDIT
  (pile partagée entre worktrees). Prevention: la sortie vide du diff est à joindre au
  retour, sinon rien ne distingue « restauré » de « oublié ».

## Recommandations suite

- **Pas de `RECOMMAND_TEST_RUNNER`** : les 2 specs ont été jouées ici même, 3 rejeux
  verts dont le fichier entier (36 tests). Rien à déléguer.
- **Pas de `RECOMMAND_DB_EXPERT` / `RECOMMAND_SECURITY`** : périmètre 100 % E2E frontend,
  aucun fichier `frontend/src/`, `backend/`, ni migration touché. Aucune BR impactée
  (l'ancrage est une contrainte d'implémentation UI, #449/#451 — aucun `BR-*` n'a été
  inventé ni cité, conformément à PIT-S70-001).
- `RECOMMAND_FOLLOWUP:` **couples de niveaux encore non couverts par une mesure
  d'ancrage.** Après #451 (Mois → Trimestre, arrière) et #477 (Mois → Semaine et
  Semaine → Jour, avant), il reste sans épinglage : Trimestre → Année et Année →
  Trimestre (2,2 px/j — l'échelle la plus grossière, où l'arrondi `scrollLeft /
  dayWidth` de la ligne `anchorDaysRef.current = el.scrollLeft / dayWidth` est le moins
  précis), ainsi que le zoom `Cmd`+molette (`TimelineView.tsx:1012`, handler `wheel`
  SÉPARÉ du raccourci clavier et du bouton — c'est la seule des quatre entrées de zoom
  qui reste sans aucune spec d'ancrage). Taille XS/S, priorité P3.
- `RECOMMAND_FOLLOWUP:` **`SET_LEVEL` n'est épinglé par aucune spec d'ancrage.** Le
  commentaire du `useLayoutEffect` (`TimelineView.tsx:880`) cite explicitement
  `SET_LEVEL` comme déclencheur de re-projection, mais les 3 blocs (#449, #451, #477)
  ne passent que par `ZOOM_IN` / `ZOOM_OUT`. Si un contrôle d'UI dispatche `SET_LEVEL`
  directement, ce chemin n'est pas couvert. À vérifier avant d'ouvrir l'issue : chercher
  un appelant réel de `SET_LEVEL` (au S82 la piste n'a pas été grepée — voir NON VÉRIFIÉ).

- NON VERIFIE:
  - Aucun appelant réel de `{ type: 'SET_LEVEL' }` n'a été cherché dans le frontend :
    la 2e recommandation ci-dessus est une piste, pas un constat (cf. mémoire
    « Prérequis d'issue : grepper les appelants »).
  - Les specs n'ont PAS été jouées sous charge (2 workers sur la suite complète
    ~240 tests) : seulement `timeline.spec.ts` seul (36 tests, workers: 2). Aucune
    affirmation de non-flakiness sous charge n'est faite ici.
  - Aucun run Firefox/WebKit (le projet `firefox` est restreint par `testMatch` à une
    autre spec, `playwright.config.ts`).
  - Les valeurs de bande de rendu ([672, 2872] etc.) sont DÉRIVÉES de la mesure
    documentée par #451 (conteneur ~1000 px), pas relues à l'exécution : la spec ne les
    asserte pas. Ce qui est mesuré, c'est leur conséquence (pastille montée / démontée),
    vérifiée dans les deux sens.
  - Pas de mesure de la CI : les runs sont locaux (pile `mtl-s82`), pas GitHub Actions.

- STATUS: COMPLETED
