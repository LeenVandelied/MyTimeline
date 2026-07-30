import { test as setup, expect } from '@playwright/test'
import { ALL_ACCOUNTS, persistAccounts, type E2eAccount } from './support/accounts'
import { ensureRegisterForm } from './support/register-page'

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

/**
 * Budget par test `provision` (#329).
 *
 * MESURÉ — le budget Playwright par défaut (30 s) est INFÉRIEUR au coût d'UN SEUL
 * cycle de retry 429 (8 s d'attente du login-form + 20 s de backoff bucket4j = 28 s,
 * avant même la 2e soumission). Conséquence : quand le 429 survenait, le test EXPIRAIT
 * sur `Test timeout of 30000ms exceeded` — le retry n'aboutissait jamais et le message
 * d'échec explicatif n'était JAMAIS atteint. Constaté au S54 : 4/4 `provision` en
 * `timedOut` à 30 s, sans une seule ligne de diagnostic exploitable.
 *
 * Pire cas RECALCULÉ (review S54 — le calcul précédent annonçait ~110 s en OUBLIANT
 * les deux `ensureRegisterForm(mode:'recover')` du bloc catch, qui ne sont pas des
 * vérifications instantanées mais des boucles de retry complètes) :
 *
 *   rendu initial, succès à la dernière tentative     8 + 2 + 8 + 2      = 20 s
 *   itération 1 : attente login-form + backoff + recover   8 + 20 + 20   = 48 s
 *   itération 2 : idem                                     8 + 20 + 20   = 48 s
 *   itération 3 : attente login-form puis `throw`                        =  8 s
 *   remplissage du formulaire (3 x ~1 s)                                 =  3 s
 *                                                                     ------------
 *                                                                        ~127 s
 *
 * Le budget doit couvrir ce pire cas SANS expirer, sinon on retombe exactement dans
 * le défaut que #329 corrige : le message de diagnostic n'est jamais atteint. 150 s
 * ne laissait que ~23 s de marge sur une infrastructure PARTAGÉE par les 134 tests
 * (un dépassement ici les bloque tous) -> porté à 180 s.
 *
 * Note : si un `recover` épuise ses 3 tentatives, il lève AVANT (à ~28 s) avec le
 * message d'ÉCHEC DE RENDU — chemin plus court, déjà couvert.
 */
const PROVISION_TIMEOUT_MS = 180_000

async function fillRegister(account: E2eAccount, page: Page): Promise<void> {
  await page.getByTestId('register-email').fill(account.email)
  await page.getByTestId('register-name').fill(account.name)
  await page.getByTestId('register-username').fill(account.username)
  await page.getByTestId('register-password').fill(account.password)
  await page.getByTestId('register-confirm-password').fill(account.password)
  await page.getByTestId('register-submit').click()
}

/**
 * Statuts HTTP réellement observés sur `POST /api/auth/register` pour cette page.
 * POURQUOI — le message d'échec de la soumission accusait le 429 EN DUR ; or trois
 * causes distinctes laissent l'app sur /fr/register : 429 (rate-limit), 403 (CORS —
 * le profil dev fige `allowed-origins=http://localhost:3000`, cf. runbook S47) et
 * 409 (compte déjà pris). On rapporte donc le statut MESURÉ, jamais une supposition.
 */
function watchRegisterResponses(page: Page): number[] {
  const statuses: number[] = []
  page.on('response', (response) => {
    if (response.request().method() === 'POST' && response.url().includes('/api/auth/register')) {
      statuses.push(response.status())
    }
  })
  return statuses
}

async function provision(account: E2eAccount, page: Page): Promise<void> {
  const registerStatuses = watchRegisterResponses(page)

  // ---- Inscription (résiliente au 500 de RENDU puis au 429 de SOUMISSION) ----
  // Rendu : retry par `page.reload()` (#329) — un 500 transitoire du serveur de dev
  // tuait sinon tout le run dès le setup.
  await ensureRegisterForm(page, { label: account.key })

  let registered = false
  for (let attempt = 1; attempt <= REGISTER_RETRIES && !registered; attempt++) {
    await fillRegister(account, page)
    try {
      // Register OK -> redirection vers /fr/login. Fenêtre courte : si on n'y bascule
      // pas, c'est probablement un 429 (l'app reste sur /fr/register).
      await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 8_000 })
      registered = true
    } catch (err) {
      // Log AVANT retry : distingue un 429 réel (rate-limit) d'une régression UI
      // que le retry masquerait autrement silencieusement.
      console.warn(
        `[setup] register/login ${account.key} retry (tentative ${attempt}/${REGISTER_RETRIES}) après erreur: ${err}`,
      )
      if (attempt === REGISTER_RETRIES) {
        const observed = registerStatuses.length
          ? `statuts HTTP observés sur POST /api/auth/register: [${registerStatuses.join(', ')}]`
          : 'AUCUNE réponse POST /api/auth/register observée (requête jamais partie : ' +
            'validation RHF côté client, ou proxy /api injoignable)'
        throw new Error(
          `ÉCHEC DE SOUMISSION du register ${account.key} après ${REGISTER_RETRIES} tentatives — ` +
            `le formulaire register s'est bien AFFICHÉ, ce n'est donc PAS un échec de rendu. ` +
            `${observed}. Lecture: 429 = rate-limit register 5/min/IP (bucket non rechargé) ; ` +
            `403 = CORS refusé (le profil dev fige app.cors.allowed-origins=http://localhost:3000, ` +
            `cf. docs/memory/sprints/sprint-47/e2e-local-runbook.md §pièges) ; ` +
            `409 = username/email déjà enregistré. Dernière erreur: ${err}`,
        )
      }
      // Bucket4j se recharge par minute : on attend puis on RETENTE le submit sur la
      // même page (le formulaire register est toujours affiché après un 429). Le
      // rendu est re-vérifié en mode `recover` : même protection 500 qu'à l'entrée
      // (#329 — cette re-vérification jetait elle aussi sans retry).
      await page.waitForTimeout(REGISTER_BACKOFF_MS)
      await ensureRegisterForm(page, { label: account.key, mode: 'recover' })
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
    // Sans ce budget, les retrys (rendu ET soumission) expirent avant d'aboutir et le
    // message d'échec explicatif n'est jamais produit. Cf. PROVISION_TIMEOUT_MS.
    setup.setTimeout(PROVISION_TIMEOUT_MS)
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
