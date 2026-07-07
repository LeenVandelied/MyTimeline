import { test, expect } from '@playwright/test'
import { PROD } from './support/accounts'
import {
  getUserId,
  seedCategory,
  seedProduct,
  gotoProducts,
  todayIsoDate,
  unique,
} from './support/products'

/**
 * #218 — Parcours E2E Produits (liste, détail, ProductDrawer).
 *
 * Couvre 3 des 7 critères d'acceptation de l'issue :
 *   5. Navigation liste -> détail produit et retour.
 *   6. Création d'un produit via le ProductDrawer depuis la page Produits.
 *   7. Édition d'un produit existant via le ProductDrawer.
 *
 * Auth : compte fixe PROD (storageState) -> ZÉRO register par test. État seedé par
 * API, parcours piloté via `data-testid` existants (#217).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 * Rappel Vague 1 : #207 corrigé -> run Playwright réel ; #41 corrigé -> produit
 * visible dans le listing. Les produits seedés portent un événement (visibilité
 * garantie + frise/historique non vides sur le détail).
 */

test.use({ storageState: PROD.storageState })

test.describe('#218 Produits — navigation & CRUD via ProductDrawer', () => {
  // Critère 5 — navigation liste -> détail -> retour.
  test('navigation liste vers détail produit et retour', async ({ page }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Nav Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Nav Prod'),
      categoryId: cat.id,
    })

    await gotoProducts(page)
    const row = page.getByTestId(`products-row-${product.id}`)
    await expect(row).toBeVisible()
    await expect(row).toContainText(product.name)

    // Clic ligne -> route détail imbriquée /fr/products/{id}.
    await row.click()
    await expect(page).toHaveURL(new RegExp(`/fr/products/${product.id}$`))
    await expect(page.getByTestId('product-detail-view')).toBeVisible()
    await expect(page.getByTestId('product-detail-card')).toContainText(product.name)
    await expect(page.getByTestId('product-detail-category')).toContainText(cat.name)

    // Retour liste via le bouton dédié.
    await page.getByTestId('product-detail-back').click()
    await expect(page.getByTestId('products-list-view')).toBeVisible()
    await expect(page.getByTestId(`products-row-${product.id}`)).toBeVisible()
  })

  // Critère 6 — création via le ProductDrawer.
  test('création d\'un produit via le ProductDrawer', async ({ page }) => {
    const cat = await seedCategory(page, unique('Create Cat'))
    const name = unique('Create Prod')

    await gotoProducts(page)
    await page.getByTestId('products-new-button').click()
    await expect(page.getByTestId('product-drawer-form')).toBeVisible()

    await page.getByTestId('product-name-input').fill(name)
    // Catégorie : Select Radix -> option seedée par testid (portail, pattern golden-path).
    await page.getByTestId('product-category-trigger').click()
    await page.getByTestId(`product-category-option-${cat.id}`).click()
    // Premier événement ponctuel (date du jour) : création couplée produit + event.
    await page.getByTestId('product-first-event-date').fill(todayIsoDate())
    await page.getByTestId('product-submit').click()

    // Drawer fermé + useCreateProduct invalide products.withEvents -> ligne visible.
    await expect(page.getByTestId('product-drawer-form')).toBeHidden()
    await expect(page.getByTestId('products-table')).toContainText(name)
  })

  // Critère 7 — édition via le ProductDrawer.
  test('édition d\'un produit existant via le ProductDrawer', async ({ page }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Edit Cat'))
    const original = unique('Edit Prod')
    const updated = `${original} MAJ`
    const product = await seedProduct(page, { userId, name: original, categoryId: cat.id })

    await gotoProducts(page)
    await expect(page.getByTestId(`products-row-${product.id}`)).toContainText(original)

    await page.getByTestId(`products-edit-${product.id}`).click()
    await expect(page.getByTestId('product-drawer-form')).toBeVisible()
    await expect(page.getByTestId('product-name-input')).toHaveValue(original)

    await page.getByTestId('product-name-input').fill(updated)
    await page.getByTestId('product-submit').click()

    // useUpdateProduct invalide products.withEvents -> la ligne reflète le nouveau nom.
    await expect(page.getByTestId('product-drawer-form')).toBeHidden()
    await expect(page.getByTestId(`products-row-${product.id}`)).toContainText(updated)
  })
})
