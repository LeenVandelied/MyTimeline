# Issue #81 — a11y Timeline (roving tabindex + aria-live + region landmark)

commits: [518aa86eac8e48f6ef4d4f4129c44728856f0db3]

## resume
Objectif: rendre la frise Timeline navigable clavier + lecteurs d'écran.
- Region landmark: `<section role="region">` + `aria-label` + `aria-describedby` (aide sr-only).
- Roving tabindex: 1 seul stop de tabulation (pastille active tabIndex=0, autres -1). Flèches ←→↑↓ + Home/End délégués par EventPill. Enter/Espace = ouverture native (pas de double-open).
- aria-live polite (sr-only): annonce zoom + event sélectionné.
- aria-label event riche (titre + statut récurrent + dates + produit) via `buildEventAriaLabel`.
- BR-EVT-001 respecté: contrat lecture events inchangé, zoom/nav = pur client, AUCUN refetch.

Fichiers clés:
- `frontend/src/components/timeline/TimelineView.tsx` (navLanes, rovingNav, focusNav, onPillKeyDown, region+live)
- `EventPill.tsx` (tabIndex/navKey/pillRef/onKeyDown), `lib.ts` (buildEventAriaLabel)
- i18n `public/locales/{fr,en,es,de}/dashboard.json` (region/live/status keys)
- `timeline.css` (focus ring)

2 MAJEUR corrigés (review):
- MAJEUR-1 (focusNav sans scroll): ajout `node.scrollIntoView({block:'nearest',inline:'nearest'})` après focus → pastille jamais hors écran sur navigation flèches (lanes vertical + rail horizontal).
- MAJEUR-2 (activeNav index-keyé glissait au collapse): état changé de `{lane,evt}` vers `{resourceId,evt}`. `rovingNav` dérive `lane = laneIndexByResource.get(resourceId)`; `focusNav(lane,evt)` garde sa signature mais stocke le resourceId. Le tabIndex=0 reste sur la bonne RESSOURCE quand une catégorie au-dessus se collapse (fini le saut d'index).
MINEUR fait: fusion des 2 imports `./lib` (no-duplicate-imports).

Tests: suite frontend verte 325/325. Ajout test non-régression MAJEUR-2 (fixture 3 catégories × 1 event: focus ressource C, collapse cat A → tabIndex=0 reste sur C, pas B) + `lib-a11y.test.ts`. `npm run build` vert (types OK, invisibles à vitest).

## [MEMORY:*] signaux
[MEMORY:pattern] PAT-S24-roving-resource-keyed — Problem: roving tabindex sur liste dont les items apparaissent/disparaissent (collapse/filtre) → un curseur keyé par index pointe sur le mauvais item après mutation. Solution: keyer l'état actif par ID stable (resourceId), dériver l'index de coordonnée à la volée via une Map id→index; garder les handlers en coordonnées index pour ne pas les réécrire. Anti-pattern: stocker `{lane,evt}` en index bruts dans le state.
[MEMORY:pitfall] PIT-S24-scrollintoview-focus — Context: `.focus()` seul ne défile pas fiablement des conteneurs scrollables imbriqués (lanes vertical + rail horizontal). Solution: `scrollIntoView({block:'nearest',inline:'nearest'})` explicite après focus. Prevention: jsdom n'implémente pas scrollIntoView → stub dans vitest.setup.ts (déjà présent) sinon les tests clavier throw.

## recommandations suite
RECOMMAND_FOLLOWUP: #197 crée `.claude/rules-jit/ux-patterns.md` — y formaliser PAT-S24-roving-resource-keyed comme pattern a11y canonique de la frise [frontend]. Déjà tracé dans la doc en tête de TimelineView.tsx.
RECOMMAND_FOLLOWUP: EventPill.tsx:82-84 — `<span aria-hidden="true">{event.title}</span>` reste aria-hidden même quand seul texte visible (aria-label couvre, OK aujourd'hui). Réévaluer dans #197 [frontend].
Pas de RECOMMAND_TEST_RUNNER ni RECOMMAND_DB_EXPERT.

STATUS: COMPLETED
