import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #621 (Sprint 92) — TOASTS DE CONFIRMATION SUR LES SURFACES MÉTIER, RENDU DS UNIQUE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT
 * ─────────────────────────────────────────────────────────────────────────────
 * Créer ou modifier un événement refermait le drawer SANS aucun retour. Et deux
 * mécanismes de toast coexistaient : le `ToastBar` par défaut de react-hot-toast
 * (hors DS) et `ui/toast.tsx` (DS, zéro consommateur).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE — et ce qui la fait ROUGIR
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Création (desktop) : un `role="status"` portant « Événement créé » apparaît
 *      dans `#_rht_toaster`, avec la classe DS `.mt-toast--success`. Rougit si le
 *      toast manque, ou s'il est rendu par le `ToastBar` par défaut (pas de `.mt-toast`).
 *   2. Pile : le `z-index` CALCULÉ du conteneur égale `--z-toast` résolu (jeton consommé).
 *   3. Non bloquant : `pointer-events` calculé = `none` sur le toast.
 *   4. Modification (desktop, depuis la frise du détail produit) : « Événement modifié ».
 *   5. Mobile (390px) : le toast ne recouvre PAS le bouton flottant « Nouvel événement ».
 *
 * CE QU'ELLE NE PROUVE PAS : l'annonce réelle par un lecteur d'écran ; l'archivage
 * (couvert unitairement, `TimelineEditHost.test.tsx`) ; produit / catégorie
 * (unitaires `ProductDrawer.test.tsx` / `CategoryDrawer.test.tsx`).
 *
 * FENÊTRE : un toast success vit 4 s (+1 s de retrait). Les assertions suivent
 * immédiatement la réponse réseau ; elles ne dépendent d'aucun délai fixe.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }
const MOBILE_PORTRAIT = { width: 390, height: 844 }

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** Le toast DS portant `text`, cherché DANS l'hôte unique (`#_rht_toaster`). */
function businessToast(page: Page, text: string): Locator {
  return page.locator('#_rht_toaster').getByRole('status').filter({ hasText: text })
}

async function seed(page: Page, label: string) {
  await neutralizeDevToolingPointerEvents(page)
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique(`621 ${label} Cat`))
  const product = await seedProduct(page, {
    userId,
    name: unique(`621 ${label} Prod`),
    categoryId: cat.id,
  })
  return { userId, product }
}

/** Remplit le drawer de création (produit + titre) et soumet ; attend le POST 2xx. */
async function createEventThroughDrawer(page: Page, productId: string, title: string) {
  const panel = page.getByTestId('shell-new-event-drawer')
  await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
  await page.getByTestId('shell-new-event-drawer-product-trigger').click({ timeout: CLICK_BUDGET })
  await page.getByTestId(`product-option-${productId}`).click({ timeout: CLICK_BUDGET })
  await page.getByTestId('event-form-title-input').fill(title)

  const created = page.waitForResponse(
    (r) => r.url().includes('/api/events') && r.request().method() === 'POST',
  )
  await page.getByTestId('event-form-submit').click({ timeout: CLICK_BUDGET })
  expect((await created).status(), 'POST /api/events doit créer (2xx)').toBeLessThan(300)
  await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })
}

test.describe('#621 — toasts métier (desktop)', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('création d’un événement : toast DS « Événement créé », au jeton --z-toast, non bloquant', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { product } = await seed(page, 'Create')

    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })

    await createEventThroughDrawer(page, product.id, unique('621 Event Desktop'))

    // (1) Le toast existe, rendu par le DS.
    const toast = businessToast(page, 'Événement créé')
    await expect(toast, 'LE DÉFAUT DE #621 : aucune confirmation après création').toBeVisible()
    await expect(toast).toHaveClass(/(^|\s)mt-toast--success(\s|$)/)
    await expect(toast).toHaveAttribute('data-testid', 'app-toast')

    // (2) Pile : z-index calculé du conteneur = `--z-toast` résolu.
    const layers = await page.evaluate(() => {
      const host = document.getElementById('_rht_toaster')
      return {
        computed: host ? getComputedStyle(host).zIndex : null,
        token: getComputedStyle(document.documentElement).getPropertyValue('--z-toast').trim(),
      }
    })
    expect(layers.token, '`--z-toast` doit être défini par le DS').not.toBe('')
    expect(layers.computed, 'le conteneur doit consommer `--z-toast`').toBe(layers.token)

    // (3) Non bloquant.
    expect(await toast.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
  })

  test('modification d’un événement depuis la frise : toast « Événement modifié »', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { userId, product } = await seed(page, 'Edit')

    const listed = await page.request.get(`/api/users/${userId}/products/${product.id}/events`)
    expect(listed.ok(), `GET events doit réussir (obtenu ${listed.status()})`).toBeTruthy()
    const [seeded] = (await listed.json()) as Array<{ id: string; title: string }>
    expect(seeded?.id, 'événement seedé requis').toBeTruthy()

    await page.goto(`/fr/products/${product.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await page
      .locator(`[data-testid="timeline-event"][data-event-title="${seeded.title}"]`)
      .first()
      .click({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

    const dialog = page.getByTestId('timeline-edit-dialog')
    await expect(dialog).toBeVisible({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-form-title-input').fill(unique('621 Edited'))

    const patched = page.waitForResponse(
      (r) => r.url().includes(`/api/events/${seeded.id}`) && r.request().method() === 'PATCH',
    )
    await page.getByTestId('event-form-submit').click({ timeout: CLICK_BUDGET })
    expect((await patched).status(), 'PATCH /api/events/{id} doit réussir').toBe(200)
    await expect(dialog).toBeHidden({ timeout: CLICK_BUDGET })

    const toast = businessToast(page, 'Événement modifié')
    await expect(toast, 'LE DÉFAUT DE #621 : aucune confirmation après modification').toBeVisible()
    await expect(toast).toHaveClass(/(^|\s)mt-toast--success(\s|$)/)
  })
})

test.describe('#621 — toasts métier (mobile portrait)', () => {
  test.use({ storageState: PROD.storageState, viewport: MOBILE_PORTRAIT })

  test('le toast de création ne recouvre pas le bouton flottant « Nouvel événement »', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { product } = await seed(page, 'Mobile')

    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    const fab = page.getByTestId('shell-mobile-new-event-button')
    await fab.click({ timeout: CLICK_BUDGET })

    await createEventThroughDrawer(page, product.id, unique('621 Event Mobile'))

    const toast = businessToast(page, 'Événement créé')
    await expect(toast).toBeVisible()
    await expect(fab).toBeVisible()

    const toastBox = await toast.boundingBox()
    const fabBox = await fab.boundingBox()
    expect(toastBox, 'le toast doit avoir une boîte').not.toBeNull()
    expect(fabBox, 'le FAB doit avoir une boîte').not.toBeNull()
    if (!toastBox || !fabBox) return
    const overlaps =
      toastBox.x < fabBox.x + fabBox.width &&
      fabBox.x < toastBox.x + toastBox.width &&
      toastBox.y < fabBox.y + fabBox.height &&
      fabBox.y < toastBox.y + toastBox.height
    expect(
      overlaps,
      `le toast (${JSON.stringify(toastBox)}) ne doit pas recouvrir le FAB (${JSON.stringify(fabBox)})`,
    ).toBe(false)
    // Le toast reste dans la largeur du viewport (aucun débordement horizontal).
    expect(toastBox.x).toBeGreaterThanOrEqual(0)
    expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(MOBILE_PORTRAIT.width)
  })
})
