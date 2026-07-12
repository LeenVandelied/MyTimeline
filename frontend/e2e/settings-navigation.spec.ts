import { test, expect } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { SHARED } from './support/accounts'

/**
 * #86 — E2E Réglages desktop : accès depuis le dashboard + navigation par
 * chapitres (tablist vertical). Parcours piloté à 100 % par l'UI via
 * `data-testid` (jamais texte / classe), i18n `localePrefix: 'always'` (`/fr/...`).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring Boot (:8080) + Postgres migré,
 * frontend Next (:3000). Auth via `storageState` (compte fixe provisionné par le
 * projet `setup`) -> ZÉRO register par test (anti rate-limit register 5/min/IP).
 * Test de LECTURE (navigation seule, aucune mutation) : compte partagé.
 */
test.use({ storageState: SHARED.storageState })

test.describe('Réglages desktop : accès + navigation 4 chapitres', () => {
  test('depuis le dashboard, navigation entre les chapitres', async ({ page }) => {
    // Auth restaurée depuis le cookie (storageState) sur le dashboard.
    await ensureAuthenticated(page)

    // ---- Accès aux Réglages depuis le dashboard ----------------------------
    await page.getByTestId('dashboard-settings-link').click()
    await expect(page.getByTestId('settings-page')).toBeVisible()

    // Chapitre Profil actif par défaut, formulaire pré-rempli avec le username.
    await expect(page.getByTestId('settings-tab-profile')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('profile-username')).toHaveValue(SHARED.username)

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
    await expect(page.getByTestId('export-flow')).toBeVisible()

    // ---- Navigation clavier (ArrowUp -> revient à Préférences) -------------
    await page.getByTestId('settings-tab-account').focus()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByTestId('settings-tab-preferences')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
