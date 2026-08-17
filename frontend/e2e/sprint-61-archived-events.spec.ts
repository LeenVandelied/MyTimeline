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

/**
 * #230 (Sprint 61) — UX de l'archivage : confirmation mentionnant l'effet sur le quota
 * d'events actifs (BR-EVE-011), grisage dans la frise, et verrouillage des champs
 * d'édition tant que `archived=true` (BR-EVE-013).
 *
 * Contrairement à #307, l'archivage est ici fait PAR L'UI (c'est le parcours testé) ;
 * le désarchivage par bouton reste couvert par #307.
 */
test.describe('#230 UX de l’archivage — confirmation, grisage, verrou', () => {
  test('un event archivé apparaît GRISÉ dans la frise (pas seulement absent)', async ({ page }) => {
    const { productId } = await seedArchivedEvent(page, 'Greyed')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('product-detail-filter-all').click()

    // Le critère est « grisé plutôt qu'absent » : la pastille EXISTE et se déclare
    // archivée. Assertion sur l'attribut (état), pas sur une couleur calculée — un
    // ratio de contraste ne se mesure pas depuis un locator (cf. PIT-S58-001).
    const pill = page.getByTestId('timeline-event').first()
    await expect(pill).toBeVisible()
    await expect(pill).toHaveAttribute('data-archived', 'true')
    await expect(pill).toHaveClass(/--archived/)
  })

  test('archiver depuis l’UI demande une confirmation, annulable, qui parle du quota', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Confirm Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Confirm Prod'),
      categoryId: cat.id,
    })
    const [seeded] = await fetchProductEvents(page.request, userId, product.id)
    expect(seeded.archived ?? false, 'event seedé actif au départ').toBe(false)

    await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('timeline-event').first().click()
    await page.getByTestId('event-drawer-edit').click()
    await expect(page.getByTestId('event-form')).toBeVisible()

    // 1) Cocher « archivé » ouvre la confirmation, qui énonce l'effet quota
    //    (BR-EVE-011), la réversibilité (BR-EVE-013) et la lecture seule.
    await page.getByTestId('event-form-archived-toggle').click()
    await expect(page.getByTestId('event-archive-confirm')).toBeVisible()
    await expect(page.getByTestId('event-archive-confirm-reversible')).toBeVisible()
    await expect(page.getByTestId('event-archive-confirm-readonly')).toBeVisible()

    // 2) Annuler ne change RIEN : ni le toggle, ni le verrou.
    await page.getByTestId('event-archive-cancel').click()
    await expect(page.getByTestId('event-archive-confirm')).toHaveCount(0)
    await expect(page.getByTestId('event-form-archived-toggle')).not.toBeChecked()
    await expect(page.getByTestId('event-form-title-input')).toBeEnabled()

    // 3) Confirmer verrouille les champs et affiche l'explication textuelle.
    await page.getByTestId('event-form-archived-toggle').click()
    await page.getByTestId('event-archive-confirm-button').click()
    await expect(page.getByTestId('event-form-archived-toggle')).toBeChecked()
    await expect(page.getByTestId('event-form-archived-lock-note')).toBeVisible()
    await expect(page.getByTestId('event-form-title-input')).toBeDisabled()
    // Le désarchivage reste possible : le toggle et le submit restent actionnables.
    await expect(page.getByTestId('event-form-archived-toggle')).toBeEnabled()
    await expect(page.getByTestId('event-form-submit')).toBeEnabled()

    // 4) Le PATCH part et l'event quitte les actifs (source de vérité = serveur).
    const patch = page.waitForResponse(
      (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
    )
    await page.getByTestId('event-form-submit').click()
    expect((await patch).status(), 'PATCH d’archivage doit réussir').toBe(200)

    const after = await fetchProductEvents(page.request, userId, product.id)
    expect(after.find((e) => e.id === seeded.id)?.archived, 'archived passé à true').toBe(true)
    // BR-EVE-011 (non-régression) : le compteur d'actifs ne compte plus cet event.
    await expect(page.getByTestId('product-detail-filter-active')).toContainText('0')
  })
})
