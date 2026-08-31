import { test, expect } from '@playwright/test'

/**
 * SPEC JETABLE — NE PAS MERGER.
 *
 * Échec PROVOQUÉ, dont le seul but est de prouver que le job `e2e` publie
 * bien ses artefacts de diagnostic après le correctif (reporter `html` +
 * upload de `test-results/`). Un upload « vert » ne prouve rien : le
 * contrôle se fait via
 *   gh api repos/:owner/:repo/actions/runs/<id>/artifacts
 *
 * Volontairement autonome : `setContent` au lieu d'une page de l'app, pour
 * que l'échec ne dépende ni du backend, ni d'un sélecteur métier.
 */
test('ARTEFACTS — échec volontaire, à supprimer', async ({ page }) => {
  await page.setContent('<h1>hello</h1>')
  await expect(page.locator('h1')).toHaveText('goodbye', { timeout: 2000 })
})
