# Issue #602 — Barre d'outils de la frise : boutons Aujourd'hui et Nouvel événement — done

Commit : `a2a3fce` (branche `claude/sprint-85-start-832373`, base `cdb798b`).

## Résumé

- **Surface du shell, pas de doublon** : nouveau `CreateEventContext.tsx` (`CreateEventProvider` +
  `useOpenCreateEvent(): (() => void) | null`). `AppShell` expose `openCreate = useCallback(() =>
  setShowCreate(true), [])` (identité stable, motif `closeCreate`, BUG-S44-001), l'utilise aussi pour
  ses deux déclencheurs existants, et enveloppe `children`. Toujours un seul `showCreate`, un seul
  `NewEventDrawer` monté (conditionnel, PR #313 intact). Hors provider → `null` → pas de bouton.
  Aucun `NewEventDrawer` dans `TimelineView`/`TimelineEditHost`. Commentaire d'invariant #455/#298
  réécrit (3e déclencheur sur `/timeline`, règle DEC-S85-003).
- **« Aujourd'hui »** (`layout === 'screen'` seulement, DEC-S85-005) : après le zoom, testid
  `timeline-today-button`, clé `common.buttons.today`. Action factorisée `goToToday` (dispatch
  `GO_TO_TODAY` + `scrollToToday`), partagée avec la touche `T`. Pas d'annonce live : la touche `T`
  n'en a pas non plus (rien à reproduire).
- **« Nouvel événement »** (`screen` ET hook non nul) : dernier de la barre, `Button size="sm"` +
  trio accent du shell (#578), icône `Plus`, clé `shell.newEvent`, `aria-haspopup="dialog"`,
  `hidden md:inline-flex` (tailwind-merge retire bien le `inline-flex` nu du Button — test), testid
  `timeline-new-event`. **En plein écran, quitte le plein écran avant d'ouvrir** : le drawer est monté
  par le shell, hors de `rootRef` (seul élément peint en plein écran) — sinon drawer invisible, focus
  piégé dedans. Focus rendu au bouton de la barre à la fermeture (`useFocusTrap`, aucun code ajouté,
  vérifié en E2E).
- **Place de la minimap** (défaut trouvé en mesurant, pas dans l'énoncé) : avec les deux boutons, la
  minimap (`flex:1`, base 0) absorbait seule le manque — **mesuré à 1024 px : 9 px de large en fr,
  56 px en de**, sans aucun débordement (scrollWidth = clientWidth) pour le signaler. Correctif CSS
  limité à `.mt-tlv--screen` : base 160 px (filet, la barre renvoie à la ligne au lieu d'écraser) +
  requête de conteneur (< 700 px de contenu de barre) qui place la minimap seule sur une 2e ligne
  pleine largeur, contrôles groupés sur la 1re, CTA calé à droite (`margin-left:auto`). Layout
  `embedded` (dashboard, fiche produit) inchangé (`min-w-0 flex-1` conservés, règles scopées).

## Fichiers modifiés

- `frontend/src/components/layout/CreateEventContext.tsx` (nouveau)
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/AppShell.test.tsx`
- `frontend/src/components/timeline/TimelineView.tsx`
- `frontend/src/components/timeline/TimelineView.test.tsx`
- `frontend/src/components/timeline/TimelineToolbarActions.test.tsx` (nouveau)
- `frontend/src/styles/ds/components/timeline.css`
- `frontend/e2e/sprint-85-timeline-toolbar.spec.ts` (nouveau)

## Écarts à la maquette et mesures

| Élément | Maquette §D | Retenu | Pourquoi |
|---|---|---|---|
| Hauteur « Aujourd'hui » | 38 px, `padding:0 14px`, 13 px | **26 px**, `0 10px`, 12 px | aligné sur le bouton « Filtres » voisin (#592) ; la barre de prod est compacte (zoom 19 px, plein écran 26 px) |
| Cadre « Aujourd'hui » | `rule-strong` | `rule-emphasis` | fond `surface` sur barre `surface-2` (~1,05:1) : le cadre est la seule limite → tier fonctionnel, même arbitrage que `.mt-zoom` / « Filtres » (#352) |
| Rayon « Aujourd'hui » | 7 px | `--radius-md` | celui du bouton « Filtres » |
| « Nouvel événement » | `Button variant="accent"` ~170×38 | `Button size="sm"` + trio accent, **32 px** (fr 175 px de large) | `Button` n'a pas de variante `accent` (le shell surcharge les classes) ; 32 px tient dans la ligne de 40 px (minimap) |
| Testid « Aujourd'hui » | proposé `timeline-today` | **`timeline-today-button`** | `timeline-today` est DÉJÀ le badge positionnel de la règle (desktop + 2 variantes mobiles, `timeline.spec.ts:579-629`) |
| Bascule de thème | 38×38 | absente | hors périmètre (énoncé) |

Mesures réelles (Chromium, harnais :3100, sonde jetable non committée), largeur de la minimap :

| Largeur | fr avant correctif | fr après | de avant | de après |
|---|---|---|---|---|
| 768 | 98 px | 630 px (2e ligne) | 151 px | 630 px (2e ligne) |
| 900 | 230 | 230 (1 ligne) | 283 | 283 |
| 1024 | **9** | 454 (2e ligne) | **56** | 454 (2e ligne) |
| 1200 | 185 | 630 (2e ligne) | 232 | 630 (2e ligne) |
| 1280 | 265 | 265 (1 ligne) | 312 | 312 (1 ligne) |

Aucun débordement de barre ni de page (fr/de/en/es × 768…1440). Coût : la barre passe de 57 à 101 px
de haut quand la minimap va à la ligne (768-833 et 1024-1265 px). Seuil 700 px = contrôles fr
< 1024 px (520 px) + gap + 160 px = 692 px mesurés : marge de 8 px — au-delà, la base 160 px renvoie
le CTA à la ligne (dégradation propre, pas d'écrasement).
Non mesuré : contraste du bouton « Aujourd'hui » (tokens identiques à « Filtres » : encre `ink` sur
`surface`, cadre `rule-emphasis`) ; anneau de focus au Tab réel (même règle `:focus-visible` que
« Filtres »).

## Tests

- **Vitest** `rtk proxy npm test` : **127 fichiers, 1511/1511** (1496 + 15).
  - `TimelineView.test.tsx` : 8 nouveaux (`#602 barre d'outils`) — 2 boutons + ordre ; Aujourd'hui =
    effet de `T` (scrollLeft 360 → 420) ; 1 appel au shell + `aria-haspopup` ; classes
    `hidden md:inline-flex` sans `inline-flex` nu ; plein écran quitté avant ouverture ; pas
    d'`exitFullscreen` hors plein écran ; `embedded` → aucun ; `screen` hors shell → Aujourd'hui seul.
  - `TimelineToolbarActions.test.tsx` : 4 (vrais messages fr/en/es/de + `onError` vide, PIT-S63-006).
  - `AppShell.test.tsx` : 3 — ouverture depuis l'écran = une instance, les déclencheurs du shell
    n'en montent pas de 2e, démontage/réouverture ; identité stable entre 2 rendus ; hook `null` hors shell.
  - Contrôle négatif (annulé) : namespace `newEvent` sans `shell.`, Aujourd'hui câblé sur
    `toggleFullscreen`, `hidden` retiré → 7 tests rouges (4 locales + 3).
- `rtk proxy npm run typecheck` exit 0 · `rtk proxy npm run lint` 0 erreur/avertissement ·
  `rtk proxy npm run format:check` conforme (2 fichiers reformatés avant commit).
- **E2E** (harnais :3100, `--reporter=json`, comptes lus dans le JSON) :
  - `e2e/sprint-85-timeline-toolbar.spec.ts` : **8/8** (+ 5 setup) — 1280 : drawer du shell, un seul,
    hors frise, Échap → focus sur le bouton de barre, coexistence avec le bouton de nav ; 768 : barre +
    nav, pas de FAB ; 700 et 767 (frise desktop) : bouton dans le DOM mais non peint, FAB seul ;
    Aujourd'hui depuis le début ET la fin de l'étendue (±400 j) → ligne TODAY dans la frise ; fr/de ×
    768/900/1024/1280 : pas de débordement, minimap ≥ 160 px, CTA dans la barre ; dashboard : aucun des deux.
  - Contrôles négatifs E2E (annulés) : `hidden` retiré → 700/767 rouges ; garde minimap retirée →
    fr (98 px) et de (151 px) rouges. Les 4 autres restent verts.
  - Régression, un seul run : `sprint-85-timeline-{toolbar,sidebar,group-head}`, `timeline.spec.ts`,
    `sprint-62-select-focus-indicator` (chromium + firefox), `sprint-66-mobile-create-event`,
    `sprint-66-mobile-keyboard`, `sprint-70-create-preview-pinned`, `sprint-70-preview-visual`,
    `sprint-63-de-overflow-audit`, `sprint-73-tablet-sidebar`, `sprint-84-palette` :
    **119 expected, 0 unexpected, 0 flaky, 0 skipped** (3 min 20).
  - 1 rouge d'environnement au 1er run d'une sonde : `setup › provision shared` (dashboard > 5 s,
    PIT-S72-004), oracles 401/200, vert à la relance.
- Non exécuté (consigne) : `npm run build`, `test-quiet.sh frontend`, suite E2E complète,
  `timeline-mobile.spec.ts` (variantes mobiles non touchées).

## Signaux mémoire

- [MEMORY:pitfall] Context: ajouter des boutons dans une barre `flex-wrap:wrap` qui contient un enfant `flex:1; min-width:0` (minimap). Solution: l'enfant à base 0 absorbe TOUT le manque avant que la barre ne passe à la ligne — mesuré 9 px de large à 1024 px (fr), `scrollWidth === clientWidth`, donc invisible à tout contrôle de débordement (y compris `sprint-63-de-overflow-audit`). Base minimale (`flex:1 1 160px`) + requête de conteneur. Prevention: après tout ajout dans une barre flexible, mesurer la largeur de l'élément élastique aux paliers, pas seulement l'absence de débordement.
- [MEMORY:pattern] Problem: un écran enveloppé doit ouvrir l'overlay possédé par le shell sans second état ni second montage. Solution: contexte dont la valeur est la fonction d'ouverture elle-même (`useCallback` à deps vides), hook qui rend `null` hors provider → le consommateur ne rend pas de bouton. Le focus revient au 3e déclencheur gratuitement si le trap mémorise `document.activeElement` à l'ouverture. Anti-pattern: prop-drilling d'un callback à travers `TimelineEditHost`/`TimelineResponsive`, ou `useState` + drawer locaux.
- [MEMORY:pitfall] Context: overlay monté par le shell, déclenché depuis un élément en plein écran (`requestFullscreen` sur la section de la frise). Solution: seul l'élément plein écran et ses descendants sont peints → l'overlay s'ouvre invisible, focus piégé dedans. Quitter le plein écran avant d'ouvrir. Prevention: tout déclencheur d'overlay placé dans un conteneur « plein-écranable » doit vérifier `document.fullscreenElement`.
- [MEMORY:pitfall] Context: testid proposé par le briefing (`timeline-today`) déjà porté par le badge positionnel de la règle dans 3 composants. Solution: `timeline-today-button`. Prevention: `grep -rn 'data-testid="<id>"' src e2e` avant d'adopter un testid proposé.
- [MEMORY:decision] Context: maquette §D pose 38 px pour « Aujourd'hui » et « Nouvel événement » ; la barre de prod aligne ses contrôles sur 26 px. Decision: « Aujourd'hui » 26 px (jumeau de « Filtres »), CTA `Button size="sm"` 32 px, minimap sur 2e ligne sous 700 px de barre. Why: cohérence avec les contrôles existants de la barre ; la maquette place la minimap dans un pied, pas dans l'en-tête — la prod l'a dans la barre, d'où la gestion de place.

## Recommandations suite

- RECOMMAND_FOLLOWUP: raccourcis clavier de la frise actifs derrière le drawer de création — `TimelineView` écoute `keydown` sur `window` et n'exclut que INPUT/TEXTAREA/contentEditable ; avec le drawer du shell ouvert sur `/timeline`, `F` (plein écran), `T`, `+`/`-`, `[`/`]` pressés sur un bouton du drawer agissent sur la frise derrière (`F` rendrait le drawer invisible). Déduit du code, non reproduit ; pré-existant (bouton de nav du shell), rendu plus probable par le 3e déclencheur. Ignorer les raccourcis quand un `[role="dialog"][aria-modal="true"]` est ouvert. [triage S | frontend/events]
- RECOMMAND_FOLLOWUP: minimap dans la barre d'outils alors que la maquette la place dans un PIED sous la frise (hors périmètre S85) — la déplacer rendrait inutile la requête de conteneur de #602 et redonnerait une barre d'une seule ligne à toute largeur. [triage S | frontend/events]
- RECOMMAND_UI_DESIGN: revue des écarts assumés — « Aujourd'hui » 26 px/12 px/`rule-emphasis` au lieu de 38/13/`rule-strong` ; CTA 32 px ; barre à 2 lignes (101 px) entre 1024 et 1265 px et sous 834 px ; hauteurs mêlées dans la barre (zoom 19, boutons 26, CTA 32, minimap 40) — prévue par le lead en fin de sprint.
- Pas de RECOMMAND_DB_EXPERT car aucun changement backend ni schéma (100 % frontend).
- Pas de RECOMMAND_SECURITY car aucune surface d'authentification, de donnée personnelle ou d'API externe touchée (le drawer de création existant est réutilisé tel quel).
- RECOMMAND_TEST_RUNNER: la régression E2E ciblée a pris 3 min 20 (> 3 min, 119 tests) — suite E2E complète et `next build` à jouer par le lead lui-même (jamais un test-runner délégué pour l'E2E) ; vitest ≈ 37 s.

STATUS: COMPLETED
