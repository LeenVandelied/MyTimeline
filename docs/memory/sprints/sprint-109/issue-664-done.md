# #664 — Sur-titres des sections du dashboard vs maquette : compteurs à droite du titre

## Résumé

Source : `docs/memory/sprints/sprint-109/maquette-sections.md` (relevé du lead, fait foi). Constat commun :
**aucune des 6 sections n'a de sur-titre dans la maquette** → absence documentée en commentaire à l'en-tête de
chacune (cite la maquette + « relevé S109 »). Là où la maquette a un élément à droite du titre, il est rendu
dans une rangée `flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1` autour du `h2` existant
(classes du `h2` conservées + `min-w-0`) ; élément = `<p class="text-ink-muted text-2xs font-mono whitespace-nowrap">`,
ni `.mt-eyebrow` ni capitales. Absent dans l'état VIDE de chaque section.

| Section | Maquette | Décision | Rendu |
|---|---|---|---|
| `WeekAgenda` (desktop) | titre + `{n} événements` | compteur | `dashboard-week-count` = `weekEvents.length` (lignes affichées), clé `dashboard.week.count` |
| `CompactAgenda` (mobile) | « Cette semaine » + `{n} évén.` | compteur de CE QUI EST AFFICHÉ | `dashboard-compact-agenda-count` = aujourd'hui + demain (pas la semaine), clé `dashboard.mobile.compactAgenda.count` |
| `KpiMarginalia` (« En bref ») | titre seul | rien | commentaire d'absence seulement |
| `ProductList` (desktop) | titre + `{n} produits` | compteur | `dashboard-product-list-count` = `products.length`, clé `dashboard.productList.count` |
| `ProductCarousel` (mobile) | titre + `{n} produits` | compteur | `dashboard-product-carousel-count`, même clé (même namespace) |
| Sous-frise `ProductDetailView` | titre + plage `{début} – {fin}` | plage des événements TRACÉS | `product-detail-timeline-range` ; commentaire #575 « aucune information à porter » remplacé |
| Historique | rien (compteur eyebrow au-dessus en prod) | hors périmètre (DEC-S84-004) | inchangé |

Écarts d'énoncé / choix justifiés :
- **CompactAgenda ≠ « cette semaine »** : le composant affiche aujourd'hui + demain (vérifié :
  `CompactAgenda.tsx`, 2 appels `getEventsInRange`). Le compteur compte donc ces lignes. `getEventsInRange`
  filtre sur la date de DÉBUT → aucun événement dans les deux groupes, la somme n'a pas de doublon.
- **Forme longue « {n} événements » sur mobile** (pas « évén. » de la maquette) : pas d'abréviation stable dans les
  4 langues (de « Ereign. » inexistant), un lecteur d'écran lit l'abréviation telle quelle, et la place existe
  (titre « Aujourd'hui et demain », 21 car.). Clé séparée de `week.count` pour permettre une forme courte plus tard.
- **Taille** : maquette 11 px (desktop) / 10 px (mobile) ; l'échelle du DS commence à `--text-2xs` = 13 px
  (`tokens/typography.css`) → `text-2xs`. Pas de valeur arbitraire.
- **Plage de la sous-frise** : la fenêtre VISIBLE (zoom + défilement) vit dans `TimelineView` /
  `useTimelineMobileState` et n'est pas connue de `ProductDetailView` sans refonte → NON inventée. Rendu =
  étendue des événements passés à la frise (mêmes `events` filtrés par l'onglet actifs/archivés/tous) : premier
  début → dernière fin (`end` vide → début, même règle que `computeRange`). Helper pur
  `frontend/src/components/products/eventSpan.ts` (`eventSpan`, `formatEventSpan`). Format court jour + mois
  (`Intl.DateTimeFormat#formatRange`) ; année affichée si une borne sort de l'année courante. Même jour →
  une date seule. La fenêtre visible réelle passe en `RECOMMAND_FOLLOWUP`.
- `flex-wrap` ajouté (non demandé) : en `de` à 375 px, « Produkt-Zeitleiste » + « 5. März – 20. Juni 2024 »
  peut dépasser la carte ; la plage passe alors à la ligne plutôt que d'écraser le titre. Non mesuré par moi.

## Tests

- Nouveaux : `frontend/src/components/dashboard/section-counts.test.tsx` (16 tests, vrai `NextIntlClientProvider`
  + vrais messages fr/de, `onError` capté : textes exacts, pluriel, état vide sans compteur, ce qui est compté,
  classes, parité des clés ×4 locales) ; `frontend/src/components/products/eventSpan.test.ts` (9 tests) ;
  `ProductDetailView.test.tsx` +3 tests (plage qui suit le filtre, rangée/classes, pas de plage en sous-frise vide).
- `npx vitest run` (3 fichiers ciblés) : 59/59.
- `npx vitest run` complet : **168 fichiers, 2173/2173 passed** (exit 0).
- `npx tsc --noEmit -p .` : exit 0. `npx next lint --file …` (11 fichiers, lu via `rtk proxy`) : « No ESLint warnings or errors ».
  `npx prettier --check` (fichiers touchés + JSON + spec) : OK.
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3999 npx playwright test e2e/sprint-109-section-counts.spec.ts --list` :
  8 tests chromium (+5 setup), aucun exécuté.
- Mutations (une à la fois, restauration vérifiée par `cmp`) :
  - M1 CompactAgenda compte aujourd'hui seulement → 3 rouges ;
  - M2 WeekAgenda compteur aussi en état vide (`>= 0`) → 1 rouge ;
  - M3 ProductCarousel sans `font-mono` → 1 rouge ;
  - M5 ProductDetailView calcule la plage sur TOUS les events (ignore le filtre) → 1 rouge ;
  - M6 `eventSpan` prend une fin illisible (NaN) → 1 rouge ;
  - M7 ProductList compteur en état vide → 1 rouge ;
  - M4 retirer `span.from.getFullYear() !== year ||` → **survit : mutant équivalent**. ICU `formatRange` ajoute
    lui-même les deux années quand la plage chevauche deux années (vérifié : « 12 déc. 2025 – 3 janv. 2026 »
    sans option `year`). Documenté dans le JSDoc de `formatEventSpan` ; condition gardée pour la lisibilité.
- Incident de protocole : 1er passage de mutations avec une copie de sauvegarde vers `scratchpad/bak` qui était un
  RÉPERTOIRE existant → `cp` a échoué, les 6 mutations se sont empilées sur disque. Restaurées à la main, vérifiées
  par grep + prettier + tsc + suite complète verte ; passage refait avec `mut664.bak` + `cmp`. Chiffres ci-dessus =
  2e passage.

## Specs E2E à jouer par le lead

Nouvelle : `frontend/e2e/sprint-109-section-counts.spec.ts` — 8 tests (fr + de × desktop 1280 / mobile 375 ×
dashboard / fiche produit). Listing produits STUBBÉ (motif `sprint-108-en-bref`), 3 produits dont un avec 2 dates
fixes en 2024 ; plage attendue calculée par le `formatRange` DU NAVIGATEUR + garde-fou regex normalisé.

Specs qui citent une surface touchée (`/usr/bin/grep -rlE "dashboard-week-agenda|dashboard-compact-agenda|dashboard-product-list|dashboard-product-carousel|dashboard-kpi-marginalia|product-detail-timeline|dashboard-mobile-portrait|product-detail-view" e2e`
∪ grep des noms de composants), liste complète :
- `e2e/golden-path.spec.ts`
- `e2e/products.spec.ts`
- `e2e/sprint-100-fab-clearance.spec.ts`
- `e2e/sprint-101-fab-landscape.spec.ts`
- `e2e/sprint-101-touch-targets.spec.ts`
- `e2e/sprint-102-touch-targets.spec.ts`
- `e2e/sprint-106-product-detail.spec.ts`
- `e2e/sprint-108-density-ribbon.spec.ts`
- `e2e/sprint-108-en-bref.spec.ts`
- `e2e/sprint-109-section-counts.spec.ts` (nouvelle)
- `e2e/sprint-42-events.spec.ts`
- `e2e/sprint-61-archived-events.spec.ts`
- `e2e/sprint-63-de-overflow-audit.spec.ts`
- `e2e/sprint-71-edit-preview-pinned.spec.ts`
- `e2e/sprint-82-recurrence-capped-hint.spec.ts`
- `e2e/sprint-84-section-titles.spec.ts`
- `e2e/sprint-85-timeline-sidebar.spec.ts`
- `e2e/sprint-85-timeline-toolbar.spec.ts`
- `e2e/sprint-86-event-category.spec.ts`
- `e2e/sprint-89-local-date-west.spec.ts`
- `e2e/sprint-90-first-contact.spec.ts`
- `e2e/sprint-91-edit-bounded-series-end-date.spec.ts`
- `e2e/sprint-92-business-toasts.spec.ts`
- `e2e/sprint-92-product-detail-actions.spec.ts`
- `e2e/timeline-mobile.spec.ts`
- `e2e/timeline.spec.ts`

Priorité : `sprint-84-section-titles` (mesure les `h2` des mêmes sections, `scrollWidth` du titre à 375 px de),
`sprint-63-de-overflow-audit`, `sprint-106-product-detail`, `sprint-90-first-contact` (états vides).

## Surfaces à mesurer en de

- Dashboard 375 × 812 portrait : « Heute und morgen » + « n Ereignisse » ; « Deine Produkte » + « n Produkte ».
- Dashboard paysage mobile (`dashboard-landscape`, même `CompactAgenda` + `ProductCarousel`) — **non couvert par ma spec**.
- Dashboard 768–1023 px (layout desktop, colonnes étroites) : « Diese Woche » + compteur, « Deine Produkte » + compteur — non couvert.
- Fiche produit 375 : « Produkt-Zeitleiste » + « 5. März – 20. Juni 2024 » (retour à la ligne attendu via `flex-wrap`).
- Clair ET sombre : couleur `ink-muted` du compteur vs fond de carte (contraste non mesuré).

## Signaux mémoire

- `[MEMORY:decision]` Context: #664, maquette S109 — aucune des 6 sections (semaine, en bref, produits ×2, agenda compact, sous-frise) n'a de sur-titre. Decision: absence documentée en commentaire ; compteurs/plage À DROITE du `h2` (rangée `flex flex-wrap items-baseline justify-between`, `text-2xs font-mono text-ink-muted whitespace-nowrap`, pas `.mt-eyebrow`) ; agenda compact compte ce qu'il affiche (aujourd'hui + demain), forme longue ; plage de la sous-frise = étendue des événements tracés, pas le viewport. Why: la maquette n'a que des compteurs à droite ; la fenêtre visible n'est pas connue du parent.
- `[MEMORY:pitfall]` Context: mutation testing avec `cp f $SP/bak` — `bak` était un répertoire existant du scratchpad, `cp` a refusé, les mutations se sont empilées et les résultats M2..M6 du 1er passage étaient contaminés. Solution: nom de sauvegarde unique + `cmp -s` après restauration, afficher « restored ». Prevention: vérifier la restauration de CHAQUE mutation avant la suivante.
- `[MEMORY:pitfall]` Context: `Intl.DateTimeFormat({day, month}).formatRange` sur une plage à cheval sur deux années ajoute les années d'office (ICU). Solution: ne tester l'option `year` que sur une plage entière dans une autre année. Prevention: une mutation qui survit sur une condition de format peut être un mutant équivalent — le vérifier au lieu d'ajouter un test vacant.
- `[MEMORY:pitfall]` Context: ` ` écrit dans un contenu de l'outil Write a atterri comme caractère U+2009 littéral dans la regex (invisible). Solution: remplacé par séquence d'échappement (`perl -CSD`). Prevention: après écriture d'une regex d'espaces Unicode, contrôler les octets (`od -c`).

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucune donnée ni schéma touchés, frontend seul.
- Pas de RECOMMAND_SECURITY : aucune entrée utilisateur, aucun appel réseau nouveau.
- Pas de RECOMMAND_UI_DESIGN : placement, contenu et style dictés par la maquette relevée et l'arbitrage dev ; seul écart (13 px au lieu de 11/10 px) est contraint par l'échelle du DS et signalé ci-dessous.
- Pas de RECOMMAND_TEST_RUNNER : suite Vitest complète jouée (2173/2173) ; l'E2E revient au lead par consigne.
- RECOMMAND_FOLLOWUP: plage de la sous-frise produit = fenêtre VISIBLE (zoom + défilement) comme dans la maquette, au lieu de l'étendue des événements — exige de remonter le viewport de `TimelineView`/`useTimelineMobileState` (callback `onVisibleRangeChange`) [triage S]
- RECOMMAND_FOLLOWUP: taille des compteurs 11 px (desktop) / 10 px (mobile) de la maquette sans palier DS (`--text-2xs` = 13 px) — arbitrage designer : classe DS `.mt-meta` 11 px sans capitales, ou 13 px entériné [triage XS]
- RECOMMAND_FOLLOWUP: couvrir en E2E le dashboard paysage mobile et la bande 768–1023 px pour les compteurs (non joués par `sprint-109-section-counts`) [triage XS]

fichiers de contexte lus: docs/memory/sprints/sprint-109/maquette-sections.md, frontend/src/components/dashboard/{WeekAgenda,CompactAgenda,ProductList,ProductCarousel,KpiMarginalia,DensityRibbon (extraits)}.tsx, frontend/src/components/dashboard/kpis.ts (extrait), frontend/src/components/dashboard/section-titles.test.tsx, frontend/src/components/dashboard/KpiMarginalia.intl.test.tsx (extrait), frontend/src/components/products/ProductDetailView.tsx (extraits), frontend/src/components/products/ProductDetailView.test.tsx (extraits), frontend/src/components/timeline/{TimelineResponsive.tsx, zoom.ts (computeRange, indexEventsByResource), lib.ts (getEventsInRange)}, frontend/src/types/event.ts (mapToFullCalendarEvent), frontend/src/lib/date-iso.ts (parseLocalDate), frontend/src/styles/ds/tokens/typography.css, frontend/src/styles/globals.css (extrait), frontend/src/styles/ds/components/{i18n.css, core.css, timeline.css} (grep), frontend/src/styles/__tests__/eyebrow-consumers.test.tsx, frontend/public/locales/{fr,en,es,de}/{dashboard,products}.json, frontend/e2e/sprint-84-section-titles.spec.ts, frontend/e2e/sprint-108-en-bref.spec.ts (extrait), frontend/app/[locale]/(app)/dashboard/page.tsx (grep), frontend/app/[locale]/(app)/products/[productId]/page.tsx (extrait), frontend/src/hooks/useProductsWithEvents.ts
STATUS: COMPLETED
