# Sprint 90 — Correctifs review cycle 1 (6 mineurs)

## Résumé

Base `7e5351b`. Quatre commits, un par tâche, chacun avec pathspec et vérifié par `git show --stat`.

| Finding | Correctif | Fichiers | Commit |
|---|---|---|---|
| 2 — CTA dans la région live | `EmptyState` : `role="status"` sur un bloc qui ne contient que le titre et la description, `action` rendue à côté, `testId` gardé sur la racine (qui n'a plus de rôle). L'espacement ne change pas : le bloc reprend le `gap-1`/`gap-3` de la racine. | `shared/EmptyState.tsx` + test ; 5 tests de surface passent de `root role=status` à `within(root).getByRole('status')` | `e04f7df` |
| 3 — `aria-busy` jamais retombé | `LoadingSkeleton` : `aria-busy` retiré. Le libellé `sr-only` reste dans la région `status`. Rien n'est posé sur la zone `aria-hidden` : un `aria-busy` y serait sans effet pour les aides techniques. `sprint-77-theme-visual` attend `[aria-busy="true"]` à 0, mais sur login/register, où il n'y a pas de squelette : pas d'impact. | `shared/LoadingSkeleton.tsx` + test ; 5 tests (`ProductsListView`, `CategoriesView`, `settings`/`products`/`timeline` `loading`, `timeline/page`) passent à `not.toHaveAttribute('aria-busy')` | `e04f7df` |
| 4 — focus sur `body` | `ProductDrawer` et `CategoryDrawer` reçoivent une prop `onCloseAutoFocus`, transmise telle quelle à `DialogContent`. Les deux vues notent l'origine de l'ouverture (`createFromEmptyRef`). Si le drawer a été ouvert depuis le CTA d'état vide : `preventDefault()` puis `focus()` sur `products-new-button` / `categories-new-button`. Ouvert depuis le bouton permanent : Radix garde la main. | `ProductsListView.tsx`, `CategoriesView.tsx`, `ProductDrawer.tsx`, `CategoryDrawer.tsx` + 4 tests | `e04f7df` |
| 5 — détour sans produit | Prop `canCreateEvent` sur `WeekAgenda` et `CompactAgenda`. Le CTA s'affiche seulement si `openCreateEvent && canCreateEvent`. `dashboard/page.tsx` calcule `canCreateEvent = products.length > 0` et le passe aux 3 montages. **Défaut `true`** : les montages qui ne connaissent pas les produits (tests, section-titles, intl) laissent le provider du shell décider seul. Le seul montage qui connaît les produits passe la valeur explicitement, et `page.test` vérifie cette transmission dans les 3 branches. | `WeekAgenda.tsx`, `CompactAgenda.tsx`, `dashboard/page.tsx` + `dashboard-components.test`, `dashboard-mobile.test`, `dashboard/page.test` | `d21235c` |
| 6 — libellé de création sur un lien | `dashboard.productList.emptyCta` : fr « Aller aux produits », en « Go to products », es « Ir a los productos », de « Zu den Produkten ». Pas de `?new=1`. Nouvelle garde i18n : ce libellé doit différer de `products.list.emptyCta` et de `products.list.newProduct` dans les 4 locales. | 4 × `dashboard.json`, commentaires `ProductList`/`ProductCarousel`, `empty-states.i18n.test.ts` | `ef5a1be` |
| 1 + suites de B | `sprint-84` : `h1.scrollWidth <= h1.clientWidth` remplace `box.x + width <= 375`. `sprint-90-first-contact` : chaque agenda (desktop et mobile) est joué deux fois, avec 1 produit sans événement (CTA → `event-form`, `-empty` absent) et sans produit (état vide sans CTA, CTA produits visible). | 2 specs | `d6f17e4` |

Tests de surface sur les libellés : les rendus mockent `next-intl` en `ns.key`, aucun n'assertait le texte, rien à adapter. Aucun spec E2E ne cite l'ancien libellé (grep `Ajouter un produit|Add a product|Añadir un producto|Produkt hinzufügen` sur `src app e2e` : vide).

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-90/specialists-reviewer-frontend.md` — l.6-11 (les 6 findings).
- `issue-630-done.md` — tableau des surfaces, recommandation « role=status sur le seul bloc texte ».
- `e2e-coverage-done.md` — stubs `PRODUCTS_LIST_RE`, compte PROD.
- `.ai-env/context-packs/pit-frontend.md`
  - l.60 PIT-S41-005 : eslint lancé sur chaque fichier de test.
  - l.137 PIT-S54-002 : témoins de rendu dans les nouvelles specs.
  - l.873 PIT-S74-008 : `rtk proxy` partout, base prettier vérifiée avant `--write`.
  - l.994 PIT-S78-001 : pas d'ancre de classes ajoutée.
  - l.1161 PIT-S83-004 : `tsc` lancé à chaque tâche. Il a attrapé le `const` réécrit par le hook.
  - l.1181 PIT-S83-009 : aucune clé `common.navigation` touchée.
  - l.1261 PIT-S85-006 : aucun testid ajouté côté produit ; `agenda-stub` n'existe que dans un mock de test.
- `frontend/src/styles/ds/a11y-audit.md` — l.144-145 (Toast/Sysbanner `role="status"`).
- Code vérifié par lecture :
  - `ui/dialog.tsx:32-44` (`DialogContent` transmet `...props`) ;
  - `ProductDrawer.tsx:237`, `CategoryDrawer.tsx:226` ;
  - `NewEventDrawer.tsx:122-124,173,232` (`showForm`, `-empty`, `EventEditForm`) ;
  - `EventEditForm.tsx:493` (`event-form`) ;
  - `types/product.ts:26-36` (forme du stub) ;
  - `ProductList.tsx:70` (`dashboard-product-list-row-<id>`), `ProductCarousel.tsx:83` ;
  - `GreetingHeader.tsx:44-56` ;
  - `timeline.spec.ts:345-372` : `-empty` ouvert par le bouton du shell sur `/timeline`, donc pas concerné par B ;
  - `sprint-77-theme-visual.spec.ts:509-518`.

## Tests joués
Depuis `<worktree>/frontend`, tout passe par `rtk proxy`.
- **A** — vitest sur 13 fichiers : **122/122, exit 0**. `tsc` exit 0 · `eslint` sur 18 fichiers exit 0 · `prettier --check` exit 1 sur `ProductsListView.tsx` (base `HEAD` conforme, diff = ma seule ligne) → `--write` sur ce fichier, puis exit 0, 18/18.
- **B** — premier run : 12 échecs dans `page.test`. Le hook PostToolUse avait réécrit `let dashboardData` en `const`, `tsc` a répondu TS2588. Corrigé avec un objet muable `dashboardState.data`. Ensuite : `page.test` **12/12**, `src/components/dashboard` + 2 fichiers date **137 tests verts**, `tsc`/`eslint`/`prettier` exit 0.
- **C** — `empty-states.i18n` + `src/components/dashboard` : **94/94, exit 0**. `tsc`/`eslint`/`prettier` (dont les 4 JSON) exit 0.
- **D** — `prettier`/`eslint` sur les 2 specs et `tsc` : exit 0.
- **Suite complète** (`rtk proxy npx vitest run`, après D) : **134 fichiers, 1646/1646, exit 0**. 5 blocs `stderr`, tous dans des fichiers non touchés : `DeleteConfirmDialog.intl`, `AccountSection` ×3, `exportService`. Je n'ai pas vérifié qu'ils existaient déjà sur la base.

Armement : mutation locale → vitest → restauration par `cp` depuis le scratchpad, vérifiée par `cmp`.

| Mutation | Résultat |
|---|---|
| A1 `role="status"` remis sur la racine, retiré du bloc message | **2 failed** / 8 (`EmptyState.test`), exit 1 |
| A2 `aria-busy="true"` remis | **2 failed** / 24 (`LoadingSkeleton` + `ProductsListView` squelette), exit 1 |
| A3 `preventDefault` + `focus` retirés de `ProductsListView` | **1 failed** / 18, exit 1 |
| A3 idem `CategoriesView` | **1 failed** / 10, exit 1 |
| A3 `onCloseAutoFocus` non transmis par `ProductDrawer` (Radix réel, jsdom) | **1 failed** / 14, exit 1 |
| B `&& canCreateEvent` retiré de `WeekAgenda` | **1 failed** / 12, exit 1 |
| B idem `CompactAgenda` | **1 failed** / 17, exit 1 |
| B `canCreateEvent = true` en dur dans la page | **3 failed** / 12 (les 3 branches), exit 1 |
| C fr remis à « Ajouter un produit » | **1 failed** / 8, exit 1 |

Retour au vert vérifié après chaque restauration.

Limite du test A3 de vue : le drawer y est mocké et rejoue la séquence Radix (`onOpenChange(false)`, puis `onCloseAutoFocus` sur un événement annulable). Que Radix appelle réellement le callback est prouvé à part, par le test de transmission (`ProductDrawer.test` / `CategoryDrawer.test`, Radix réel). L'enchaînement complet dans un vrai navigateur n'est PAS vérifié.

## Specs E2E modifiées NON jouées
- `frontend/e2e/sprint-84-section-titles.spec.ts` — test « le salut reste dans l'écran… ».
  - **Pourquoi `scrollWidth` rougit sans `break-words`.** Le `h1` est un bloc enfant de `header.flex.flex-col.min-w-0`. En `flex-col`, l'axe transversal est la largeur : l'item est étiré à la largeur du conteneur, et `min-width:auto` ne vaut que sur l'axe principal (la hauteur). Donc `clientWidth` = largeur du conteneur, quel que soit le texte. D'où la vacuité de l'ancienne mesure `box`.
  - Sans `overflow-wrap: break-word`, un jeton de 14 caractères ou plus plus large que la colonne n'a aucun point de coupure. Il déborde en `overflow: visible`, et `scrollWidth` d'un élément inclut ce débordement : `scrollWidth > clientWidth`, l'assertion rougit.
  - Avec `break-words`, le jeton est coupé dans la boîte, et `scrollWidth == clientWidth`.
  - Anti-vacuité conservée : précondition « jeton ≥ 14 » et `clientWidth > 0`.
  - Non vérifié : la largeur réelle du jeton à 375 px. Si 14 caractères en `text-md` tenaient dans ~343 px, le test serait vacant même sans `break-words` (même limite qu'avant).
- `frontend/e2e/sprint-90-first-contact.spec.ts` — 4 tests d'agenda (2 desktop, 2 mobile), qui en remplacent 2.
  - Le stub produit suit `productSchema` : `color` et `category.color` à `null`, `events: []`, ids UUID fictifs, jamais soumis.
  - Chaque cas attend `waitForResponse` du listing stubbé (enregistré avant `ensureAuthenticated`).
  - Le cas « avec produit » a un témoin de rendu : `dashboard-product-list-row-<id>` en desktop, `dashboard-product-carousel-card-<id>` en mobile. Il prouve que le stub est bien lu, puis `event-form` visible et `-empty` à 0.
  - **Pourquoi le cas « sans produit » ne passe pas à vide.** Avant le correctif, le CTA dépendait seulement du provider du shell, donc il était présent pendant le chargement ET après. Asserter `toHaveCount(0)` une fois `…-agenda-empty` visible (dashboard monté sous le shell) aurait rougi. L'inversion `canCreateEvent = true` est aussi couverte par le cas avec produit et par `page.test`.
  - Hypothèses non vérifiées au run :
    - `event-form` est visible sans attendre un autre appel réseau : les produits sont déjà en cache via la même query ;
    - le drawer ne passe pas par `shell-new-event-drawer-loading` : même clé de query que le dashboard.
- Specs qui citent les surfaces touchées (grep sur `e2e/`) : `timeline.spec.ts:165-180,351,371` et `sprint-66:105` (commentaire). Aucune ne passe par un CTA d'agenda ni par la racine `role=status` d'un état vide. Aucune n'a été jouée.
- Remarque : `frontend/e2e/zz-lead-s90-empty-probe.spec.ts` (non suivi au démarrage) n'apparaît plus dans `git status` à la fin. Je ne l'ai ni lu ni touché, il a sans doute été retiré par le lead.

## Signaux mémoire
- `[MEMORY:pitfall] Context: review S90, page.test.tsx. Un « let x = … » réassigné dans un beforeEach mais déclaré au niveau module (lu par un vi.mock) a été réécrit en « const » par le hook PostToolUse (autofix prefer-const, qui ne voit pas la réassignation dans un callback ?). Résultat : 12 tests rouges et tsc TS2588, alors que prettier et eslint étaient verts. Solution : holder muable « const state = { data } ». Prevention : pas de let module réassigné dans un fichier de test ; relire le fichier après tout avertissement « PostToolUse hook modified ».`
- `[MEMORY:pattern] Problem: rendre le focus quand le déclencheur d'un Dialog Radix se démonte (CTA d'état vide qui disparaît à la création). Solution: le drawer expose onCloseAutoFocus et le transmet à DialogContent ; l'appelant note l'origine de l'ouverture dans une ref, fait preventDefault puis focus() sur un bouton permanent seulement pour cette origine. Test en deux temps : Radix réel (rerender open=false → callback appelé), puis vue avec drawer mocké qui rejoue onOpenChange(false) + onCloseAutoFocus(Event annulable). Anti-pattern: focus() dans onOpenChange(false), écrasé ensuite par la restitution de FocusScope (setTimeout 0).`
- `[MEMORY:decision] Context: review S90, finding 5. Decision: canCreateEvent optionnel, défaut true, passé explicitement par dashboard/page.tsx et verrouillé par page.test (stubs qui exposent la prop). Why: prop requise = churn sur ~6 fichiers de test qui montent les agendas sans connaître les produits ; le défaut true garde le comportement #630 hors page.`
- `[MEMORY:pattern] Problem: rendre accessible un état vide avec action. Solution: role=status sur le message seul, action en frère de la région (EmptyState). Anti-pattern: région live qui contient un bouton, dont le libellé est annoncé avec le message.`

## Recommandations suite
- `RECOMMAND_TEST_RUNNER: jouer sprint-90-first-contact (4 tests d'agenda réécrits) et sprint-84-section-titles contre la pile du lead ; armer sprint-84 en retirant break-words de GreetingHeader.tsx:54 (doit rougir sur scrollWidth) [S | e2e]`
- `RECOMMAND_FOLLOWUP: vérifier au lecteur d'écran (VoiceOver) l'annonce des états vides (message sans libellé de bouton) et des squelettes (libellé annoncé sans aria-busy) — non vérifiable sous jsdom [XS | a11y]`

STATUS: COMPLETED
