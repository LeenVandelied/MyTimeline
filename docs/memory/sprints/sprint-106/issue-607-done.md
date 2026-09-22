# Issue #607 — Historique produit : désaturation des événements passés

## Commits
- `0b0f8b68` :lipstick: style(products): l'historique désature la ligne entière des événements passés (#607)
- E2E dans `9fbca3c4` (commit #698, spec commune `e2e/sprint-106-product-detail.spec.ts`)

## Résumé
- `frontend/src/components/products/isPastEvent.ts` (nouveau) : « passé » = fin (repli début si fin vide/illisible) STRICTEMENT antérieure au jour civil LOCAL (`parseLocalDate`, comparaison de jours civils, pas d'UTC). Série récurrente : sans `recurrenceEndDate` → jamais passée ; bornée → fin de la DERNIÈRE occurrence (`recurrenceEndDate` + durée de la 1re, en jours civils). Date illisible → `false`.
- `ProductDetailView.tsx` : `li[data-past]` ; titre `text-ink-muted` si passé (sinon `text-ink`) — aucune opacité ni filtre sur le texte ; pastille `.mt-evt--past` ; mention `sr-only` `products.detail.pastLabel` (WCAG 1.4.1). Archivé inchangé (pastille `.mt-evt--archived` + badge + Désarchiver) ; passé + archivé = cumul.
- `timeline.css` : `.mt-evt--past, .mt-evt--past.mt-evt--archived{filter:grayscale(1)}` (commenté, réservé à la pastille décorative ; sélecteur composé pour ne pas dépendre de l'ordre des sources).
- i18n : `products.detail.pastLabel` fr « Passé » / en « Past » / es « Pasado » / de « Vergangen ».
- BR : BR-EVE-011 inchangé (compteur actifs) ; BR-EVE-013 inchangé (archivé garde son traitement).
- Tests : unit `isPastEvent.test.ts` (12 : hier/aujourd'hui/demain, durée, repli début, invalide, minuit local, 4 cas récurrence) + `ProductDetailView.test.tsx` (horloge figée : passé vs à venir, cumul, passé non archivé désaturé, clé i18n dans les 4 locales). E2E clair + sombre : 3 événements seedés (+60 j, −60 j, −90 j archivé).

## Mesures (E2E, chromium, `next build` + `next start`)
| thème | titre passé | passé + archivé | à venir |
|---|---|---|---|
| clair | 5.96:1 (#5e626b / #fcfcfd) | 5.96:1 | 17.32:1 |
| sombre | 6.26:1 (#8e9299 / #0b0c0e) | 6.26:1 | 16.70:1 |
Opacité effective du texte = 1, aucun `filter` sur la ligne ni ses ancêtres. Pastilles : à venir `none/1`, passé `grayscale(1)/1`, passé+archivé `grayscale(1)/0.45`.

## Écarts d'énoncé
- Récurrence non couverte par l'arbitrage : dérivée de la même règle (fin de la dernière occurrence). À valider par le lead.
- Indice non chromatique choisi : mention `sr-only` (pas de badge visible — la grande majorité de l'historique est passée, un badge par ligne serait du bruit). À l'écran : date visible + écart de luminance ink (17:1) → ink-muted (6:1).
- `today` recalculé à chaque rendu (`new Date()`) : une page laissée ouverte après minuit ne se met à jour qu'au rendu suivant.

## [MEMORY:*] signaux
- [MEMORY:decision] Context: #607 désaturer du texte. Decision: ligne passée = swap d'encre vers `ink-muted` (token AA) + `grayscale(1)` sur la seule pastille décorative, jamais filtre/opacité sur le texte. Why: PIT-S61-003 (grayscale déplace le ratio) + PIT-S70-003 (opacité cumulée tombe sous AA) ; mesuré 5.96 / 6.26:1.
- [MEMORY:decision] Context: critère « passé » d'un événement. Decision: `isPastEvent` (fin < jour civil local ; récurrente sans fin = jamais passée ; bornée = fin de la dernière occurrence). Why: fin de la 1re occurrence ne dit rien d'une série.

## Recommandations suite
- RECOMMAND_FOLLOWUP: la frise (TimelineView) n'applique aucun traitement « passé » — cohérence avec l'historique à arbitrer [triage | timeline]
- Pas de RECOMMAND_SECURITY car aucune donnée/auth/API touchée.

## Correctif review
- Commit `44c7dd75` 🐛 fix(products): une série bornée est passée d'après sa dernière occurrence réelle (#607).
- Constat (reviewer, MAJEUR) : `recurrenceEndDate` était pris pour le DÉBUT de la dernière occurrence ; c'est un HORIZON inclusif (BR-EVE-012). Borne hors cadence → fin de série calculée trop tard (WEEK lundi borné un mercredi : ~2 j).
- Correctif `isPastEvent.ts` : réutilise `occurrenceStart` + `seriesHorizon` + `MAX_OCCURRENCES` (`lib/recurrence.ts`, mêmes que `nextStart`) ; dernière occurrence = plus grand `occurrenceStart(origin, unit, k) <= horizon`, durée = celle de la 1re en jours civils. `recurrenceUnit` ajouté à `PastEventInput` ; `isRecurring` sans unité → ponctuel (comme `nextStart`).
- Unit `isPastEvent.test.ts` : 18 cas (+6), dont WEEK hors cadence (passée / 3 jours en cours), MONTH « tous les 31 » borné le 29/09 (passée) et le 30/09 (clamp, pas passée), 31/01 → 28/02 clampé (pas passée le 28/02, passée le 01/03), YEAR hors cadence.
- E2E ajouté (NON exécuté par moi, consigne du lead) : `#607 — séries récurrentes dans l'historique` — série WEEK bornée à −10 j (hors cadence) → `data-past=true`, AA mesuré ; série MONTH sans borne → `data-past=false`, pas de mention.
- Checks : vitest 2056/2056 (160 fichiers), tsc 0, lint 0, format:check 0.
- [MEMORY:pitfall] Context: calculer la fin d'une série bornée. Solution: `recurrenceEndDate` = horizon, pas une occurrence ; chercher la plus grande `occurrenceStart <= seriesHorizon`. Prevention: ne jamais recalculer une occurrence hors de `lib/recurrence.ts`.

## Non vérifié
- E2E du correctif (série bornée / sans fin) : écrit, non joué ici.
- Écart de durée par occurrence : la durée est celle de la 1re occurrence en jours civils ; une durée en mois (`durationUnit: months`) sur une occurrence clampée n'est pas recalculée.
- Rendu Firefox/WebKit.
- Fuseau à l'ouest (la spec seed à ±60/90 j, insensible au fuseau ; la logique locale est couverte en unit avec dates locales, pas sous `TZ` forcé).
- Lecture effective de la mention sr-only par un vrai lecteur d'écran.

STATUS: COMPLETED
