import { test, expect } from '@playwright/test'
import { openSettingsChapter } from './support/auth'
import { SHARED } from './support/accounts'
import { keepThemeOffSharedAccount } from './support/theme-preference'

/**
 * #86 — E2E chapitre Préférences (desktop) : thème (classe `.dark` sur <html>
 * SANS reload), densité (`data-density` sur <html>), langue (navigation
 * `localePrefix: 'always'` vers `/en/...`).
 *
 * #398 — Les options des <Select> Radix ciblent `data-testid` dérivé de la
 * `value` (`pref-<champ>-option-<valeur>`, convention #331), jamais le libellé
 * i18n affiché : la spec reste verte indépendamment de la locale.
 */

// Comptes fixes réutilisés (storageState) : ZÉRO register par test (anti rate-limit).
// Mutations client-only (densité/langue). Le thème est persisté SUR LE COMPTE
// depuis #653 : son `PUT` est répondu dans le navigateur (`keepThemeOffSharedAccount`)
// pour que le compte partagé reste sans préférence (non restaurable à `null`).
test.use({ storageState: SHARED.storageState })

test.describe('Réglages — Préférences', () => {
  test('thème sombre appliqué sans reload (classe .dark sur <html>)', async ({ page }) => {
    const themeWrites = await keepThemeOffSharedAccount(page)
    await openSettingsChapter(page, 'preferences')

    const html = page.locator('html')
    await expect(page.getByTestId('pref-theme')).toBeVisible()

    // Ouvre le Select thème puis choisit "dark" (testid dérivé de la value).
    await page.getByTestId('pref-theme').click()
    await page.getByTestId('pref-theme-option-dark').click()

    // next-themes applique la classe `.dark` sur <html> immédiatement.
    await expect(html).toHaveClass(/dark/)

    // Repasse en "light" -> la classe `.dark` est retirée, toujours sans reload.
    await page.getByTestId('pref-theme').click()
    await page.getByTestId('pref-theme-option-light').click()
    await expect(html).not.toHaveClass(/dark/)

    // #653 — le sélecteur des Réglages confie aussi le choix au compte.
    await expect.poll(() => [...themeWrites]).toEqual(['dark', 'light'])
  })

  test('densité appliquée via data-density sur <html>', async ({ page }) => {
    await openSettingsChapter(page, 'preferences')

    const html = page.locator('html')
    await expect(page.getByTestId('pref-density')).toBeVisible()

    await page.getByTestId('pref-density').click()
    await page.getByTestId('pref-density-option-compact').click()
    await expect(html).toHaveAttribute('data-density', 'compact')

    await page.getByTestId('pref-density').click()
    await page.getByTestId('pref-density-option-comfortable').click()
    await expect(html).toHaveAttribute('data-density', 'comfortable')
  })

  test('langue -> navigation localisée vers /en/settings', async ({ page }) => {
    await openSettingsChapter(page, 'preferences')

    await expect(page.getByTestId('pref-language')).toBeVisible()
    await page.getByTestId('pref-language').click()
    // testid dérivé du code locale ("en"), stable quelle que soit la locale d'affichage.
    await page.getByTestId('pref-language-option-en').click()

    // Redirection next-intl -> l'URL passe sur /en/... et la page reste montée.
    await expect(page).toHaveURL(/\/en\/settings/)
    await expect(page.getByTestId('settings-page')).toBeVisible()
  })
})
