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

type Page = import('@playwright/test').Page

/**
 * Fenêtre bucket4j register = 5 req / min / IP. Le setup enchaîne 3 registers, plus
 * le self-register golden-path : sous charge (retry, réordonnancement) la file peut
 * frôler/dépasser le seuil -> 429 -> l'app RESTE sur /fr/register (aucune redirection
 * vers /fr/login) -> le `provision` échoue (flaky `[setup]`, cf. run 28752900622).
 *
 * On rend donc CHAQUE register RÉSILIENT au rate-limit : si après submit on ne bascule
 * pas sur le formulaire de login dans un délai court, on ATTEND que le bucket se
 * recharge (~1 min par minute) et on RETENTE le submit. Déterministe (pas de register
 * par test réintroduit ; on ne fait que temporiser le provisioning fixe).
 */
const REGISTER_RETRIES = 3
const REGISTER_BACKOFF_MS = 20_000

async function fillRegister(account: E2eAccount, page: Page): Promise<void> {
  await page.getByTestId('register-email').fill(account.email)
  await page.getByTestId('register-name').fill(account.name)
  await page.getByTestId('register-username').fill(account.username)
  await page.getByTestId('register-password').fill(account.password)
  await page.getByTestId('register-confirm-password').fill(account.password)
  await page.getByTestId('register-submit').click()
}

async function provision(account: E2eAccount, page: Page): Promise<void> {
  // ---- Inscription (résiliente au 429 register) --------------------------
  await page.goto('/fr/register')
  await expect(page.getByTestId('register-form')).toBeVisible()

  let registered = false
  for (let attempt = 1; attempt <= REGISTER_RETRIES && !registered; attempt++) {
    await fillRegister(account, page)
    try {
      // Register OK -> redirection vers /fr/login. Fenêtre courte : si on n'y bascule
      // pas, c'est probablement un 429 (l'app reste sur /fr/register).
      await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 8_000 })
      registered = true
    } catch {
      if (attempt === REGISTER_RETRIES) throw new Error(
        `register ${account.key} échoué après ${REGISTER_RETRIES} tentatives ` +
          `(rate-limit register 5/min/IP probable — bucket non rechargé)`,
      )
      // Bucket4j se recharge par minute : on attend puis on RETENTE le submit sur la
      // même page (le formulaire register est toujours affiché après un 429).
      await page.waitForTimeout(REGISTER_BACKOFF_MS)
      await expect(page.getByTestId('register-form')).toBeVisible()
    }
  }

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
