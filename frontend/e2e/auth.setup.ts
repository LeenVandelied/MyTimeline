import { test as setup, expect } from '@playwright/test'
import { ALL_ACCOUNTS, persistAccounts, type E2eAccount } from './support/accounts'

/**
 * PROJET `setup` (dépendance de `chromium`, cf. playwright.config.ts).
 *
 * Provisionne UNE SEULE FOIS par run les comptes E2E fixes (register UI -> login
 * UI -> cookie JWT HttpOnly) et sauvegarde leur `storageState` (cookies) sur disque.
 * Les specs chargent ensuite ce state via `test.use({ storageState })` : ZÉRO
 * register par test -> on reste sous le rate-limit register (5/min/IP).
 *
 * Le setup ne se rejoue PAS quand un test échoue et retry (seuls les tests
 * retryent). Nombre de registers de la suite settings = nombre de comptes ici (3).
 *
 * Chaque compte est provisionné en SÉRIE (registers espacés dans le même job) et
 * dans son propre `browser.newContext` pour isoler les cookies avant sauvegarde.
 */

async function provision(account: E2eAccount, page: import('@playwright/test').Page): Promise<void> {
  // ---- Inscription -------------------------------------------------------
  await page.goto('/fr/register')
  await expect(page.getByTestId('register-form')).toBeVisible()
  await page.getByTestId('register-email').fill(account.email)
  await page.getByTestId('register-name').fill(account.name)
  await page.getByTestId('register-username').fill(account.username)
  await page.getByTestId('register-password').fill(account.password)
  await page.getByTestId('register-confirm-password').fill(account.password)
  await page.getByTestId('register-submit').click()

  // Register OK -> redirection vers /fr/login.
  await expect(page.getByTestId('login-form')).toBeVisible()

  // ---- Connexion ---------------------------------------------------------
  await page.getByTestId('login-username').fill(account.username)
  await page.getByTestId('login-password').fill(account.password)
  await page.getByTestId('login-submit').click()

  // Login OK -> cookie JWT HttpOnly posé, AuthContext restaure -> dashboard.
  await expect(page.getByTestId('dashboard')).toBeVisible()
}

// Persiste d'abord les identités (username/name/email) sur disque : les process de
// specs (workers/retries `chromium`) réimportent `accounts.ts` et DOIVENT lire ces
// mêmes identités (sinon `Date.now()` recalculé -> username divergent, cf. accounts.ts).
setup('persist account identities', async () => {
  persistAccounts()
})

for (const account of ALL_ACCOUNTS) {
  setup(`provision ${account.key}`, async ({ browser }) => {
    // Contexte neuf par compte : cookies isolés avant sauvegarde du storageState.
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await provision(account, page)
      await context.storageState({ path: account.storageState })
    } finally {
      await context.close()
    }
  })
}
