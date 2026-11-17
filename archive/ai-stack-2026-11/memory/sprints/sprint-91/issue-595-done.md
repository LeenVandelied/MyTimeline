# Issue #595 — Frise : glyphe ↻, occurrences fantômes et connecteur sur les séries récurrentes

**Vague :** 2 (seul agent) · **Agent :** fullstack-dev (opus, xhigh) · **Spawn ref :** `eb8bb51`
**Périmètre :** 3 frises (arbitrage dev 2026-09-14) ; **sans empilage en rangées** (arbitrage dev 2026-09-15).
**Incident d'orchestration :** l'agent s'est arrêté DEUX fois en attente d'un monitor en arrière-plan pendant son run E2E (aucun commit, travail non commité intact) ; relancé par le lead via message, run surveillé par le lead (`until` bloquant). Coût : ~2 allers-retours, aucune perte.

## Commit (vérifié par le lead)
- `9d583db` — :sparkles: feat(timeline): glyphe ↻, occurrences fantômes et connecteur de série sur les 3 frises (#595)
- `git show --stat` : 23 fichiers, +1710/−46 — dont `lib/recurrence.ts` (+107) et test (+101), `timeline/recurrence-marks.ts` (+275) et test (+182), `RecurrenceMarks.tsx` (+78), `e2e/sprint-91-recurrence-marks.spec.ts` (+564), 4 `dashboard.json`, `timeline.css` (46). **Aucune spec existante modifiée** (confirmé par la liste). `issue-594-done.md` bien exclu.
- `git branch --contains 9d583db` = `sprint/91` ; dépôt principal non pollué (seul `docker-compose.override.yml`, préexistant).
- `git show 9d583db | grep repeating-linear-gradient|stripe` : 0 occurrence (critère « aucune trame de stries »).

## Résumé
- **Helper d'occurrences mutualisé** : `frontend/src/lib/recurrence.ts` (`addDays`, `addMonths`, `nextOccurrenceStart` déplacés) ; `events/previewTimeline.ts` les ré-exporte — rien de dupliqué. Occurrence k calculée **depuis l'origine** (31 janv. → 28 févr. → 31 mars).
- **Bornes retenues :**
  - fantômes **après le début uniquement** ;
  - `recurrenceEndDate` **incluse** (parité backend `!isAfter`, BR-EVE-012) ;
  - série non bornée → horizon 5 ans + plafond 4000 occurrences (miroir de `RecurrenceExpansion`) ;
  - coupe à l'étendue existante (jamais étirée) et à la largeur peinte (sinon la zone défilable grandit) ;
  - série **archivée** → `↻` conservé, ni fantôme ni connecteur ;
  - catégorie repliée → aucune marque.
- Calcul `timeline/recurrence-marks.ts` en 3 passes (jours → px → bande visible) ; rendu partagé `timeline/RecurrenceMarks.tsx` ; marques rendues AVANT les occurrences réelles dans le DOM, non interactives, **sans `data-testid="timeline-event"`**.
- Légende de la sidebar : 2 entrées (« Occurrence à venir », « Récurrence ↻ ») dans les 4 locales (`public/locales/*/dashboard.json`), DEC-S85-002 soldée.

## Rendu par vue
- desktop `TimelineView.tsx:506` · barre `EventPill.tsx:178` · pin `EventPill.tsx:122`
- portrait `TimelineMobilePortrait.tsx:279,342,359` · paysage `TimelineMobileLandscape.tsx:292,350,366`
- légende `TimelineSidebar.tsx:239`
- Specs existantes modifiées : **aucune**.

## Tests (déclarés par l'agent)
- Vitest `test-quiet.sh frontend-unit` : 136 fichiers / 1698 passés (état source final).
- `tsc` exit 0 ; `prettier --check` (23 fichiers) exit 0 ; `next lint --no-cache` exit 0.
- E2E des 17 specs qui citent la frise : **122 passés / 0 échec (3,1 min)**, `sprint-63:397` compris — **confirmé par le lead** (fin de run surveillée, `exit=0`, `122 passed`).
- E2E `sprint-91-recurrence-marks` : 8/8 (3 tests + 5 setup) sur la version finale.
- **Contrôle négatif** : `return null` en tête de `RecurrenceMarks` → 3 échecs sur « fantôme monté près de A » (attendu 1, reçu 0) ; restauré par `cp`, shasum `1845fa…` identique avant/après.
- **Non prouvé :** l'ordre de peinture en E2E — `elementFromPoint` ignore `pointer-events:none`, la spec prouve la non-captation du clic, pas l'ordre ; l'ordre repose sur l'ordre DOM (test unitaire).

## Fichiers de contexte lus (déclaration de l'agent)
- `sprint-91/maquette-frise-instant-serie.md` en entier (§3 fantôme `x − 4`, 8 px) ; `sprint-91/issue-594-done.md` en entier.
- `br-events.md` l.73-117 (BR-EVE-012, horizon 5 ans).
- `pit-frontend.md` : S82-002 l.1128 (**lu dans le dépôt principal**, contenu déclaré identique), S46-001 l.1502 (titre seul), `.mt-evt--draft` opacity l.741, S64-009 l.676.
- `decisions.md` l.761-910 (DEC-S82-005, S85-002, S85-006).
- `rules-jit/frontend.md` et `ux-patterns.md` en entier.
- `sprint-85/maquette-vue-timeline.md` §A.3 l.51-60 ; `RecurrenceExpansionServiceImpl.java` l.30-95.
- **`i18n.css:195` NON LU** (le briefing du lead donnait un chemin incomplet : `styles/ds/components/i18n.css`).

## Écarts visuels connus (vs maquette)
- Connecteur : 2 px dashed (règle DS inchangée) contre 1,5 px dotted + opacity .5.
- Fantôme de durée sans opacity .7 ; fantôme de ponctuel sans opacity .65, contour planché à 3:1 (#325/#497).
- Filet de légende « Récurrence » en 2 px dashed (trait réellement rendu).
- Pas de fantôme avant le début de la série (la maquette en dessine — données de démo sans début).
- Peu de fantômes sur une petite étendue (coupe à +30 j).
- Pas d'empilage : deux occurrences RÉELLES peuvent encore se superposer (arbitrage dev).

## Signaux mémoire
- [MEMORY:pitfall] E2E qui compte ou centre des occurrences juste après le chargement : la virtualisation horizontale ne monte que la bande ±600 px, et une piste de ~1830 px au zoom Année ne tient pas en portrait. Faire défiler jusqu'à la date (marqueur TODAY + jours × px/j) avant d'asserter ; réunir plusieurs cadrages.
- [MEMORY:decision] La frise calcule l'occurrence k depuis l'origine ; le backend (`RecurrenceExpansionServiceImpl.advance`) avance de proche en proche (`plusMonths(1)` répété → dérive au 28). Motif : ce service ne sert que le compte de l'aperçu.
- [MEMORY:pitfall] `elementFromPoint` ignore les éléments `pointer-events:none` : une mutation de z-index sur une marque décorative reste verte. Ne pas présenter un hit-test comme preuve d'ordre de peinture.
- [MEMORY:pitfall] (lead) Un subagent qui attend un process via un monitor en arrière-plan s'arrête sans RETOUR : exiger dans le briefing une attente BLOQUANTE (`until …; do sleep 5; done`).

## Recommandations suite
- RECOMMAND_FOLLOWUP : empilage en rangées des événements qui se chevauchent (`layoutLane`) — déjà proposé par #594.
- RECOMMAND_FOLLOWUP : aligner `RecurrenceExpansionServiceImpl.advance` sur un calcul depuis l'origine (dérive au 28 du mois).
- RECOMMAND_UI_DESIGN : arbitrer les écarts d'opacité des fantômes et de trait du connecteur (DS vs maquette).
- Pas de RECOMMAND_DB_EXPERT car aucun schéma touché.
- Pas de RECOMMAND_SECURITY car aucune surface auth ou donnée personnelle touchée.
- Pas de RECOMMAND_TEST_RUNNER car le lead joue la suite complète et `next build`.

STATUS: COMPLETED
