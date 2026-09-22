# Issue #640 — « En bref » : retrait de « jour de série », 4 métriques de la maquette

## Commits

- `c03a98f1` ♻️ refactor(dashboard): « En bref » affiche les 4 métriques de la maquette (#640) — 17 fichiers, +938/−157

## Résumé

Les 4 phrases de la maquette (`maquette-dashboard.md` § « En bref ») remplacent les 3 lignes activeProducts / eventsThisMonth / currentStreak (DEC-S82-007, DEC-S108-004).

Fichiers :
- `frontend/src/components/dashboard/kpis.ts` (NOUVEAU, pur) : `DashboardKpis {week, weekRecurring, dueSoon, ongoing, busiestCategory}`, `computeDashboardKpis`, `currentWeekEvents`, `isOngoing`, `busiestCategory`, `DUE_SOON_DAYS = 14`.
- `frontend/src/hooks/useDashboardData.ts` : `computeStreak` et l'ancien calcul supprimés ; les KPIs sont mémoïsés sur le JOUR CIVIL de `now` (et non sur la référence `now`, recréée à chaque rendu) ; le type `DashboardKpis` est ré-exporté.
- `frontend/src/components/dashboard/KpiMarginalia.tsx` : 4 `<p>` en `t.rich`, un tag par chiffre (`<weekNum>`, `<recurringNum>`, `<dueNum>`, `<daysNum>`, `<ongoingNum>`, `<categoryName>`), pas de concaténation. Carte à filet `border-rule rounded-lg p-4 gap-3 text-xs leading-normal text-ink-muted`.
- `frontend/src/components/dashboard/WeekAgenda.tsx` : utilise `currentWeekEvents` : la liste et le compteur ont la même source.
- `frontend/public/locales/{fr,en,es,de}/dashboard.json` (section `kpi` seulement) : 3 clés retirées ; clés `week`, `dueSoon`, `ongoing`, `busiestCategory`, `busiestCategoryNone` (« — ») ajoutées, avec un pluriel ICU sur chaque nombre. Le fr tutoie, comme la maquette.
- Nouveaux testids : `dashboard-kpi-{week,recurring,due-14d,ongoing,busiest-category}` et `dashboard-kpi-{week,due,ongoing,busiest}-sentence`. La spec E2E les cite tous. Anciens testids `dashboard-kpi-{active-products,events-month,streak}` supprimés (aucune spec E2E ne les citait).

BR : BR-EVE-011 (archivés exclus, déjà filtrés dans le hook), BR-EVE-006 (récurrent = `isRecurring` ET `recurrenceUnit`, via `isRecurringSeries`), BR-EVE-012 (borne `recurrenceEndDate` incluse, via `seriesHorizon`/`nextStart`), BR-EVE-018 (catégorie de PRODUIT, `extendedProps.category`).

Définitions retenues :
- `week` = `currentWeekEvents` (lundi → dimanche, début de l'événement dans la semaine civile). C'est exactement la liste « Cette semaine ». `weekRecurring` = le sous-ensemble `isRecurringSeries`.
- `dueSoon` = `nextStart` mutualisé (#603), avec `0 ≤ jours civils(aujourd'hui → prochaine occurrence) ≤ 14`, bornes incluses.
- `ongoing` = `type === 'duration'` et `début ≤ aujourd'hui ≤ fin` en jours civils locaux, bornes incluses.
- `busiestCategory` = somme par catégorie des DÉBUTS d'occurrence (origine + récurrences) tombant dans le mois calendaire courant. Ex æquo : `Intl.Collator('en')`, locale figée (donc indépendante de l'UI et du navigateur ; « Électricité » passe avant « Zinc »), puis ordre des points de code. Aucune occurrence → `null`, rendu « — » par la clé i18n.

Tests (résultats) :
- ciblés : 14 fichiers, 159/159 verts.
- suite complète `npx vitest run` : 163 fichiers, 2086/2086 verts. Aucune ligne stderr ne vient des fichiers touchés (celles qui restent sont préexistantes : DeleteConfirmDialog, AccountSection, exportService).
- `tsc --noEmit` : exit 0 (e2e inclus). `npm run lint` (rtk proxy) : 0 warning/erreur. `npm run format:check` (rtk proxy) : conforme.
- `kpis.test.ts` (14 tests, TZ forcé America/New_York) : compte vide, bornes de semaine lun/dim, récurrent sans unité, cohérence avec WeekAgenda, J0/J+14/J+15/hier, avancée de récurrence WEEK/YEAR, série terminée, archivé, DST US (1er→15 mars), 5 cas de durée en cours, mois calendaire avec récurrences, série bornée, ex æquo dans les 2 ordres + accent, `null`, 1er août à l'ouest.
- `KpiMarginalia.intl.test.tsx` (17 tests, VRAIS messages, `onError`) : textes fr exacts (pluriels + compte vide), absence de « série », classes (accent / mono / « 14 » non gras / catégorie non mono / aucun `text-xl+`), 4 locales × (compte vide, n=1/2/5), milliers ×4 locales (repris d'`intl-formats.test`), rendu conjoint WeekAgenda + KpiMarginalia : nombre de lignes = compteur.
- Armement : 5 mutations de `kpis.ts` (ex æquo inversé, `<` au lieu de `<=`, `new Date(str)`, fin de mois +1 jour, `isRecurring` sans unité), toutes détectées par au moins 1 test rouge.
- Adaptés : `dashboard-components.test` (bloc KPI déplacé), `intl-formats.test` (cas KPI déplacé, `norm` supprimé), `section-titles.test` (le mock expose `rich`), `dashboard/page.test`, `timeline/page.test` (forme `kpis`), `date-iso.local-date.test` (KPIs civils : semaine, J+14, catégorie).
- E2E `frontend/e2e/sprint-108-en-bref.spec.ts` : NON exécuté (consigne). 2 tests : compte vide (listing stubbé `[]`, textes fr exacts, « — », pas de « série ») et données stubbées relatives au jour du NAVIGATEUR (3/1/3/2/« S108 Alpha », nombre de lignes de « Cette semaine » = 3, couleur accent ≠ encre, police catégorie ≠ mono). `timezoneId: 'Europe/Paris'`, viewport 1280×900, PROD storageState.

## Non vérifié

- Aucun rendu navigateur : taille, couleur et police effectives ne sont prouvées que par la spec E2E, qui n'a pas été jouée.
- `e2e/sprint-84-section-titles.spec.ts` asserte que le h2 de `dashboard-product-list` (placé SOUS « En bref » dans l'aside de 280 px) finit à ≤ 800 px de haut à 1280×800. La carte passe de 3 lignes courtes à 4 phrases de 2-3 lignes chacune, soit environ +150 à 200 px (estimation, non mesurée). Risque réel de rouge, aggravé si #623 fait grandir le hero : à jouer en priorité.
- `e2e/sprint-97-ink-faint-contrast.spec.ts` balaie le dashboard : `text-accent` sur `surface` n'a pas été mesuré ici (le couple est déjà utilisé ailleurs, mais sans preuve pour ce montage).
- Le pluriel de « récurrent(s) » en en/de est invariable (« recurring », « wiederkehrend ») : tournure choisie, pas relue par un natif.

## Écarts à la maquette

1. **statWeek** : la maquette compte les 7 PROCHAINS jours, avance la récurrence et inclut les durées en cours. Le briefing exige la cohérence avec la section « Cette semaine » livrée (semaine ISO civile, débuts réels seulement), donc une série née avant la semaine n'est comptée ni dans la liste ni dans le compteur. C'est testé et documenté dans `currentWeekEvents`.
2. **statBusy** : mois calendaire (arbitrage lead), au lieu de la fenêtre de 30 j de la maquette. Ex æquo : collation figée, au lieu de la « première rencontrée ».
3. **statOngoing** : ne regarde que l'occurrence d'origine [début, fin]. Une série récurrente de durées dont une occurrence LATER est en cours n'est pas comptée (même comportement que la maquette et la précision du lead).
4. Styles DS : la police passe de 14 px à `text-xs` (15 px, l'échelle n'a pas de 14). Padding 16/18 → `p-4`, gap 13 → `gap-3` (grille base 4). Rayon 10 px = `rounded-lg` (`--radius-lg`). Interligne 1.5 = `leading-normal` explicite (PIT-S53-001).
5. Le h2 « En bref » est conservé AU-DESSUS de la carte (#575).

## Signaux mémoire

- [MEMORY:pattern] Problem: une phrase i18n qui contient plusieurs chiffres stylés différemment (accent, mono, gras), chacun avec un testid. Solution: 1 message ICU par phrase, rendu par `t.rich`, avec un nom de BALISE distinct par chiffre (`<dueNum>`) qui porte classe + testid. Le chiffre formaté (`{dueValue}`, `Intl.NumberFormat`) est séparé du compte du pluriel (`{due, plural…}`). Anti-pattern: concaténer des fragments `t('a') + <span/> + t('b')`, ce qui casse l'ordre des mots en de/es.
- [MEMORY:pitfall] Context: passer un composant de `t()` à `t.rich` casse tous les fichiers de test qui mockent `useTranslations` en `(ns) => (k) => ns.k` (« t.rich is not a function »). Ici, 3 fichiers de tests dashboard étaient concernés. Solution: exposer `rich` dans le mock (`Object.assign(t, { rich: t })`) OU déplacer les tests du composant vers un `*.intl.test.tsx` avec les vrais messages. Prevention: avant d'introduire `t.rich`, grepper les fichiers de test qui importent le composant et adapter TOUS leurs mocks.
- [MEMORY:decision] Context: « catégorie la plus chargée » ex æquo (#640). Decision: départage par `Intl.Collator('en')` (collation racine, locale FIGÉE), puis points de code. Why: déterministe quels que soient l'ordre de l'API et la locale du navigateur, sans le piège des points de code (« É » après « Z »).
- [MEMORY:pattern] Problem: un compteur de synthèse qui doit égaler une liste rendue ailleurs sur la page. Solution: extraire le filtre de la liste en fonction pure partagée (`currentWeekEvents`), appelée par le composant liste ET par le calcul du compteur. Un test rend les deux composants ensemble et compare nombre de lignes et valeur. Anti-pattern: recoder le filtre dans le hook, ce qui produit une divergence silencieuse au premier changement de règle.

## Recommandations suite

- RECOMMAND_FOLLOWUP: « Cette semaine » (WeekAgenda) ne liste ni les occurrences récurrentes d'une série née avant la semaine, ni les durées en cours, alors que la maquette le fait (7 prochains jours + `nextStart` + `ongoing`). Aligner la LISTE sur la maquette ferait suivre le compteur automatiquement (source partagée `currentWeekEvents`). [S | frontend/dashboard]
- RECOMMAND_FOLLOWUP: « couvertures en cours » ignore les occurrences récurrentes d'une durée (seule l'origine est testée). À trancher : compter l'occurrence courante (même calcul que `isPastEvent`) ? [XS | frontend/events]
- Pas de RECOMMAND_TEST_RUNNER : la spec E2E `sprint-108-en-bref` et `sprint-84-section-titles` sont à jouer par le lead dans la passe E2E de fin de sprint (risque de flottaison noté plus haut).

STATUS: COMPLETED
