import { test, expect } from '@playwright/test'
import { openSettingsChapter } from './support/auth'
import { SHARED, DEL } from './support/accounts'

/**
 * #86 / #59 — E2E chapitre Compte (desktop) : export RGPD (flux 3 étapes, contrat
 * backend #58 livré) + suppression de compte (2 étapes, re-saisie username ->
 * DELETE /api/me, BR-AUT-001).
 *
 * Sélecteurs `data-testid` UNIQUEMENT, routes `/fr/...`. PRÉREQUIS RUNTIME
 * (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 *
 * ⚠ Le test de suppression DÉTRUIT le compte : chaque test crée son propre
 * utilisateur dédié (identité unique) -> pas de dépendance d'état entre tests.
 */

// Export = lecture seule (aucune mutation de compte) : compte partagé fixe. storageState.
test.describe('Réglages — Compte : export RGPD (#59)', () => {
  test.use({ storageState: SHARED.storageState })

  test('export JSON (sync) : confirmation -> téléchargement immédiat', async ({ page }) => {
    await openSettingsChapter(page, 'account')

    // Étape 1 : le flux d'export + le sélecteur de format sont visibles. JSON
    // (format sync) est le choix par défaut -> téléchargement inline immédiat.
    await expect(page.getByTestId('export-flow')).toBeVisible()
    await expect(page.getByTestId('export-step-confirm')).toBeVisible()
    await expect(page.getByTestId('export-format')).toBeVisible()

    // Déclenche l'export : GET /api/export?format=JSON renvoie le fichier inline.
    // On attend l'événement de téléchargement navigateur (parcours réel #58).
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-start').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('mytimeline-export')

    // Étape 3 : succès sync (fichier déjà téléchargé), pas de lien/expiration.
    await expect(page.getByTestId('export-step-ready')).toBeVisible()
    await expect(page.getByTestId('export-ready-sync')).toBeVisible()
  })
})

// Suppression = compte THROWAWAY dédié `DEL` (se détruit) : storageState, pas de
// register par test. Aucun autre test ne réutilise ce compte.
test.describe('Réglages — Compte : suppression', () => {
  test.use({ storageState: DEL.storageState })
  // fullyParallel global : le test lit/DÉTRUIT le compte DEL. Un futur 2e test lisant
  // ce même compte s'entrelacerait avec la suppression -> serial (cf. settings-profile).
  test.describe.configure({ mode: 'serial' })

  test('suppression : mauvais username bloqué, bon username -> DELETE /me + redirect login', async ({
    page,
  }) => {
    const identity = DEL
    await openSettingsChapter(page, 'account')

    // Ouverture du dialog de suppression (desktop = Dialog Radix).
    await page.getByTestId('delete-account-open').click()
    const dialog = page.getByTestId('delete-account-dialog')
    await expect(dialog).toBeVisible()

    // Étape 1 : avertissement -> continuer.
    await expect(page.getByTestId('delete-account-warn')).toBeVisible()
    await page.getByTestId('delete-account-continue').click()

    // Étape 2 : re-saisie du username.
    await expect(page.getByTestId('delete-account-form')).toBeVisible()

    // ---- Mauvais username : le schéma Zod bloque (username != saisie) --------
    await page.getByTestId('delete-account-username').fill(`${identity.username}_wrong`)
    await page.getByTestId('delete-account-confirm').click()
    // Toujours sur le formulaire (aucun DELETE, aucune redirection).
    await expect(page.getByTestId('delete-account-form')).toBeVisible()
    await expect(page).toHaveURL(/\/fr\/settings/)

    // ---- Bon username : DELETE /api/me -> logout -> redirect login ----------
    await page.getByTestId('delete-account-username').fill('')
    await page.getByTestId('delete-account-username').fill(identity.username)
    await page.getByTestId('delete-account-confirm').click()

    // Redirection vers login : `useDeleteAccountFlow` fait `router.replace('/fr/login')`
    // (locale courante), mais un 401 concurrent (polling /me après logout) peut
    // aussi router via l'intercepteur apiClient (`window.location.href`) — les deux
    // pointent vers login. On assouplit le préfixe locale et on laisse le temps au
    // logout + redirection (401 avec setTimeout 1500ms dans l'intercepteur).
    await expect(page).toHaveURL(/\/(fr\/)?login/, { timeout: 15_000 })
    await expect(page.getByTestId('login-form')).toBeVisible()
  })
})
