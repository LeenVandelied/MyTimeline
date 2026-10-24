# Issue #596 — Zébrures de lanes au lieu de la grille verticale de jours

## Objectif

Appliquer le handoff Graphite (`docs/design/graphite-handoff.md:126` : « Lanes en zébrures très subtiles (`ink 2.6%`) pour le suivi visuel ») sur les frises bureau, portrait et paysage, et RETIRER la grille verticale de jours (arbitrage du dev au démarrage, non rediscuté).

**Décision à reporter dans l'issue : grille verticale de jours RETIRÉE sur les trois sélecteurs** (`.mt-lane__track`, `.mt-tlv__lane`, `.mt-tlm__lane`) ; la règle porte déjà les graduations.

## Fichiers modifiés

- `frontend/src/styles/ds/components/timeline.css` —
  - `.mt-lane__track`, `.mt-tlv__lane`, `.mt-tlm__lane` : `background-image:linear-gradient(90deg, var(--color-rule) 1px, transparent 1px)` retiré (+ `background-size:var(--mt-grid-step, 12.5%) 100%` sur `.mt-lane__track`) ;
  - nouvelle règle (l.53-55) `.mt-lane--alt > .mt-lane__track, .mt-tlv__lane--alt, .mt-tlm__lane--alt{background-color:color-mix(in srgb, var(--color-ink) 2.6%, transparent);}` + bloc de commentaire (handoff, parité) ;
  - nouvelle règle (l.286) `.mt-tlv__lane--alt > .mt-tlv__lane-label{background-color:color-mix(in srgb, var(--color-ink) 2.6%, var(--color-surface));}` + commentaire ;
  - `.mt-tlv__lane{background-position-x:var(--lane-header-w);}` supprimé (ne servait qu'à recaler la grille) ; commentaire mobile « PAS de `background-position-x` ici… » supprimé (il décrivait la grille).
- `frontend/src/components/timeline/TimelineView.tsx` — `TimelineLaneRow` : classe `mt-tlv__lane--alt` si `laneOrdinal % 2 === 1` ; `backgroundSize: ${dayWidth}px 100%` retiré du style en ligne (style `undefined` hors lane empilée) ; prop `dayWidth` retirée de `TimelineLaneRow` (ne servait qu'à la trame).
- `frontend/src/components/timeline/TimelineMobilePortrait.tsx`, `TimelineMobileLandscape.tsx` — classe `mt-tlm__lane--alt` si `(laneWindow.startIndex + i) % 2 === 1`.
- `frontend/src/components/timeline/TimelineView.test.tsx` — helper `zebraByCategory` + describe `#596 — zébrures de lanes` (parité DOM, absence de `backgroundSize` en ligne, verrou CSS).
- `frontend/src/components/timeline/TimelineMobilePortrait.test.tsx`, `TimelineMobileLandscape.test.tsx` — même helper + test de parité.
- `frontend/e2e/sprint-105-lane-zebra.spec.ts` — NOUVELLE spec (7 tests).
- `frontend/e2e/sprint-91-more-contrast.spec.ts` — adaptée (PIT-S91-011), voir ci-dessous.

## Décisions et écarts

- **Token d'encre** : `--color-ink` (existant, déjà utilisé par `.mt-tl-ruler__maj--weekend` à 3,5 %). Aucun nouveau token.
- **Aplat, pas dégradé** : `background-color` semi-transparent. Conséquence voulue : le harnais `e2e/support/contrast.ts` sait compositer un aplat (il refusait le dégradé de la grille, PIT-S91-011), il mesure donc désormais le fond RÉEL.
- **Parité posée par le COMPOSANT, jamais par `:nth-child`** : chaque liste de lanes (`role="list"`) peut commencer par une cale de virtualisation (`timeline-lane-spacer`, #69) et ne contient que les lanes de la bande. `:nth-child(even)` (ou un index dans la fenêtre montée) inverse la zébrure selon le 1er rang monté — démontré par le contrôle négatif A ci-dessous. Source retenue : `laneOrdinal` (bureau) / `laneWindow.startIndex + i` (mobile) = rang dans la catégorie, identique à `aria-posinset − 1`, stable au scroll et au pliage.
- **Remise à zéro PAR CATÉGORIE** (et non parité globale) : la 1re lane sous chaque en-tête (`surface-2`) est claire, ce qui garde la hiérarchie catégorie/lane lisible ; une parité globale changerait de phase quand une catégorie au-dessus est pliée ou masquée.
- **Cellule sticky, bureau : elle SUIT la zébrure.** Mesuré : `.mt-tlv` est peint en `--color-surface` (fond sur lequel se posent les lanes, clair `#FFFFFF`, sombre `#131519`) et la cellule est `surface` opaque ; sans relais, une colonne claire coupait chaque lane zébrée. `color-mix(ink 2.6%, surface)` rend exactement la composition de la piste zébrée : mesuré clair 249,0 / 249,0 / 249,1 et sombre 24,6 / 26,6 / 30,6 pour la cellule, identiques à l'aplat de piste composé sur `surface`.
- **Cellule sticky, mobile : elle NE suit PAS.** La gouttière mobile est une colonne `surface-2` d'une seule teinte (#706, règle + en-têtes + cellules) : la zébrure s'arrête à son filet. Assertion E2E : la cellule reste `surface-2` sur lane zébrée ou non.
- **`.mt-lane` (primitive DS)** : aucun consommateur TSX, story ou page (grep `mt-lane\b|mt-lane__` sur tout le dépôt hors `docs/memory` : seul `timeline.css`). Grille retirée et modificateur `--alt` ajouté pour cohérence ; aucun effet visible aujourd'hui. `--mt-grid-step` n'était posé nulle part (seul son repli `12.5%` servait) : supprimé.
- **Perception** : 2,6 % est volontairement à peine perceptible (handoff « très subtiles ») — clair ≈ `#F9F9F9` sur `#FFFFFF`, sombre ≈ `#191B1F` sur `#131519`. Relu sur captures bureau et portrait, clair et sombre : alternance lisible, les barres (aplats saturés) ne sont pas concurrencées.

## Tests

- **Vitest** `rtk proxy npx vitest run src/components/timeline` → 22 fichiers / 347 tests (343 + 4 nouveaux) ; suite complète `rtk proxy npx vitest run` → **157 fichiers / 2013 tests verts**.
- **Contrôle négatif Vitest** (4 mutations simultanées : parité `=== 0` au bureau, au portrait et au paysage, grille remise sur `.mt-tlv__lane`) → **4 ROUGES / 4** (parité bureau, verrou CSS, parité portrait, parité paysage) ; restauré → 4 verts.
- **E2E nouvelle spec** `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test e2e/sprint-105-lane-zebra.spec.ts --reporter=line` → 7 passed : bureau / portrait / paysage × clair / sombre (couleur calculée de lanes consécutives = encre résolue à alpha 0,026 ; lane claire alpha 0 ; aucun `background-image` ; cellule bureau = composition sur `surface` à ±1 ; cellule mobile = `surface-2` ; 1re lane de chaque catégorie claire) + parité sous virtualisation (70 lanes stubbées, page défilée au pas d'UNE lane jusqu'à voir un 1er rang monté pair ET impair, prémisse assertée ; chaque lane montée PEINTE zébrée ⇔ rang pair).
- **Contrôle négatif E2E A** (anti-pattern `:nth-child`) : règles CSS réécrites en `.mt-tlv__lane:nth-child(even)` → seul le test de virtualisation ROUGE (`[scroll 1522] lane #21 zébrée ?`), les 6 tests de couleur restent verts (pas de cale sans virtualisation) — c'est bien la virtualisation qui démasque le défaut. Restauré.
- **Contrôle négatif E2E B** : règle de zébrure supprimée → **7 ROUGES / 7**. Restauré → 7 verts.
- **sprint-91-more-contrast** adaptée (sans la désarmer) : la neutralisation du dégradé de lane est retirée ; elle asserte désormais « aucun dégradé traversé » et que la barre 1 est sur une lane claire, la barre 2 sur une lane zébrée (`--alt`) → le ratio ≥ 3:1 du `⋯` est mesuré sur les DEUX fonds réels. 4/4 verts. Contrôle négatif de l'adaptation : NON JOUÉ (grille remise ⇒ `gradients` non vide ⇒ rouge par construction, non exécuté).
- **E2E 20 specs** (19 de la liste grep + la nouvelle), même commande → **142 passed (3.7 min), 0 échec**.
- `rtk proxy npx tsc --noEmit` exit 0 ; `rtk proxy npx next lint --file` (8 TS/TSX) 0 warning ; `rtk proxy npx prettier --check` (9 fichiers) OK.
- Sonde jetable `e2e/zz-agentA-probe.spec.ts` (captures bureau/portrait clair+sombre, couleurs calculées) supprimée, jamais stagée. `git status --porcelain | /usr/bin/grep -E 'darwin|test-results'` → vide.

## Signaux mémoire

- [MEMORY:pitfall] Context: zébrure « une lane sur deux » sur la frise virtualisée (#596). Solution: parité tirée du rang STABLE dans la catégorie (`laneOrdinal` / `startIndex + i`), posée en classe par le composant. Prevention: jamais `:nth-child(even)` ni index dans la fenêtre montée sur une liste virtualisée — la cale haute (`timeline-lane-spacer`) est un enfant de la liste et le 1er rang monté varie ; mesuré : `:nth-child` tient sans virtualisation et casse à `scroll 1522` (lane #21) sous 70 lanes. Un test sans virtualisation (jsdom ou petite fixture) ne peut PAS le voir.
- [MEMORY:pattern] Problem: vérifier une couleur semi-transparente issue de `color-mix` en E2E. Solution: parser `getComputedStyle().backgroundColor` localement — Chromium le sérialise `color(srgb r g b / a)` en flottants 0-1 — et résoudre les tokens via un témoin `background-color:var(--token)`. Anti-pattern: passer par un canvas 1×1 (le `toRgba` de `contrast.ts`) pour un alpha de 2,6 % : 8 bits prémultipliés quantifient les canaux (alpha 7/255 ; estimé, non mesuré : un canal d'encre à 22 relu ~36).
- [MEMORY:decision] Context: handoff « zébrures ink 2.6% » vs grille verticale de jours en prod (#596). Decision: grille retirée sur bureau/portrait/paysage, zébrure en aplat `color-mix(in srgb, var(--color-ink) 2.6%, transparent)` une lane sur deux par catégorie ; cellule sticky bureau relayée (`color-mix(... var(--color-surface))`), colonne mobile inchangée `surface-2`. Why: la règle porte déjà les graduations ; l'aplat laisse le harnais de contraste mesurer le fond réel (fin du contournement PIT-S91-011).

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : changement purement visuel (CSS + classe calculée).
- Pas de RECOMMAND_TEST_RUNNER : 142 E2E de frise, Vitest complet (2013) joués ; aucune référence visuelle Playwright ne couvre la frise (les seules, `sprint-77-theme-visual` et `landing-auth-theme-toggle`, capturent auth + hero de landing).
- Pas de RECOMMAND_UI_DESIGN : valeur et intention dictées par le handoff, arbitrage bureau+mobile fait au démarrage ; choix de la cellule sticky mesuré et consigné ci-dessus (le lead peut le soumettre à ui-design s'il veut un second avis sur le relais bureau / non-relais mobile).
- RECOMMAND_FOLLOWUP: PIT-S91-011 est périmé (la lane mobile n'a plus de `background-image`) — l'amender dans `pitfalls.md` / le pack `pit-frontend` (régénérer via `gen-pit-packs.sh`) [triage XS | frontend]
- RECOMMAND_FOLLOWUP: `.mt-lane*` (primitive DS `timeline.css:32-55`) n'a aucun consommateur — la supprimer ou la brancher dans une story [triage XS | frontend]

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-105/briefing-674-429-596.md` — lu en entier (288 lignes).
- `docs/design/graphite-handoff.md` — l.120-128 (« Lanes en zébrures très subtiles (`ink 2.6%`) », l.126).
- `docs/memory/sprints/sprint-85/maquette-vue-timeline.md` — B-bis l.86 (« pas de fond propre : `--color-bg` du scroller »).
- `.ai-env/context-packs/pit-frontend.md` — `PIT-S91-011` (l.1476), `PIT-S64-009` (l.676), `PIT-S91-005` (l.1452), `PIT-S94-004` (l.1540).
- `frontend/e2e/support/contrast.ts` — l.145-169 (`toRgba` par canvas), l.230-257 (refus des dégradés, compositage des aplats).
- `frontend/e2e/sprint-91-more-contrast.spec.ts` — l.1-175.
- `frontend/e2e/sprint-91-recurrence-marks.spec.ts` — l.540-570 (`bg` du connecteur, non concerné).
- `frontend/src/components/timeline/TimelineView.tsx` — l.440-560 (`TimelineLaneRow`), l.1560-1640 (pré-passe de fenêtrage), l.1820-1920 (rendu des groupes et cales).
- `frontend/src/components/timeline/TimelineMobilePortrait.tsx` l.225-300, `TimelineMobileLandscape.tsx` l.240-310.
- `frontend/src/components/timeline/virtualization.ts` — l.75-85 (`LANE_VIRTUALIZATION_MIN_ROWS = 60`).

STATUS: COMPLETED
