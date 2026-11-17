# #709 — Frise : empiler en rangées les événements qui se chevauchent dans une lane (Sprint 97)

## Objectif

Deux occurrences réelles qui se chevauchent dans une même lane se peignaient l'une sur
l'autre (hauteur de lane fixe, `top` fixe) : la seconde masquait la première et captait ses
clics. Appliquer la règle `layoutLane` de la maquette S91 sur les trois frises (desktop,
mobile portrait, mobile paysage) : tri par début, première rangée libre, lane à hauteur
variable, sans casser la virtualisation (#69) ni la navigation clavier (#81).

## Fichiers modifiés

- **Nouveau modèle pur** : `frontend/src/components/timeline/lane-layout.ts` (+ `lane-layout.test.ts`)
  — `layoutLane` / `layoutLanes` (rangée, rang dans la rangée, lignes de lecture, rangée par
  id), `inRowOrder`, constantes `LANE_GAP_PX`, `LANE_ROW_PITCH_PX`, `MOBILE_MORE_BUTTON_PX`.
- **Virtualisation** : `virtualization.ts` — `windowLanes(offsets, listTop, band)` sur sommes
  préfixées + dichotomie (résultat identique à l'ancien floor/ceil en hauteurs uniformes,
  vérifié par test) ; `buildVerticalModel(..., laneHeightOf?)` produit `laneOffsetsByCategory`
  et `laneHeights`. `useTimelineViewport.ts` — hauteur de BASE mesurée sur la 1re lane moins
  son `data-lane-extra` (avant : la 1re lane mesurée devenait la hauteur de toutes).
- **Desktop** : `TimelineView.tsx` — empilage mémoïsé par zoom, hauteur par lane, navigation
  clavier par RANGÉE (`navLines`), roving repéré par `id` d'événement (stable au ré-empilage),
  `ensureVisible` sur la bande de la rangée ; `EventPill.tsx` (`rowOffsetPx` → `--mt-row-y`) ;
  `RecurrenceMarks.tsx` (`rowByEventId`, `rowPitchPx`).
- **Mobile** : `useTimelineMobileState.ts` (empilage partagé + `verticalModels.{portrait,landscape}`,
  remplace `listTops`), `TimelineMobilePortrait.tsx`, `TimelineMobileLandscape.tsx` (wrap posé sur
  sa rangée, ordre DOM en rangées, attributs `data-lane-rows` / `data-lane-extra`).
- **CSS** : `frontend/src/styles/ds/components/timeline.css` — `--mt-lane-extra` ajouté aux
  hauteurs de lane (3 vues), `--mt-row-y` ajouté aux `top` historiques (barre, pin, libellé
  extérieur, fantômes, connecteur ; wrap et marques mobiles recentrés sur la bande de base).
- **Tests unitaires** : `TimelineStacking.test.tsx` (nouveau, 3 frises), `virtualization.test.ts`
  (appels migrés + 7 tests hauteurs variables), `TimelineView.test.tsx` (1 test clavier adapté,
  cf. écarts).
- **E2E** : `frontend/e2e/sprint-97-lane-stacking.spec.ts` (nouveau).
- **Doc / commentaires périmés** : `docs/adr/ADR-007-virtualisation-timeline.md` (limite
  « hauteur uniforme » levée), `recurrence-marks.ts`, `zoom.test.ts`,
  `e2e/sprint-91-event-pin.spec.ts`, `e2e/sprint-91-recurrence-marks.spec.ts` (mentions « la prod
  n'empile pas »).

## Décisions (arbitrages hors maquette)

- **DEC-S97-002** — gap et réservation en PIXELS (repère piste), comme la maquette (qui les
  convertit en jours) ⇒ le nombre de rangées DÉPEND DU ZOOM. Assumé, recalcul par niveau (jamais
  au scroll). Test : même jeu, zoom Jour → 1 rangée, zoom Année → 2.
- **DEC-S97-003** — hauteur de lane = `base + (rangées − 1) × pas`, pas = hauteur de barre RENDUE
  + VGAP maquette. Desktop 26 + 8 = 34 ⇒ `46 + (r−1)×34` = EXACTEMENT `max(46, PADT×2 + r×BARH +
  (r−1)×VGAP)` (vérifié r = 1..7). Portrait : barre prod 28 (maquette 24) + 7 = 35 ⇒ `44 + (r−1)×35`
  (formule maquette avec ses constantes mobiles : 44, 79, 110 — identique à 2 rangées). Paysage :
  24 + 7 = 31 ⇒ `34 + (r−1)×31`. La rangée 0 garde sa géométrie historique au pixel (top 9 desktop,
  pas le PADT 10 de la maquette) : aucune lane mono-rangée ne bouge, DOM inchangé (variables posées
  seulement hors rangée 0).
- **DEC-S97-004** — mobile : le bouton `⋯` (44 px) qui suit chaque occurrence est RÉSERVÉ dans
  l'empilage (`trailingPx`), sinon il se poserait sur l'occurrence suivante de la rangée et
  capterait ses taps. La maquette n'a pas de `⋯` (ajout prod).
- **DEC-S97-005** — clavier desktop : l'unité de navigation devient la RANGÉE (↑/↓ parcourent les
  rangées d'une lane avant de changer de lane ; ←/→ suivent l'ordre de lecture). Mobile : pas de
  roving, l'ordre DOM (= tabulation) est rangée 0 par date puis rangée 1.
- **Cibles de 44 px et pas < 44** : pin desktop (bouton 44 px, pas 34), barres/pins/`⋯` mobiles
  (44 px, pas 35 / 31) — les zones de frappe de deux rangées adjacentes se RECOUVRENT sur leurs
  bords (≤ 1 px de barre peinte desktop/portrait, ~3 px en paysage) ; l'élément plus loin dans le
  DOM gagne. Même arbitrage que la lane dense paysage existante (cibles qui débordent de 5 px).
  Centres toujours atteignables (prouvé E2E). À faire valider (cf. RECOMMAND_UI_DESIGN).
- Libellé de lane (colonne sticky) : `height:100%`, texte centré verticalement dans une lane
  haute — rendu non spécifié par la maquette, le plus simple retenu.

## Écarts d'énoncé constatés

- **Confirmé** : l'issue confond deux grandeurs. `gap` HORIZONTAL 8 / 10 px (converti en jours
  par la maquette) ≠ `VGAP` VERTICAL 8 / 7 px. Implémenté selon la maquette.
- La maquette mobile suppose des barres de 24 px ; la prod portrait les rend à 28 px (#594/#63) :
  le pas portrait est dérivé de la barre RENDUE (35), pas de la maquette (31).
- `useTimelineViewport` mesurait `laneHeight` sur la 1re lane : correct tant que les lanes étaient
  uniformes, faux dès la 1re lane empilée (non signalé par l'issue ni le plan).
- Un test existant (`TimelineView.test.tsx`, « navigation clavier correcte APRÈS masquage ») avait
  deux ponctuels à 1 jour d'écart dans la même lane — ils sont désormais EMPILÉS (réservation
  100 px > 12 px/j) : ↓ passe par la 2e rangée avant de changer de lane. Test adapté (intention
  conservée, étape intermédiaire assertée).

## Tests

- Unitaires ciblés : `npx vitest run src/components/timeline` → **20 fichiers / 307 tests OK**
  (dont `lane-layout.test.ts` 17, `TimelineStacking.test.tsx` 12, `virtualization.test.ts` 20).
- `./scripts/test-quiet.sh frontend-unit` → **150 fichiers / 1917 tests OK**.
- `rtk proxy npx prettier --check <14 fichiers + spec>` rc=0 ; `npm run lint` rc=0 ;
  `npm run typecheck` rc=0.
- **Harnais E2E** (pile dédiée, jetable, sans toucher au Postgres laissé par la vague 1) :
  `docker run postgres:16` sur `:5437` (`eventmanager_e2e`, Flyway from scratch) ; backend
  `java -jar target/eventmanager-0.0.1-SNAPSHOT.jar --server.port=8087` (jar bâti à HEAD par la
  vague 1, 0 commit `backend/` depuis) avec `SPRING_PROFILES_ACTIVE=dev,e2e`,
  `RATE_LIMIT_ENABLED=false`, `APP_CORS_ALLOWED_ORIGINS=…:3000,…:3100` ; front `next build`
  (`NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8087` au build) +
  `next start -p 3100`. Oracles : `/fr/login` 200, `/api/auth/me` 401, `test-support` 404.
  Tout arrêté en fin de travail (PID next + java, conteneur supprimé, ports libres vérifiés).
- Nouvelle spec : `SKIP_DELEGATION=1 CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx
  playwright test e2e/sprint-97-lane-stacking.spec.ts` → **8 passed** (5 setup + 3 : desktop,
  portrait, paysage ; zooms Mois et Trimestre chacun).
- **Contrôle négatif** : `layoutLane` neutralisé (tout en rangée 0), rebuild, rerun → **3 failed /
  5 passed**, les 3 frises rougissent sur le hit-test : `aCenter` et `overlapAtA` rendent
  « S97 Chevauche B » au lieu de A (le symptôme de l'issue). Code restauré (`git status` vide sur le
  fichier), rebuild, rerun.
- Rejeu après restauration : `sprint-97-lane-stacking`, `sprint-91-event-pin`,
  `sprint-91-recurrence-marks`, `sprint-94-mobile-lane-gutter` en `--repeat-each=3` → **38 passed**.
- **Suite COMPLÈTE** (`--ignore-snapshots`, `next build`+`next start`, 2 workers) : **473 passed /
  1 failed / 8 skipped / 1 did not run** en 3,0 min (483 tests). Unique échec :
  `sprint-77-theme-visual:620` « armement de la comparaison » — échoue MÉCANIQUEMENT sous
  `--ignore-snapshots` (mémoire E2E §S78, même constat que la vague 1) ; le « did not run » est son
  voisin sériel. `sprint-84-palette:128` : vert sur ce run.
- Specs citant la surface (grep `/usr/bin/grep -rlE "timeline-event|timeline-resource-row|mt-tlv__|
  mt-tlm__|timeline-lane|recurrence-mark|evt-wrap|timeline-scroll|timeline-view|timeline-mobile"
  e2e/*.ts e2e/support/*.ts`) — toutes vertes dans la suite complète : golden-path, sprint-42-events,
  sprint-61-archived-events, sprint-62-control-focus-contrast, sprint-63-de-overflow-audit,
  sprint-71-edit-preview-pinned, sprint-82-recurrence-capped-hint, sprint-85-timeline-group-head,
  sprint-85-timeline-sidebar, sprint-85-timeline-toolbar, sprint-86-event-category,
  sprint-89-local-date-west, sprint-91-edit-bounded-series-end-date, sprint-91-event-pin,
  sprint-91-more-contrast, sprint-91-recurrence-marks, sprint-92-business-toasts,
  sprint-92-products-next-event, sprint-94-fullscreen-overlays, sprint-94-mobile-lane-gutter,
  sprint-94-modal-shortcuts, sprint-97-lane-stacking, timeline-mobile, timeline + supports
  `timeline-lanes.ts`, `seed-cleanup.ts` ; + `sprint-90-first-contact` (liste du lead).
- Références visuelles : `git status --porcelain | /usr/bin/grep darwin` → vide. Aucune référence
  `-linux` a priori impactée (les 10 captures de `sprint-77` ne montrent pas la frise).

## Non vérifié

- Virtualisation VERTICALE (≥ 60 lanes) AVEC des lanes empilées, en navigateur : couverte par les
  tests unitaires de `windowLanes`/`buildVerticalModel` à hauteurs variables, et la suite complète
  a tourné sur un compte qui franchit le seuil (#467), mais aucune spec n'asserte une lane EMPILÉE
  hors bande puis remontée au scroll.
- Recouvrement des zones de frappe entre rangées (bords) : mesuré seulement aux centres et dans la
  zone de chevauchement horizontal ; pas de sonde aux bords haut/bas en paysage.
- Pas de capture visuelle humaine d'une lane à 3+ rangées ni du libellé de lane centré dans une
  lane haute ; thème sombre non regardé (aucune couleur modifiée).
- Coût de `layoutLanes` à 1000 événements non mesuré au banc (`findIndex` sur les rangées, O(n·r),
  recalculé au zoom seulement).
- Firefox/WebKit : projet `chromium` seulement.

## Recommandations suite

- RECOMMAND_UI_DESIGN : valider (1) le pas mobile 35 / 31 px (VGAP maquette 7 sur les barres
  PROD 28 / 24) et le recouvrement des cibles de 44 px entre rangées qu'il implique, (2) le libellé
  de lane centré verticalement dans une lane haute, (3) la réservation du `⋯` mobile dans l'empilage.
- Pas de RECOMMAND_DB_EXPERT : aucun schéma, aucun backend touché.
- Pas de RECOMMAND_SECURITY : rendu client pur, aucune donnée nouvelle, aucun appel réseau.
- Pas de RECOMMAND_TEST_RUNNER : suite E2E complète jouée par l'agent (473 verts), la CI Linux
  tranchera les captures.
- RECOMMAND_FOLLOWUP: le libellé EXTÉRIEUR de secours d'une barre à faible contraste
  (`.mt-tlv__evt-outside`, à `leftPx + widthPx + 6`) n'est pas réservé dans l'empilage et peut
  chevaucher l'événement suivant de la même rangée [triage S | frontend-timeline].
- RECOMMAND_FOLLOWUP: libellé de pin plus long que la réservation 100 / 90 px (plafond CSS 240 px)
  chevauche l'événement suivant de la rangée — point « non traité » de la maquette, désormais
  mesurable puisque l'empilage existe [triage S | frontend-timeline + ui-design].
- RECOMMAND_FOLLOWUP: les frises mobiles ne ré-ancrent pas le défilement au changement de zoom
  (desktop le fait depuis #449/#451) — constaté en écrivant la spec (B hors bande après Mois →
  Trimestre, contourné par un recentrage sur TODAY comme `sprint-91-event-pin`) [triage M |
  frontend-timeline-mobile].

## Mémoire

[MEMORY:decision] DEC-S97-002 — Context: la maquette `layoutLane` exprime gap (8/10 px) et réservation des ponctuels (100/90 px) en pixels convertis en jours. Decision: empilage en px repère piste, recalculé par niveau de zoom ; le nombre de rangées (donc la hauteur des lanes) dépend du zoom. Why: fidélité maquette ; un gap en jours constants rendrait les pins illisibles au zoom large.

[MEMORY:decision] DEC-S97-003 — Context: formule de hauteur donnée pour le desktop seulement, prod mobile à barres 28/24 ≠ maquette 24. Decision: hauteur = base historique (46/44/34) + (rangées − 1) × (barre rendue + VGAP maquette) = 34/35/31 ; rangée 0 inchangée au pixel, variables CSS posées seulement hors rangée 0. Why: égale exactement la formule maquette desktop, ne déplace aucune lane mono-rangée (toutes les specs de géométrie existantes restent vraies).

[MEMORY:decision] DEC-S97-004/005 — Context: prod ajoute un `⋯` 44 px après chaque occurrence mobile ; roving desktop indexé par lane. Decision: `⋯` réservé dans l'empilage mobile ; navigation clavier par RANGÉE (↑/↓ traversent les rangées d'une lane), roving repéré par id d'événement ; ordre DOM mobile en rangées. Why: sans réservation le `⋯` capte les taps de l'occurrence suivante ; un index de rangée glisse au ré-empilage d'un zoom.

[MEMORY:pattern] Problem: virtualisation verticale à hauteurs variables sans boucle mesure → rendu. Solution: hauteur CALCULÉE (base mesurée une fois + pas × rangées), la vue publie la part ajoutée en `data-lane-extra` que la mesure retranche ; modèle en sommes préfixées + dichotomie. Anti-pattern: mesurer chaque lane dans le DOM, ou mesurer « la première lane » comme hauteur de toutes (faux dès qu'elle est empilée).

[MEMORY:pattern] Problem: décaler verticalement des éléments dont le `top` historique vit dans le CSS du DS, sans dupliquer ces valeurs en JS. Solution: `top: calc(<valeur historique> + var(--mt-row-y, 0px))` et une variable posée en ligne seulement quand ≠ 0 ; pour un enfant qui doit rester centré sur la bande de base d'un parent agrandi : `calc(50% − var(--mt-lane-extra)/2 + var(--mt-row-y))` (la variable du parent est héritée). Anti-pattern: réécrire tous les `top` en ligne depuis le JS (deux sources de vérité, DOM des lanes mono-rangée modifié).

[MEMORY:pitfall] Context: spec E2E mobile qui change de niveau de zoom puis cherche un événement proche d'aujourd'hui. Solution: les frises mobiles ne ré-ancrent pas `scrollLeft` au zoom → recentrer sur `.mt-tlm__ruler .mt-tlm__today` après chaque changement de niveau. Prevention: pour un contrôle négatif E2E, placer l'assertion du SYMPTÔME (hit-test) avant les assertions de crochets (`data-lane-rows`), sinon la spec rougit sur un attribut absent et ne prouve rien.

STATUS: COMPLETED
