# Sprint 87 — Corrections revue cycle 1 (C1) + déterminisme du diff visuel (C2)

## Résumé
- C1 : `landing-mobile-overflow.spec.ts` borne le bord droit visible par la CHAÎNE DES BLOCS CONTENEURS (plus la chaîne DOM). Sondes 3 (fixed échappé), 4 (absolute échappé), 5 (contre-épreuve fixed sous transform) ajoutées. Mutation vers l'ancienne remontée DOM → auto-contrôle ROUGE (sondes 3/4 non relevées) ; restauré → vert.
- C2 : `sprint-77-theme-visual.spec.ts` fige `.hero-timeline__track` dans `prepare()` (feuille injectée) puis attend `transform|will-change|animations === 'none|auto|0'`. Tolérance, références, code produit intouchés.

## Commits
- `571375d` :bug: fix(e2e): le bornage du débordement suit la chaîne des blocs conteneurs (revue S87) — 1 fichier, +137/−7.
- `6481397` :bug: fix(e2e): gel exact de la frise du hero avant capture visuelle (S87) — 1 fichier, +58/−6.
- `git add <chemin>` + `git commit -- <chemin littéral>` ; fichiers du lead (`briefing-*.md`, `spawn-ref-review-fix.txt`) restés non suivis.

## C1
Règle retenue (fonction `containingBlockOf` dans `measureOverflow`) :
- `static`/`relative`/`sticky` → parent (en flux, tout ancêtre rognant rogne).
- `fixed` → 1er ancêtre créant un bloc conteneur pour les fixed : `transform`, `perspective`, `filter`, `backdrop-filter` ≠ none ; `contain` paint|layout|strict|content ; `will-change` transform|perspective|filter ; `container-type` ≠ normal ; `content-visibility: auto` ; sinon `null` (viewport → aucun ancêtre ne borne).
- `absolute` → idem OU 1er ancêtre `position ≠ static`.
- Remontée `el → cb → cb(cb) …`, arrêt avant `body`/`html` (Radix, inchangé). Un ancêtre ne borne que s'il rogne : `overflow-x ≠ visible` ET `display ∉ {inline, contents}`.
- Correction du briefing : un `overflow:hidden` non positionné situé ENTRE un `absolute` et son bloc conteneur ne le rogne pas ; un rognant AU-DESSUS du bloc conteneur le rogne (il rogne le bloc conteneur). Le briefing formulait l'inverse ; l'implémentation suit le comportement CSS/Chromium, confirmé par les sondes 4 et 5.
- Conservatrice : propriété créatrice oubliée ⇒ bloc conteneur pris trop haut ⇒ borne moins ⇒ vrai positif possible, jamais faux vert.

Cas couverts par sonde (auto-contrôle, 375 px) :
1. absolute 9999 px (existant) → relevé.
2. conteneur `overflow:hidden` 9999 px + enfant (#611) → les deux relevés.
3. `fixed` 9999 px dans wrapper `absolute` 100 px `overflow:hidden` sans transform → relevé.
4. `absolute` 9999 px dans wrapper statique 100 px `overflow:hidden` (bloc conteneur = bloc initial) → relevé.
5. `fixed` 9999 px dans wrapper 100 px `overflow:hidden` + `transform` → NON relevé (borné).
+ aucun autre offender pendant 3-5 (dont frise du hero : piste en flux + barres absolute dans viewport rogné, sous `.section-animation` transformée).

Non couverts / limites :
- Rognage par `clip-path`, `mask`, `contain: paint` SANS overflow : non pris en compte comme borne (⇒ vrai positif possible, sens sûr).
- `overflow: clip` avec `overflow-clip-margin` : bornage au bord de boîte, pas à la marge (écart ≤ marge).
- Top layer (`<dialog>` modal, popover) : traité comme fixed normal ; un ancêtre transformé le bornerait à tort. Aucun sur la landing.
- Rognage borné à la boîte de bordure (`getBoundingClientRect`), pas à la boîte de padding (existant, #611).
- Éléments SVG internes : `position` calculée `static` ⇒ parent (comportement #611 inchangé).

## C2
- `FROZEN_MOTION_CSS` (constante, sélecteur `HERO_TRACK = '.hero-timeline__track'`) : `animation: none; transform: none; will-change: auto`, tous `!important`, injectée par `addStyleTag` juste après `ENV_CHROME_CSS`. NO-OP sur les 4 écrans d'auth.
- Hero : `expect(target.locator(HERO_TRACK)).toHaveCount(1)` (un renommage de classe rendrait le gel inerte en silence).
- Condition attendue (si piste présente), `expect.poll` 5 s : `getComputedStyle.transform|willChange|getAnimations().length` === `none|auto|0`, APRÈS `waitForRenderedFonts`, avant `assertThemeApplied`/capture.
- Armement : passe par le même `prepare()` (vérifié : il atteint la garde `existsSync` après `prepare()`).
- Bloc DÉTERMINISME réécrit : l'affirmation #611 « `animations:'disabled'` ramène à une position déterministe » est retirée, remplacée par la mesure du lead (2382 px, ratio 0,01, `MAI` 611 → 610, ~16 px/s) et le pourquoi du gel.
- Mesure ad hoc darwin (script `scratchpad/freeze-determinism.cjs`, hors dépôt, `locator.screenshot({animations:'disabled'})`, 3 captures par page, 2 pages par variante) :
  - sans gel : état avant capture `matrix(1,0,0,1,-14.72,0)|transform|1` puis `-14.98` ; captures d'une même page identiques entre elles, mais **PNG différents d'une page à l'autre** (100407 vs 100258 octets) → non-déterminisme reproduit sur darwin.
  - avec gel : état `none|auto|0` ; **PNG identiques d'une page à l'autre** (96932/96932 octets).
  - Taille sans gel ≠ taille avec gel : la capture « animations disabled » n'est pas le rendu figé à `translateX(0)` hors couche (position ou rastérisation — non départagé).
  - Limite : darwin, pas l'image noble ; la preuve CI reste les 3 recomparaisons du lead.

## Tests
Depuis `frontend/`, harnais lead (`next start` :3100 + backend :8086), oracles avant chaque run : `/api/auth/me` 401, `/fr/login` 200.
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test landing-mobile-overflow sprint-63-de-overflow-audit --reporter=line` → **33 passés / 0 échec** (5 setup + 10 landing fr/de × 5 largeurs + auto-contrôle + 17 sprint-63).
- Mutation (remontée DOM restaurée temporairement, fichier sauvegardé puis recopié) : `… landing-mobile-overflow --grep "auto-contrôle"` → **1 échec attendu** « relevés : [] » sur sondes 3/4 ; fichier restauré, puis seul un commentaire modifié.
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test sprint-77-theme-visual --ignore-snapshots --reporter=line` → **15 passés / 1 échec** : `:620` armement « Référence absente (…landing-hero-light-chromium-darwin.png) » = environnement (aucune référence darwin), `prepare()` + gel passés (hero light/dark 1280×803, armement).
- `rtk proxy npx tsc --noEmit` → exit 0 ; `rtk proxy npx eslint <2 specs>` → exit 0 ; `rtk proxy npm run format:check` → « All matched files use Prettier code style! ».
- Aucune référence régénérée ; 0 `*-darwin.png` dans `sprint-77-theme-visual.spec.ts-snapshots/` ; aucun run Playwright en fond.
- Non joué : les 9 autres specs landing de #611 (fichiers non touchés par ce correctif, aucun helper partagé modifié).

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-87/briefing-review-fix.md` (intégral) — C1 l.8-24, C2 l.26-43.
- `docs/memory/sprints/sprint-87/issue-611-done.md` (intégral) — §Décisions l.35 « Gel sous test », l.37 bornage.
- `frontend/e2e/landing-mobile-overflow.spec.ts` (intégral).
- `frontend/e2e/sprint-77-theme-visual.spec.ts` l.30-229, l.400-621 (`ENV_CHROME_CSS`, `prepare`, armement).
- `frontend/src/styles/hero-timeline.css` l.15-74 (`.hero-timeline__viewport` overflow hidden, `.hero-timeline__track` will-change/animation).
- Sous-ensemble pit-frontend (prompt) — S77-010 (condition ≠ stabilité), S77-019 (tolérance intouchable, pas de régénération), S83-005/S74-008 (`rtk proxy npm run format:check`), S76-005/#610 (`git commit -- <chemins>`), S81-022 (aucun next dev/build).

## Signaux mémoire
- `[MEMORY:pitfall] Context: borner un rect.right par les ancêtres overflow en remontant parentElement. Solution: remonter la chaîne des blocs conteneurs (fixed → ancêtre transform/filter/contain/will-change…, absolute → idem ou 1er positionné) ; un rognant strictement entre un élément hors flux et son bloc conteneur ne le rogne pas. Prevention: toute sonde qui borne un débordement par le rognage doit porter une sonde d'armement fixed ET absolute échappés, vérifiée par mutation.`
- `[MEMORY:pitfall] Context: toHaveScreenshot animations:'disabled' sur une animation CSS infinie en transform + will-change. Solution: figer par feuille injectée (animation/transform none, will-change auto) puis attendre transform none + getAnimations().length 0. Prevention: ne pas conclure « animations disabled ⇒ état initial » sur une mesure cancel() isolée ; comparer les PNG de deux PAGES distinctes (mesuré darwin : 100407 vs 100258 octets sans gel, identiques avec gel).`
- `[MEMORY:pattern] Problem: prouver qu'un correctif d'algorithme de sonde E2E ferme le défaut signalé. Solution: réintroduire temporairement l'ancien algorithme (copie de sauvegarde en scratchpad), jouer seulement l'auto-contrôle, exiger le rouge sur la nouvelle sonde, restaurer. Anti-pattern: ajouter une sonde verte sans l'avoir vue rougir.`

## Recommandations suite
- RECOMMAND_VISUAL_REFS: régénérer `landing-hero-{light,dark}-chromium-linux.png` dans l'image noble contre le build de prod, `--grep-invert "armement"`, puis 3 recomparaisons sans `--update-snapshots` (gel mesuré déterministe sur darwin seulement).
- RECOMMAND_REVIEW: cycle 2 sur `571375d` et `6481397` (commits de correction de revue, cf. mémoire « cycle 2 avant PR »), notamment la règle des blocs conteneurs qui contredit la formulation du briefing sur `absolute`.
- Pas de RECOMMAND_TEST_RUNNER car les 3 specs concernées ont été jouées contre le harnais de production.
- Pas de RECOMMAND_DB_EXPERT car aucun schéma touché.
- Pas de RECOMMAND_SECURITY car specs E2E seules.

STATUS: COMPLETED
