import { test, expect } from '@playwright/test'

/**
 * #86 — E2E Réglages desktop : accès depuis le dashboard + navigation par
 * chapitres (tablist vertical). Parcours piloté à 100 % par l'UI via
 * `data-testid` (jamais texte / classe), i18n `localePrefix: 'always'` (`/fr/...`).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring Boot (:8080) + Postgres migré,
 * frontend Next (:3000). On crée un utilisateur frais (register) puis on se
 * connecte pour disposer d'un cookie JWT valide (les Réglages sont protégés).
 */
function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

test.describe('Réglages desktop : accès + navigation 4 chapitres', () => {
  test('depuis le dashboard, navigation entre les chapitres', async ({ page }) => {
    const suffix = uniqueSuffix()
    const username = `set${suffix}`.slice(0, 20)
    const name = `set${suffix}`.slice(0, 20)
    const email = `set_${suffix}@example.com`
    const password = 'SetPass123'

    // ---- Inscription -------------------------------------------------------
    await page.goto('/fr/register')
    await expect(page.getByTestId('register-form')).toBeVisible()
    await page.getByTestId('register-email').fill(email)
    await page.getByTestId('register-name').fill(name)
    await page.getByTestId('register-username').fill(username)
    await page.getByTestId('register-password').fill(password)
    await page.getByTestId('register-confirm-password').fill(password)
    await page.getByTestId('register-submit').click()

    // ---- Connexion ---------------------------------------------------------
    await expect(page.getByTestId('login-form')).toBeVisible()
    await page.getByTestId('login-username').fill(username)
    await page.getByTestId('login-password').fill(password)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('dashboard')).toBeVisible()

    // ---- Accès aux Réglages depuis le dashboard ----------------------------
    await page.getByTestId('dashboard-settings-link').click()
    await expect(page.getByTestId('settings-page')).toBeVisible()

    // Chapitre Profil actif par défaut, formulaire pré-rempli avec le username.
    await expect(page.getByTestId('settings-tab-profile')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('profile-username')).toHaveValue(username)

    // ---- Navigation Sécurité ----------------------------------------------
    await page.getByTestId('settings-tab-security').click()
    await expect(page.getByTestId('settings-tab-security')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('password-form')).toBeVisible()
    // La session courante est listée (au moins une session active).
    await expect(page.getByTestId('session-list')).toBeVisible()

    // ---- Navigation Préférences -------------------------------------------
    await page.getByTestId('settings-tab-preferences').click()
    await expect(page.getByTestId('pref-theme')).toBeVisible()

    // ---- Navigation Compte -------------------------------------------------
    await page.getByTestId('settings-tab-account').click()
    await expect(page.getByTestId('delete-account-open')).toBeVisible()
    await expect(page.getByTestId('export-step-format')).toBeVisible()

    // ---- Navigation clavier (ArrowUp -> revient à Préférences) -------------
    await page.getByTestId('settings-tab-account').focus()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByTestId('settings-tab-preferences')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
