import { test, expect } from './support/fixtures'
import type { Page } from '@playwright/test'
import { registerOnly, type E2eIdentity } from './support/auth'
import { openCategoriesTab } from './support/products'

/**
 * #638 (DEC-S82-004) — compte neuf : sept catégories proposées, rien d'écrit avant le
 * choix, la catégorie choisie apparaît dans la liste.
 *
 * COMPTE NEUF, PAS UN COMPTE FIXE : `SHARED` et `PROD` reçoivent des catégories semées
 * par d'autres specs en parallèle, `DEL` et `PWD` sont détruits ou modifiés par les
 * leurs. Seul un compte inscrit ici garantit « aucune catégorie ».
 *
 * BUDGET RATE-LIMIT (`src/__tests__/e2e-rate-limit-budget.test.ts`) : un register (le
 * helper `registerOnly`) et une connexion par formulaire (`loginViaForm`, appelée UNE
 * fois), dans UN seul test. Pas de seconde inscription ni de seconde connexion.
 *
 * Libellé attendu en français : « Véhicules » (liste fournie par le ticket).
 */

/** Première navigation après une modification : `next dev` recompile (10-20 s). */
const FIRST_NAV_BUDGET = 60_000

async function loginViaForm(page: Page, identity: E2eIdentity): Promise<void> {
  await expect(page.getByTestId('login-form')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await page.getByTestId('login-username').fill(identity.username)
  await page.getByTestId('login-password').fill(identity.password)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
}

/** Noms des catégories du compte connecté, lus côté serveur (pas sur l'écran). */
async function serverCategoryNames(page: Page): Promise<string[]> {
  const res = await page.request.get('/api/categories')
  expect(res.ok(), `GET /api/categories doit réussir (obtenu ${res.status()})`).toBeTruthy()
  const body = (await res.json()) as { name: string }[]
  return body.map((category) => category.name)
}

test.describe('#638 — catégories proposées à un compte neuf', () => {
  test('new account sees suggestions, creates nothing until choosing one', async ({ page }) => {
    test.setTimeout(240_000)

    const identity = await registerOnly(page, 'sg')
    await loginViaForm(page, identity)
    await openCategoriesTab(page)

    // État vide hydraté : le CTA habituel est cliquable, donc les boutons le sont aussi.
    await expect(page.getByTestId('categories-empty-cta')).toBeEnabled()
    const suggestions = page.locator('[data-testid^="categories-suggestion-"]')
    await expect(suggestions).toHaveCount(7)
    for (const label of [
      'Véhicules',
      'Assurance',
      'Santé',
      'Alimentation',
      'Logement',
      'Voyage',
      'Finances',
    ]) {
      await expect(page.getByTestId('categories-suggestions')).toContainText(label)
    }

    // Les voir n'écrit rien : le serveur ne connaît aucune catégorie.
    expect(await serverCategoryNames(page)).toEqual([])

    await page.getByTestId('categories-suggestion-vehicles').click()

    // La catégorie choisie apparaît dans la liste, avec le libellé du moment.
    const list = page.getByTestId('categories-view').getByRole('listitem')
    await expect(list).toHaveCount(1)
    await expect(list.first()).toContainText('Véhicules')
    await expect(suggestions).toHaveCount(0)
    expect(await serverCategoryNames(page)).toEqual(['Véhicules'])
  })
})
