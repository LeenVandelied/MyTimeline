import type { Locator } from '@playwright/test'

import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #617 (Sprint 86) — CHAMP CATÉGORIE DU FORMULAIRE D'ÉVÉNEMENT, DÉRIVÉ DU PRODUIT.
 *
 * DEC-S86-001 : la catégorie d'un événement est celle de son produit, NON surchargeable.
 * Le champ est une valeur en lecture seule (pas de `Select`), rendue par
 * `EventCategoryField` sur les deux surfaces de la coque `EventFormDrawer`.
 *
 * CE QUE LA SPEC PROUVE (moteur réel + backend réel, là où les tests unitaires mockent
 * `useProductsWithEvents` et le view-model de la frise) :
 *   1. création : avant tout choix, état vide explicite ; choisir un produit affiche la
 *      catégorie de CE produit avec sa couleur PEINTE ; changer de produit la fait suivre ;
 *   2. création : le champ est au-dessus du sélecteur de produit ;
 *   3. édition depuis la frise du détail produit : la catégorie du produit est affichée,
 *      pastille à la couleur de la catégorie.
 *
 * TESTIDS introduits par #617 et cités ici (garde coverage-E2E) :
 *   `shell-new-event-drawer-category`, `shell-new-event-drawer-category-swatch`,
 *   `timeline-edit-dialog-category`, `timeline-edit-dialog-category-swatch`.
 *
 * CE QU'ELLE NE PROUVE PAS : le contraste clair/sombre du champ (non mesuré ici).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 800 }
const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** Couleurs de catégorie distinctes, hex → valeur calculée par le moteur. */
const COLOR_A = { hex: '#C2410C', rgb: 'rgb(194, 65, 12)' }
const COLOR_B = { hex: '#0F766E', rgb: 'rgb(15, 118, 110)' }

const paintedBackground = (swatch: Locator) =>
  swatch.evaluate((el) => getComputedStyle(el).backgroundColor)

test.describe('#617 — catégorie dérivée du produit dans le formulaire d’événement', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('création : la catégorie suit le produit choisi', async ({ page }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)

    const userId = await getUserId(page)
    const catA = await seedCategory(page, unique('617 Cat A'), COLOR_A.hex)
    const catB = await seedCategory(page, unique('617 Cat B'), COLOR_B.hex)
    const productA = await seedProduct(page, {
      userId,
      name: unique('617 Prod A'),
      categoryId: catA.id,
    })
    const productB = await seedProduct(page, {
      userId,
      name: unique('617 Prod B'),
      categoryId: catB.id,
    })

    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: FIRST_NAV_BUDGET })

    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })

    const field = page.getByTestId('shell-new-event-drawer-category')
    const trigger = page.getByTestId('shell-new-event-drawer-product-trigger')
    await expect(field).toBeVisible()

    // ── (1) état vide explicite, rôle et nom accessibles ─────────────────────
    await expect(field).toHaveAttribute('data-empty', 'true')
    await expect(field).toHaveText(/Choisissez d'abord un produit/)
    await expect(page.getByRole('group', { name: 'Catégorie' })).toHaveCount(1)
    await expect(page.getByTestId('shell-new-event-drawer-category-swatch')).toHaveCount(0)

    // ── (2) position : au-dessus du sélecteur de produit ─────────────────────
    const fieldBox = await field.boundingBox()
    const triggerBox = await trigger.boundingBox()
    expect(fieldBox, 'le champ Catégorie doit avoir une boîte').not.toBeNull()
    expect(triggerBox, 'le déclencheur Produit doit avoir une boîte').not.toBeNull()
    expect(fieldBox!.y + fieldBox!.height).toBeLessThanOrEqual(triggerBox!.y)

    // ── (3) produit A → catégorie A, couleur peinte ──────────────────────────
    await trigger.click({ timeout: CLICK_BUDGET })
    await page.getByTestId(`product-option-${productA.id}`).click({ timeout: CLICK_BUDGET })
    const swatch = page.getByTestId('shell-new-event-drawer-category-swatch')
    await expect(field).toHaveAttribute('data-empty', 'false')
    await expect(field).toContainText(catA.name)
    await expect.poll(() => paintedBackground(swatch)).toBe(COLOR_A.rgb)

    // ── (4) produit B → la catégorie SUIT ────────────────────────────────────
    await trigger.click({ timeout: CLICK_BUDGET })
    await page.getByTestId(`product-option-${productB.id}`).click({ timeout: CLICK_BUDGET })
    await expect(field).toContainText(catB.name)
    await expect(field).not.toContainText(catA.name)
    await expect.poll(() => paintedBackground(swatch)).toBe(COLOR_B.rgb)
  })

  test('édition depuis la frise : la catégorie du produit est affichée', async ({ page }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)

    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('617 Edit Cat'), COLOR_A.hex)
    // `seedProduct` couple un premier événement au produit : c'est lui qu'on éditera.
    const product = await seedProduct(page, {
      userId,
      name: unique('617 Edit Prod'),
      categoryId: cat.id,
    })

    await page.goto(`/fr/products/${product.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })

    await page.getByTestId('timeline-event').first().click({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

    const dialog = page.getByTestId('timeline-edit-dialog')
    await expect(dialog).toBeVisible({ timeout: CLICK_BUDGET })

    const field = dialog.getByTestId('timeline-edit-dialog-category')
    await expect(field).toBeVisible()
    await expect(field).toHaveAttribute('data-empty', 'false')
    await expect(field).toContainText(cat.name)
    await expect
      .poll(() => paintedBackground(dialog.getByTestId('timeline-edit-dialog-category-swatch')))
      .toBe(COLOR_A.rgb)

    // Premier bloc du corps : au-dessus du titre du formulaire.
    const fieldBox = await field.boundingBox()
    const titleBox = await page.getByTestId('event-form-title-input').boundingBox()
    expect(fieldBox).not.toBeNull()
    expect(titleBox).not.toBeNull()
    expect(fieldBox!.y + fieldBox!.height).toBeLessThanOrEqual(titleBox!.y)
  })
})
