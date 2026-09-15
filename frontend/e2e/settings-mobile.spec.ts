import { test, expect } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { SHARED } from './support/accounts'

/**
 * #87 — E2E Réglages MOBILE (375px, iPhone 14 ~390 / Android réf ~360) :
 * drill-down (index -> détail -> retour) + bottom sheet de suppression de compte
 * (2 étapes). Piloté par `data-testid`, i18n `/fr/...` (localePrefix always).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring Boot (:8080) + Postgres,
 * frontend Next (:3000). Auth via `storageState` (compte fixe, projet `setup`) ->
 * ZÉRO register par test (anti rate-limit register 5/min/IP). On NE confirme PAS la
 * suppression (le compte partagé ne doit pas être détruit) : on vérifie l'ouverture
 * du sheet + le passage à l'étape confirmation, puis la fermeture par backdrop.
 */
test.use({ viewport: { width: 375, height: 812 }, storageState: SHARED.storageState })

test.describe('Réglages mobile : drill-down + bottom sheet suppression', () => {
  test('index -> détail -> retour, puis bottom sheet suppression compte', async ({ page }) => {
    // Auth restaurée depuis le cookie (storageState) sur le dashboard.
    await ensureAuthenticated(page)

    // ---- Accès Réglages : index mobile visible (drill-down) ---------------
    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-index')).toBeVisible()
    // La coquille desktop (tablist) ne doit PAS être montée en mobile.
    await expect(page.getByTestId('settings-tablist')).toHaveCount(0)

    // ---- Drill-down : Profil -> retour ------------------------------------
    await page.getByTestId('settings-index-profile').click()
    await expect(page.getByTestId('mobile-settings-detail-profile')).toBeVisible()
    await expect(page.getByTestId('profile-username')).toHaveValue(SHARED.username)
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
