# Correctif CI — sprint-91-recurrence-marks déterministe

## Commits
- (ce commit, unique) :bug: test(e2e): rendre sprint-91-recurrence-marks déterministe (bande de virtualisation + ancrage de l'étendue)

## Diagnostic
Occurrence manquante : **B** (`S91 Série ponctuelle`, A + 33 j) — mesuré au navigateur, portrait
390 px, zoom Mois : A piste 5700 px, C 5443 px, **B 6091 px**, bande rendue **[4390, 5930]**.
Cause : HYSTÉRÉSIS de `useTimelineViewport.ts:173-176` (`bandCovers`). Au chargement la bande
vaut `aujourd'hui ± 770 px` = [4510, 6050] rail ; `scrollToDay(A+5 j)` visait `scrollLeft` 5710
et la fenêtre visible [5710, **6050**] tenait PILE dans la bande → aucun recalcul, la bande
restait centrée sur aujourd'hui, B hors bande. Seuil exact : `A_START − TODAY ≤ 45 j`, atteint
ssi `TODAY + 40 j` tombe le DERNIER jour d'un mois — 14 jours sur 400. Pas un flake : déterministe.

Second défaut de fixture trouvé en balayant les dates (rouge AVANT comme APRÈS le 1er correctif,
donc préexistant) : `assertGhostBounds:584`. Quand `RANGE_END − C_START ≡ 0 (mod 7)` (1 jour sur 7),
le dernier fantôme de C tombait PILE sur le dernier jour de l'étendue, où `scaleRecurrenceMarks`
(`recurrence-marks.ts:193`) le RETIRE (peinture `leftPx + GHOST_PIN_HALF_PX` = 4 px hors piste).
Mesuré horloge figée au 2026-09-22 : fixture 54 attendus, frise 53 rendus, dernier 2027-11-20.

## Correctif
`frontend/e2e/sprint-91-recurrence-marks.spec.ts` — fixture et helpers uniquement, zéro fichier applicatif.
1. `scrollToDay` (l.286-335) : saut en DEUX temps, passage par l'origine de la piste avant la cible.
   La bande y devient `[−600, clientWidth+600]`, que la fenêtre visible de la cible (≥ 5 000 px)
   ne peut pas satisfaire → la bande finale est TOUJOURS centrée sur `day` (± 770 px en portrait),
   au lieu de dépendre de l'historique de défilement. Helper `frames(page, n)` (3 frames par étape).
   Retenu plutôt que l'horloge figée : figer la date aurait rendu la spec déterministe sur UNE
   géométrie, en la laissant passer à 12 px de la limite d'hystérésis ; ici la marge est ≥ 283 px.
2. `BOUND_PAST` / `BOUND_FUTURE` (l.104-105) : ancrés sur `A_START` et non sur aujourd'hui.
   `totalDays` devient constant (862) et `RANGE_END − C_START` constant (452 j) → 64 fantômes,
   le dernier à `RANGE_END − 4 j`, soit 7 px de marge sur la coupe de peinture.
Aucune assertion relâchée : `toHaveCount(3)` inchangé, aucune tolérance élargie, aucun `skip`,
rien de conditionnel à la date. L'assertion est au contraire renforcée — elle passait de 2 sur 3
occurrences montées à 3 sur 3.

## Preuve de détermination
Moyen : (a) rejeu de la spec RÉELLE avec `page.clock.install({ time })` + `TODAY` figé côté Node
sur la MÊME date (patch temporaire, non livré) ; (b) boucle arithmétique sur 400 dates consécutives.

(a) 14 dates — 7 consécutives (tous les restes mod 7) + fins de mois hostiles + changement d'année
+ 29 février : 2026-09-21→27, 2026-10-21, 2026-11-21, 2026-12-22, 2027-01-19, 2027-02-19,
2028-01-20, 2028-02-29. **14/14 à 8/8 passed.** Contrôle négatif sur le code AVANT correctif,
mêmes dates figées : 2026-09-21, 2026-11-21, 2026-12-22, 2027-01-19, 2028-01-20 → **1 failed /
7 passed** à chaque fois (même test, même ligne 479), et 2026-09-22 → **3 failed** (le défaut
`assertGhostBounds`). 4 rouges parasites pendant le balayage (échecs du projet `setup`,
runs enchaînés sans pause) : rejoués un par un, 8/8 les trois fois.

(b) 400 dates à partir du 2026-09-21 : `totalDays` ∈ {862}, `RANGE_END − C_START` ∈ {452 j},
fantômes de C ∈ {64} — CONSTANTS ; `A_START − TODAY` ∈ [45, 75] et A→B ∈ {31, 33, 34} restent
variables mais sans effet. Marges minimales : **283 px** (extent droit de B vs bord de bande),
**453 px** (extent gauche de C), **7 px** (règle de peinture, zoom Année).

## Tests
- `e2e/sprint-91-recurrence-marks.spec.ts` : **8/8** (date réelle) et 8/8 aux 14 dates figées.
- `e2e/sprint-95-toast-overlap.spec.ts` : **9/9** (12/12 avec setup, joué avec la spec corrigée).
- Suite complète : **411 passed / 10 failed / 8 skipped / 1 did not run** (2,8 min). Les 11
  non-verts appartiennent tous à `sprint-77-theme-visual.spec.ts` : artefact macOS connu
  (PIT — références `-linux` seules, message `A snapshot doesn't exist … writing actual`,
  vérifié pour les 10). Hors ce fichier : 411 + 11 = **422 passed**, conforme à l'attendu.
- `./scripts/test-quiet.sh frontend` : OK (build + unitaires + typecheck + lint). `npm run format:check`
  (binaire réel) : OK. `npx tsc --noEmit` : OK.
- **10 PNG `*-chromium-darwin.png` générés puis SUPPRIMÉS** (`git status | grep darwin` → 0).
  Aucun `--update-snapshots`, aucune référence visuelle régénérée.

## Prémisses infirmées
- « L'écart A→B vaut 33 ou 34 jours » : il vaut 31, 33 ou 34 (février donne 31). Mesuré sur 400 dates.
- « Les trois occurrences réelles (A − 21 j … A + **34** j) » (commentaire l.477-478) : A + 31 à 34 j.
- « BASE = 31 octobre, dernier jour du mois — le cas limite » : exact, mais le mécanisme n'est PAS
  le saut d'un mois de `A_START` ; c'est que ce cas est le SEUL où `A_START − TODAY` vaut 45 j,
  seuil auquel la fenêtre visible tient à 0 px près dans la bande précédente.
- « La spec n'a jamais été déterministe » : vrai, et il y avait DEUX non-déterminismes
  indépendants, pas un. Le second (1 date sur 7) n'avait encore jamais rougi.

## [MEMORY:*] signaux
[MEMORY:pitfall] Contexte : E2E frise, virtualisation #69. Un `scrollTo` programmatique NE déplace
PAS la bande rendue s'il atterrit dans la bande précédente (`bandCovers`, hystérésis voulue) — la
pastille visée est montée mais ses voisines à > 770 px restent démontées, et l'échec ressemble à
un défaut produit. Solution : passer par l'origine de la piste avant la cible. Prévention : dans
toute spec de frise, ne jamais supposer « j'ai scrollé donc c'est monté » ; mesurer `scrollLeft`,
`clientWidth` et les positions piste avant d'accuser le code.
[MEMORY:pitfall] Contexte : fantômes de récurrence. `scaleRecurrenceMarks:193` retire le fantôme
dont la PEINTURE dépasse la piste (`leftPx + 4 px`), pas seulement celui dont la DATE dépasse
l'étendue. Une fixture qui compte les fantômes par date sur-compte de 1 quand le dernier tombe sur
le dernier jour de l'étendue. Prévention : ancrer les bornes d'étendue sur la série testée, pas sur
aujourd'hui, pour que l'écart ne soit jamais un multiple de la période.
[MEMORY:pattern] Problème : prouver qu'une spec E2E est déterministe dans le temps. Solution :
`page.clock.install({ time })` côté navigateur + la MÊME date en dur côté Node (les deux repères
doivent s'accorder, la frise se repérant sur le marqueur TODAY du DOM), en patch TEMPORAIRE, plus
une boucle arithmétique sur 400 dates qui vérifie les invariants dérivés. Anti-pattern : livrer
l'horloge figée — la spec ne teste plus qu'une géométrie et passe éventuellement à 12 px de la limite.
[MEMORY:decision] Contexte : deux voies pour stabiliser la spec (figer l'horloge vs. rendre la bande
déterministe). Décision : rendre la bande déterministe + ancrer l'étendue sur `A_START`, horloge NON
figée en production de test. Pourquoi : la spec continue d'exercer les 31 valeurs de `A_START − TODAY`
et les 3 longueurs de mois, avec des marges mesurées ≥ 283 px, au lieu d'une seule géométrie choisie.

## Recommandations suite
RECOMMAND_FOLLOWUP: aucune. Aucun défaut produit trouvé : le non-montage de B est la conséquence
voulue de l'hystérésis (B est hors écran, à 33 j du centre pour 28 j de fenêtre visible), et la coupe
de peinture de `recurrence-marks.ts:193` est documentée et délibérée. Les deux défauts étaient dans
la fixture. Aucun fichier applicatif touché.

## Fichiers de contexte lus
- `frontend/e2e/sprint-91-recurrence-marks.spec.ts` (intégral)
- `frontend/e2e/timeline-mobile.spec.ts:145-195` (recette `page.clock`), `frontend/e2e/support/fixtures.ts`,
  `frontend/e2e/support/auth.ts`, `frontend/e2e/support/accounts.ts`, `frontend/playwright.config.ts`
- `frontend/src/components/timeline/virtualization.ts`, `useTimelineViewport.ts`,
  `useTimelineMobileState.ts`, `TimelineMobilePortrait.tsx`, `TimelineView.tsx:1500-1525`,
  `zoom.ts` (`computeRange`, `eventTrackExtent`), `recurrence-marks.ts`
- `frontend/src/lib/recurrence.ts`, `frontend/src/lib/auth-token-verify.ts`
- `frontend/e2e/sprint-77-theme-visual.spec.ts:600-660`
- Briefing du lead (extraits `br-events`, `cp-frontend`)

STATUS: COMPLETED
