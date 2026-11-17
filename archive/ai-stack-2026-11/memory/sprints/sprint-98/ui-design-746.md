# Arbitrage charte — issue #746 : libellés qui dépassent leur emprise réservée

## Contre-vérification des chiffres de l'énoncé (code lu)

- `PIN_FOOTPRINT_PX = { desktop: 100, mobile: 90 }` — confirmé (`zoom.ts:193`).
- `MOBILE_MORE_BUTTON_PX = 44`, `LANE_GAP_PX = { desktop: 8, mobile: 10 }` — confirmés (`lane-layout.ts:56,62`).
- `.mt-evt-pin__label{max-width:240px}` — confirmé (`timeline.css:353`), **partagé mobile** (l.823 ne change que `font-size`, pas `max-width`) → mobile aussi exposé, pas seulement desktop.
- `.mt-tlv__evt-outside` — confirmé AUCUNE largeur bornée, `white-space:nowrap`, pas d'ellipsis (`timeline.css:423`) : réservation actuelle = **0 px** (le `widthPx` passé à `layoutLane` pour une barre = largeur réelle de la barre, sans marge pour ce libellé de secours).
- Le gap fixe `#gap 6 ⇒ x+11` du commentaire `timeline.css:337` est confirmé par `EventPin.tsx`/CSS.
- La maquette S91 liste explicitement ce trou en non-traité (« Libellé de pin plus long que l'espace réservé (100/90 px) : la maquette ne tronque pas », `maquette-frise-instant-serie.md:98`) → #746 formalise un point déjà identifié « à arbitrer, pas à inventer ».
- `layoutLane` est bien pure (aucun import DOM/React, `lane-layout.ts:1`), invariant répété 3× dans les commentaires + DEC-S97-002 (empilage recalculé par zoom, déterministe).
- `eventLabelReadableInside` (`lib.ts:74`) est **pure** (calcul de contraste sur la couleur de l'event), donc évaluable AVANT `layoutLane`, à l'étape de positionnement — pas besoin du DOM.

## Options comparées

| Critère | A. Troncature à l'emprise | B. Réservation dynamique (measureText) | C. Hybride (min(mesure, plafond)) |
|---|---|---|---|
| Lisibilité desktop | OK si plafond ≥ ~10-12 car. + `title` natif | Optimale (texte jamais coupé) | Bonne, coupe seulement au-delà du plafond |
| Lisibilité mobile (all. long) | Risque fort de troncature agressive (all. compose, ex. « Rendez-vous » → « Zahnarzttermin ») | Bonne mais rangées gonflent | Bonne, plafond absorbe le pire cas |
| Densité / hauteur de lane | Stable, indépendante du contenu | Rows ↑ imprévisible par locale/police (mandat le signale) | Rows ↑ borné par le plafond |
| Dépendance au zoom (DEC-S97-002) | Aucune — cohérent avec l'existant (px fixes par zoom) | Ajoute une 2e source de variabilité (texte × zoom) — cumul avec le zoom déjà documenté comme source de recalcul | Idem B mais bornée |
| Coût implé (`layoutLane` pure) | Nul à faible : CSS `max-width` + éventuelle réservation fixe supplémentaire en amont (positionnement), **aucun changement de `layoutLane` lui-même** | Casse l'invariant « pure, sans DOM » 3× documenté : `measureText` = Canvas API, indisponible SSR, nécessite `document.fonts.ready` (police custom) avant mesure fiable → 2e passe de layout après chargement police = reflow visible | Même coût que B pour la mesure, un peu de logique de plafonnement en plus |
| A11y | Texte complet : `aria-label` du bouton (pin) DÉJÀ complet, + pattern `title=` natif déjà utilisé ailleurs (`TimelineSidebar.tsx:216`, `TimelineView.tsx:397,525`) — réutilise un pattern EXISTANT, n'invente rien | Texte complet à l'écran, mais aucun gain a11y supplémentaire (déjà couvert par `aria-label`) | Idem A pour la partie tronquée |
| Stabilité 4 locales (fr/en/es/de) | Robuste : troncature indépendante de la police/langue, testable en pur (jsdom/unit, pas de canvas) | Fragile : `measureText` en jsdom ne reflète pas le rendu réel (cf. mémoire `jsdom-scroll-tests-prove-nothing.md` — même piège que le scroll : jsdom ment sur la géométrie) → faux verts en test, nécessite un vrai navigateur (E2E) pour toute assertion de largeur | Même fragilité de test que B, mais surface réduite (seulement au-delà du plafond) |
| Risque hors-mandat (charte) | Aucun composant/pattern inventé | Introduit Canvas API + logique de chargement de police, absent de la charte actuelle | Idem B |

## RECOMMANDATION : A — troncature à l'emprise réservée

Argument central : `layoutLane` est un invariant architectural documenté (pur, sans DOM, déterministe par zoom — DEC-S97-002/003/004). B/C réintroduisent une dépendance DOM/Canvas et un recalcul post-chargement-police que rien dans la charte ne prévoit, et que le test E2E (hit-test) ne peut pas garantir de façon stable (jsdom ne mesure pas le texte comme un vrai moteur de rendu). A ne touche pas `layoutLane`, réutilise un pattern a11y déjà en place (`title=` natif + `aria-label` déjà complet sur le bouton), et reste déterministe par construction (donc testable en pur, sans navigateur).

### Valeurs recommandées (à confirmer visuellement — pas de navigateur disponible ici)

**Cas 2 — libellé de pin (`.mt-evt-pin__label`)**
- Le libellé démarre à `x+11` (pin à `x-5`, largeur 10, gap 6) ; la réservation totale du pin est `PIN_FOOTPRINT_PX` = 100 desktop / 90 mobile, mesurée depuis `x` (= `leftPx`).
- Largeur dispo avant la fin de la réservation : `100 - 11 = 89` desktop, `90 - 11 = 79` mobile.
- **Remplacer `max-width:240px` par `max-width:84px` desktop et `74px` mobile/portrait/paysage** (même footprint `mobile` partagé par les deux — confirmé, pas de 3e valeur landscape), marge de sécurité ~5px sous le calcul brut pour absorber l'arrondi sub-pixel et le `LANE_GAP` qui suit.
- **Ne PAS changer `PIN_FOOTPRINT_PX` ni `layoutLane`** — uniquement CSS.
- Ajouter `title={event.title}` sur `.mt-evt-pin__label` (pattern déjà en place ailleurs) : tooltip natif au survol pour le texte complet ; le lecteur d'écran a déjà tout via l'`aria-label` du bouton parent (EventPin, confirmé dans `EventPin.tsx` commentaire l.20).

**Cas 1 — libellé extérieur de secours (`.mt-tlv__evt-outside`)**
- Réservation actuelle = 0 px (le `widthPx` de la barre ne prévoit rien pour ce libellé) → ce n'est pas une histoire de plafond CSS seul, il faut RÉSERVER un espace dans le calcul de `widthPx` en amont de `layoutLane` (au positionnement, comme `PIN_FOOTPRINT_PX` le fait pour les pins), car sinon même une troncature à 0 dispo écraserait le texte à rien de lisible.
- Proposition : quand `!eventLabelReadableInside(...)` (calcul déjà pur, faisable au positionnement — confirmé `lib.ts:74`), ajouter une réservation fixe **trailing** après la barre, ex. **120 px desktop / 110 px mobile** (gap 6 + label plafonné ellipsis ~114/104px), symétrique du principe `MOBILE_MORE_BUTTON_PX`/`PIN_FOOTPRINT_PX` déjà en place (DEC-S97-004).
- CSS : ajouter `max-width` (ex. `114px` desktop / `104px` mobile) + `overflow:hidden; text-overflow:ellipsis` à `.mt-tlv__evt-outside` (actuellement aucun des deux) + `title={event.title}`.
- **Ceci est un changement de comportement de `layoutLane`-adjacent (le `widthPx` d'entrée), pas de `layoutLane` lui-même** — à confirmer par le dev où cette réservation conditionnelle s'insère le plus proprement (probablement `zoom.ts` positionnement, avant l'appel `layoutLanes`).

## Points que le dev doit trancher

1. Les valeurs 84/74px (pin) et 120/110px (outside, réservation) sont des calculs sur papier à partir des constantes existantes — **aucune vérification visuelle possible ici (pas de navigateur)**. À confirmer/ajuster en Graphite ou capture réelle, notamment le nombre de caractères lisibles en allemand (locale la plus longue) à ces largeurs.
2. Le point d'insertion exact de la réservation conditionnelle du cas 1 (quel module calcule `widthPx` pour les barres, où brancher `eventLabelReadableInside` avant `layoutLane`) — je n'ai pas tracé toute la chaîne `positionEvents`/`zoom.ts` jusqu'au bout.
3. Faut-il un test unitaire pur (sans navigateur) sur `layoutLane`/positionnement pour garantir la non-collision AVANT le hit-test E2E (double filet), vu le précédent jsdom qui ment sur la géométrie (texte/canvas) ?

## Non vérifié

- Rendu visuel réel (aucun navigateur/Playwright disponible, exclusivité à un autre agent).
- Le point exact d'insertion de la réservation cas 1 dans `zoom.ts`/`positionEvents` (lu seulement l'appelant mobile, pas la fonction complète).
- Impact largeur du glyphe `↻` (récurrence) sur les plafonds proposés — non chiffré, marge de 5px peut être insuffisante si `↻ ` est comptée dans le même `max-width`.

## Décision du dev (2026-09-21, au démarrage du S98)
**Retenu : réserve ESTIMÉE (hybride C sans DOM)**, contre la recommandation A (troncature à 84/74 px, jugée trop courte : ~12 caractères, et pas de survol au doigt).
- Largeur réservée = estimation pure (nombre de caractères × chasse moyenne de la police du libellé), plancher = emprise actuelle (100/90 px), plafond 240 px ; calculée au positionnement, AVANT `layoutLane`, qui reste pur et déterministe.
- CSS : `max-width` du libellé = cette réserve (moins le décalage de départ du libellé) + ellipsis + `title` ⇒ zéro chevauchement même si l'estimation est optimiste (allemand long).
- Libellé extérieur de secours : même principe (réserve estimée quand `!eventLabelReadableInside`), plafonnée, ellipsis + `title`.
- Conséquence assumée : plus de rangées quand les titres sont longs. À consigner en DEC-S98-00x.
