import { expect, test, type Locator, type Page } from '@playwright/test'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { isThemePreferenceWrite } from './support/theme-preference'

/**
 * #838 (Sprint 116) — L'ÉCHEC DE SAUVEGARDE DU THÈME NE MONTE PLUS LA BANNIÈRE RÉSEAU.
 *
 * LE DÉFAUT. Depuis #833, un 500 sur `PUT /api/me/preferences` ne toaste plus
 * (`inlineHandledStatuses: [500]`, posé par `persistThemeChoice`). Mais l'intercepteur
 * d'`apiClient` classait la santé réseau AVANT le court-circuit : tout `status >= 500`
 * appelait `networkStatusStore.reportServerError()`, et `OfflineBanner`
 * (`[data-testid="network-banner"]`, monté par `app/[locale]/layout.tsx`) s'affichait
 * en `server-error` pour un échec sans conséquence visible — le thème choisi reste
 * appliqué localement.
 *
 * L'ARBITRAGE (dev, S116). Un 500 que la requête déclare traiter inline n'alimente plus
 * le bus #76. Toute AUTRE requête continue de l'alimenter : le témoin ci-dessous le
 * prouve sur la même page, avec un 500 sur une lecture de données sans opt-out.
 *
 * POURQUOI UNE SPEC ET PAS SEULEMENT VITEST (PIT-S102-001). Un test de composant au
 * service mocké ne fait jamais passer la requête par l'intercepteur. Ici, toute la
 * chaîne réelle tourne dans le navigateur : bascule → `useThemeChoice` →
 * `persistThemeChoice` → `updatePreferences` → `apiClient` → intercepteur → store →
 * `OfflineBanner`. Seule la RÉPONSE HTTP est fabriquée (`page.route`).
 *
 * ORACLE D'ATTENTE, PAS DE DÉLAI FIXE. On n'affirme l'absence de bannière qu'APRÈS
 * avoir vu le `console.error('Theme preference save failed', …)` du `catch` de
 * `persistThemeChoice` : il est émis APRÈS l'intercepteur (qui rejette d'abord), donc
 * un `reportServerError()` éventuel a déjà eu lieu. Deux frames de rendu sont ensuite
 * laissées à React avant la lecture.
 *
 * COMPTE PARTAGÉ. Le `PUT` est répondu dans le navigateur et n'atteint jamais le
 * backend : la préférence de `SHARED` reste `null` (même garantie que
 * `keepThemeOffSharedAccount`, qui répond 200 et ne sert donc pas ici).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` ; session par `storageState`.
 */

test.use({ storageState: sessionState(SHARED), viewport: { width: 1280, height: 900 } })

/** Première navigation après une modification : `next dev` recompile (10-20 s). */
const FIRST_NAV_BUDGET = 60_000
const TOGGLE_ID = 'shell-sidebar-theme-toggle'
const SAVE_FAILED_LOG = 'Theme preference save failed'

/** Répond `status` à tout `PUT /api/me/preferences` ; laisse passer le reste. */
async function failThemeSave(page: Page, status: 429 | 500): Promise<string[]> {
  const requested: string[] = []
  await page.route('**/api/me/preferences', async (route) => {
    if (!isThemePreferenceWrite(route.request())) return route.fallback()
    const body = route.request().postDataJSON() as { themePreference?: unknown }
    requested.push(String(body?.themePreference))
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: `e2e-838-${status}` }),
    })
  })
  return requested
}

/** Journal des `console.error` du `catch` de `persistThemeChoice`. */
function watchSaveFailures(page: Page): string[] {
  const seen: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes(SAVE_FAILED_LOG)) {
      seen.push(message.text())
    }
  })
  return seen
}

async function openDashboardInLight(page: Page): Promise<Locator> {
  await neutralizeDevToolingPointerEvents(page)
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('theme', 'light')
    } catch {
      /* stockage indisponible : l'assertion d'état initial le signalera */
    }
  })
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  const toggle = page.getByTestId(TOGGLE_ID)
  await expect(toggle).toBeVisible()
  // PIT-S83-001 : `aria-pressed` n'existe qu'après hydratation (un clic avant = NO-OP).
  await expect(toggle).toHaveAttribute('aria-pressed', /^(true|false)$/)
  return toggle
}

async function isDark(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains('dark'))
}

/** Laisse React committer un éventuel rendu déclenché par le store. */
async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  )
}

async function toggleToDarkWithFailingSave(page: Page, status: 429 | 500): Promise<void> {
  const requested = await failThemeSave(page, status)
  const failures = watchSaveFailures(page)
  const toggle = await openDashboardInLight(page)
  expect(await isDark(page), 'état initial semé : clair').toBe(false)
  await expect(page.getByTestId('network-banner'), 'aucune bannière avant la bascule').toHaveCount(
    0,
  )

  const response = page.waitForResponse(
    (r) => isThemePreferenceWrite(r.request()) && r.status() === status,
  )
  await toggle.click()
  await response

  // Le `catch` de `persistThemeChoice` a été atteint : l'intercepteur est déjà passé.
  await expect
    .poll(() => failures.length, { message: `« ${SAVE_FAILED_LOG} » attendu (catch atteint)` })
    .toBeGreaterThan(0)
  await settleFrames(page)

  expect(requested, 'la bascule a bien été confiée à la persistance de compte').toEqual(['dark'])
  await expect(page.getByTestId('network-banner')).toHaveCount(0)
  await expect(page.getByTestId('app-toast')).toHaveCount(0)
  // Critère 3 : le thème choisi reste appliqué malgré l'échec.
  expect(await isDark(page), 'le thème sombre reste appliqué').toBe(true)
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
}

test.describe('#838 — échec de PUT /api/me/preferences : ni bannière ni toast', () => {
  test('500 : pas de bannière « erreur serveur », pas de toast, thème appliqué', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await toggleToDarkWithFailingSave(page, 500)
  })

  test('429 (#831) : comportement inchangé — ni bannière ni toast, thème appliqué', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await toggleToDarkWithFailingSave(page, 429)
  })

  /**
   * TÉMOIN — la bannière est bien câblée sur CETTE page et le bus reste alimenté par
   * les autres requêtes : un 500 sur la lecture des produits (aucun opt-out) la monte
   * en `server-error`. Sans ce témoin, les deux absences ci-dessus passeraient aussi
   * avec une bannière démontée ou un store débranché.
   */
  test('témoin : un 500 sur une autre requête (sans opt-out) monte la bannière', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.route('**/api/users/*/products', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'e2e-838-witness' }),
          })
        : route.fallback(),
    )
    await neutralizeDevToolingPointerEvents(page)
    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('network-banner')).toHaveAttribute('data-state', 'server-error', {
      timeout: FIRST_NAV_BUDGET,
    })
  })
})
