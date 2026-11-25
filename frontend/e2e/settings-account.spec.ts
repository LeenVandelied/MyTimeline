import { test, expect, type Page, type Route } from '@playwright/test'
import { openSettingsChapter } from './support/auth'
import { SHARED, DEL } from './support/accounts'
import { sessionState } from './support/session'

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
  test.use({ storageState: sessionState(SHARED) })

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
  test.use({ storageState: sessionState(DEL) })
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

/**
 * #270 — export RGPD asynchrone (ZIP/CSV) : préparation, lien + expiration, lien
 * expiré puis relance, échec du TRAVAIL d'export. Le suivi du travail est simulé par
 * `page.route` (réponses conformes à `exportJobResponseSchema`) : le compte partagé
 * n'a aucune ligne d'export et aucune requête d'export réelle ne part vers le backend.
 * Les cas « coupure réseau » et « toutes les étapes » vivent dans
 * `sprint-99-touch-targets.spec.ts`.
 */
const JOB_ID = '0192f0a0-0000-7000-8000-00000000c270'
const DOWNLOAD_URL = `/api/export/download/${JOB_ID}?token=t270`

interface FakeJob {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  downloadUrl?: string | null
  expiresAt?: string | null
}

/**
 * POST -> 202 PENDING ; GET job -> `job` ; GET download -> petit fichier. Toute autre
 * requête d'export est avortée (jamais de repli vers le backend réel).
 */
async function withFakeAsyncExport(
  page: Page,
  job: FakeJob,
): Promise<{ posted: string[]; downloads: string[] }> {
  const seen = { posted: [] as string[], downloads: [] as string[] }
  await page.route('**/api/export**', (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())
    const format = url.searchParams.get('format') ?? 'ZIP'
    if (req.method() === 'POST' && url.pathname.endsWith('/api/export')) {
      seen.posted.push(format)
      return route.fulfill({
        status: 202,
        json: { jobId: JOB_ID, status: 'PENDING', format, downloadUrl: null, expiresAt: null },
      })
    }
    if (req.method() === 'GET' && url.pathname === `/api/export/job/${JOB_ID}`) {
      return route.fulfill({
        status: 200,
        json: {
          jobId: JOB_ID,
          format: 'ZIP',
          downloadUrl: null,
          expiresAt: null,
          ...job,
        },
      })
    }
    if (req.method() === 'GET' && url.pathname === `/api/export/download/${JOB_ID}`) {
      seen.downloads.push(`${url.pathname}${url.search}`)
      return route.fulfill({
        status: 200,
        contentType: 'application/zip',
        headers: { 'content-disposition': 'attachment; filename="mytimeline-export.zip"' },
        body: 'PK',
      })
    }
    return route.abort('failed')
  })
  return seen
}

/** Choisit un format asynchrone dans le Select de l'étape de confirmation. */
async function pickFormat(page: Page, label: string): Promise<void> {
  await page.getByTestId('export-format').click()
  await page.getByRole('option', { name: label }).click()
}

test.describe('Réglages — Compte : export asynchrone (#270)', () => {
  test.use({ storageState: sessionState(SHARED) })

  test('export async (ZIP et CSV) : l\u2019étape préparation s\u2019affiche pendant le suivi du travail', async ({
    page,
  }) => {
    const seen = await withFakeAsyncExport(page, { status: 'RUNNING' })

    for (const [format, label] of [
      ['ZIP', 'ZIP (archive complète)'],
      ['CSV', 'CSV (tableur)'],
    ] as const) {
      await openSettingsChapter(page, 'account')
      await expect(page.getByTestId('export-step-confirm')).toBeVisible()
      await pickFormat(page, label)
      await page.getByTestId('export-start').click()

      // Le serveur répond « en cours » : préparation visible, aucun lien de téléchargement.
      const preparing = page.getByTestId('export-step-preparing')
      await expect(preparing).toBeVisible()
      await expect(preparing).toContainText('en cours')
      await expect(page.getByTestId('export-download')).toHaveCount(0)
      await expect(page.getByTestId('export-ready-async')).toHaveCount(0)
      expect(seen.posted).toContain(format)
    }
    expect(seen.posted).toEqual(['ZIP', 'CSV'])
  })

  test('export async terminé : lien de téléchargement et expiration affichés', async ({ page }) => {
    const seen = await withFakeAsyncExport(page, {
      status: 'COMPLETED',
      downloadUrl: DOWNLOAD_URL,
      expiresAt: '2099-01-01T00:00:00',
    })
    await openSettingsChapter(page, 'account')
    await pickFormat(page, 'ZIP (archive complète)')
    await page.getByTestId('export-start').click()

    await expect(page.getByTestId('export-ready-async')).toBeVisible()

    // La date d'expiration est affichée (instant serveur = UTC).
    const expiry = page.getByTestId('export-expiry')
    await expect(expiry).toBeVisible()
    await expect(expiry.locator('time')).toHaveAttribute('datetime', '2099-01-01T00:00:00.000Z')
    await expect(expiry).toContainText('2099')

    // Le bouton de téléchargement vise l'adresse renvoyée par le serveur.
    const download = page.getByTestId('export-download')
    await expect(download).toBeVisible()
    const request = page.waitForRequest((r) => r.url().includes('/api/export/download/'))
    await download.click()
    const sent = new URL((await request).url())
    expect(`${sent.pathname}${sent.search}`).toBe(DOWNLOAD_URL)
    // waitForRequest se résout avant le gestionnaire de route : on attend que le faux serveur ait enregistré la requête.
    await expect.poll(() => seen.downloads).toEqual([DOWNLOAD_URL])
  })

  test('lien expiré : relancer ramène à l\u2019étape de confirmation', async ({ page }) => {
    await withFakeAsyncExport(page, {
      status: 'COMPLETED',
      downloadUrl: DOWNLOAD_URL,
      expiresAt: '2020-01-01T00:00:00',
    })
    await openSettingsChapter(page, 'account')
    await pickFormat(page, 'CSV (tableur)')
    await page.getByTestId('export-start').click()

    await expect(page.getByTestId('export-expired')).toBeVisible()
    await expect(page.getByTestId('export-step-confirm')).toHaveCount(0)

    await page.getByTestId('export-relaunch').click()
    await expect(page.getByTestId('export-step-confirm')).toBeVisible()
    await expect(page.getByTestId('export-start')).toBeVisible()
    await expect(page.getByTestId('export-expired')).toHaveCount(0)
  })

  test('travail d\u2019export en échec : erreur puis réessayer ramène à la confirmation', async ({
    page,
  }) => {
    await withFakeAsyncExport(page, { status: 'FAILED' })
    await openSettingsChapter(page, 'account')
    await pickFormat(page, 'ZIP (archive complète)')
    await page.getByTestId('export-start').click()

    // Échec du TRAVAIL (statut FAILED, réponse 200), pas une coupure réseau.
    const error = page.getByTestId('export-step-error')
    await expect(error).toBeVisible()
    await expect(error).toContainText(/La préparation de l.export a échoué/)

    await page.getByTestId('export-retry').click()
    await expect(page.getByTestId('export-step-confirm')).toBeVisible()
    await expect(page.getByTestId('export-start')).toBeVisible()
    await expect(page.getByTestId('export-step-error')).toHaveCount(0)
  })
})
