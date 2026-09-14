import { test as setup, expect } from '@playwright/test'
import { ALL_ACCOUNTS, persistAccounts, type E2eAccount } from './support/accounts'
import { ensureRegisterForm } from './support/register-page'
import {
  acceptedRegisterStatus,
  classifyRegisterResponse,
  type RegisterOutcome,
} from './support/register-retry'

/**
 * PROJET `setup` (dépendance de `chromium`, cf. playwright.config.ts).
 *
 * Provisionne UNE SEULE FOIS par run les comptes E2E fixes (register UI -> login
 * UI -> cookie JWT HttpOnly) et sauvegarde leur `storageState` (cookies) sur disque.
 * Les specs chargent ensuite ce state via `test.use({ storageState })` : ZÉRO
 * register par test.
 *
 * BUDGET RATE-LIMIT (filtre ARMÉ en E2E depuis #547). Par compte et par passe CI, ce
 * fichier émet UN login et UN register — plus une ré-émission du register UNIQUEMENT
 * quand la requête elle-même a échoué (5xx ou aucune réponse, cf.
 * `support/register-retry.ts`). Ce n'est vrai que parce que :
 *   1. la boucle de soumission ne ré-émet plus sur une page lente, ni après 201/409/429
 *      (arbitrage dev du 2026-09-14, revue S88 — elle ré-émettait jusqu'à 3 fois) ;
 *   2. le projet n'a AUCUN retry Playwright (`configure` ci-dessous) : depuis que 409 vaut
 *      succès, un `provision` retenté irait jusqu'au login et ré-émettrait register ET login.
 * ⚠ Ces ré-émissions sur échec consomment un jeton et sont EXCLUES du pire cas écrit (20) :
 * en les comptant, register est borné à 36 (3 soumissions × 4 comptes × 2 passes + 12 des
 * specs), au-dessus du plafond de 30. Un backend qui renvoie des 5xx fait donc rougir le job ;
 * un 429 register dans ce contexte est un symptôme de l'instabilité, pas un défaut de budget.
 * En CI la passe 2 rejoue ce fichier contre le même backend (seaux partagés). Le budget
 * complet est RECOMPTÉ par `src/__tests__/e2e-rate-limit-budget.test.ts`, qui lit la
 * fonction `provision`, la boucle annotée et le `configure` — c'est ce recomptage, pas
 * ce paragraphe, qui fait foi.
 *
 * Chaque compte est provisionné dans son propre `browser.newContext` pour isoler les
 * cookies avant sauvegarde.
 */

type Page = import('@playwright/test').Page
type Response = import('@playwright/test').Response

/**
 * AUCUN RETRY PLAYWRIGHT (revue S88), quelle que soit la valeur globale (`retries: 2` en CI).
 *
 * Le budget ci-dessus en dépend : un essai retenté ré-inscrit le compte (409 = succès) puis
 * ré-émet le login, soit jusqu'à 3 register et 3 login par compte par passe. Ce que ce
 * retry rattrapait est déjà couvert À L'INTÉRIEUR d'un essai : le 500 de rendu
 * (`ensureRegisterForm`, 3 tentatives) et l'échec de requête register (boucle ci-dessous).
 * Le reste (login refusé, dashboard absent) est un vrai rouge, pas une instabilité.
 */
setup.describe.configure({ retries: 0 })

/** Soumissions au plus, en comptant la première. Seul un échec de REQUÊTE en consomme une autre. */
const REGISTER_ATTEMPTS = 3

/** Délai d'attente de la réponse `POST /api/auth/register` (hachage BCrypt compris). */
const REGISTER_RESPONSE_TIMEOUT_MS = 10_000

/**
 * Délai du clic de soumission, INFÉRIEUR au délai de réponse (revue S88, cycle 2) : quand
 * `Promise.all` rend la main, le clic est forcément résolu ou abandonné — aucun clic resté en
 * attente ne peut émettre un POST non compté pendant le backoff ou la tentative suivante.
 */
const REGISTER_CLICK_TIMEOUT_MS = 5_000

/** Respiration avant une ré-émission (5xx / aucune réponse) — pas une attente de seau. */
const REGISTER_RETRY_BACKOFF_MS = 5_000

/** Attente du formulaire de login après un register accepté (page lente ≠ ré-inscription). */
const LOGIN_FORM_TIMEOUT_MS = 20_000

/**
 * Budget par test `provision` (#329).
 *
 * Le budget Playwright par défaut (30 s) est inférieur au pire cas d'un essai : sans ce
 * budget, le test expirait avant d'atteindre le message d'échec explicatif (constaté au S54 :
 * 4/4 `provision` en `timedOut` à 30 s, sans diagnostic).
 *
 * Pire cas RECALCULÉ après la revue S88 (retry seulement sur échec de requête) :
 *
 *   rendu initial : 3 × 8 s + 2 × 2 s                           = 28 s
 *   tentative 1 : remplissage ~3 s + réponse 10 s              = 13 s
 *   backoff 5 s + `ensureRegisterForm(recover)` jusqu'à 28 s   = 33 s
 *   tentative 2                                                = 13 s
 *   backoff + recover                                          = 33 s
 *   tentative 3                                                = 13 s
 *   formulaire de login lent 20 s, puis `goto` + 20 s          = 42 s
 *   login + dashboard (expect par défaut 5 s) + saisie         = ~8 s
 *                                                            ------------
 *                                                              ~183 s
 *
 * Ce total additionne des pires cas qui s'excluent en pratique (un formulaire de login lent
 * suit un 201, pas trois échecs de requête) ; il est gardé comme majorant : 210 s.
 */
const PROVISION_TIMEOUT_MS = 210_000

async function fillRegister(account: E2eAccount, page: Page): Promise<void> {
  await page.getByTestId('register-email').fill(account.email)
  await page.getByTestId('register-name').fill(account.name)
  await page.getByTestId('register-username').fill(account.username)
  await page.getByTestId('register-password').fill(account.password)
  await page.getByTestId('register-confirm-password').fill(account.password)
}

function isRegisterPost(response: Response): boolean {
  return response.request().method() === 'POST' && response.url().includes('/api/auth/register')
}

/**
 * SEUL point d'émission du `POST /api/auth/register` de ce fichier : un clic, et le statut de
 * SA réponse. Sans réponse dans le délai, on relit ce qui a déjà été observé (201 tardif, page
 * déjà sur le login) avant de conclure `null` (erreur réseau, backend muet).
 *
 * Forme FIGÉE (#685) : `waitForResponse` + `click`, puis `response.status()` ou
 * `acceptedRegisterStatus(…)` — aucune autre attente, aucune autre valeur renvoyée. Une attente
 * glissée ici ferait d'une page lente « aucune réponse » après un 201, et la boucle ré-émettrait :
 * `e2e-rate-limit-budget.test.ts` (clause 5 du contrat) rougit dans ce cas.
 */
async function submitRegister(page: Page, observed: readonly number[]): Promise<number | null> {
  try {
    const [response] = await Promise.all([
      page.waitForResponse(isRegisterPost, { timeout: REGISTER_RESPONSE_TIMEOUT_MS }),
      page.getByTestId('register-submit').click({ timeout: REGISTER_CLICK_TIMEOUT_MS }),
    ])
    return response.status()
  } catch {
    return acceptedRegisterStatus(observed, page.url(), true)
  }
}

/**
 * Une tentative de register. Une RÉ-émission (`retry`) n'a lieu que si rien d'acquis n'a été
 * observé, relu avant ET après le backoff (revue S88, cycle 2) : un 201 tardif ou une page
 * déjà sur le login mène au login, sans ré-émettre et sans `ensureRegisterForm`.
 */
async function attemptRegister(
  account: E2eAccount,
  page: Page,
  observed: readonly number[],
  retry: boolean,
): Promise<number | null> {
  if (retry) {
    const before = acceptedRegisterStatus(observed, page.url(), true)
    if (before !== null) return before
    await page.waitForTimeout(REGISTER_RETRY_BACKOFF_MS)
    const after = acceptedRegisterStatus(observed, page.url(), true)
    if (after !== null) return after
    await ensureRegisterForm(page, { label: account.key, mode: 'recover' })
  }
  await fillRegister(account, page)
  return submitRegister(page, observed)
}

/**
 * Statuts HTTP réellement observés sur `POST /api/auth/register` pour cette page.
 * POURQUOI — trois causes distinctes laissent l'app sur /fr/register : 429 (rate-limit),
 * 403 (CORS — le profil dev fige `allowed-origins=http://localhost:3000`, cf. runbook S47)
 * et 409 (compte déjà pris). On rapporte donc le statut MESURÉ, jamais une supposition.
 */
function watchRegisterResponses(page: Page): number[] {
  const statuses: number[] = []
  page.on('response', (response) => {
    if (isRegisterPost(response)) statuses.push(response.status())
  })
  return statuses
}

function registerFailure(account: E2eAccount, outcome: RegisterOutcome, statuses: number[]): Error {
  const observed = statuses.length
    ? `statuts HTTP observés sur POST /api/auth/register: [${statuses.join(', ')}]`
    : 'AUCUNE réponse POST /api/auth/register observée (requête jamais partie : ' +
      'validation RHF côté client, ou proxy /api injoignable)'
  const cause =
    outcome === 'throttled'
      ? `429 NON retenté (seau register PARTAGÉ par toute la suite, 30/min/IP sous le profil ` +
        `e2e, 5 sans lui — le budget a cédé : e2e-rate-limit-budget.test.ts)`
      : outcome === 'refused'
        ? 'refus non retentable'
        : `échec de requête (5xx ou aucune réponse) après ${REGISTER_ATTEMPTS} soumissions`
  return new Error(
    `ÉCHEC DE SOUMISSION du register ${account.key} — ${cause}. Le formulaire register s'est ` +
      `bien AFFICHÉ, ce n'est donc PAS un échec de rendu. ${observed}. Lecture: 429 = ` +
      `rate-limit register ; 403 = CORS refusé (le profil dev fige ` +
      `app.cors.allowed-origins=http://localhost:3000, cf. ` +
      `docs/memory/sprints/sprint-47/e2e-local-runbook.md §pièges) ; 400 = validation ; ` +
      `409 = déjà enregistré (traité comme un succès, n'apparaît ici qu'à côté d'un autre statut).`,
  )
}

/** Après un register accepté : attendre le formulaire de login, ou y aller — sans ré-inscrire. */
async function reachLoginForm(page: Page, outcome: 'created' | 'exists'): Promise<void> {
  const loginForm = page.getByTestId('login-form')
  if (outcome === 'created') {
    try {
      await expect(loginForm).toBeVisible({ timeout: LOGIN_FORM_TIMEOUT_MS })
      return
    } catch (err) {
      console.warn(`[setup] register accepté mais formulaire de login absent, navigation: ${err}`)
    }
  }
  await page.goto('/fr/login')
  await expect(loginForm).toBeVisible({ timeout: LOGIN_FORM_TIMEOUT_MS })
}

async function provision(account: E2eAccount, page: Page): Promise<void> {
  const registerStatuses = watchRegisterResponses(page)

  // ---- Inscription ----------------------------------------------------------
  // Rendu : retry par `page.reload()` (#329) — un 500 transitoire du serveur de dev
  // tuait sinon tout le run dès le setup.
  await ensureRegisterForm(page, { label: account.key })

  let outcome: RegisterOutcome = 'retry'
  // La ré-émission n'a lieu QUE sur échec de la requête : le compteur de budget ne
  // multiplie donc pas cette boucle par sa borne, SOUS CONTRAT (condition sur 'retry',
  // `outcome` assigné par `classifyRegisterResponse` seul, aucun try/catch) — cf.
  // e2e-rate-limit-budget.test.ts. Toute autre raison de retenter rompt le contrat.
  // rate-limit-budget: retry-on-request-failure
  for (let attempt = 1; attempt <= REGISTER_ATTEMPTS && outcome === 'retry'; attempt++) {
    if (attempt > 1) {
      console.warn(
        `[setup] register ${account.key} : échec de requête (statuts [${registerStatuses.join(', ')}]), ` +
          `tentative ${attempt}/${REGISTER_ATTEMPTS} (ré-émission seulement si rien d'acquis)`,
      )
    }
    outcome = classifyRegisterResponse(
      await attemptRegister(account, page, registerStatuses, attempt > 1),
    )
  }

  if (outcome !== 'created' && outcome !== 'exists') {
    throw registerFailure(account, outcome, registerStatuses)
  }
  await reachLoginForm(page, outcome)

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
    // Sans ce budget, les retrys (rendu ET requête) expirent avant d'aboutir et le
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
