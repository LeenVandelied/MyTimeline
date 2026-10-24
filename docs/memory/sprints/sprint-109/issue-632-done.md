# Issue #632 — Filet d'élasticité allemande du DS (Sprint 109, vague 1)

## Résumé

Objectif : les sur-titres mono capitales « faits main » (`text-ink-muted text-2xs font-mono tracking-widest uppercase` = 13 px, `.16em` DS en dur) passent par `.mt-eyebrow` (`ds/components/i18n.css` §2 : 10 px, `.08em`, `.02em` en `de`) ; les utilitaires DS i18n restants sont documentés dormants.

Fichiers (tous sous `frontend/`) :
- `src/components/dashboard/GreetingHeader.tsx:53` — eyebrow → `.mt-eyebrow` seule (arbitrage maquette `Dashboard.dc.html`, cf. `maquette-sections.md` §#632 : 13 px → 10 px, plus qu'une taille d'eyebrow sur le dashboard). `min-w-0`/`break-words` du header conservés (PIT-S84-004).
- `src/components/dashboard/CompactAgenda.tsx:126,146` — intertitres « Aujourd'hui » / « Demain » → `.mt-eyebrow`. `h2` (l.97) NON touché (#664).
- `src/components/dashboard/MobileDrawer.tsx:81,86` — intitulés « Langue » / « Thème » → `.mt-eyebrow`. PIT-S84-001 vérifié : `span` frères du contrôle, aucun ancêtre ne pilote la couleur par état (pas de lien/pilule active) → `.mt-eyebrow` sûre, pas besoin de `.mt-nav-label`.
- `app/[locale]/(app)/timeline/page.tsx:66` + `loading.tsx:34` — sur-titre Frise → `.mt-eyebrow`, identique dans les deux (pas de saut au chargement).
- `src/components/products/ProductDetailView.tsx:503` — badge « archivé » CONSERVÉ (c'est une pilule bordée, pas un sur-titre) + `[&:lang(de)]:tracking-[.02em]`. Sortie Tailwind vérifiée par compilation `@tailwindcss/postcss` : `.cls{&:lang(de){letter-spacing:.02em}}`, spécificité 0,2,0 > `tracking-widest` 0,1,0. `h2` (~l.425) NON touché.
- `src/styles/ds/components/i18n.css` — en-tête : liste des classes câblées + 6 classes « VOLONTAIREMENT DORMANTES » avec raison (`.mt-seg*`, `.mt-tabs--collapsible`/`--de-menu`, `.mt-btn--wrap`, `.mt-truncate`, `.mt-eyebrow--wrap`, `.mt-eyebrow--title`). Aucune règle CSS modifiée ni supprimée.
- Tests : `src/styles/__tests__/eyebrow-consumers.test.tsx` (nouveau, 9 tests), `src/components/dashboard/section-titles.test.tsx` (assertion CompactAgenda adaptée : `uppercase`/`font-mono` → `className === 'mt-eyebrow'` ; titre du test GreetingHeader « NON converti » corrigé).

Décisions :
- `.mt-eyebrow` posée SEULE (aucune utilitaire `text-*`/`tracking-*` à côté : la règle DS hors layer les battrait, PIT-S53-003) — verrouillé par `className === 'mt-eyebrow'`.
- `.mt-eyebrow--wrap` : non posée. Libellés des 4 locales tous courts (fr « Aperçu », « Aujourd'hui », « Demain », « Langue », « Thème », « Frise » ; de « Überblick », « Heute », « Morgen », « Sprache », « Design », « Zeitachse » ; en/es comparables). `nowrap` ne devrait pas déborder, même dans le tiroir `min(320px,85vw)` — NON mesuré au navigateur.
- Dormantes : aucun cas d'usage trivial à câbler (détail et raison par classe dans l'en-tête `i18n.css`). `.mt-btn--wrap` : ses règles sont recopiées par le gabarit `lg` du hero (#682, `globals.css`), la classe n'est pas posée. `.mt-truncate` : Tailwind `truncate` + `[&>span]:line-clamp-1` du trigger `ui/select.tsx` couvrent le besoin.

Écarts d'énoncé / de briefing :
- HEAD de départ réel `f54ab665` (merge S108, au-dessus de `0bfd91ad`) ; #697 a commité `db43be3e` pendant la vague.
- `tracking-widest` vaut `.16em` (token DS `ds/tokens/typography.css:34`, hors layer), pas `.1em` comme l'énoncé.
- Lignes du briefing exactes au départ ; après prettier (spans repliés sur une ligne) : CompactAgenda 126/146, MobileDrawer 81/86.
- En-tête `i18n.css` : `.mt-timeline-ltr`, `.mt-dir-icon`, `.mt-sheet-accent` (§8 RTL) ont AUSSI 0 consommateur (grep) — signalé dans l'en-tête, hors périmètre.
- `.mt-drawer__k` (`ds/components/timeline.css:479`) : `.06em` fixe, PAS de détente en `de` → non réécrit (consigne), signalé en follow-up. Libellés `de` courts (« Kategorie », « Farbe ») : risque faible.

## Tests

- Ciblé : `npx vitest run src/styles/__tests__/eyebrow-consumers.test.tsx src/components/dashboard/section-titles.test.tsx src/components/dashboard/dashboard-mobile.test.tsx src/components/products/ProductDetailView.test.tsx` → 4 fichiers, 73/73 verts.
- Suite complète : `npx vitest run` → 166 fichiers, 2145/2145 verts (exit 0).
- `npx tsc --noEmit -p .` → exit 0, 0 ligne.
- `npx next lint --file …` (8 fichiers .tsx) → « No ESLint warnings or errors ».
- `rtk proxy npx prettier --check …` (9 fichiers ; `src/styles/ds` est dans `.prettierignore`) → « All matched files use Prettier code style! ».
- Mutations (sur `eyebrow-consumers.test.tsx`, fichier restauré après chacune, 9/9 verts ensuite) :
  - M1 GreetingHeader remis au motif fait main → 2 rouges (rendu + garde statique).
  - M2 MobileDrawer « Thème » `mt-eyebrow text-2xs` (utilitaire empilée) → 1 rouge.
  - M3 `timeline/page.tsx` remis au motif fait main → 2 rouges (parité page/loading + garde statique).
  - M4 badge sans `[&:lang(de)]:tracking-[.02em]` → 1 rouge.
- Garde statique : balayage par LIGNE (commentaires exclus), contrôle négatif intégré, anti-vacuité (> 100 fichiers), liste blanche `landing/HowItWorksSection.tsx` elle-même contrôlée (rougit si la landing est convertie).
- Limites : jsdom n'applique aucune feuille → ni taille rendue, ni interlettrage `de`, ni débordement prouvés ici.

## Specs E2E à jouer par le lead

Grep `/usr/bin/grep -rl <clé> frontend/e2e` (clés : `dashboard-greeting-eyebrow`, `dashboard-greeting`, `GreetingHeader`, `MobileDrawer`, `dashboard-mobile-drawer`, `CompactAgenda`, `dashboard-compact-agenda`, `timeline-screen`, `timeline-loading-skeleton`, `product-detail` ; `archivedBadge`/`Archiviert` : 0) — union :

- e2e/golden-path.spec.ts
- e2e/landing-auth-theme-toggle.spec.ts
- e2e/products.spec.ts
- e2e/sprint-42-events.spec.ts
- e2e/sprint-61-archived-events.spec.ts
- e2e/sprint-62-select-focus-indicator.spec.ts
- e2e/sprint-63-de-overflow-audit.spec.ts
- e2e/sprint-71-edit-preview-pinned.spec.ts
- e2e/sprint-73-model-vs-rendered.spec.ts
- e2e/sprint-73-tablet-sidebar.spec.ts
- e2e/sprint-82-recurrence-capped-hint.spec.ts
- e2e/sprint-84-section-titles.spec.ts
- e2e/sprint-85-timeline-group-head.spec.ts
- e2e/sprint-85-timeline-sidebar.spec.ts
- e2e/sprint-85-timeline-toolbar.spec.ts
- e2e/sprint-86-event-category.spec.ts
- e2e/sprint-89-local-date-west.spec.ts
- e2e/sprint-90-first-contact.spec.ts
- e2e/sprint-91-edit-bounded-series-end-date.spec.ts
- e2e/sprint-91-event-pin.spec.ts
- e2e/sprint-91-recurrence-marks.spec.ts
- e2e/sprint-92-business-toasts.spec.ts
- e2e/sprint-92-product-detail-actions.spec.ts
- e2e/sprint-94-fullscreen-overlays.spec.ts
- e2e/sprint-94-mobile-lane-gutter.spec.ts
- e2e/sprint-94-modal-shortcuts.spec.ts
- e2e/sprint-97-ink-faint-contrast.spec.ts
- e2e/sprint-97-lane-stacking.spec.ts
- e2e/sprint-98-label-collision.spec.ts
- e2e/sprint-100-fab-clearance.spec.ts
- e2e/sprint-101-fab-landscape.spec.ts
- e2e/sprint-101-touch-targets.spec.ts
- e2e/sprint-102-touch-targets.spec.ts
- e2e/sprint-106-product-detail.spec.ts
- e2e/sprint-107-tab-focus-outline.spec.ts
- e2e/timeline-mobile.spec.ts
- e2e/timeline.spec.ts

Risque ciblé : `sprint-97-ink-faint-contrast` mesure le contraste des eyebrows dashboard (`dashboard-greeting-eyebrow`) et Frise (`timeline-screen header > span` — toujours le 1er span, le commentaire JSX n'émet rien). Même encre `ink-muted` → ratio inchangé attendu, taille 13 → 10 px (le seuil 4,5:1 ne dépend pas de la taille sous 18 px). `sprint-84-section-titles` : aucune assertion de taille sur l'eyebrow du GreetingHeader (grep).

## Surfaces à mesurer en de

Pour chaque surface : `letter-spacing` calculé = 0,2 px en `de` (10 px × .02em) vs 0,8 px en fr, `font-size` 10 px, aucun débordement horizontal (`scrollWidth <= clientWidth` du parent), 375 px ET desktop :
1. `/de/dashboard` — `dashboard-greeting-eyebrow` (« ÜBERBLICK »).
2. `/de/dashboard` à 375 px — `dashboard-compact-agenda-today > span` / `-tomorrow > span` (« HEUTE » / « MORGEN »).
3. `/de/dashboard` à 375 px, tiroir ouvert — `dashboard-mobile-drawer` : intitulés « SPRACHE » / « DESIGN » (tiroir `min(320px,85vw)`).
4. `/de/timeline` — `timeline-screen header > span` (« ZEITACHSE ») + le squelette `loading.tsx` (même classe).
5. `/de/products/<id>` avec un event archivé (onglet « archivés ») — badge « ARCHIVIERT » : `letter-spacing` 0,26 px (13 px × .02em) en `de` vs 2,08 px en fr.
Critère « 4 écrans principaux sans débordement en de » : dashboard, frise, liste produits, fiche produit → à jouer par le lead.

## Signaux mémoire

- [MEMORY:decision] Context: #632, 6 utilitaires i18n du DS à 0 consommateur (`.mt-seg*`, `.mt-tabs--collapsible`/`--de-menu`, `.mt-btn--wrap`, `.mt-truncate`, `.mt-eyebrow--wrap`, `.mt-eyebrow--title`). Decision: documentées « VOLONTAIREMENT DORMANTES » dans l'en-tête de `ds/components/i18n.css`, CSS conservée. Why: aucun cas d'usage réel (SettingsShell a retenu le défilement `.mt-tablist-scroll` ; hero recopie `.mt-btn--wrap` dans `globals.css` #682 ; Tailwind `truncate`/`line-clamp-1` couvrent `.mt-truncate` ; libellés d'eyebrow courts dans les 4 locales).
- [MEMORY:decision] Context: badge « archivé » de `ProductDetailView` en `tracking-widest uppercase` sans mono. Decision: non converti en `.mt-eyebrow` (rôle et forme de badge), détendu par `[&:lang(de)]:tracking-[.02em]`. Why: `.mt-eyebrow` retire la bordure et passe en mono 10 px ; `.mt-badge` du DS changerait forme/police/taille et ne se détend pas non plus en `de`.
- [MEMORY:pattern] Problem: garder un motif Tailwind fait main hors du code (`font-mono tracking-widest uppercase`). Solution: garde statique par LIGNE de code (commentaires exclus) + contrôle négatif + anti-vacuité + liste blanche elle-même testée (rougit quand l'entrée meurt) — `eyebrow-consumers.test.tsx`. Anti-pattern: balayer les littéraux entre guillemets — les apostrophes des commentaires FR désapparient les paires (faux négatifs).

## Recommandations suite

- RECOMMAND_FOLLOWUP: `.mt-drawer__k` (`ds/components/timeline.css:479`, `.06em` fixe) et `.mt-badge` (`core.css:199`, `.06em`) ne se détendent pas en `de` — ajouter `[lang="de"] …{letter-spacing:.02em}` comme `.mt-eyebrow`/`.mt-nav-label` [triage XS]
- RECOMMAND_FOLLOWUP: en-têtes de colonnes `ProductsListView.tsx:40` (`tracking-[.1em]` 9 px mono capitales) ne se détendent pas en `de` [triage XS]
- RECOMMAND_FOLLOWUP: §8 RTL de `i18n.css` (`.mt-timeline-ltr`, `.mt-dir-icon`, `.mt-sheet-accent`) à 0 consommateur — décider dormant documenté ou retrait du DS [triage XS]
- Pas de RECOMMAND_DB_EXPERT : aucune donnée ni schéma touchés.
- Pas de RECOMMAND_SECURITY : changements de classes CSS et de commentaires uniquement.
- Pas de RECOMMAND_UI_DESIGN : l'arbitrage de taille GreetingHeader est tranché par la maquette (`maquette-sections.md` §#632).
- Pas de RECOMMAND_TEST_RUNNER : suite Vitest complète jouée (2145/2145) ; l'E2E est réservé au lead.

fichiers de contexte lus: docs/memory/sprints/sprint-109/maquette-sections.md, frontend/src/styles/ds/components/i18n.css, frontend/src/styles/ds/components/core.css (Badge, tablist), frontend/src/styles/ds/components/timeline.css (mt-drawer), frontend/src/styles/ds/tokens/typography.css, frontend/src/styles/globals.css (gabarit hero #682), frontend/src/components/dashboard/section-titles.test.tsx, frontend/src/components/dashboard/dashboard-mobile.test.tsx, frontend/src/components/settings/SettingsShell.tsx (en-tête), frontend/src/components/ui/tabs.tsx, frontend/src/components/ui/select.tsx (trigger), frontend/src/components/products/ProductsListView.tsx (TH), frontend/e2e/sprint-97-ink-faint-contrast.spec.ts, frontend/e2e/sprint-84-section-titles.spec.ts, frontend/public/locales/{fr,en,es,de}/{dashboard,shell,products}.json
STATUS: COMPLETED
