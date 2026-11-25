import type { Page } from '@playwright/test'

import { expect, test } from './support/fixtures'
import { PROD, SHARED } from './support/accounts'
import { sessionState } from './support/session'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #234 — Mode hors ligne et écrans d'état, de bout en bout.
 *
 * Quatre comportements existaient déjà sans test navigateur :
 *  - T2 : édition d'un événement, la connexion tombe -> enregistrer et supprimer
 *    sont inactifs et la bannière hors ligne s'affiche ;
 *  - T4 : le serveur répond 500 puis répond correctement -> « Réessayer » recharge
 *    les données et la bannière d'erreur disparaît ;
 *  - T6 : adresse inconnue -> le lien retour mène à l'accueil de la langue ;
 *  - T7 : une page plante après une réponse inattendue -> écran 500 avec son code,
 *    un bouton réessayer et un lien vers l'accueil.
 *
 * Aucun code applicatif n'est livré avec cette spec. La preuve du rouge se fait par
 * mutation locale, non commitée, du composant visé (cf. evidence du ticket).
 *
 * Comptes fixes de `support/accounts.ts` (pas d'inscription par test). Les réponses
 * réseau de T4 et T7 sont simulées avec `page.route`, jamais le backend.
 */

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** `GET /api/users/{userId}/products` (la liste), pas `/products/{id}/events`. */
const PRODUCTS_LIST_URL = /\/api\/users\/[^/]+\/products(\?.*)?$/

/** Ouvre le formulaire d'édition d'un événement (motif sprint-71, chemin desktop). */
async function openEventEditForm(page: Page): Promise<void> {
  await neutralizeDevToolingPointerEvents(page)
  await ensureAuthenticated(page)

  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('234 Offline Cat'))
  const product = await seedProduct(page, {
    userId,
    name: unique('234 Offline Prod'),
    categoryId: cat.id,
  })

  await page.goto(`/fr/products/${product.id}`, {
    waitUntil: 'domcontentloaded',
    timeout: FIRST_NAV_BUDGET,
  })
  await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('product-detail-timeline')).toBeVisible()

  await page.getByTestId('timeline-event').first().click({ timeout: CLICK_BUDGET })
  await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

  await expect(page.getByTestId('timeline-edit-dialog')).toBeVisible({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('event-form')).toBeVisible()
}

test.describe('#234 — hors ligne : édition d’un événement', () => {
  test.use({ storageState: sessionState(PROD), viewport: { width: 1280, height: 800 } })

  test('T2 : connexion perdue pendant l’édition -> enregistrer et supprimer inactifs, bannière hors ligne', async ({
    page,
    context,
  }) => {
    test.setTimeout(150_000)
    await openEventEditForm(page)

    const submit = page.getByTestId('event-form-submit')
    const remove = page.getByTestId('event-form-delete')
    // Témoin : en ligne, les deux boutons sont actifs et aucune bannière n'est posée.
    await expect(submit).toBeEnabled()
    await expect(remove).toBeEnabled()
    await expect(page.getByTestId('network-banner')).toHaveCount(0)

    // La connexion tombe APRÈS l'ouverture du formulaire.
    await context.setOffline(true)

    await expect(submit).toBeDisabled()
    await expect(remove).toBeDisabled()
    const banner = page.getByTestId('network-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute('data-state', 'offline')

    // Retour en ligne : le formulaire redevient utilisable (le contexte est jeté après le test).
    await context.setOffline(false)
  })
})

test.describe('#234 — serveur en erreur puis rétabli', () => {
  test.use({ storageState: sessionState(SHARED) })

  test('T4 : 500 puis réponse correcte -> Réessayer recharge les données et la bannière disparaît', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)

    // Le serveur répond 500 tant que `healthy` est faux, puis 200 (liste vide).
    // Le client retente une fois tout seul (QueryProvider `retry: 1`) : basculer sur
    // un drapeau plutôt que sur un compteur de requêtes évite de dépendre de ce nombre.
    let healthy = false
    let reloads = 0
    await page.route(PRODUCTS_LIST_URL, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      if (!healthy) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      }
      reloads += 1
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/fr/products', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })

    const banner = page.getByTestId('network-banner')
    await expect(banner).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await expect(banner).toHaveAttribute('data-state', 'server-error')
    await expect(page.getByTestId('products-error')).toBeVisible()

    healthy = true
    await page.getByTestId('network-banner-retry').click({ timeout: CLICK_BUDGET })

    // Les données ont été rechargées (la liste vide simulée remplace l'erreur)...
    await expect(page.getByTestId('products-error')).toHaveCount(0)
    await expect(page.getByTestId('products-empty-cta')).toBeVisible()
    expect(reloads, 'la liste a été redemandée au serveur').toBeGreaterThanOrEqual(1)
    // ... et la bannière d'erreur a disparu.
    await expect(banner).toHaveCount(0)
  })
})

test.describe('#234 — adresse inconnue', () => {
  test('T6 : le lien retour mène à la page d’accueil de la langue', async ({ page }) => {
    // Allemand : prouve que la cible suit la langue de l'adresse et non la langue par défaut.
    const response = await page.goto('/de/sprint-234-page-inconnue', {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    expect(response?.status(), 'statut de l’adresse inconnue').toBe(404)

    const home = page.getByTestId('global-not-found-home-link')
    await expect(home).toBeVisible()
    // La langue est lue dans l'URL après hydratation (prérendu : langue par défaut).
    await expect(home).toHaveAttribute('href', '/de')

    await home.click({ timeout: CLICK_BUDGET })

    await expect(page).toHaveURL(/\/de\/?$/)
    await expect(page.getByTestId('landing-header-bar')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  })
})

test.describe('#234 — plantage de page', () => {
  test.use({ storageState: sessionState(SHARED) })

  test('T7 : réponse inattendue -> écran 500 avec code, bouton réessayer et lien accueil', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)

    // `getProducts` ne valide pas sa réponse : un objet à la place d'une liste fait
    // lever le rendu de la liste (`slice is not a function`) -> `[locale]/error.tsx`.
    await page.route(PRODUCTS_LIST_URL, (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unexpected: 'not a list' }),
      })
    })

    await page.goto('/fr/products', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })

    const screen = page.getByTestId('error-screen')
    await expect(screen).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await expect(screen.getByTestId('state-screen-code')).toHaveText('500')
    await expect(screen.getByTestId('error-retry')).toBeVisible()
    const home = screen.getByTestId('error-home-link')
    await expect(home).toBeVisible()
    await expect(home).toHaveAttribute('href', '/fr')
  })
})
