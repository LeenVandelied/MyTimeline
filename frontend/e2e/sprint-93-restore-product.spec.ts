import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, gotoProducts, seedCategory, seedProduct, unique } from './support/products'

/**
 * #711 (Sprint 93) — RESTAURER UN PRODUIT ARCHIVÉ : onglet « Archivés » de `/products`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT
 * ─────────────────────────────────────────────────────────────────────────────
 * Depuis #605, « Archiver » fait disparaître le produit de toute l'application, sans aucun
 * moyen de le retrouver : un archivage par erreur était sans issue.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE — et ce qui la fait ROUGIR
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Le dialog d'archivage dit que le produit reste récupérable (« Archivés »). Rougit si
 *      le texte promet encore une disparition sans retour.
 *   2. Onglet « Archivés » (3e onglet) : le produit archivé y est listé, SANS rechargement
 *      depuis l'archivage (rougit si `products.archived` n'est pas sous `products.all`).
 *   3. « Désarchiver » ouvre une confirmation ; ANNULER ne restaure rien (aucun POST).
 *   4. Confirmer : `POST …/restore` → 204, toast « Produit désarchivé », la ligne quitte
 *      l'onglet EN PLACE (PIT-S92-004).
 *   5. Onglet « Produits » SANS rechargement : le produit est de retour AVEC son événement
 *      (compteur ≥ 1). Un témoin seedé APRÈS le premier chargement de la liste prouve que la
 *      liste a été relue (pas un cache figé). Rougit si la restauration n'invalide pas
 *      `products.all`.
 *   6. Rechargement complet : le produit reste actif et n'est plus dans « Archivés ».
 *
 * CE QU'ELLE NE PROUVE PAS : l'IDOR et le 404 uniforme (produit d'autrui / non archivé) —
 * `ProductRestoreIntegrationTest` (backend, SQL natif réel) ; l'erreur inline du dialog
 * (`RestoreProductDialog.test.tsx`) ; les autres locales (`ArchivedProductsView.intl.test.tsx`) ;
 * l'état vide de l'onglet (compte PROD partagé : d'autres specs y laissent des archivés).
 *
 * ÉCRITURES : une catégorie + deux produits seedés (purge `seed-cleanup`).
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }
const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

async function openTab(page: Page, name: 'Produits' | 'Archivés') {
  await page
    .getByTestId('products-tabs')
    .getByRole('tab', { name })
    .click({ timeout: CLICK_BUDGET })
}

test.describe('#711 — restaurer un produit archivé (desktop)', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('archiver → onglet Archivés → Désarchiver (annuler puis confirmer) → produit et événement de retour sans rechargement', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)
    const userId = await getUserId(page)
    const category = await seedCategory(page, unique('711 Restore Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('711 Restore Prod'),
      categoryId: category.id,
    })

    await gotoProducts(page)
    await expect(page.getByTestId(`products-row-${product.id}`)).toBeVisible({
      timeout: FIRST_NAV_BUDGET,
    })

    // (1) Archivage depuis la liste : le dialog annonce un retour possible.
    await page.getByTestId(`products-archive-${product.id}`).click({ timeout: CLICK_BUDGET })
    const archiveDialog = page.getByRole('dialog').filter({ hasText: 'Archiver ce produit ?' })
    await expect(archiveDialog).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(
      archiveDialog,
      "#711 : l'archivage n'est plus définitif, le dialog doit dire où retrouver le produit",
    ).toContainText('« Archivés »')
    const archived = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/users/${userId}/products/${product.id}`) &&
        r.request().method() === 'DELETE',
    )
    await page.getByTestId('delete-confirm-button').click({ timeout: CLICK_BUDGET })
    expect((await archived).status()).toBe(204)
    await expect(page.getByTestId(`products-row-${product.id}`)).toHaveCount(0, {
      timeout: CLICK_BUDGET,
    })

    // Témoin seedé APRÈS le chargement de la liste : il n'apparaîtra au retour sur l'onglet
    // Produits que si la liste est relue.
    const witness = await seedProduct(page, {
      userId,
      name: unique('711 Restore Witness'),
      categoryId: category.id,
    })

    // (2) Onglet Archivés, sans rechargement.
    await openTab(page, 'Archivés')
    await expect(page.getByTestId('products-archived-view')).toBeVisible({ timeout: CLICK_BUDGET })
    const row = page.getByTestId(`products-archived-row-${product.id}`)
    await expect(
      row,
      "#711 : le produit archivé doit être listé dans l'onglet Archivés",
    ).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(row).toContainText(product.name)
    await expect(row).toContainText(category.name)

    // (3) Annuler ne restaure rien.
    let restoreCalls = 0
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes(`/products/${product.id}/restore`)) {
        restoreCalls += 1
      }
    })
    const restoreButton = page.getByTestId(`products-archived-restore-${product.id}`)
    await expect(restoreButton).toHaveText('Désarchiver')
    await restoreButton.click({ timeout: CLICK_BUDGET })
    const confirmDialog = page.getByTestId('product-restore-confirm')
    await expect(confirmDialog).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(confirmDialog).toContainText('Désarchiver ce produit ?')
    await expect(confirmDialog).toContainText(product.name)
    await page.getByTestId('product-restore-cancel').click({ timeout: CLICK_BUDGET })
    await expect(confirmDialog).toBeHidden({ timeout: CLICK_BUDGET })
    await expect(row).toBeVisible()
    expect(restoreCalls, 'annuler ne doit émettre aucun POST de restauration').toBe(0)

    // (4) Confirmer : 204, toast, ligne retirée en place.
    await restoreButton.click({ timeout: CLICK_BUDGET })
    await expect(confirmDialog).toBeVisible({ timeout: CLICK_BUDGET })
    const restored = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/users/${userId}/products/${product.id}/restore`) &&
        r.request().method() === 'POST',
    )
    await page.getByTestId('product-restore-confirm-button').click({ timeout: CLICK_BUDGET })
    expect((await restored).status(), 'POST restore doit renvoyer 204').toBe(204)
    await expect(
      page.locator('#_rht_toaster').getByRole('status').filter({ hasText: 'Produit désarchivé' }),
    ).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(confirmDialog).toBeHidden({ timeout: CLICK_BUDGET })
    await expect(
      row,
      'PIT-S92-004 : la ligne restaurée doit quitter l’onglet Archivés en place',
    ).toHaveCount(0, { timeout: CLICK_BUDGET })

    // (5) Onglet Produits sans rechargement : témoin (liste relue) + produit ET son événement.
    await openTab(page, 'Produits')
    await expect(page.getByTestId(`products-row-${witness.id}`)).toBeVisible({
      timeout: CLICK_BUDGET,
    })
    await expect(
      page.getByTestId(`products-row-${product.id}`),
      '#711 : le produit restauré doit réapparaître dans la liste sans rechargement',
    ).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(
      page.getByTestId(`products-row-events-count-${product.id}`),
      "#711 : l'événement du produit restauré doit revenir avec lui",
    ).toContainText('1')

    // (6) Rechargement complet : état persistant.
    await gotoProducts(page)
    await expect(page.getByTestId(`products-row-${product.id}`)).toBeVisible({
      timeout: FIRST_NAV_BUDGET,
    })
    await openTab(page, 'Archivés')
    await expect(page.getByTestId('products-archived-view')).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(
      page
        .getByTestId('products-archived-table')
        .or(page.getByTestId('products-archived-empty'))
        .first(),
    ).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId(`products-archived-row-${product.id}`)).toHaveCount(0)
  })
})
