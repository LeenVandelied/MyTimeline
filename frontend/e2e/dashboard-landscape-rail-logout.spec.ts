import { expect, test, type Route } from '@playwright/test'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'

/**
 * #209 — DÉCONNEXION DEPUIS LE RAIL PAYSAGE (complète `dashboard-mobile.spec.ts`, T10 à T12,
 * qui touchent Accueil et Produits mais jamais Déconnexion).
 *
 * COMPTE. `support/accounts.ts` ne prévoit aucun compte dédié aux tests de déconnexion
 * (`DEL` est réservé à la suppression de compte), on garde `SHARED` sous `storageState`.
 *
 * GARDE-FOUS. Le vrai `POST /api/auth/logout` révoquerait le jeton du compte partagé
 * (BR-AUT-010, cf. `support/session.ts`). Il est donc intercepté AVANT toute navigation
 * et jamais transmis au serveur. La réponse simulée vide les cookies de CE contexte de
 * test seulement : c'est l'effet réel du serveur (`Set-Cookie` d'expiration), sans lequel
 * le middleware renverrait vers le tableau de bord un utilisateur encore porteur du jeton.
 * Le compteur d'interceptions prouve que le clic est bien parti vers l'appel simulé.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (cf. `playwright.config.ts`).
 */

test.use({
  storageState: sessionState(SHARED),
  hasTouch: true,
  viewport: { width: 812, height: 375 },
})

const FIRST_NAV_BUDGET = 60_000
const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
const LOGOUT_RE = /\/api\/auth\/logout/

test('toucher Déconnexion dans le rail paysage ramène sur /fr/login (appel serveur simulé)', async ({
  page,
}) => {
  test.setTimeout(120_000)

  // Posée AVANT la navigation : aucun logout réel ne doit pouvoir partir.
  let logoutCalls = 0
  await page.route(LOGOUT_RE, async (route: Route) => {
    logoutCalls += 1
    await page.context().clearCookies()
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  // Listing produits vide : le cas ne dépend d'aucune donnée.
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await neutralizeDevToolingPointerEvents(page)
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard-loading')).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByTestId('dashboard-landscape')).toBeVisible()

  await page.getByTestId('dashboard-rail').getByTestId('dashboard-rail-item-logout').tap()

  await expect(page).toHaveURL(/\/fr\/login$/, { timeout: 15_000 })
  await expect(page.getByTestId('login-form')).toBeVisible()
  expect(
    logoutCalls,
    'le logout a été intercepté, jamais envoyé au serveur',
  ).toBeGreaterThanOrEqual(1)
})
