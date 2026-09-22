# Issue #674 — Gouttière de la frise : 168 px → 176 px (couvre aussi #429 — fallback `var(--lane-header-w, 160px)`)

> Ce fichier couvre DEUX issues livrées dans le MÊME commit `a0baf8bd` : #674 (gouttière) et #429 (repli du token retiré, même ligne CSS).

## Objectif

Aligner la gouttière desktop de la frise sur la maquette (`LH = 176px`, `maquette-vue-timeline.md` l.73 et l.90) au lieu de 168 px, avec audit d'impact exhaustif (CSS, JS, E2E), et retirer le repli `var(--lane-header-w, 160px)` de `.mt-tlv__lane-label` (#429, PIT-S56-003 : un repli qui recopie un token est une duplication de valeur).

## Fichiers modifiés

- `frontend/src/styles/ds/tokens/spacing.css` — `--lane-header-w: 176px` + commentaire (miroir JS, lecture E2E) ; commentaire de `--lane-header-w-m` « 168px » → « 176px ».
- `frontend/src/components/timeline/TimelineView.tsx` — `LANE_TRACK_OFFSET_PX = 176`.
- `frontend/src/styles/ds/components/timeline.css` — `.mt-tlv__lane-label` : `width:var(--lane-header-w)` (repli retiré, #429) ; commentaire `.mt-tlv__group-cell` (« 168 px — la maquette pose 176 » → gouttière = LH).
- `frontend/src/components/timeline/TimelineView.test.tsx` — nouveau test #429 (aucun repli sur `--lane-header-w`, largeur de `.mt-tlv__lane-label` sans repli).
- `frontend/e2e/support/timeline-lanes.ts` — nouvel export `LANE_GUTTER_PX`, LU dans `spacing.css` (même regex que le test de dérive).
- `frontend/e2e/sprint-85-timeline-group-head.spec.ts` — `GUTTER_PX = LANE_GUTTER_PX` (était 168 en dur).
- `frontend/e2e/sprint-91-recurrence-marks.spec.ts` — `assertRealOccurrencesOnTop(..., LANE_GUTTER_PX)` (était 168).
- `frontend/e2e/timeline.spec.ts` — `LANE_TRACK_OFFSET_PX = LANE_GUTTER_PX` (était 168) ; arithmétique des commentaires recalculée à 176 (l.1041, 1194-1203, 1311, 1566-1568, 1774-1785).

## Audit d'impact (grep sur HEAD `ade5dba6`, `/usr/bin/grep -rnE 'lane-header-w|LANE_TRACK_OFFSET_PX|spacing-lane-header|GUTTER_PX|168'` sur `frontend/{src,e2e,app}`, puis 2e passe avec `168px`)

Consommateurs du TOKEN `--lane-header-w` (suivent automatiquement, aucune édition) :
- `timeline.css:34` `.mt-lane__head` (primitive DS, sans consommateur TSX) ; `:216` `.mt-tlv__group-cell` ; `:233` `.mt-tlv__group-bar` (margin-left) ; `:258` `.mt-tlv__lane-label` (repli retiré) ; `:298-306` gouttière #392 (ticks, today ×2, weekend, evt, evt-outside, ghost, ghost-pin, connector) ; `:308` `background-position-x` de la grille (retiré ensuite par #596) ; `:318` `.mt-tlv__ruler::before`.
- `globals.css:193` `--spacing-lane-header` (utilitaire Tailwind, 0 usage relevé) ; `LoadingSkeleton.tsx:97` `w-[var(--lane-header-w)]` ; `app/[locale]/(app)/timeline/loading.tsx:14` (commentaire).

Miroir JS `LANE_TRACK_OFFSET_PX` (`TimelineView.tsx`) : l.671 (`railWidth`), 856-857 (bande horizontale), 992-993, 1183 (minimap), 1266 / 1304 (today), 1320 (seek) — tous dérivés de la constante, aucune édition. Test de dérive `TimelineView.test.tsx:747` vert.

Valeurs EN DUR trouvées : `sprint-85-timeline-group-head.spec.ts:42`, `sprint-91-recurrence-marks.spec.ts:639`, `timeline.spec.ts:1594` → remplacées par `LANE_GUTTER_PX`. Valeurs DÉRIVÉES en commentaire : `timeline.spec.ts` 768 = 600 + 168 (overscan + gouttière) et 1432 → 776 / 1424, bandes [732, 2932] / [2832, 5032] / [672, 2872] / [3312, 5512] / [10752, 12952], écarts 1208 / 8648 → recalculés à 176. Aucune valeur dérivée dans le code (`336`, `184`, `344` : 0 occurrence pertinente).

Hors périmètre, non touchés : `--lane-header-w-m` / `MOBILE_LANE_TRACK_OFFSET_PX` (120, mobile) ; mentions historiques de 168 dans `docs/memory/*` (patterns.md l.241 et 430, decisions.md l.361 et 1028, audits S54/S56) — à la main du lead s'il veut les annoter.

Inégalités de `timeline.spec.ts` (#392) à 176 : Trimestre 150 < 176 ✗, Année 66 < 176 ✗, Mois 360 ✓, Semaine 1020 ✓, Jour 2880 ✓ — même classement qu'à 168, aucun cas ne bascule. La prémisse « rail sans débordement au zoom Trimestre » (l.1313) reste vraie (spec verte).

## Décisions et écarts

- **Valeur E2E LUE dans le token**, pas recopiée : `LANE_GUTTER_PX` lit `spacing.css` à l'import (`e2e/support/timeline-lanes.ts`). Importer `TimelineView.tsx` depuis Playwright aurait chargé un composant client (React, lucide, next-intl) pour une constante. La chaîne est fermée : token → (test de dérive Vitest) → `LANE_TRACK_OFFSET_PX` ; token → `LANE_GUTTER_PX` → specs. Les assertions E2E comparent toujours cette valeur à une MESURE de rendu (largeur d'en-tête, écart pastille ↔ viewport), qui reste le verdict.
- **#429 : repli retiré** (décision du lead), pas corrigé à 176 : le token est défini sous `:root`, le repli ne sert jamais. Vérifié : aucun autre repli du token (`/usr/bin/grep -rn "lane-header-w," frontend/src` → 0 après correctif). Verrouillé par un test Vitest.
- Commentaire du token mobile (« ne peuvent pas réserver 168px ») mis à jour à 176 : texte seulement, valeur mobile inchangée.

## Tests

- **Alignement au navigateur** (sonde Playwright jetable `zz-agentA-probe`, non commitée, 1440×900, clair ET sombre, 7 lanes / 2 catégories stubbées) : `--lane-header-w` résolu `176px` ; 7 en-têtes de lane = 176 px ; 2 cellules sticky de catégorie = 176 px ; `.mt-tlv__ruler::before` = 176px ; pastilles : `railX = style.left + 176` (2724→2900, 2815→2991, 2736→2912) ; graduations : `railX = style.left + 176` (−24→152, 60→236) ; ligne TODAY règle = ligne TODAY rail (2936) ; minimap `aria-valuenow` 42 = `round((scrollLeft 2489 − 176) / (rail 5708 − 176) × 100)`. Captures relues (colonne continue, rien de décalé).
- Vitest `rtk proxy npx vitest run src/components/timeline` → 22 fichiers / 343 tests verts (dont le nouveau test #429 et le test de dérive).
- **Contrôle négatif 1** : repli `, 160px` remis sur `.mt-tlv__lane-label` → test #429 ROUGE ; restauré → vert.
- **Contrôle négatif 2** : `LANE_TRACK_OFFSET_PX = 168` avec token à 176 → test de dérive ROUGE ; restauré → vert.
- E2E (19 specs de la liste grep du briefing), `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test <19 specs> --reporter=line` → **135 passed (3.7 min), 0 échec**. Baseline du lead (HEAD `ade5dba6`) : 87 passed / 1 failed (`sprint-63-de-overflow-audit.spec.ts:571` create-form · es) — ce rouge n'est PAS réapparu ici (non imputable, flaky pré-existant).
- `rtk proxy npx tsc --noEmit` exit 0 ; `rtk proxy npx next lint --file` (6 TS/TSX touchés) 0 warning ; `rtk proxy npx prettier --check` (8 fichiers) OK après `--write` sur `TimelineView.test.tsx`.
- `git status --porcelain | /usr/bin/grep -E 'darwin|test-results'` → vide (`test-results/` ignoré par git).

## Signaux mémoire

- [MEMORY:pattern] Problem: une valeur de token DS recopiée en dur dans N specs E2E (168 à 3 endroits + arithmétique en commentaire) survit au changement du token. Solution: helper E2E qui LIT le token dans la feuille (`LANE_GUTTER_PX`, `e2e/support/timeline-lanes.ts`) avec la même regex que le test de dérive Vitest du miroir JS ; les assertions restent comparées à une mesure de rendu. Anti-pattern: importer le composant TSX dans Playwright pour une constante, ou recopier la nouvelle valeur en dur.
- [MEMORY:decision] Context: #674 gouttière desktop 168 px vs maquette 176 px (écart consigné au S85, point 4 ui-design). Decision: `--lane-header-w: 176px`, `LANE_TRACK_OFFSET_PX = 176`, repli `var(--lane-header-w, 160px)` supprimé (#429). Why: le `.dc.html` fait foi ; un repli sur un token défini sous `:root` ne sert jamais et ne peut que diverger (PIT-S56-003).

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : changement de mise en page CSS et de constantes de géométrie.
- Pas de RECOMMAND_TEST_RUNNER : les 19 specs de frise (135 tests) et la suite Vitest de la frise ont été jouées.
- Pas de RECOMMAND_UI_DESIGN : valeur dictée par la maquette (`LH = 176px`), alignement mesuré au navigateur en clair et sombre.
- RECOMMAND_FOLLOWUP: annoter dans `docs/memory/patterns.md` (l.241, l.430) et `decisions.md` (l.361, l.1028) que la gouttière vaut 176 px depuis #674 (mentions historiques 168 px) [triage XS | frontend]
- RECOMMAND_FOLLOWUP: `--spacing-lane-header` (`globals.css:193`) n'a aucun consommateur relevé — le retirer ou l'utiliser dans `LoadingSkeleton.tsx:97` (`w-lane-header` au lieu de `w-[var(--lane-header-w)]`) [triage XS | frontend]

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-105/briefing-674-429-596.md` — lu en entier (288 lignes, dont cp-frontend inline).
- `.ai-env/context-packs/pit-frontend.md` — grep ciblé : `PIT-S56-001..006` (l.201-247, lu PIT-S56-003 l.219), `PIT-S85-001..006` (l.1240-1260, titres), `PIT-S94-004` (l.1540), `PIT-S64-009` (l.676), `PIT-S91-005` (l.1452), `PIT-S91-011` (l.1476).
- `docs/memory/sprints/sprint-85/maquette-vue-timeline.md` — sections B (l.68-82, `LH = 176px` l.73) et B-bis (l.84-95, `width:176px (LH)` l.90).
- `docs/memory/sprints/sprint-85/specialists-ui-design.md` — point 4, l.15 (« Gouttière 168 px au lieu de 176 px — ÉCART »).
- `docs/memory/sprints/sprint-104/issue-616-done.md` — gabarit.
- `frontend/src/components/timeline/TimelineView.tsx` — l.180-205 (doc de `LANE_TRACK_OFFSET_PX`), usages grep.
- `frontend/src/styles/ds/components/timeline.css` — l.1-60, 190-330, 725-805.
- `frontend/e2e/timeline.spec.ts` — l.1025-1060, 1185-1240, 1297-1380, 1530-1600, 1700-1730, 1765-1800, 1905-1945.

STATUS: COMPLETED
