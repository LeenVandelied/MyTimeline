import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, gotoProducts, seedCategory, seedProduct, unique } from './support/products'

/**
 * #605 (Sprint 92) — DÉTAIL PRODUIT : « Nouvel événement » prérempli et « Archiver ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT
 * ─────────────────────────────────────────────────────────────────────────────
 * Handoff §5 : actions Nouvel événement / Éditer / Archiver. Le détail n'exposait que
 * « Modifier » et « Supprimer » : aucun chemin de création depuis la fiche, et
 * « Supprimer » déclenchait un soft delete (#50, BR-PRO-007) — le mot contredisait l'acte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE — et ce qui la fait ROUGIR
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Ordre des actions : Nouvel événement · Modifier · Archiver.
 *   2. « Nouvel événement » ouvre LE drawer du shell avec CE produit sélectionné et sa
 *      catégorie dérivée. Rougit si le prérempli est perdu (sélecteur vide).
 *   3. Le bouton du shell rouvre ensuite un drawer VIERGE (le prérempli ne fuit pas).
 *   4. « Archiver » : le dialog dit « Archiver ce produit ? », son bouton dit « Archiver »,
 *      aucun « supprim… » ; la confirmation archive (DELETE 204), revient à la liste et
 *      affiche le toast « Produit archivé ».
 *   5. « Archiver » DEPUIS LE DRAWER D'ÉDITION (`product-drawer-archive`, ouvert depuis la
 *      liste) : même vocabulaire (titre + bouton), DELETE 204, toast « Produit archivé »,
 *      drawer refermé, et le produit n'est plus listé (liste RECHARGÉE, avec un produit
 *      témoin visible pour que l'absence ne soit pas vacante).
 *
 * CE QU'ELLE NE PROUVE PAS : les autres locales (unitaires) ; le formulaire du drawer
 * produit hors archivage (unitaires `ProductDrawer.test.tsx` / `ProductsListView.test.tsx`) ;
 * le retrait de la ligne SANS rechargement (ni la liste ni le drawer n'invalident la query
 * `products.withEvents` après `deleteProduct` — non asserté ici, signalé au lead) ; le cas
 * « liste de produits en cours de chargement » (unitaire `NewEventDrawer.test.tsx`).
 *
 * ÉCRITURES : une catégorie + un produit seedés par test (purge `seed-cleanup`, qui
 * accepte le 404 d'un produit déjà archivé par le test).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }
const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

async function seedAndOpenDetail(page: Page, label: string) {
  await neutralizeDevToolingPointerEvents(page)
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  const category = await seedCategory(page, unique(`605 ${label} Cat`))
  const product = await seedProduct(page, {
    userId,
    name: unique(`605 ${label} Prod`),
    categoryId: category.id,
  })

  await page.goto(`/fr/products/${product.id}`, {
    waitUntil: 'domcontentloaded',
    timeout: FIRST_NAV_BUDGET,
  })
  await expect(page.getByTestId('product-detail-card')).toContainText(product.name, {
    timeout: FIRST_NAV_BUDGET,
  })
  return { userId, category, product }
}

test.describe('#605 — actions du détail produit (desktop)', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('« Nouvel événement » ouvre le drawer du shell avec CE produit sélectionné', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { category, product } = await seedAndOpenDetail(page, 'New')

    // (1) Ordre du handoff §5.
    const newEvent = page.getByTestId('product-detail-new-event')
    await expect(newEvent).toBeVisible({ timeout: CLICK_BUDGET })
    const order = await newEvent.evaluate((el) =>
      Array.from(el.parentElement?.children ?? []).map((child) =>
        child.getAttribute('data-testid'),
      ),
    )
    expect(order).toEqual([
      'product-detail-new-event',
      'product-detail-edit',
      'product-detail-archive',
    ])

    // (2) Prérempli : produit ET catégorie dérivée.
    await newEvent.click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(
      page.getByTestId('shell-new-event-drawer-product-trigger'),
      'LE DÉFAUT DE #605 : le produit de la fiche doit être présélectionné',
    ).toContainText(product.name)
    await expect(page.getByTestId('shell-new-event-drawer-category')).toContainText(category.name)

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })

    // (3) Le déclencheur du shell rouvre un drawer vierge.
    await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('shell-new-event-drawer-product-trigger')).not.toContainText(
      product.name,
    )
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })
  })

  test('« Archiver » : confirmation qui dit archiver, retour liste et toast', async ({ page }) => {
    test.setTimeout(120_000)
    const { userId, product } = await seedAndOpenDetail(page, 'Archive')

    const archive = page.getByTestId('product-detail-archive')
    await expect(archive).toHaveText('Archiver')
    await archive.click({ timeout: CLICK_BUDGET })

    // (4) Le vocabulaire du dialog suit le soft delete.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(dialog.getByText('Archiver ce produit ?')).toBeVisible()
    const confirm = page.getByTestId('delete-confirm-button')
    await expect(confirm).toHaveText('Archiver')
    await expect(
      dialog,
      'LE DÉFAUT DE #605 : aucun « supprimer » pour un archivage',
    ).not.toContainText(/supprim/i)

    const archived = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/users/${userId}/products/${product.id}`) &&
        r.request().method() === 'DELETE',
    )
    await confirm.click({ timeout: CLICK_BUDGET })
    expect((await archived).status(), 'DELETE produit (soft delete) doit renvoyer 204').toBe(204)

    await expect(page).toHaveURL(/\/fr\/products$/, { timeout: CLICK_BUDGET })
    await expect(
      page.locator('#_rht_toaster').getByRole('status').filter({ hasText: 'Produit archivé' }),
    ).toBeVisible({ timeout: CLICK_BUDGET })
  })

  test('« Archiver » depuis le drawer d’édition : confirmation qui dit archiver, toast, produit retiré', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)
    const userId = await getUserId(page)
    const category = await seedCategory(page, unique('605 DrawerArchive Cat'))
    // Produit DÉDIÉ (archivé par ce test) + témoin (reste listé : l'absence n'est pas vacante).
    const product = await seedProduct(page, {
      userId,
      name: unique('605 DrawerArchive Prod'),
      categoryId: category.id,
    })
    const witness = await seedProduct(page, {
      userId,
      name: unique('605 DrawerArchive Witness'),
      categoryId: category.id,
    })

    await gotoProducts(page)
    await expect(page.getByTestId(`products-row-${product.id}`)).toBeVisible({
      timeout: FIRST_NAV_BUDGET,
    })
    await page.getByTestId(`products-edit-${product.id}`).click({ timeout: CLICK_BUDGET })

    const drawerArchive = page.getByTestId('product-drawer-archive')
    await expect(drawerArchive).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(drawerArchive).toHaveText('Archiver')
    await drawerArchive.click({ timeout: CLICK_BUDGET })

    // Deux dialogs Radix sont montés (drawer + confirmation) : on cible la confirmation.
    const confirmDialog = page.getByRole('dialog').filter({ hasText: 'Archiver ce produit ?' })
    await expect(confirmDialog).toBeVisible({ timeout: CLICK_BUDGET })
    const confirm = page.getByTestId('delete-confirm-button')
    await expect(confirm).toHaveText('Archiver')
    await expect(
      confirmDialog,
      'LE DÉFAUT DE #605 : aucun « supprimer » pour un archivage',
    ).not.toContainText(/supprim/i)

    const archived = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/users/${userId}/products/${product.id}`) &&
        r.request().method() === 'DELETE',
    )
    await confirm.click({ timeout: CLICK_BUDGET })
    expect((await archived).status(), 'DELETE produit (soft delete) doit renvoyer 204').toBe(204)

    await expect(
      page.locator('#_rht_toaster').getByRole('status').filter({ hasText: 'Produit archivé' }),
    ).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(drawerArchive, 'le drawer d’édition se referme après archivage').toBeHidden({
      timeout: CLICK_BUDGET,
    })

    // Liste RECHARGÉE : le témoin prouve qu'elle est peinte, le produit archivé en est absent.
    await gotoProducts(page)
    await expect(page.getByTestId(`products-row-${witness.id}`)).toBeVisible({
      timeout: FIRST_NAV_BUDGET,
    })
    await expect(page.getByTestId(`products-row-${product.id}`)).toHaveCount(0)
  })
})
