# Issue #630 — États vides : frise pointillée et CTA sur les surfaces listantes

## Résumé

Objectif : `EmptyState` sait dessiner une frise vide en pointillés, la frise a un état vide dédié, et chaque surface listante a un état vide avec CTA. Aucune illustration, icône ou emoji ajouté. Un seul commit, 28 fichiers (27 modifiés + 1 test créé).

**`EmptyState.track`** (`frontend/src/components/shared/EmptyState.tsx`)
- Rendu au-dessus du titre : `aria-hidden="true"`, testid `${testId}-track`.
- 3 lanes de hauteur `var(--lane-height)`, chacune traversée d'un trait `border-t-2 border-dashed border-rule-emphasis`, largeur `w-full max-w-md`.
- Pas de variante `.dark` : `--color-rule-emphasis` n'est pas inversé en sombre (`ds/readme.md` § Border tiers), comme pour le connecteur `.mt-evt-connector`.
- **En `compact`, `track` est ignoré.** Cette variante vit dans des colonnes étroites (aside 280 px, carousel), sous un titre de section. Trois lanes de 46 px y écraseraient le contenu, et une lane unique réduite se lirait comme un simple filet séparateur.

| Surface | testid conservé | CTA (testid) | Cible | Piste |
|---|---|---|---|---|
| `/timeline` sans produit (`app/[locale]/(app)/timeline/page.tsx`) | `timeline-empty` | `timeline-empty-cta`, « Créer un produit » | `Link` → `/${locale}/products` (BR-EVE-002 : pas d'événement sans produit) | oui |
| Liste produits vide (`ProductsListView.tsx`) | `products-empty` | `products-empty-cta` | `setCreateOpen(true)`, même handler que `products-new-button` | non |
| Recherche sans résultat (`ProductsListView.tsx`) | `products-empty-search` | `products-empty-search-cta`, « Effacer la recherche » | `setSearch('')` + focus rendu au champ (sinon le focus tombe sur body quand le bouton disparaît). Pas de CTA de création | non |
| Catégories vides (`CategoriesView.tsx`) | `categories-empty` | `categories-empty-cta` | `setCreateOpen(true)`, même handler que `categories-new-button` | non |
| Agenda semaine (`WeekAgenda.tsx`, compact) | `dashboard-week-agenda-empty` | `dashboard-week-agenda-empty-cta`, « Ajouter un événement » | `useOpenCreateEvent()`. Hors shell (null) : aucun bouton | non (compact) |
| Produits dashboard (`ProductList.tsx`, compact) | `dashboard-product-list-empty` | `dashboard-product-list-empty-cta` | `Link` → `/${locale}/products` | non (compact) |
| Carousel mobile (`ProductCarousel.tsx`, compact) | `dashboard-product-carousel-empty` | `dashboard-product-carousel-empty-cta` | `Link` → `/${locale}/products` | non (compact) |
| Agenda compact mobile (`CompactAgenda.tsx`, compact) | `dashboard-compact-agenda-empty` | `dashboard-compact-agenda-empty-cta` | `useOpenCreateEvent()`, absent hors shell | non (compact) |

Choix et écarts au plan :
- **Cadres.**
  - Frise : l'ancien cadre `border-dashed` devient un filet plein `border-rule` ; les pointillés sont désormais portés par la piste (un cadre pointillé autour de lanes pointillées aurait doublé le motif). `flex-1` est conservé.
  - Produits et catégories : cadre `border-rule rounded-lg border px-4`, le même que `products-loading` (#629).
- **Styles de CTA.** Pleins (`Button` par défaut) sur les surfaces pleine page ; `variant="outline" size="sm"` sur les surfaces compactes, même forme que `dashboard-open-timeline` (#624).
- **Textes.** Valeurs remplacées par des instructions sur les clés existantes : `shell.timeline.emptyTitle/emptyBody`, `products.list.empty`, `products.categories.empty`, `dashboard.week.empty`, `dashboard.productList.empty`. Clés ajoutées :
  - `emptyCta` pour chacune de ces surfaces ;
  - `products.list.clearSearch` ;
  - `dashboard.mobile.compactAgenda.emptyTitle` et `emptyCta`.
  - `compactAgenda.empty` n'est **pas** modifiée : elle sert aussi au sous-groupe « Aujourd'hui » vide (`CompactAgenda.tsx`), où une instruction serait déplacée.
  - Ton conservé par namespace : `shell` vouvoie (de : Sie), `products` et `dashboard` tutoient (de : du, es : tú). Rien sous `common.navigation`.
- **Couleur de piste = `rule-emphasis`, tier FONCTIONNEL, sur un élément décoratif.** Écart assumé à la règle des tiers de `ds/readme.md` : c'est la consigne du plan et le précédent `.mt-evt-connector`. En sombre, `rule` / `rule-strong` seraient quasi invisibles. Arbitrage Designer possible.
- **Live-regions.** Aucun parent en `role="status"` sur les 8 surfaces. Dans le dashboard, `role="status"` n'existe que dans la branche `loading` (`dashboard/page.tsx:112`) ; dans AppShell, seulement sur le spinner `app-shell-loading`. Sur mobile, les états vides agenda et carousel sont deux régions sœurs, non imbriquées.
- **Le CTA est à l'intérieur de la région `role="status"`** (structure existante d'`EmptyState`, non modifiée) : le lecteur d'écran annonce aussi le libellé du bouton. Non changé pour ne pas casser l'assertion `root role=status`.

## Fichiers de contexte lus
- `.ai-env/context-packs/pit-frontend.md` :
  - PIT-S41-005 (l.59) : lu ; appliqué, eslint joué sur les tests touchés.
  - PIT-S54-002 (l.137) : lu ; `timeline.spec.ts:160-167` lu dans le code, pas seulement grepé.
  - PIT-S63-006 (l.597) : lu ; appliqué, création de `empty-states.i18n.test.ts`, qui lit les vrais JSON (les tests de surface mockent `${ns}.${key}`).
  - PIT-S74-008 (l.872) et PIT-S75-002 (l.880) : lus ; toutes les commandes jouées sous `rtk proxy` avec code de sortie.
  - PIT-S78-001 (l.993) : lu ; les assertions de classes portent sur des jetons isolés (`border-dashed`, `border-rule-emphasis`, `flex-1`), jamais sur une chaîne contiguë.
  - PIT-S82-002 (l.1128) : lu ; non applicable, aucun seuil déduit.
  - PIT-S83-004 (l.1160) : lu ; `tsc --noEmit` joué.
  - PIT-S83-005 (l.1164) : lu ; `prettier --check` joué sur les 16 fichiers ts/tsx + 12 JSON.
  - PIT-S83-009 (l.1180) : lu ; aucune clé sous `common.navigation`, `language-selector.i18n.test.ts` joué.
  - PIT-S85-006 (l.1260) : lu ; grep des 10 nouveaux testids (`*-cta`, `timeline-empty-track`, `empty-state-track`) dans `src app e2e` → 0 occurrence avant écriture.
- `docs/memory/decisions.md` :
  - DEC-S82-004 (l.758, « suggestions non persistées, pas de seed ») : aucune catégorie semée ni suggérée.
  - DEC-S82-003 (l.755, « L'état de chargement nomme l'action en cours ») : lu, sans objet direct (états vides, pas de chargement).
- `frontend/src/styles/ds/readme.md` : l.40-60 (voix, casse de phrase, « Emoji: never », « empty/secondary text stays terse ») et l.62-110 (tiers de bordure, `rule-emphasis` non inversé en sombre).
- `frontend/src/styles/ds/components/timeline.css` : l.96-97 (`.mt-evt-connector{border-top:2px dashed … var(--color-rule-emphasis)}`).
- `frontend/src/styles/ds/tokens/spacing.css` : l.47 (`--lane-height: 46px`).
- `docs/memory/sprints/sprint-90/issue-624-done.md` et `issue-629-done.md` : lus en entier.
- `frontend/src/components/layout/CreateEventContext.tsx` (l.36, `useOpenCreateEvent` → null hors provider) et `AppShell.tsx` (l.206 status = spinner de chargement ; l.347 `CreateEventProvider` enveloppe `children`).

## Tests joués
Depuis `<worktree>/frontend`, via `rtk proxy`, code de sortie lu :
- `npx vitest run` sur 11 cibles, dont `src/components/dashboard` (répertoire entier) → **17 fichiers, 192/192 passés, exit=0**. Cibles :
  - `EmptyState.test.tsx`, `empty-states.i18n.test.ts` ;
  - `timeline/page.test.tsx`, `ProductsListView.test.tsx`, `CategoriesView.test.tsx` ;
  - `src/components/dashboard` ;
  - `i18n-namespaces.test.ts`, `language-selector.i18n.test.ts` ;
  - `dashboard/page.test.tsx`, `date-time-semantics.test.tsx`, `date-iso.local-date.test.tsx`.
- Tests ajoutés :
  - `EmptyState` : 3 (piste + `aria-hidden` + 3 lanes + aucun svg/img ; absente par défaut ; ignorée en compact) ;
  - `timeline/page` : 1 ;
  - `ProductsListView` : 2 (création ; effacer la recherche + focus) ;
  - `CategoriesView` : 1 ;
  - `dashboard-components` : 3 (WeekAgenda sous shell / hors shell, ProductList href `/de/products`) ;
  - `dashboard-mobile` : 3 (CompactAgenda sous shell / hors shell, carousel) ;
  - `empty-states.i18n` : 4 (1 par locale : 15 clés présentes, non vides, sans `\p{Extended_Pictographic}`).
- **Armement** : `track` → `track={false}` dans `timeline/page.tsx` → **1 failed | 6 passed, exit=1** (test #630). Retour arrière vérifié par `/usr/bin/grep -F` avant commit → 7/7, exit=0.
- `npx tsc --noEmit` → **exit=0**.
- `npx eslint <16 fichiers ts/tsx>` → **exit=0**.
- `npx prettier --check <16 fichiers + 12 JSON>` → **exit=0**. Avant, `--write` a reformaté 5 fichiers (les miens).
- Parité profonde des clés `shell` / `products` / `dashboard`, fr contre en/es/de (script node) → **OK, exit=0**.
- NON joués (interdits) : Playwright, `next build`, `test-quiet.sh`, `npm run format:check` global. **La garde des 15 clés est tenue à la main** : elle ne voit pas une faute de frappe de clé dans un composant.

## À vérifier par le lead
- **E2E modifiée, non jouée** : `frontend/e2e/timeline.spec.ts`, test « écran vide (aucun produit) ».
  - Nouvelles assertions : `timeline-empty-track` visible, `timeline-empty-cta` visible avec `href="/fr/products"`, puis clic → URL `/fr/products$` → `products-empty` et `products-empty-cta` visibles.
  - Hypothèse : la route `stubProductsList` (`page.route`) reste active après navigation et couvre le listing de `ProductsListView`. Même `GET /users/{id}/products` d'après #624, non vérifié au run.
- **Specs non modifiées susceptibles de bouger** (le bouton ajoute ~32 px de hauteur quand l'agenda est vide) :
  - `sprint-84-section-titles.spec.ts` : titres de section avant 800 px à 1280×800 ; mobile portrait, le titre du carousel descend si `CompactAgenda` est vide ;
  - `sprint-63-de-overflow-audit.spec.ts` (libellés DE : « Ereignis hinzufügen », « Produkt hinzufügen ») ;
  - `golden-path.spec.ts` ;
  - `sprint-73-tablet-sidebar.spec.ts`.
- **Couverture E2E** : 9 nouveaux testids ne sont cités par aucune spec. Cités par `timeline.spec.ts` : `timeline-empty-cta`, `timeline-empty-track`, `products-empty-cta`. Non cités :
  - `products-empty-search-cta`, `categories-empty-cta` ;
  - `dashboard-week-agenda-empty-cta`, `dashboard-compact-agenda-empty-cta` ;
  - `dashboard-product-list-empty-cta`, `dashboard-product-carousel-empty-cta`.
  - Risque de signalement coverage-e2e.
- **Navigateur, clair ET sombre** :
  1. `/fr/timeline` sans produit : 3 traits pointillés lisibles (`rule-emphasis` sur `bg` / `surface`), piste centrée au-dessus du titre, bloc qui occupe toujours la hauteur.
  2. Dashboard compte neuf, desktop et mobile : CTA compacts, contraste du bouton outline, pas de débordement à 375 px en allemand.
  3. `/fr/products` : recherche « zzz » → « Effacer la recherche » → liste revenue, focus dans le champ.
  4. Onglet Catégories vide (si atteignable : catégories système ?) → CTA ouvre le drawer.
  5. Agenda vide sur un compte SANS produit : « Ajouter un événement » ouvre le drawer, qui affiche `shell-new-event-drawer-empty` (BR-EVE-002).

## Signaux mémoire
- `[MEMORY:pattern] Problem: rendre un état vide actionnable sur une surface montée sous le shell ET testée hors shell. Solution: CTA branché sur useOpenCreateEvent(), rendu seulement si non null ; test sous CreateEventProvider (handler appelé) + test hors provider (aucun bouton). Anti-pattern: bouton toujours rendu avec onClick optionnel → bouton inerte.`
- `[MEMORY:pitfall] Context: #630, armement par mutation temporaire. Sous le hook, grep est aliasé vers rg : grep -c "track={false}" rend « 0 matches » sur erreur de regex (accolades lues comme quantificateur) alors que la mutation est présente. Solution: /usr/bin/grep -F pour vérifier un retour arrière. Prevention: tout contrôle « la mutation a disparu » passe par /usr/bin/grep -F, jamais par grep nu.`
- `[MEMORY:decision] Context: #630, EmptyState compact + track. Decision: track ignoré en compact. Why: colonnes étroites sous titre de section ; 3 lanes de 46 px écrasent le contenu, une lane réduite se lit comme un filet séparateur.`

## Recommandations suite
- `RECOMMAND_FOLLOWUP: dashboard.mobile.compactAgenda.empty (« Aucun événement aujourd'hui ni demain ») sert aussi au sous-groupe « Aujourd'hui » vide quand DEMAIN a des événements (CompactAgenda.tsx, branche todayEvents.length === 0) : libellé faux dans ce cas, clé dédiée « Rien aujourd'hui » à créer [XS | i18n/dashboard]`
- `RECOMMAND_FOLLOWUP: EmptyState place l'action DANS la région role="status" : le lecteur d'écran annonce aussi le libellé du bouton. Évaluer un role="status" sur le seul bloc texte (impact : assertions root role=status de EmptyState.test et des surfaces) [XS | a11y/design]`
- `RECOMMAND_FOLLOWUP: citer en E2E les 6 CTA d'états vides non couverts (recherche, catégories, 4 dashboard), ou les exempter de coverage-e2e [S | tests E2E]`
- `RECOMMAND_FOLLOWUP: arbitrage Designer sur la couleur de la piste vide (rule-emphasis, tier fonctionnel, sur un élément décoratif) [XS | design]`

STATUS: COMPLETED
