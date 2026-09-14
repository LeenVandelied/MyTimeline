import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import {
  getUserId,
  gotoProducts,
  openCategoriesTab,
  seedCategory,
  seedProduct,
  unique,
} from './support/products'

/**
 * Sprint 90 — PREMIER CONTACT : états vides avec CTA (#630) et fallbacks de segment
 * `loading.tsx` (#629), exercés au RENDU et au COMPORTEMENT, pas seulement cités
 * ([[PIT-S54-002]] : un grep de testid n'atteste ni un usage ni un rendu).
 *
 * Testids couverts (10) :
 *   états vides : `categories-empty-cta`, `products-empty-search-cta`,
 *                 `dashboard-week-agenda-empty-cta`, `dashboard-product-list-empty-cta`,
 *                 `dashboard-compact-agenda-empty-cta`, `dashboard-product-carousel-empty-cta`
 *   squelettes  : `timeline-loading-skeleton`, `products-loading-skeleton`,
 *                 `product-detail-loading-skeleton`, `settings-loading-skeleton`
 *
 * Compte : PROD (storageState, zéro register). Le seul semis (produit du cas
 * « recherche vide » et de la fiche) passe par `support/products.ts`, purgé par la
 * fixture de `support/fixtures.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ÉTATS VIDES — pourquoi des stubs
 * ─────────────────────────────────────────────────────────────────────────────
 * PROD est alimenté par d'autres specs du même run : « aucun produit / aucune
 * catégorie » n'y est pas un état atteignable de façon déterministe. On stubbe donc
 * les GET de listing (motif `stubProductsList` de `timeline.spec.ts`) ; toute autre
 * méthode passe au réseau réel. Aucun CTA n'est soumis.
 *
 * Review S90 — agendas : le CTA « Ajouter un événement » n'existe QUE si l'utilisateur
 * a au moins un produit (sans produit, le drawer ne pouvait qu'expliquer BR-EVE-002).
 * Chaque agenda est donc joué deux fois : un produit SANS événement (CTA → vrai
 * formulaire), et aucun produit (état vide sans CTA).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FALLBACKS DE SEGMENT — la porte RSC
 * ─────────────────────────────────────────────────────────────────────────────
 * Un `loading.tsx` n'est peint que pendant une navigation CLIENT, le temps que le
 * payload RSC de la route cible arrive — quelques ms en local. Relevé réseau (sonde
 * du S90, `next start` 15.5) : au chargement du dashboard, les liens du shell sont
 * PRÉCHARGÉS (`GET /fr/<route>?_rsc=…`, en-têtes `rsc: 1` + `next-router-prefetch: 1`) ;
 * le clic émet ENSUITE une seconde requête `?_rsc=…` avec `rsc: 1` et SANS
 * `next-router-prefetch`. Le préchargement fournit la frontière `loading.tsx`, la
 * seconde requête porte la page. On laisse donc passer le préchargement (sans lui,
 * le routeur n'a aucun fallback à peindre) et on RETIENT la seconde jusqu'à
 * l'assertion. Aucune temporisation : l'état est stable tant que la porte est close.
 *
 * Le préchargement est ATTENDU avant le clic : un clic qui le devancerait naviguerait
 * sans frontière connue, et le squelette n'apparaîtrait jamais — un flake, pas un bug.
 *
 * FICHE PRODUIT — autre porte, parce qu'autre chemin. Le SEUL accès UI à
 * `/fr/products/<id>` est `router.push` au clic d'une ligne (`ProductsListView.tsx`),
 * sans `<Link>` donc sans préchargement. Retenir le RSC n'y peint RIEN (constaté au
 * premier run : requête retenue, squelette jamais monté) — le routeur ne connaît pas
 * encore la frontière. Ce qu'un utilisateur peut réellement voir est la fenêtre qui
 * SUIT l'arrivée du RSC : la page est un Client Component dont le chunk JS n'est pas
 * encore chargé, React suspend, et le `loading.tsx` du segment (livré dans ce même
 * payload) sert de fallback. On retient donc le chunk `page-<hash>.js` de la fiche.
 *
 * ⚠ Borne de la preuve : ce fallback-là n'est visible qu'au PREMIER chargement du chunk
 * (réseau lent). Une fois le chunk en cache, rouvrir une fiche ne montre plus rien.
 *
 * ⚠ Seed AVANT le premier chargement de page : `useProductsWithEvents` a un
 * `staleTime` de 30 s (`QueryProvider.tsx`) ; un listing lu avant le semis resterait
 * servi depuis le cache et masquerait le produit semé (constaté par la sonde).
 */

test.use({ storageState: PROD.storageState })

const DESKTOP = { width: 1280, height: 900 }
const MOBILE_PORTRAIT = { width: 390, height: 844 }

/** `GET /api/users/{userId}/products` — source de TOUT le dashboard (`useDashboardData`). */
const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
/** `GET /api/categories` — `categoryService.getCategories` (`useCategories`). */
const CATEGORIES_LIST_RE = /\/api\/categories(\?.*)?$/

/** Stub d'un listing GET (vide par défaut) ; les écritures passent au réseau réel. */
async function stubEmptyList(page: Page, re: RegExp, items: unknown[] = []): Promise<void> {
  await page.route(re, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    })
  })
}

/**
 * Review S90 — UN produit SANS événement, à la forme exacte de `productSchema`
 * (`src/types/product.ts` : `color` et `category.color` `.nullable()`, `events` tableau).
 * Un stub mal formé ne donnerait pas un état vide mais une erreur. Jamais soumis :
 * aucun événement n'est créé contre cet id fictif.
 */
const PRODUCT_WITHOUT_EVENTS = {
  id: '00000000-0000-7000-8000-000000000090',
  name: 'S90 produit sans événement',
  color: null,
  category: { id: '00000000-0000-7000-8000-000000000091', name: 'S90 catégorie', color: null },
  events: [],
}

/** Promesse résolue quand le listing produits (GET, stubbé) a répondu. */
function waitForProductsList(page: Page): Promise<unknown> {
  return page.waitForResponse(
    (res) => PRODUCTS_LIST_RE.test(res.url()) && res.request().method() === 'GET',
  )
}

/** Vrai pour une requête RSC vers `pathname` (préchargement OU navigation). */
function isRscFor(url: string, pathname: string): boolean {
  const parsed = new URL(url)
  return parsed.pathname === pathname && parsed.searchParams.has('_rsc')
}

interface RscGate {
  /** Résolue quand la requête de NAVIGATION (non préchargement) a été interceptée. */
  held: Promise<void>
  /** Libère la requête retenue. Idempotent. */
  release: () => void
}

/**
 * Retient les requêtes dont l'URL satisfait `matches` et que `hold` désigne ; les
 * autres requêtes appariées passent librement.
 */
async function gateRequests(
  page: Page,
  matches: (url: string) => boolean,
  hold: (headers: Record<string, string>) => boolean,
): Promise<RscGate> {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let markHeld: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    markHeld = resolve
  })
  await page.route(
    (url) => matches(url.toString()),
    async (route: Route) => {
      if (!hold(route.request().headers())) {
        await route.continue()
        return
      }
      markHeld()
      await gate
      await route.continue()
    },
  )
  return { held, release: () => release() }
}

/**
 * Retient la requête RSC de navigation vers `pathname`. Les préchargements
 * (`next-router-prefetch: 1`) passent librement.
 */
function gateRscNavigation(page: Page, pathname: string): Promise<RscGate> {
  return gateRequests(
    page,
    (url) => isRscFor(url, pathname),
    (headers) => headers['next-router-prefetch'] !== '1',
  )
}

/**
 * Chunk client de la PAGE fiche produit (`app/[locale]/(app)/products/[productId]/page-<hash>.js`,
 * crochets éventuellement encodés). Le chunk `loading-<hash>.js` du même segment
 * n'est PAS apparié : c'est lui qui doit arriver pour peindre le fallback.
 */
const PRODUCT_DETAIL_PAGE_CHUNK_RE =
  /\/_next\/static\/chunks\/app\/.*\/products\/(?:%5B|\[)productId(?:%5D|\])\/page-[^/]+\.js$/

/** Promesse résolue à la réponse du PRÉCHARGEMENT RSC de `pathname`. */
function waitForPrefetch(page: Page, pathname: string): Promise<unknown> {
  return page.waitForResponse(
    (res) =>
      isRscFor(res.url(), pathname) && res.request().headers()['next-router-prefetch'] === '1',
  )
}

/**
 * Le squelette est peint, porte au moins un item, et CHAQUE item a une hauteur
 * rendue non nulle (une lane `height: var(--lane-height)` sans token défini
 * mesurerait 0 : `toBeVisible` seul ne le verrait pas sur le conteneur).
 */
async function expectPaintedSkeleton(skeleton: Locator): Promise<void> {
  await expect(skeleton).toBeVisible()
  const items = skeleton.getByTestId('loading-skeleton-item')
  await expect(items.first()).toBeVisible()
  const heights = await items.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height),
  )
  expect(heights.length).toBeGreaterThan(0)
  for (const h of heights) expect(h).toBeGreaterThan(0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// #630 — États vides listants, desktop
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#630 — états vides avec CTA (desktop)', () => {
  test.use({ viewport: DESKTOP })

  test('catégories : liste vide → le CTA ouvre le drawer de création', async ({ page }) => {
    await stubEmptyList(page, CATEGORIES_LIST_RE)
    await openCategoriesTab(page)

    await expect(page.getByTestId('categories-empty')).toBeVisible()
    await expect(page.getByTestId('category-drawer')).toHaveCount(0)

    const cta = page.getByTestId('categories-empty-cta')
    await expect(cta).toBeVisible()
    await cta.click()

    await expect(page.getByTestId('category-drawer')).toBeVisible()
    // Mode création : champ nom vide, aucun bouton de suppression (réservé à l'édition).
    await expect(page.getByTestId('category-name-input')).toHaveValue('')
    await expect(page.getByTestId('category-delete-button')).toHaveCount(0)
  })

  test('produits : recherche sans résultat → le CTA vide le champ, rend le focus et la liste', async ({
    page,
  }) => {
    // Seed AVANT tout chargement de page (staleTime 30 s, cf. en-tête).
    const userId = await getUserId(page)
    const category = await seedCategory(page, unique('S90 Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S90 Prod'),
      categoryId: category.id,
    })

    await gotoProducts(page)
    const row = page.getByTestId(`products-row-${product.id}`)
    await expect(row).toBeVisible()

    const search = page.getByTestId('products-search-input')
    await search.fill(`zz-aucun-resultat-${Date.now()}`)

    await expect(page.getByTestId('products-empty-search')).toBeVisible()
    await expect(page.getByTestId('products-table')).toHaveCount(0)
    // Recherche vide ≠ aucun produit : pas de CTA de création ici.
    await expect(page.getByTestId('products-empty-cta')).toHaveCount(0)

    const cta = page.getByTestId('products-empty-search-cta')
    await expect(cta).toBeVisible()
    await cta.click()

    await expect(search).toHaveValue('')
    await expect(search).toBeFocused()
    await expect(page.getByTestId('products-empty-search')).toHaveCount(0)
    await expect(row).toBeVisible()
  })

  test('dashboard : un produit sans événement → le CTA de l’agenda ouvre le vrai formulaire', async ({
    page,
  }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE, [PRODUCT_WITHOUT_EVENTS])
    const listed = waitForProductsList(page)
    await ensureAuthenticated(page)
    await listed

    // Témoin : le produit stubbé est bien celui que lit le dashboard.
    await expect(
      page.getByTestId(`dashboard-product-list-row-${PRODUCT_WITHOUT_EVENTS.id}`),
    ).toBeVisible()
    await expect(page.getByTestId('dashboard-week-agenda-empty')).toBeVisible()
    await expect(page.getByTestId('shell-new-event-drawer')).toHaveCount(0)

    const cta = page.getByTestId('dashboard-week-agenda-empty-cta')
    await expect(cta).toBeVisible()
    await cta.click()

    await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible()
    await expect(page.getByTestId('event-form')).toBeVisible()
    await expect(page.getByTestId('shell-new-event-drawer-empty')).toHaveCount(0)
  })

  test('dashboard : aucun produit → agenda vide SANS CTA (l’action vit dans l’état vide produits)', async ({
    page,
  }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE)
    const listed = waitForProductsList(page)
    await ensureAuthenticated(page)
    await listed

    await expect(page.getByTestId('dashboard-week-agenda-empty')).toBeVisible()
    // L'action est portée par l'état vide produits voisin, rendu dans la même vue.
    await expect(page.getByTestId('dashboard-product-list-empty-cta')).toBeVisible()
    await expect(page.getByTestId('dashboard-week-agenda-empty-cta')).toHaveCount(0)
  })

  test('dashboard : aucun produit → le CTA mène à la liste produits', async ({ page }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE)
    await ensureAuthenticated(page)

    await expect(page.getByTestId('dashboard-product-list-empty')).toBeVisible()
    const cta = page.getByTestId('dashboard-product-list-empty-cta')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', '/fr/products')

    await cta.click()
    await page.waitForURL(/\/fr\/products$/)
    await expect(page.getByTestId('products-page')).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// #630 — États vides listants, mobile portrait
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#630 — états vides avec CTA (mobile portrait)', () => {
  // Viewport fixée AVANT `goto` : le dashboard choisit sa branche par `useMediaQuery`.
  test.use({ viewport: MOBILE_PORTRAIT })

  test('agenda compact vide, un produit sans événement → le CTA ouvre le vrai formulaire', async ({
    page,
  }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE, [PRODUCT_WITHOUT_EVENTS])
    const listed = waitForProductsList(page)
    await ensureAuthenticated(page)
    await listed
    await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()

    // Témoin : la carte du produit stubbé est rendue dans le carousel.
    await expect(
      page.getByTestId(`dashboard-product-carousel-card-${PRODUCT_WITHOUT_EVENTS.id}`),
    ).toBeVisible()
    await expect(page.getByTestId('dashboard-compact-agenda-empty')).toBeVisible()
    await expect(page.getByTestId('shell-new-event-drawer')).toHaveCount(0)

    const cta = page.getByTestId('dashboard-compact-agenda-empty-cta')
    await expect(cta).toBeVisible()
    await cta.click()

    await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible()
    await expect(page.getByTestId('event-form')).toBeVisible()
    await expect(page.getByTestId('shell-new-event-drawer-empty')).toHaveCount(0)
  })

  test('agenda compact vide, aucun produit → pas de CTA (l’action vit dans le carousel vide)', async ({
    page,
  }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE)
    const listed = waitForProductsList(page)
    await ensureAuthenticated(page)
    await listed
    await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()

    await expect(page.getByTestId('dashboard-compact-agenda-empty')).toBeVisible()
    await expect(page.getByTestId('dashboard-product-carousel-empty-cta')).toBeVisible()
    await expect(page.getByTestId('dashboard-compact-agenda-empty-cta')).toHaveCount(0)
  })

  test('carousel produits vide → le CTA mène à la liste produits', async ({ page }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE)
    await ensureAuthenticated(page)
    await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()

    await expect(page.getByTestId('dashboard-product-carousel-empty')).toBeVisible()
    const cta = page.getByTestId('dashboard-product-carousel-empty-cta')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', '/fr/products')

    await cta.click()
    await page.waitForURL(/\/fr\/products$/)
    await expect(page.getByTestId('products-page')).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// #629 — Fallbacks de segment `loading.tsx`
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#629 — squelettes de segment pendant une navigation client', () => {
  test.use({ viewport: DESKTOP })

  /**
   * Charge le dashboard, attend le préchargement de `pathname`, puis clique
   * `trigger` avec la navigation retenue. Rend la porte (déjà `held`).
   */
  async function navigateGated(
    page: Page,
    pathname: string,
    trigger: (p: Page) => Locator,
  ): Promise<RscGate> {
    const gate = await gateRscNavigation(page, pathname)
    const prefetched = waitForPrefetch(page, pathname)
    await ensureAuthenticated(page)
    await prefetched
    await trigger(page).click()
    await gate.held
    return gate
  }

  test('/fr/timeline : squelette en lanes peint, puis remplacé par la frise', async ({ page }) => {
    const gate = await navigateGated(page, '/fr/timeline', (p) =>
      p.getByTestId('shell-sidebar-nav-link-timeline'),
    )
    try {
      const skeleton = page.getByTestId('timeline-loading-skeleton')
      await expectPaintedSkeleton(skeleton)
      await expect(page.getByTestId('timeline-screen')).toHaveCount(0)
    } finally {
      gate.release()
    }
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    await expect(page.getByTestId('timeline-loading-skeleton')).toHaveCount(0)
  })

  test('/fr/products : squelette de liste peint, puis remplacé par la page', async ({ page }) => {
    const gate = await navigateGated(page, '/fr/products', (p) =>
      p.getByTestId('shell-sidebar-nav-link-products'),
    )
    try {
      await expectPaintedSkeleton(page.getByTestId('products-loading-skeleton'))
      await expect(page.getByTestId('products-page')).toHaveCount(0)
    } finally {
      gate.release()
    }
    await expect(page.getByTestId('products-page')).toBeVisible()
    await expect(page.getByTestId('products-loading-skeleton')).toHaveCount(0)
  })

  test('/fr/settings : squelette peint, puis remplacé par la page', async ({ page }) => {
    const gate = await navigateGated(page, '/fr/settings', (p) =>
      p.getByTestId('shell-sidebar-settings-link'),
    )
    try {
      await expectPaintedSkeleton(page.getByTestId('settings-loading-skeleton'))
      await expect(page.getByTestId('settings-page')).toHaveCount(0)
    } finally {
      gate.release()
    }
    await expect(page.getByTestId('settings-page')).toBeVisible()
    await expect(page.getByTestId('settings-loading-skeleton')).toHaveCount(0)
  })

  test('/fr/products/<id> depuis la liste : squelette de FICHE (pas celui de la liste)', async ({
    page,
  }) => {
    // Seed AVANT tout chargement de page (staleTime 30 s, cf. en-tête).
    const userId = await getUserId(page)
    const category = await seedCategory(page, unique('S90 Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S90 Fiche'),
      categoryId: category.id,
    })
    // Porte sur le CHUNK de la page, pas sur le RSC : cf. en-tête « Fiche produit ».
    const gate = await gateRequests(
      page,
      (url) => PRODUCT_DETAIL_PAGE_CHUNK_RE.test(url),
      () => true,
    )
    await gotoProducts(page)
    const row = page.getByTestId(`products-row-${product.id}`)
    await expect(row).toBeVisible()
    await row.click()
    await gate.held
    try {
      await expectPaintedSkeleton(page.getByTestId('product-detail-loading-skeleton'))
      // `[productId]/loading.tsx` existe pour que le squelette de LISTE ne soit pas hérité.
      await expect(page.getByTestId('products-loading-skeleton')).toHaveCount(0)
      await expect(page.getByTestId('product-detail-page')).toHaveCount(0)
    } finally {
      gate.release()
    }
    await expect(page.getByTestId('product-detail-view')).toBeVisible()
    await expect(page.getByTestId('product-detail-loading-skeleton')).toHaveCount(0)
  })
})
