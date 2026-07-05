import { test, expect } from '@playwright/test'
import { openSettingsChapter } from './support/auth'
import { SHARED, DEL } from './support/accounts'

/**
 * #86 — E2E chapitre Compte (desktop) : export des données (navigation 3 étapes,
 * endpoint stub) + suppression de compte (2 étapes, re-saisie username -> DELETE
 * /api/me, BR-AUT-001).
 *
 * Sélecteurs `data-testid` UNIQUEMENT, routes `/fr/...`. PRÉREQUIS RUNTIME
 * (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 *
 * ⚠ Le test de suppression DÉTRUIT le compte : chaque test crée son propre
 * utilisateur dédié (identité unique) -> pas de dépendance d'état entre tests.
 */

// Export = lecture seule (stub) : compte partagé fixe (aucune mutation). storageState.
test.describe('Réglages — Compte : export (stub)', () => {
  test.use({ storageState: SHARED.storageState })

  test('export : navigation format -> confirmation (endpoint stub non livré)', async ({
    page,
  }) => {
    await openSettingsChapter(page, 'account')

    // Étape 1 : choix du format (Select JSON/CSV).
    await expect(page.getByTestId('export-step-format')).toBeVisible()
    await expect(page.getByTestId('export-format')).toBeVisible()

    // Étape 2 : confirmation.
    await page.getByTestId('export-next').click()
    await expect(page.getByTestId('export-step-confirm')).toBeVisible()
    await expect(page.getByTestId('export-confirm')).toBeVisible()

    // ⚠ STUB : GET /api/me/export N'EST PAS livré côté backend. `exportData`
    // rejette -> `runExport` catch -> toast « à venir » + retour à l'étape format.
    // On NE peut donc PAS atteindre `export-step-done` (téléchargement réel) tant
    // que l'endpoint n'existe pas. On VÉRIFIE le comportement de repli du stub
    // (retour à l'étape format), sans test rouge ni téléchargement.
    await page.getByTestId('export-confirm').click()
    await expect(page.getByTestId('export-step-format')).toBeVisible()
    await expect(page.getByTestId('export-step-done')).toHaveCount(0)

    // NOTE: quand l'endpoint export sera livré (RECOMMAND_FOLLOWUP), remplacer la
    // vérification ci-dessus par l'attente de `export-step-done` + téléchargement.
  })
})

// Suppression = compte THROWAWAY dédié `DEL` (se détruit) : storageState, pas de
// register par test. Aucun autre test ne réutilise ce compte.
test.describe('Réglages — Compte : suppression', () => {
  test.use({ storageState: DEL.storageState })

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
