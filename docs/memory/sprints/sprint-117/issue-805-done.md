# Issue #805 (+ E2E #804 + réserve dynamique de libellé) — Frise : dérive sur `[` `]` enchaînés à `+` `-`

## Résumé

Trois travaux, un seul agent (V2), Playwright joué contre la pile du lead (`next dev` webpack `:3000`, backend `:8087`, oracles 200 / 401 vérifiés avant chaque série).

### Travail 1 — #805 : dérive REPRODUITE puis corrigée

**Cause.** Trois sites écrivaient `el.scrollLeft = …` sous le `scroll-behavior:smooth` du conteneur (`ds/components/timeline.css:200`) : l'effet `offsetDays` (#392, `[` `]` `T`), `scrollToToday`, et `onMinimapSeek`. L'affectation lance une animation. `recordScrollAnchor()` relisait aussitôt la position de DÉPART. Un `+` / `-` frappé pendant le vol re-projetait (#449, `useLayoutEffect`) cette ancre périmée, en `behavior:'instant'`, ce qui annulait aussi l'animation : le saut de période était perdu.

**Mesure AVANT** (spec jetable, viewport 1600, fixture J−600 / J−300 / J+70 → étendue 731 j, aujourd'hui au jour 630 ; touches frappées sans attente ; 3 rejeux, écart ≤ 5 px entre rejeux) :

| Séquence | Attendu (px) | Mesuré AVANT | Mesuré APRÈS |
|---|---|---|---|
| `] +` | 1 020 (30 j × 34) | 20 425 | 1 020 |
| `] -` | 150 (30 j × 5) | 2 822 (rabattu au bord, max 2 824) | 150 |
| `] ] + ] -` | 888 (74 j × 12) | 7 201 | 888 |
| `]×4`, attente, `] +` | 5 100 (150 j × 34) | 4 081 | 5 100 |
| `] + ] - [` | 168 | 168 | 168 |

Une séquence qui FINIT par `[` / `]` ne dérive pas : l'écriture est absolue. Seules les séquences qui finissent par un changement d'échelle montrent la dérive.

**Correctif** (`frontend/src/components/timeline/TimelineView.tsx`) : les trois sites passent en `el.scrollTo({ left, behavior: 'instant' })`. Le repère PISTE volontaire de #392 est conservé (même formule `offsetDays × dayWidth`). Le motif `useLayoutEffect` de #597 n'était pas nécessaire : la re-projection #449 est déjà un `useLayoutEffect`, et il suffisait que l'ancre lue soit à jour. Le mobile (`useTimelineMobileState.ts`) n'est pas touché, car `.mt-tlm__scroll` n'a pas de `smooth` (commentaire `:233`).

**E2E** `frontend/e2e/sprint-117-period-zoom-no-drift.spec.ts` (6 tests) :
- 4 séquences frappées d'une traite : `] +`, `] -`, `] ] + ] -`, `] ] ] [ +`. Oracle : `scrollLeft = jour × dayWidth` ± 1 px, et la prémisse `0 < attendu < maxScroll` est assertée.
- `]×4` posé et attendu, puis `] +`.
- Non-régression des touches isolées `]`, `]`, `[`, `+`, `-`, `T` (aujourd'hui au jour 630 × 12), puis `- T +` d'une traite : le centrage de `T` au Trimestre doit être re-projeté. Ce contrôle sort de l'ancre d'avant `T` de plus de 50 px.
- Résultat : 18/18 sur 3 rejeux (`--repeat-each=3`).
- **Contrôle négatif** (les 3 sites remis en `el.scrollLeft =`) : 6 rouges sur 6 (`] +` 20 425 au lieu de 1 020, `] -` 2 823 au lieu de 150, `] ] + ] -` 7 208 au lieu de 888, `] ] ] [ +` 20 416 au lieu de 2 040, `]×4 … ] +` 4 081 au lieu de 5 100, `- T +` 6 778 au lieu de 6 717,6). Restauration vérifiée (0 `el.scrollLeft =` restant dans `TimelineView.tsx`).

**Constat annexe** (pré-existant, non corrigé) : le 1er `T` après le chargement place aujourd'hui au bord de l'en-tête (7 560 = 630 × 12, repère piste, car l'effet `offsetDays` passe APRÈS le centrage de `scrollToToday`). Un 2e `T`, `offsetDays` étant inchangé, CENTRE aujourd'hui (7 209). Deux positions pour la même touche, voir le follow-up.

### Travail 2 — E2E #804 (`frontend/e2e/sprint-105-fit-shortcut.spec.ts`)

- AVANT mise à jour : 1 rouge attendu, `centrage 226 vs 322` (écart 96, soit 95 dû aux marges asymétriques).
- `:46` `FIT_MARGIN_PX = 40` est remplacé par `FIT_LEAD_PX = 40` / `FIT_TRAIL_PX = 135` / `FIT_EDGE_AIR_PX = 35`. Ce sont des constantes recopiées et commentées : `zoom.ts` tire `@/…` à l'exécution. La prémisse devient `usablePx − 40 − 135 ∈ [704, 1560[`. L'oracle de centrage devient `|(g.right − g.left) − 95| ≤ 1,5`.
- Nouveau bloc `#804 — libellé du pin de queue entier`, 4 jeux. Oracle : `trackRight − label.right ≥ 34`, `scrollWidth ≤ clientWidth`, et `tête.left − trackLeft ≥ 34`.
- **1re version VACANTE, détectée par mutation.** Les jeux à étendue fixe (21 j, 61 j…) laissaient 150 à 570 px d'air à 1920 px, à cause du mou des niveaux discrets. La mutation « marges 40/40 » restait verte. Les jeux sont désormais SERRÉS : l'étendue est calculée depuis la piste MESURÉE (chargement provisoire, mesure, puis rechargement avec le jeu), et c'est la plus grande qui tient au niveau visé avec les marges réelles. Le pin seul a pour oracle le centrage de l'emprise `[date − 5, date + 100]`. Le jeu « 61 j » est devenu « barre + pin, `quarter` », car à 1920 px un écart de 61 j se cadre en `month`, le niveau initial, et rien ne prouvait alors que `F` avait été appliqué.
- Mesures APRÈS (air de queue / air de tête, px) :
  - 2 pins `week` : 47,1 / 36 ;
  - barre + pin `quarter` : 47,1 / 41 ;
  - pin seul `day` : 569 / 546, emprise centrée ;
  - titre de 31 car. `week` : 58,8 / 51, `scrollWidth` 188 = `clientWidth` 188.
- Résultat : 6/6 (2 tests #597 + 4 tests #804) sur 3 rejeux, 18/18.
- **Contrôles négatifs** :
  - Mutation B, marges 40/40 (état d'avant #804) : 5 rouges, à savoir le centrage #597 (`274 vs 274`), jeu 1 (−0,9 px), jeu 2 (−0,9 px), pin seul (594 vs 499) et jeu 4 (−42,2 px).
  - Mutation A, réserve ignorée : seul le jeu 4 rougit (5,8 px d'air).
  - Restauration vérifiée par `cmp`.

### Travail 3 — réserve réelle du libellé de queue (absorbé, ~40 min)

- `frontend/src/components/timeline/label-reserve.ts` : deux fonctions pures.
  - `trailingLabelReservePx(indexed, displayedIds, endDay)` calcule l'emprise du libellé des événements du DERNIER jour, avec l'estimation même du rendu (`applyLabelReserves`, desktop). Pin : `pinFootprintPx`. Barre à libellé extérieur : `outsideLabelTrailPx`. Barre à libellé intérieur : 0.
  - `fitMarginsForTrailReserve(r)` renvoie `{ leadPx: 40, trailPx: max(135, r + 35) }`.
  - Les deux vivent hors de `zoom.ts` : `label-reserve` importe déjà `zoom`, il n'y a donc pas de cycle.
- `TimelineView.fitToEvents` passe ces marges en 3e argument de `computeFit`.
- Tests unitaires : `label-reserve.test.ts` +8 (pin court = plancher, pin long, série, seul le dernier jour compte, barres intérieur/extérieur, ressource masquée, marges, cadrage avec contrôle négatif intégré) ; `TimelineView.fit-shortcut.test.tsx` +2 (titre de 44 car. en queue : `month`, `scrollLeft` 167 au lieu de `week` 927,5 ; titre long hors queue : sans effet).
- Mutation A côté Vitest : le test « titre long en queue » rougit.
- **Limite assumée** (documentée en JSDoc) : seuls les événements du dernier jour comptent. Un pin d'un jour antérieur à libellé plus long peut, à forte échelle, déborder davantage. Le traiter rendrait le calcul circulaire, puisque la marge dépend du niveau qu'elle sert à choisir.

### Vérifications (résultats exacts)

- `npx vitest run src/components/timeline/` : 24 fichiers, 386 passed (376 + 10).
- `npx tsc --noEmit` : 0 erreur.
- `rtk proxy npx next lint --file …` (5 fichiers + spec #805) : « No ESLint warnings or errors ». Le résumé RTK affichait « Errors: 1 », ce qui est faux.
- `rtk proxy npx prettier --check` (6 fichiers) : « All matched files use Prettier code style! ».
- Balayage des specs qui citent la surface (une passe, chromium) : `timeline`, `timeline-mobile`, `sprint-85-timeline-sidebar`, `sprint-85-timeline-group-head`, `sprint-85-timeline-toolbar`, `sprint-94-modal-shortcuts`, `sprint-91-event-pin`, `sprint-97-lane-stacking`, `sprint-98-label-collision`, `sprint-98-mobile-zoom-anchor`, `sprint-91-recurrence-marks`, `sprint-117-touch-targets`, `sprint-105-fit-shortcut`, `sprint-117-period-zoom-no-drift`. Résultat : **106 passed** (setup compris), 0 failed, 0 flaky. Le setup a rejoué 2 fois le rendu `/fr/register` en 500 (recompilation `next dev`), puis il est passé.
- Pas de `next build` ni de `test-quiet.sh` (consigne). Le `next build` reste au lead.

### Correction CI (run 40201893001, job e2e, PR #873)

- **Symptôme.** Jeu 4 (`sprint-105-fit-shortcut.spec.ts:470`, titre de 31 car.) rouge sous Linux : `scrollWidth` 205 > `clientWidth` 196. Le jeu était vert 3× sous macOS (188 ≤ 188).
- **Cause, confirmée par la lecture du code et par les chiffres.** 196 = `pinLabelMaxPx(11 + ⌈31 × 6,3⌉ = 207)` = le `--mt-label-max` que `EventPin` reçoit de `applyLabelReserves` (#746). Le libellé est donc coupé par SA PROPRE réserve estimée (ellipse + `title`, comportement assumé par DEC-S98), pas par le bord de piste. La police Linux rend ce titre à 6,6 px/car. ; l'estimation en retient 6,3.
- **Décision : (a).** L'oracle mélangeait l'objet de #804 (« le cadrage F laisse la place ») et une métrique de police. Pour le jeu 4 seulement (`fontDependentWidth`), la non-troncature est remplacée par « largeur rendue = min(texte, réserve) ± 1 ». Un nouvel oracle, INDÉPENDANT DE LA POLICE, s'applique aux 4 jeux : départ du libellé + `max-width` calculé ≤ bord de piste − 34 px. Il renforce les jeux 1 à 3 : leur non-troncature et l'air de queue restent assertés.
- **Mesures (macOS, `next start`).** Air de la réserve : jeux 1 et 2 37 px, pin seul 547 px, jeu 4 51 px (réserve 196 px).
- **Résultats.**
  - Spec 18/18 sur 3 rejeux contre `next start`.
  - Mutation « réserve ignorée » (build de production mutant) : jeu 4 rouge (air 5,8 px). L'oracle de réserve isolé est rouge lui aussi (−2 px), donc non vacant quelle que soit la police.
  - Source restaurée et rebuild propre ; oracles 200 / 401.
- `sprint-101-fab-landscape.spec.ts:272` rejoué 3× : vert (pas rougi).
- **Non tranché.** Je n'ai pas vérifié si l'écart Linux vient de la police elle-même (rendu, hinting) ou d'un repli avant chargement de la police web, ni s'il touche les libellés partout : c'est le follow-up ci-dessous.

## Commits

- `f0627005` — `:bug: fix(timeline): plus de dérive sur [ ] enchaînés à + / - (scrollTo instantané) (#805)` : `TimelineView.tsx` + `e2e/sprint-117-period-zoom-no-drift.spec.ts`.
- `b3f52fa8` — `:sparkles: feat(timeline): marge droite du recadrage F = réserve réelle du libellé de queue (#804)` : `label-reserve.ts`, `TimelineView.tsx`, `label-reserve.test.ts`, `TimelineView.fit-shortcut.test.tsx`.
- 3e commit `:white_check_mark: test(e2e): …(#804)` : `e2e/sprint-105-fit-shortcut.spec.ts` + ce fichier. Son SHA est reporté dans le retour au lead (il ne peut pas figurer dans son propre contenu).
- Vérification : `/usr/bin/git -C <worktree> branch --contains <sha>` → `sprint/117` pour chacun.

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-117/briefing-805.md` — lu intégralement (3 travaux, ordre, contraintes, format).
- `docs/memory/sprints/sprint-117/issue-804-done.md` — lu intégralement ; la section « Pour l'agent V2 (#805) » a été appliquée (`:46`, `:170`, `:250` ; jeux sans `year`). Écart : les jeux à étendue fixe ont été remplacés par des jeux serrés, faute de quoi la spec était vacante.
- `.ai-env/context-packs/pit-frontend.md` — par pointeur :
  - PIT-S63-015 (l.633, `scrollLeft` sous smooth : attendre deux lectures égales, appliqué par `settledScroll`) ;
  - PIT-S54-003 (l.149) ;
  - PIT-S105-002 (l.1768, même famille `scrollLeft =` + changement d'échelle : #805 en est la généralisation à `[` `]`) ;
  - PIT-S105-003 (l.1772, rail de 30 j → jeux jamais en `year`) ;
  - PIT-S91-003 (l.1444) : titre parcouru, sans objet (cible tactile mobile) ;
  - `BOX_ONLY` : 0 occurrence.
- `.ai-env/context-packs/br-events.md` — `/usr/bin/grep` frise/timeline : l.55 (`single` = un jour), l.154 (agrégation par catégorie produit) ; aucune règle sur le défilement ni le cadrage.
- `docs/memory/sprints/sprint-105/issue-597-done.md` — l.25 (constat 332 vs 216, hypothèse smooth, cause « non vérifiée » : #805 la vérifie), l.51 (pitfall), l.58 (follow-up d'origine de #805).
- `docs/memory/sprints/sprint-112/issue-767-830-done.md`, `issue-768-done.md` — NON LU : origine de #837 (touch targets), sans lien avec le défilement ni le cadrage desktop.
- Code : `TimelineView.tsx:1150-1400` et `:1495-1545`, `zoom.ts` (reducer, constantes, `computeFit`, `indexEventsByResource`), `label-reserve.ts` (en entier), `EventPin.tsx`, `timeline.css:200, :389`, `vitest.setup.ts:98-120` (stub `scrollTo`), `e2e/timeline.spec.ts:120-130, 1475-1500, 1640-1980`.

## Signaux mémoire

- [MEMORY:bug] Cause : `el.scrollLeft = X` sous `scroll-behavior:smooth`, suivi d'une relecture immédiate de `scrollLeft` (`recordScrollAnchor`) : l'ancre enregistrée est la position de DÉPART de l'animation. Un zoom frappé pendant le vol re-projette l'ancre périmée et annule le saut (`] +` : 20 425 px au lieu de 1 020). Solution : `scrollTo({ left, behavior: 'instant' })` à TOUT site qui relit `scrollLeft` après écriture. Règle : sous smooth, n'écrire `scrollLeft` que si rien ne le relit avant la fin du vol.
- [MEMORY:pitfall] Contexte : E2E de cadrage sur une échelle à niveaux DISCRETS (frise : 96/34/12/5/2,2 px/j). Une étendue « au hasard » laisse jusqu'à un niveau entier de mou, et l'oracle « libellé dans la piste » passe même avec les marges fautives (S117 : 150 à 570 px d'air, mutation 40/40 verte). Solution : jeu SERRÉ calculé depuis la piste mesurée (charger, mesurer `clientWidth`, recharger avec la plus grande étendue qui tient au niveau visé), et contrôle négatif systématique. Prévention : tout oracle de marge sur niveaux discrets doit être prouvé par mutation avant d'être déclaré.
- [MEMORY:pattern] Problème : une spec E2E dont la fixture dépend d'une mesure du rendu. Solution : un stub `page.route` qui relit une variable `current` à chaque requête ; produit provisoire → `goto` → mesure → `current = build(mesure)` → `page.reload()` → attente d'un attribut propre au jeu final (pas seulement d'un compte, identique au provisoire). Anti-pattern : des étendues codées en dur, calibrées pour un viewport donné.
- [MEMORY:decision] Contexte : #804 suite. Décision : la réserve de queue du cadrage `F` = max des emprises de libellé des événements du DERNIER jour (`trailingLabelReservePx`, `label-reserve.ts`), et `trailPx = max(135, réserve + 35)`. Pourquoi : c'est la même estimation que le rendu (le libellé est coupé à cette réserve, `--mt-label-max`), donc cohérente par construction. Considérer aussi les jours antérieurs rendrait le calcul circulaire (la marge dépend du niveau qu'elle choisit).

## Recommandations suite

- RECOMMAND_FOLLOWUP: frise — `T` a deux positions : le 1er appui après chargement place aujourd'hui au bord de l'en-tête (l'effet `offsetDays` #392 passe après `scrollToToday`, 7 560 px), un 2e appui (offset inchangé) le CENTRE (7 209 px) ; trancher le repère voulu et l'unifier [triage XS | domaine frontend/timeline]
- RECOMMAND_FOLLOWUP: frise — réserve de queue du cadrage `F` limitée aux événements du dernier jour ; un pin antérieur à long libellé peut encore déborder à forte échelle (cas marginal, documenté en JSDoc de `trailingLabelReservePx`) [triage S | domaine frontend/timeline]
- RECOMMAND_FOLLOWUP: frise — l'estimation #746 (6,3 px/car., calibrée sur macOS) sous-dimensionne sous Linux CI (31 car. : 205 px rendus pour 196 réservés) : mesurer la chasse réelle sur Linux/Windows et recalibrer, ou accepter l'ellipse [triage S | domaine frontend/timeline]
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touché, correctifs purement frontend.
- Pas de RECOMMAND_SECURITY : défilement et géométrie seulement, aucune donnée ni entrée utilisateur nouvelle.
- Pas de RECOMMAND_UI_DESIGN : aucun token, style ni composant modifié ; seul le défilement programmatique devient instantané, comme #449/#597 l'avaient déjà décidé.
- Pas de RECOMMAND_TEST_RUNNER : 14 specs citant la surface jouées (106 passed), 386/386 Vitest timeline ; reste le `next build` du lead.

STATUS: COMPLETED
