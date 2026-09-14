# Sprint 90 — Couverture E2E des testids neufs (Phase 8)

## Résumé

Spec unique : `frontend/e2e/sprint-90-first-contact.spec.ts` (1 commit, `Refs #624 #629 #630` — `git log -1 -- frontend/e2e/sprint-90-first-contact.spec.ts`). Compte `PROD` (storageState, zéro register, seeds purgés par `support/fixtures.ts`). Aucun fichier applicatif modifié.

| testid | Test | Technique | Preuve de comportement |
|---|---|---|---|
| `categories-empty-cta` | desktop 1280 | stub `GET /api/categories` → `[]` (`categoryService.getCategories`) | `categories-empty` visible → clic → `category-drawer` visible, `category-name-input` vide, `category-delete-button` absent (mode création). Non soumis. |
| `products-empty-search-cta` | desktop | seed réel catégorie+produit AVANT tout chargement de page, recherche `zz-aucun-resultat-<ts>` | `products-empty-search` visible, `products-table` et `products-empty-cta` absents → clic → champ `''`, `toBeFocused`, ligne du produit semé revisible |
| `dashboard-week-agenda-empty-cta` | desktop | stub `GET /api/users/{id}/products` → `[]` (source unique `useDashboardData`) | drawer absent → clic → `shell-new-event-drawer` visible + `shell-new-event-drawer-empty` (BR-EVE-002) |
| `dashboard-product-list-empty-cta` | desktop | même stub | `href="/fr/products"` → clic → URL `/fr/products`, `products-page` visible |
| `dashboard-compact-agenda-empty-cta` | 390×844 (`test.use` avant goto) | même stub | `dashboard-mobile-portrait` visible, drawer absent → clic → `shell-new-event-drawer` visible |
| `dashboard-product-carousel-empty-cta` | 390×844 | même stub | `href="/fr/products"` → clic → navigation + `products-page` |
| `timeline-loading-skeleton` | desktop, clic `shell-sidebar-nav-link-timeline` | porte RSC (voir ci-dessous) | squelette visible, chaque `loading-skeleton-item` hauteur > 0, `timeline-screen` absent ; libération → `timeline-screen` visible, squelette absent |
| `products-loading-skeleton` | clic `shell-sidebar-nav-link-products` | porte RSC | idem, cible `products-page` |
| `settings-loading-skeleton` | clic `shell-sidebar-settings-link` | porte RSC | idem, cible `settings-page` |
| `product-detail-loading-skeleton` | clic ligne `products-row-<id>` (produit semé) | porte sur le CHUNK `page-<hash>.js` de `[productId]` | squelette de fiche peint (items > 0), `products-loading-skeleton` et `product-detail-page` absents ; libération → `product-detail-view` visible |

**Porte RSC — relevé réseau réel (sonde temporaire, supprimée)** : sur `next start` 15.5.25, le dashboard précharge les liens du shell (`GET /fr/<route>?_rsc=…`, `rsc: 1` + `next-router-prefetch: 1`) ; le clic émet une seconde requête `?_rsc=…` `rsc: 1` SANS `next-router-prefetch`. La spec laisse passer le préchargement (il porte la frontière `loading.tsx`), l'attend (`waitForResponse`) avant le clic, et retient la seconde jusqu'à l'assertion. Aucun `waitForTimeout`.

**Fiche produit — écart à la technique imposée.** Retenir le RSC de `/fr/products/<id>` ne peint RIEN (1er run rouge : requête retenue, squelette jamais monté) : le seul accès UI est `router.push` (`ProductsListView.tsx:130`), sans `<Link>` donc sans préchargement, le routeur ne connaît pas la frontière. La fenêtre réellement visible pour un utilisateur est celle qui SUIT le RSC : chunk JS du Client Component page non chargé → suspension → fallback `loading.tsx` du segment. Porte déplacée sur `/_next/static/chunks/app/…/products/[productId]/page-<hash>.js` (le chunk `loading-<hash>.js` passe). Borne : ce fallback n'est visible qu'au premier chargement du chunk.

Endpoints stubbés (GET seulement, autres méthodes au réseau réel) : `/api/users/{id}/products`, `/api/categories`.

## Fichiers de contexte lus

- `.ai-env/context-packs/pit-frontend.md` — PIT-S54-002 (l.137 « Un `grep` de testid n'atteste NI un usage réel NI un rendu ») : chaque testid asserté `toBeVisible` + effet du clic ; armement ci-dessous.
- `pit-frontend.md` — PIT-S58-003 (l.314) et PIT-S88-009 (l.1348) : oracles joués avant tout (`/api/auth/me` 401, `/fr/login` 200) ; pile non touchée.
- `pit-frontend.md` — PIT-S82-005 (l.1140, check coverage compte les fichiers de test) : lu ; les 10 testids sont des surfaces produit réelles (vérifié dans le code, pas dans les rapports).
- `pit-frontend.md` — PIT-S74-008 (l.872) : `rtk proxy` sur prettier/eslint/tsc/playwright/vitest, `exit=` relevé.
- `pit-frontend.md` — PIT-S83-001 (l.1148, clic sur bouton non hydraté) : lu ; tous les CTA n'apparaissent qu'après résolution d'une query client (donc hydratés).
- `frontend/e2e/support/accounts.ts` — l.342 `export const PROD = makeAccount('prod', 'pr')` (compte des parcours produits/catégories).
- `frontend/e2e/support/auth.ts` — l.105 `ensureAuthenticated` (goto dashboard + `dashboard` visible).
- `frontend/e2e/support/products.ts` — `getUserId`, `seedCategory`, `seedProduct`, `unique`, `gotoProducts`, `openCategoriesTab`.
- `frontend/e2e/support/fixtures.ts` — fixture auto de purge des seeds.
- `frontend/e2e/timeline.spec.ts:58-91` — `stubProductsList` / `stubProductsListGated` (motif repris).
- `frontend/e2e/sprint-66-mobile-create-event.spec.ts` — viewport par `test.use` avant `goto`.
- `frontend/playwright.config.ts` — projets `setup`/`chromium`, `workers: 2`.
- `frontend/src/__tests__/e2e-rate-limit-budget.test.ts` + `backend/src/main/resources/application-e2e.properties:52,74` (register 30/min en e2e) : spec sans register/login → aucune mise à jour.
- Code vérifié : `CategoriesView.tsx:103-120`, `ProductsListView.tsx:130,139-143,230-250`, `WeekAgenda.tsx:294-316`, `ProductList.tsx:401-417`, `CompactAgenda.tsx:557-578`, `ProductCarousel.tsx:666-680`, `dashboard/page.tsx` (branches ternaires desktop/portrait/paysage), `AppShell.tsx:137-143,251-310,345-395`, `CreateEventContext.tsx`, `NewEventDrawer.tsx:149,173`, `CategoryDrawer.tsx:234,269,385`, `LoadingSkeleton.tsx` (item `loading-skeleton-item` dans les 3 variantes), les 4 `loading.tsx`, `QueryProvider.tsx:28` (`staleTime: 30_000`), `.next/app-build-manifest.json` (chunks `[productId]/page` et `/loading`).
- `docs/memory/sprints/sprint-90/issue-629-done.md`, `issue-630-done.md`.

## Tests joués

Depuis `<worktree>/frontend`, pile du lead (oracles 401 / 200 vérifiés au départ) :
`SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test sprint-90-first-contact --ignore-snapshots --reporter=line`

- run 0 (version initiale) : 14 passed / 1 failed — fiche produit (porte RSC inopérante, cf. Résumé) → porte chunk.
- run fiche seule (`-g "FICHE"`) : 6 passed (5 setup + 1).
- **run 1 : 15 passed (4.8s), exit 0** · **run 2 : 15 passed (5.8s), exit 0** · **run 3 : 15 passed (4.9s), exit 0** — 15 = 5 tests `setup` + 10 tests de la spec. 0 flaky, 0 retry (retries=0 hors CI).
- run 4 (après armement 1, fichier d'armement supprimé) : 15 passed (5.0s) · run 5 (après armement 2) : 15 passed (5.2s).

Armement — copies mutées générées par script (chaque remplacement vérifié à 1 occurrence exacte), jouées puis supprimées, spec committée jamais modifiée :
| Mutation | Résultat | Lecture |
|---|---|---|
| M1 CTA recherche rendu inerte (listener `click` en capture sur `document` + `stopImmediatePropagation`) | **ROUGE** `toHaveValue("")` reçu `"zz-aucun-resultat-1789385714008"` | l'assertion de comportement porte |
| M2 CTA agenda semaine inerte (idem) | **ROUGE** `shell-new-event-drawer` not found | idem |
| M4 testid squelette settings faux (`-ARMING`) | **ROUGE** not found | locator non vacant |
| M6 `timeline-loading-skeleton` retiré du DOM à l'insertion (MutationObserver via `addInitScript`) | **ROUGE** not found | l'assertion rougit si le squelette disparaît |
| M3 porte timeline relâchée AVANT l'assertion | **VERT** | ⚠ ne discrimine pas : le fallback reste peint assez longtemps pour le premier sondage `toBeVisible` en local |
| M5 fiche sans porte chunk | **VERT** | ⚠ idem : en local le squelette est visible sans porte |

M3/M5 verts = les portes ne sont PAS ce qui rend le squelette observable en local ; elles garantissent la stabilité de l'état (runners plus rapides, CI) pendant les mesures de hauteur et les `toHaveCount(0)` de la cible. La preuve « le squelette existe et rougit s'il disparaît » est M4 + M6.

Statiques (fichier final) : `rtk proxy npx prettier --check e2e/sprint-90-first-contact.spec.ts` exit 0 (après un `--write` sur ce seul fichier) · `rtk proxy npx eslint e2e/sprint-90-first-contact.spec.ts` exit 0 · `rtk proxy npx tsc --noEmit` exit 0 · `rtk proxy npx vitest run src/__tests__/e2e-rate-limit-budget.test.ts` 37/37 exit 0.

NON vérifié : exécution en CI Linux (`workers: 2`, pile `next build` CI) ; comportement des portes sous Firefox (spec non incluse dans le projet firefox) ; spec jouée seule, pas dans la suite complète (pollution inter-specs non mesurée — les stubs sont par page, le seul semis est purgé).

## Signaux mémoire

- `[MEMORY:pitfall] Contexte : E2E d'un loading.tsx de route atteinte par router.push (fiche produit, ProductsListView). Retenir la requête RSC ?_rsc= de navigation ne peint aucun fallback : sans <Link> il n'y a pas de préchargement, le routeur ignore la frontière loading. Solution : retenir le chunk client /_next/static/chunks/app/.../page-<hash>.js (le chunk loading-<hash>.js doit passer) — la page Client Component suspend après l'arrivée du RSC. Prévention : avant de geler un loading.tsx, identifier le déclencheur réel (Link préchargé vs router.push) ; le RSC ne se gate que dans le premier cas.`
- `[MEMORY:pattern] Problème : figer un fallback loading.tsx atteint par un <Link> du shell sur next start. Solution : page.route sur pathname + _rsc, laisser passer next-router-prefetch: 1, ATTENDRE la réponse du préchargement avant le clic, retenir la requête rsc: 1 sans en-tête prefetch, asserter, libérer. Anti-pattern : retenir aussi le préchargement (plus de frontière → pas de squelette) ou cliquer avant qu'il réponde (flake).`
- `[MEMORY:pitfall] Contexte : spec qui seede un produit puis ouvre une page. useProductsWithEvents a staleTime 30 s (QueryProvider.tsx:28) : un listing lu AVANT le semis (ensureAuthenticated charge le dashboard) reste servi depuis le cache et le produit semé n'apparaît pas. Solution : getUserId/seed via page.request AVANT le premier goto. Prévention : semer avant toute navigation authentifiée.`
- `[MEMORY:pitfall] Contexte : armement « porte relâchée avant l'assertion » d'un squelette de segment. Reste VERT en local : le fallback est encore peint au premier sondage toBeVisible. Solution : armer en retirant le nœud (MutationObserver en addInitScript) ou par testid faux. Prévention : ne pas présenter « porte relâchée » comme preuve que la porte est nécessaire.`

## Recommandations suite

- `RECOMMAND_FOLLOWUP: précharger la fiche produit au survol/focus d'une ligne (router.prefetch) dans ProductsListView — aujourd'hui le squelette de fiche n'apparaît que pendant le chargement du chunk JS au premier accès, et la navigation garde l'ancien écran pendant tout l'aller-retour RSC [XS | produits/chargement]`

STATUS: COMPLETED
