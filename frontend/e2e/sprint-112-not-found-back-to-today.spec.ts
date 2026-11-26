import { expect, test } from './support/fixtures'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'

/**
 * #828 — page introuvable : « Revenir à aujourd'hui » pour une personne connectée.
 *
 * Une adresse inconnue est servie par `app/global-not-found.tsx` (document autonome,
 * statique, sans provider). Le premier rendu est anonyme ; une sonde `GET /api/auth/me`
 * lancée après montage bascule le bouton vers le tableau de bord si la session existe.
 *
 *  - T6 : session SHARED -> « Revenir à aujourd'hui », le clic ouvre le tableau de bord ;
 *  - T7 : aucune session -> « Retour à l'accueil », le clic ouvre la page d'accueil.
 *
 * Aucune inscription ni connexion par formulaire : la session de T6 vient du
 * `storageState` de SHARED (budget rate-limit intact). T7 est anonyme.
 */

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000
// Sonde de session après montage : largement sous le délai du test (30 s).
const PROBE_BUDGET = 15_000
const UNKNOWN_FR = '/fr/sprint-828-page-inconnue'

test.describe('#828 — adresse inconnue, personne connectée', () => {
  test.use({ storageState: sessionState(SHARED) })

  test('signed-in visitor on an unknown address gets back-to-today and lands on the dashboard', async ({
    page,
  }) => {
    const response = await page.goto(UNKNOWN_FR, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    expect(response?.status(), 'statut de l’adresse inconnue').toBe(404)

    const link = page.getByTestId('global-not-found-home-link')
    await expect(link).toHaveText("Revenir à aujourd'hui", { timeout: PROBE_BUDGET })
    await expect(link).toHaveAttribute('href', '/fr/dashboard')

    await link.click({ timeout: CLICK_BUDGET })

    await expect(page).toHaveURL(/\/fr\/dashboard\/?$/)
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  })
})

test.describe('#828 — adresse inconnue, personne anonyme', () => {
  test('anonymous visitor on an unknown address keeps back-to-home and lands on the landing page', async ({
    page,
  }) => {
    const response = await page.goto(UNKNOWN_FR, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    expect(response?.status(), 'statut de l’adresse inconnue').toBe(404)

    const link = page.getByTestId('global-not-found-home-link')
    await expect(link).toHaveText("Retour à l'accueil")
    await expect(link).toHaveAttribute('href', '/fr')
    // La sonde a eu le temps de répondre 401 : le bouton ne doit pas avoir changé.
    await page.waitForLoadState('networkidle')
    await expect(link).toHaveText("Retour à l'accueil")

    await link.click({ timeout: CLICK_BUDGET })

    await expect(page).toHaveURL(/\/fr\/?$/)
    await expect(page.getByTestId('landing-header-bar')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  })
})
