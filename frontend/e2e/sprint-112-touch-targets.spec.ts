import { type APIRequestContext, type Locator, type Page, type Route } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import {
  getUserId,
  gotoProducts,
  openCategoriesTab,
  seedCategory,
  seedProduct,
  todayIsoDate,
  unique,
} from './support/products'
import { revealSeededLane } from './support/timeline-lanes'
import { expectAllTouchable, expectClickableBox, expectHitbox } from './support/touch-targets'

/**
 * #767 (Sprint 112) — DERNIÈRES CIBLES TACTILES À 375 px (WCAG 2.5.5), clôture du
 * chantier ouvert par #754 (`sprint-101`) et poursuivi par #764 (`sprint-102`).
 *
 * MESURER D'ABORD (PAT-S99-001, PAT-S101-001) : cette spec est l'oracle ; une zone
 * n'est corrigée (via `src/lib/touchTarget.ts`, DEC-S101-003) que si elle mesure
 * moins de 44 px ici. Les chiffres relevés avant correction sont dans
 * `docs/memory/sprints/sprint-112/issue-767-830-done.md`.
 *
 * SURFACES (4) :
 *  1. `products-empty-cta` — état vide de la liste produits (`ProductsListView`) ;
 *  2. `categories-empty-cta` — état vide des catégories (`CategoriesView`) ;
 *     ces deux CTA sont des surfaces SPACIEUSES : oracle = boîte rendue de TOUS les
 *     contrôles de l'état vide (`expectAllTouchable`, profil complet) ;
 *  3. bouton « désarchiver » d'une ligne d'historique de la fiche produit
 *     (`product-detail-unarchive-<id>`, `ProductDetailView`) : rangée DENSE à
 *     pseudo-hitbox `::before` → zone cliquable prouvée par `elementFromPoint`
 *     (`expectHitbox`), un ancêtre qui rognerait le pseudo (PIT-S41-001) fait rougir ;
 *  4. déclencheur `⋯` de la frise portrait (`timeline-event-more`,
 *     `TimelineMobilePortrait`) : la BOÎTE porte la taille (`.mt-tlm__evt-more`
 *     44×44), pas de pseudo. Une boîte conforme peut être recouverte par la lane
 *     suivante (PIT-S91-003) : zone cliquable prouvée par `elementFromPoint` aux
 *     4 coins (`expectClickableBox`), jamais par la seule boîte.
 *
 * DONNÉES. États vides : listings GET stubbés (motif `sprint-90-first-contact`) —
 * « aucun produit / aucune catégorie » n'est pas un état déterministe du compte PROD,
 * partagé par le run. Aucun CTA n'est soumis. Fiche et frise : produit semé par API
 * sur PROD, purgé par la fixture AUTO de `support/fixtures.ts` (`trackSeed`), y
 * compris quand le test échoue. Aucun `register`, aucune connexion par formulaire
 * (budget rate-limit, PIT-S111-002).
 */

const MOBILE = { width: 375, height: 812 } as const
const BUDGET = 15_000
const API = '/api'

/** Profil COMPLET de `support/touch-targets.ts` (#768). */
const TOUCH = { tag: '#767' } as const

/** `GET /api/users/{userId}/products` — listing de `ProductsListView`. */
const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
/** `GET /api/categories` — `categoryService.getCategories` (`useCategories`). */
const CATEGORIES_LIST_RE = /\/api\/categories(\?.*)?$/

/** Stub d'un listing GET vide ; les écritures passent au réseau réel. */
async function stubEmptyList(page: Page, re: RegExp): Promise<void> {
  await page.route(re, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

interface ApiEvent {
  id: string
  archived?: boolean
  version?: number
}

async function fetchProductEvents(
  request: APIRequestContext,
  userId: string,
  productId: string,
): Promise<ApiEvent[]> {
  const res = await request.get(`${API}/users/${userId}/products/${productId}/events`)
  expect(res.ok(), `GET events doit réussir (obtenu ${res.status()})`).toBeTruthy()
  return (await res.json()) as ApiEvent[]
}

/** Sème produit + événement, puis ARCHIVE l'événement par API (motif `sprint-61`). */
async function seedArchivedEvent(page: Page): Promise<{ productId: string; eventId: string }> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('S112 Touch Cat'))
  const product = await seedProduct(page, {
    userId,
    name: unique('S112 Touch Prod'),
    categoryId: cat.id,
  })
  const [seeded] = await fetchProductEvents(page.request, userId, product.id)
  expect(seeded?.id, 'événement semé requis').toBeTruthy()
  const patch = await page.request.patch(`${API}/events/${seeded.id}`, {
    data: { archived: true, version: seeded.version },
  })
  expect(patch.status(), 'archivage par API doit réussir').toBe(200)
  return { productId: product.id, eventId: seeded.id }
}

/** `⋯` de l'occurrence semée (le compte PROD porte d'autres lanes). */
function seededEventMore(page: Page, title: string): Locator {
  return page
    .locator('.mt-tlm__evt-wrap')
    .filter({ has: page.locator(`[data-event-title="${title}"]`) })
    .getByTestId('timeline-event-more')
}

test.describe('#767 — dernières cibles tactiles (375 px)', () => {
  test.use({ viewport: MOBILE, storageState: PROD.storageState })

  test('produits : CTA de l’état vide', async ({ page }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE)
    await gotoProducts(page)
    const empty = page.getByTestId('products-empty')
    await expect(empty).toBeVisible({ timeout: BUDGET })
    await expect(page.getByTestId('products-empty-cta')).toBeVisible()
    await expectAllTouchable('ProductsListView (vide)', empty, 1, TOUCH)
  })

  test('catégories : CTA de l’état vide', async ({ page }) => {
    await stubEmptyList(page, CATEGORIES_LIST_RE)
    await openCategoriesTab(page)
    const empty = page.getByTestId('categories-empty')
    await expect(empty).toBeVisible({ timeout: BUDGET })
    await expect(page.getByTestId('categories-empty-cta')).toBeVisible()
    await expectAllTouchable('CategoriesView (vide)', empty, 1, TOUCH)
  })

  test('fiche produit : bouton « désarchiver » d’un événement archivé', async ({ page }) => {
    // Semis AVANT le premier chargement (staleTime 30 s, cf. `sprint-90`).
    const { productId, eventId } = await seedArchivedEvent(page)
    await ensureAuthenticated(page)
    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('product-detail-filter-archived').click({ timeout: BUDGET })
    await expect(page.getByTestId(`product-detail-history-row-${eventId}`)).toBeVisible({
      timeout: BUDGET,
    })
    await expectHitbox(
      'product-detail-unarchive',
      page.getByTestId(`product-detail-unarchive-${eventId}`),
      TOUCH,
    )
  })

  test('frise portrait : déclencheur ⋯ d’un événement', async ({ page }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)
    const userId = await getUserId(page)
    const productName = unique('S112 Touch TL')
    const cat = await seedCategory(page, unique('S112 Touch TL Cat'))
    await seedProduct(page, {
      userId,
      name: productName,
      categoryId: cat.id,
      eventDate: todayIsoDate(),
    })
    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-host')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('timeline-mobile-portrait')).toBeVisible({ timeout: BUDGET })
    await revealSeededLane(page, { category: cat.name, product: productName })
    // `seedProduct` donne à l'événement le nom du produit.
    await expectClickableBox('timeline-event-more', seededEventMore(page, productName), TOUCH)
  })
})

/**
 * Correctif `max-md:h-11` (`TOUCH_TARGET_BUTTON`) : au-dessus de 768 px, les CTA
 * d'état vide gardent la hauteur de la cva (`h-9` = 36 px). Un `max-md:` devenu
 * utilitaire nu ferait rougir (même garde que le bloc desktop de `sprint-101`).
 */
test.describe('#767 — desktop (1280×800) : CTA d’état vide inchangés', () => {
  test.use({ viewport: { width: 1280, height: 800 }, storageState: PROD.storageState })

  test('produits et catégories : CTA à 36 px', async ({ page }) => {
    await stubEmptyList(page, PRODUCTS_LIST_RE)
    await stubEmptyList(page, CATEGORIES_LIST_RE)
    await gotoProducts(page)
    const productsCta = page.getByTestId('products-empty-cta')
    await expect(productsCta).toBeVisible({ timeout: BUDGET })
    expect((await productsCta.boundingBox())?.height, 'products-empty-cta desktop').toBe(36)

    await openCategoriesTab(page)
    const categoriesCta = page.getByTestId('categories-empty-cta')
    await expect(categoriesCta).toBeVisible({ timeout: BUDGET })
    expect((await categoriesCta.boundingBox())?.height, 'categories-empty-cta desktop').toBe(36)
  })
})
