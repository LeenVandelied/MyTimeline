import { test, expect } from '@playwright/test'
import { openSettingsChapter } from './support/auth'
import { SHARED } from './support/accounts'

/**
 * #86 — E2E chapitre Préférences (desktop) : thème (classe `.dark` sur <html>
 * SANS reload), densité (`data-density` sur <html>), langue (navigation
 * `localePrefix: 'always'` vers `/en/...`).
 *
 * Les <Select> sont des primitives Radix rendues en PORTAIL : leurs options
 * n'exposent pas de `data-testid` fiable (cf. exception documentée dans
 * golden-path.spec.ts). On ouvre via le trigger `data-testid` puis on choisit
 * l'OPTION par son rôle Radix (`role=option`, name = libellé i18n) — même
 * dérogation que golden-path. Le reste reste `data-testid`.
 */

// Comptes fixes réutilisés (storageState) : ZÉRO register par test (anti rate-limit).
// Mutations client-only (thème/densité/langue) : aucun conflit d'état backend.
test.use({ storageState: SHARED.storageState })

test.describe('Réglages — Préférences', () => {
  test('thème sombre appliqué sans reload (classe .dark sur <html>)', async ({ page }) => {
    await openSettingsChapter(page, 'preferences')

    const html = page.locator('html')
    await expect(page.getByTestId('pref-theme')).toBeVisible()

    // Ouvre le Select thème puis choisit « Sombre » (libellé fr).
    await page.getByTestId('pref-theme').click()
    await page.getByRole('option', { name: 'Sombre' }).click()

    // next-themes applique la classe `.dark` sur <html> immédiatement.
    await expect(html).toHaveClass(/dark/)

    // Repasse en « Clair » -> la classe `.dark` est retirée, toujours sans reload.
    await page.getByTestId('pref-theme').click()
    await page.getByRole('option', { name: 'Clair' }).click()
    await expect(html).not.toHaveClass(/dark/)
  })

  test('densité appliquée via data-density sur <html>', async ({ page }) => {
    await openSettingsChapter(page, 'preferences')

    const html = page.locator('html')
    await expect(page.getByTestId('pref-density')).toBeVisible()

    await page.getByTestId('pref-density').click()
    await page.getByRole('option', { name: 'Compact' }).click()
    await expect(html).toHaveAttribute('data-density', 'compact')

    await page.getByTestId('pref-density').click()
    await page.getByRole('option', { name: 'Confortable' }).click()
    await expect(html).toHaveAttribute('data-density', 'comfortable')
  })

  test('langue -> navigation localisée vers /en/settings', async ({ page }) => {
    await openSettingsChapter(page, 'preferences')

    await expect(page.getByTestId('pref-language')).toBeVisible()
    await page.getByTestId('pref-language').click()
    // Libellé de l'option anglaise (identique dans toutes les locales : "English").
    await page.getByRole('option', { name: 'English' }).click()

    // Redirection next-intl -> l'URL passe sur /en/... et la page reste montée.
    await expect(page).toHaveURL(/\/en\/settings/)
    await expect(page.getByTestId('settings-page')).toBeVisible()
  })
})
