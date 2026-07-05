import { test, expect } from '@playwright/test'

/**
 * #87 — E2E Réglages MOBILE (375px, iPhone 14 ~390 / Android réf ~360) :
 * drill-down (index -> détail -> retour) + bottom sheet de suppression de compte
 * (2 étapes). Piloté par `data-testid`, i18n `/fr/...` (localePrefix always).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring Boot (:8080) + Postgres,
 * frontend Next (:3000). On crée un utilisateur frais puis on se connecte (les
 * Réglages sont protégés). On NE va PAS jusqu'à confirmer la suppression pour ne
 * pas détruire le compte : on vérifie l'ouverture du sheet + le passage à
 * l'étape confirmation, puis la fermeture par backdrop.
 */
test.use({ viewport: { width: 375, height: 812 } })

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

test.describe('Réglages mobile : drill-down + bottom sheet suppression', () => {
  test('index -> détail -> retour, puis bottom sheet suppression compte', async ({ page }) => {
    const suffix = uniqueSuffix()
    const username = `m${suffix}`.slice(0, 20)
    const name = `m${suffix}`.slice(0, 20)
    const email = `m_${suffix}@example.com`
    const password = 'SetPass123'

    // ---- Inscription + connexion ------------------------------------------
    await page.goto('/fr/register')
    await page.getByTestId('register-email').fill(email)
    await page.getByTestId('register-name').fill(name)
    await page.getByTestId('register-username').fill(username)
    await page.getByTestId('register-password').fill(password)
    await page.getByTestId('register-confirm-password').fill(password)
    await page.getByTestId('register-submit').click()

    await expect(page.getByTestId('login-form')).toBeVisible()
    await page.getByTestId('login-username').fill(username)
    await page.getByTestId('login-password').fill(password)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('dashboard')).toBeVisible()

    // ---- Accès Réglages : index mobile visible (drill-down) ---------------
    await page.goto('/fr/settings')
    await expect(page.getByTestId('settings-index')).toBeVisible()
    // La coquille desktop (tablist) ne doit PAS être montée en mobile.
    await expect(page.getByTestId('settings-tablist')).toHaveCount(0)

    // ---- Drill-down : Profil -> retour ------------------------------------
    await page.getByTestId('settings-index-profile').click()
    await expect(page.getByTestId('mobile-settings-detail-profile')).toBeVisible()
    await expect(page.getByTestId('profile-username')).toHaveValue(username)
    await page.getByTestId('mobile-settings-back').click()
    await expect(page.getByTestId('settings-index')).toBeVisible()

    // ---- Chapitre Compte -> bottom sheet suppression (2 étapes) -----------
    await page.getByTestId('settings-index-account').click()
    await expect(page.getByTestId('mobile-settings-detail-account')).toBeVisible()
    await page.getByTestId('delete-account-open').click()

    const sheet = page.getByTestId('delete-account-sheet')
    await expect(sheet).toBeVisible()
    // Étape 1 (avertissement) -> étape 2 (confirmation par username).
    await page.getByTestId('delete-account-continue').click()
    await expect(page.getByTestId('delete-account-form')).toBeVisible()
    await expect(page.getByTestId('delete-account-username')).toBeVisible()

    // ---- Fermeture par tap backdrop ---------------------------------------
    await page.getByTestId('delete-account-sheet-backdrop').click()
    await expect(sheet).toHaveCount(0)
  })
})
