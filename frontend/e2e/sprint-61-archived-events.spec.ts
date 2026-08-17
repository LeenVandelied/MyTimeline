import { test, expect, type APIRequestContext } from '@playwright/test'
import { PROD } from './support/accounts'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #307 (Sprint 61) — E2E : un événement ARCHIVÉ reste atteignable, ré-ouvrable en
 * édition et DÉSARCHIVABLE depuis la vue détail produit (BR-EVE-013, option A).
 *
 * Ce que ce spec prouve, et que rien ne prouvait avant : `sprint-42-events.spec.ts`
 * (#232) devait se contenter d'asserter la DISPARITION de l'event archivé — « le
 * pré-remplissage n'est pas vérifiable : event archivé non réouvrable via la frise ».
 * L'état de vue « actifs / archivés / tous » livré par #307 rend ce critère testable :
 * on rouvre bien le formulaire PRÉ-REMPLI (titre + toggle archivé coché).
 *
 * Auth : compte fixe PROD (storageState) → ZÉRO register par test. État seedé par API
 * (y compris l'archivage : le toggle par l'UI est DÉJÀ couvert par #232, le rejouer ici
 * ne testerait rien de neuf et rallongerait le parcours). Sélecteurs `data-testid`
 * EXCLUSIVEMENT — jamais de texte i18n (4 locales, `localePrefix:'always'`).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres migré, front :3000.
 */

test.use({ storageState: PROD.storageState })

const API = '/api'

interface ApiEvent {
  id: string
  title: string
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

/**
 * Seede un produit + son event, puis ARCHIVE l'event par API (BR-EVE-013, PATCH-only).
 * Renvoie l'état serveur de départ, source de vérité du test.
 */
async function seedArchivedEvent(
  page: import('@playwright/test').Page,
  label: string,
): Promise<{ userId: string; productId: string; event: ApiEvent }> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique(`${label} Cat`))
  const product = await seedProduct(page, {
    userId,
    name: unique(`${label} Prod`),
    categoryId: cat.id,
  })
  const [seeded] = await fetchProductEvents(page.request, userId, product.id)
  expect(seeded?.id, 'event seedé requis').toBeTruthy()
  expect(seeded.archived ?? false, 'event seedé non archivé au départ').toBe(false)

  const patch = await page.request.patch(`${API}/events/${seeded.id}`, {
    data: { archived: true, version: seeded.version },
  })
  expect(patch.status(), 'archivage par API doit réussir').toBe(200)

  const [archived] = await fetchProductEvents(page.request, userId, product.id)
  expect(archived.archived, 'event archivé côté serveur').toBe(true)
  return { userId, productId: product.id, event: archived }
}

test.describe('#307 Events archivés — retrouver, ré-éditer, désarchiver', () => {
  test('un event archivé est retrouvable puis ré-ouvert PRÉ-REMPLI en édition', async ({
    page,
  }) => {
    const { productId, event } = await seedArchivedEvent(page, 'Reopen')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('product-detail-view')).toBeVisible()

    // Vue par défaut « actifs » : l'archivé reste masqué (comportement historique).
    await expect(page.getByTestId('product-detail-timeline-empty')).toBeVisible()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toHaveCount(0)

    // Bascule sur « archivés » : l'event redevient atteignable, historique ET frise.
    await page.getByTestId('product-detail-filter-archived').click()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()
    await expect(page.getByTestId('timeline-event')).toHaveCount(1)

    // Réouverture en édition depuis la frise (TimelineEditHost) : formulaire PRÉ-REMPLI.
    // C'est le critère de #232 resté non testable jusqu'ici.
    await page.getByTestId('timeline-event').first().click()
    await page.getByTestId('event-drawer-edit').click()
    await expect(page.getByTestId('event-form')).toBeVisible()
    await expect(page.getByTestId('event-form-title-input')).toHaveValue(event.title)
    await expect(page.getByTestId('event-form-archived-toggle')).toBeChecked()
  })

  test('désarchiver depuis la vue « archivés » remet l’event dans les actifs', async ({ page }) => {
    const { userId, productId, event } = await seedArchivedEvent(page, 'Unarchive')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('product-detail-filter-archived').click()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()

    // Anti-flaky : on ASSERTE le statut du PATCH avant de juger le DOM.
    const patch = page.waitForResponse(
      (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
    )
    await page.getByTestId(`product-detail-unarchive-${event.id}`).click()
    expect((await patch).status(), 'PATCH de désarchivage doit réussir').toBe(200)

    // Source de vérité serveur (indépendante du DOM).
    const after = await fetchProductEvents(page.request, userId, productId)
    expect(after.find((e) => e.id === event.id)?.archived, 'archived repassé à false').toBe(false)

    // UI : l'event quitte la vue « archivés » (invalidation TanStack) et revient en actifs.
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toHaveCount(0)
    await page.getByTestId('product-detail-filter-active').click()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()
    await expect(page.getByTestId('timeline-event')).toHaveCount(1)
  })

  test('la vue « tous » montre actifs et archivés ensemble', async ({ page }) => {
    const { productId, event } = await seedArchivedEvent(page, 'AllView')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('product-detail-filter-all').click()

    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()
    await expect(page.getByTestId('product-detail-filter')).toBeVisible()
    await expect(page.getByTestId('timeline-event')).toHaveCount(1)
  })
})
