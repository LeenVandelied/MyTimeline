import { test, expect } from '@playwright/test'
import { PROD } from './support/accounts'
import {
  getUserId,
  seedCategory,
  seedProduct,
  gotoProducts,
  openCategoriesTab,
  unique,
} from './support/products'

/**
 * #218 — Parcours E2E Catégories (CategoryDrawer + DeleteConfirmDialog).
 *
 * Couvre 4 des 7 critères d'acceptation de l'issue :
 *   1. Création d'une catégorie via le drawer -> apparition dans la liste.
 *   2. Édition d'une catégorie existante via le drawer.
 *   3. Suppression d'une catégorie SANS produits liés.
 *   4. Suppression d'une catégorie AVEC produits liés (flux de réassignation).
 *
 * Auth : compte fixe PROD (storageState, provisionné par `auth.setup.ts`) -> ZÉRO
 * register par test (anti rate-limit register 5/min/IP, cf. accounts.ts). État seedé
 * par API, parcours piloté à la souris via `data-testid` existants (#217).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 *
 * ⚠ Comportement RÉEL de l'API de réassignation (lu dans le code, NON supposé) :
 *   - `categoryService.deleteCategory(id, reassignToCategoryId?)` ->
 *     `DELETE /api/categories/{id}?reassignToCategoryId=<uuid>`.
 *   - AVEC produits liés + cible fournie -> 204, produits réassignés ATOMIQUEMENT
 *     vers la cible (backend `CategoryInUseException` seulement si cible absente -> 409).
 *   - `DeleteConfirmDialog` (#65) force le select de réassignation quand
 *     `linkedProductsCount > 0` (bouton confirmer désactivé tant qu'aucune cible),
 *     cible = toutes catégories SAUF celle supprimée (systèmes incluses).
 *
 * #245 — La suppression passe par `useDeleteCategory` (useMutation) qui invalide
 *   `categories.all` + `products.all` sur succès : la liste se rafraîchit SEULE, sans
 *   reload. Les assertions de disparition observent donc la vue courante directement.
 */

test.use({ storageState: PROD.storageState })

// DeleteConfirmDialog expose des data-testid stables (RF1 #218) : on cible ces
// hooks plutôt que des libellés i18n devinés (anti-fragilité, cf. fix CI e2e).
//   - `delete-confirm-button`  : bouton de confirmation de suppression.
//   - `delete-reassign-label`  : libellé du bloc de réassignation (rendu ssi produits liés).
//   - `delete-reassign-select` : trigger du <Select> de réassignation.

test.describe('#218 Catégories — CRUD via CategoryDrawer', () => {
  // Critère 1 — création via le drawer.
  test('création d\'une catégorie via le drawer apparaît dans la liste', async ({ page }) => {
    const name = unique('Cat Create')

    await openCategoriesTab(page)
    await page.getByTestId('categories-new-button').click()
    await expect(page.getByTestId('category-drawer-form')).toBeVisible()

    await page.getByTestId('category-name-input').fill(name)
    await page.getByTestId('category-swatch-#3E63DD').click()
    await page.getByTestId('category-submit').click()

    // Drawer fermé au succès + useCreateCategory invalide categories.all -> refetch.
    await expect(page.getByTestId('category-drawer-form')).toBeHidden()
    await expect(page.getByTestId('categories-view')).toContainText(name)
  })

  // Critère 2 — édition via le drawer.
  test('édition d\'une catégorie existante via le drawer', async ({ page }) => {
    const original = unique('Cat Edit')
    const updated = `${original} MAJ`
    const cat = await seedCategory(page, original)

    await openCategoriesTab(page)
    const card = page.getByTestId(`categories-card-${cat.id}`)
    await expect(card).toBeVisible()

    await card.click()
    await expect(page.getByTestId('category-drawer-form')).toBeVisible()
    await expect(page.getByTestId('category-name-input')).toHaveValue(original)

    await page.getByTestId('category-name-input').fill(updated)
    await page.getByTestId('category-submit').click()

    // useUpdateCategory invalide categories.all -> la carte reflète le nouveau nom.
    await expect(page.getByTestId('category-drawer-form')).toBeHidden()
    await expect(page.getByTestId(`categories-card-${cat.id}`)).toContainText(updated)
  })

  // Critère 3 — suppression SANS produits liés.
  test('suppression d\'une catégorie sans produits liés', async ({ page }) => {
    const cat = await seedCategory(page, unique('Cat Del'))

    await openCategoriesTab(page)
    await expect(page.getByTestId(`categories-card-${cat.id}`)).toBeVisible()

    await page.getByTestId(`categories-delete-${cat.id}`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // 0 produit lié -> ni libellé ni select de réassignation.
    await expect(page.getByTestId('delete-reassign-label')).toHaveCount(0)
    await expect(page.getByTestId('delete-reassign-select')).toHaveCount(0)

    await page.getByTestId('delete-confirm-button').click()

    // #245 : useDeleteCategory invalide categories.all -> la carte disparaît
    // automatiquement, SANS reload de la vue.
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId(`categories-card-${cat.id}`)).toHaveCount(0)
  })

  // Critère 4 — suppression AVEC produits liés + réassignation.
  test('suppression d\'une catégorie avec produits liés réassigne puis supprime', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const source = await seedCategory(page, unique('Source'), '#E5484D')
    const target = await seedCategory(page, unique('Target'), '#46A758')
    const product = await seedProduct(page, {
      userId,
      name: unique('Prod Reassign'),
      categoryId: source.id,
    })

    await openCategoriesTab(page)
    // linkedProductsCount dérivé du listing : la source compte bien 1 produit.
    await expect(page.getByTestId(`categories-count-${source.id}`)).toContainText('1')

    await page.getByTestId(`categories-delete-${source.id}`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Produits liés -> le bloc de réassignation est requis.
    await expect(page.getByTestId('delete-reassign-label')).toBeVisible()

    // Select de réassignation ciblé par data-testid stable (DeleteConfirmDialog).
    // Cible = uniquement `target` (la source est exclue des cibles).
    await page.getByTestId('delete-reassign-select').click()
    await page.getByRole('option', { name: target.name }).click()

    await page.getByTestId('delete-confirm-button').click()

    // #245 : useDeleteCategory invalide categories.all -> la source disparaît de la
    // vue courante SANS reload ; la cible demeure.
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId(`categories-card-${source.id}`)).toHaveCount(0)
    await expect(page.getByTestId(`categories-card-${target.id}`)).toBeVisible()

    // API réelle : produits de `source` réassignés atomiquement vers `target`.
    // Navigation vers la vue Produits (route distincte) pour vérifier la persistance.
    await gotoProducts(page)
    await expect(page.getByTestId(`products-row-category-${product.id}`)).toContainText(
      target.name,
    )
  })
})
