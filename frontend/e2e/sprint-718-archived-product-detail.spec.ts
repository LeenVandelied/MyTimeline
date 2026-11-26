import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import {
  deleteProduct,
  getUserId,
  gotoProducts,
  seedCategory,
  seedProduct,
  unique,
} from './support/products'

/**
 * #718 — Parcours complet : un produit archivé s'ouvre depuis l'onglet « Archivés » sur une fiche
 * en lecture seule (bandeau, aucune action de modification), puis « Désarchiver » + confirmation
 * mène à la fiche active et à ses actions habituelles.
 *
 * Aucun composant mocké : produit semé et archivé par l'API (compte PROD, `storageState`), route
 * `GET /users/{userId}/products/archived/{productId}` réelle. Le produit n'est jamais laissé
 * archivé par ce test : il finit restauré, puis archivé à nouveau par le nettoyage.
 */

test.use({ storageState: sessionState(PROD) })

test.describe('#718 Fiche en lecture seule d’un produit archivé', () => {
  test('archived tab row opens read-only page, then restore lands on active page', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const category = await seedCategory(page, unique('S718 Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S718 Prod'),
      categoryId: category.id,
    })
    await deleteProduct(page, { userId, productId: product.id })

    try {
      // Onglet Archivés : le nom mène à la fiche.
      await gotoProducts(page)
      await page.getByTestId('products-tabs').getByRole('tab', { name: 'Archivés' }).click()
      const row = page.getByTestId(`products-archived-row-${product.id}`)
      await expect(row).toBeVisible()
      const link = row.getByRole('link', { name: product.name })
      await expect(link).toBeVisible({ timeout: 8_000 })
      await link.click()

      // Fiche en lecture seule, même adresse que le détail actif.
      await expect(page).toHaveURL(new RegExp(`/fr/products/${product.id}$`))
      await expect(page.getByTestId('product-detail-not-found')).toHaveCount(0)
      await expect(page.getByTestId('archived-product-detail-view')).toBeVisible()
      await expect(page.getByTestId('archived-product-detail-banner')).toBeVisible()
      await expect(page.getByTestId('archived-product-detail-name')).toContainText(product.name)
      await expect(page.getByTestId('archived-product-detail-category')).toContainText(
        category.name,
      )
      await expect(page.getByTestId('archived-product-detail-events')).toContainText(product.name)
      await expect(page.getByTestId('product-detail-edit')).toHaveCount(0)
      await expect(page.getByTestId('product-detail-archive')).toHaveCount(0)
      await expect(page.getByTestId('product-detail-new-event')).toHaveCount(0)

      // Restauration avec confirmation, puis fiche active et ses actions habituelles.
      await page.getByTestId('archived-product-detail-restore').click()
      await expect(page.getByTestId('product-restore-confirm')).toBeVisible()
      await page.getByTestId('product-restore-confirm-button').click()

      await expect(page).toHaveURL(new RegExp(`/fr/products/${product.id}$`))
      await expect(page.getByTestId('product-detail-card')).toContainText(product.name)
      await expect(page.getByTestId('archived-product-detail-view')).toHaveCount(0)
      await expect(page.getByTestId('product-detail-edit')).toBeVisible()
      await expect(page.getByTestId('product-detail-archive')).toBeVisible()
      await expect(page.getByTestId('product-detail-new-event')).toBeVisible()
    } finally {
      await deleteProduct(page, { userId, productId: product.id })
    }
  })
})
