import { expect, test, type Page, type Request } from '@playwright/test'
import { registerOnly, type E2eIdentity } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { isThemePreferenceWrite } from './support/theme-preference'

/**
 * #653 (Sprint 111) — LA PRÉFÉRENCE DE THÈME PORTÉE PAR LE COMPTE, BOUT EN BOUT.
 *
 * Ferme les critères de #642 restés ouverts (ADR-010, BR-AUT-013) :
 *  1. le choix fait AVANT connexion est conservé après, et devient celui du
 *     compte (compte neuf, préférence `null`) ;
 *  2. un compte avec préférence explicite n'est PAS écrasé par le choix local ;
 *  3. la préférence du compte est celle appliquée sur un second appareil.
 *
 * UN SEUL TEST, UN SEUL COMPTE NEUF, DEUX CONNEXIONS. Le filtre de rate-limit est
 * ARMÉ en E2E et le budget `login` de la suite est recompté depuis les sources
 * (`src/__tests__/e2e-rate-limit-budget.test.ts`, lignes `BUDGET` de
 * `application-e2e.properties`) : au pire cas CI (retries: 2), chaque connexion
 * de cette spec en coûte 3. Les critères 2 et 3 sont donc tenus par la MÊME
 * connexion : le second appareil porte un choix local EXPLICITE contraire à celui
 * du compte. Si le compte y gagne, il est appliqué sur un autre appareil (3) ET il
 * n'est pas écrasé par le choix local (2). Un appareil vierge emprunterait la même
 * branche du code (le compte porte une préférence → elle s'applique) sans rien
 * prouver de plus ; les branches sont couvertes une à une par
 * `src/contexts/AuthContext.theme.test.tsx`.
 *
 * COMPTE DÉDIÉ, JAMAIS `SHARED` : on ne peut pas remettre une préférence à `null`
 * par l'API (ADR-010 § 2), la spec muterait définitivement le compte partagé.
 *
 * ORACLES.
 *  - thème effectif : classe `.dark` sur `<html>` ;
 *  - choix local : `localStorage['theme']` (clé imposée à next-themes,
 *    `THEME_STORAGE_KEY`) ;
 *  - préférence du compte : `GET /api/me` (champ `themePreference`) ;
 *  - écritures : les requêtes `PUT /api/me/preferences` ÉMISES par chaque page.
 *
 * ÉTAT INITIAL DÉTERMINISTE : contextes en `colorScheme: 'light'` (défaut
 * Playwright, posé explicitement pour le second) et sans `localStorage` — le
 * thème « système » y est clair, donc tout `.dark` observé vient d'un choix.
 *
 * PRÉREQUIS RUNTIME : backend Spring (:8080) + Postgres migré (V16) + front Next
 * (:3000) avec le proxy `/api`. Aucun storageState : la spec part anonyme.
 */

/** Première navigation après une modification : `next dev` recompile (10-20 s). */
const FIRST_NAV_BUDGET = 60_000
const STORAGE_KEY = 'theme'

async function isDark(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains('dark'))
}

async function storedTheme(page: Page): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY)
}

async function accountThemePreference(page: Page): Promise<unknown> {
  const response = await page.request.get('/api/me')
  expect(response.status(), 'GET /api/me doit répondre 200 (session ouverte)').toBe(200)
  const body = (await response.json()) as { themePreference?: unknown }
  expect(body, 'UserResponse doit TOUJOURS porter la clé themePreference').toHaveProperty(
    'themePreference',
  )
  return body.themePreference
}

/** Valeurs des `PUT /api/me/preferences` émis par `page` (liste vivante). */
function recordThemeWrites(page: Page): string[] {
  const writes: string[] = []
  page.on('request', (request: Request) => {
    if (!isThemePreferenceWrite(request)) return
    const body = request.postDataJSON() as { themePreference?: unknown } | null
    writes.push(String(body?.themePreference))
  })
  return writes
}

/** Connexion par le FORMULAIRE : c'est elle, et elle seule, qui arbitre (S111). */
async function loginViaForm(page: Page, identity: E2eIdentity): Promise<void> {
  await expect(page.getByTestId('login-form')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await page.getByTestId('login-username').fill(identity.username)
  await page.getByTestId('login-password').fill(identity.password)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
}

test.describe('#653 — préférence de thème du compte', () => {
  test('le choix d’avant connexion devient celui du compte, qui gagne ensuite sur un autre appareil', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000)
    await neutralizeDevToolingPointerEvents(page)
    const writesDevice1 = recordThemeWrites(page)

    // ---- 0. Compte NEUF (préférence `null`) ; l'inscription n'ouvre pas de session.
    const identity = await registerOnly(page, 'th')

    // ---- 1. Anonyme : choix SOMBRE sur la landing -----------------------------
    await page.goto('/fr', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    const toggle = page.getByTestId('landing-header-theme-toggle')
    await expect(toggle).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    // Barrière d'hydratation (PIT-S83-001) : `aria-pressed` n'existe qu'après montage.
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(await isDark(page), 'état initial : clair (système clair, aucun choix)').toBe(false)
    expect(await storedTheme(page), 'aucun choix local avant la bascule').toBeNull()

    await toggle.click()
    await expect
      .poll(() => isDark(page), { message: 'la bascule doit passer en sombre' })
      .toBe(true)
    expect(await storedTheme(page)).toBe('dark')
    expect(writesDevice1, 'anonyme : la bascule reste locale, aucun PUT').toEqual([])

    // ---- 2. Connexion : le choix local est CONSERVÉ et ADOPTÉ par le compte ------
    await page.goto('/fr/login', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await loginViaForm(page, identity)

    expect(await isDark(page), 'critère 1 : le sombre choisi avant connexion est conservé').toBe(
      true,
    )
    await expect
      .poll(() => accountThemePreference(page), {
        message: 'critère 1 : le compte neuf adopte le choix local (PUT à la connexion)',
      })
      .toBe('dark')
    expect(writesDevice1, 'une seule écriture, celle de l’arbitrage').toEqual(['dark'])

    // ---- 3. Second appareil, choix local CONTRAIRE, connexion -------------------
    const device2 = await browser.newContext({ colorScheme: 'light' })
    try {
      const page2 = await device2.newPage()
      await neutralizeDevToolingPointerEvents(page2)
      const writesDevice2 = recordThemeWrites(page2)

      await page2.goto('/fr/login', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
      await expect(page2.getByTestId('login-form')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
      // Choix local EXPLICITE « clair » sur cet appareil, appliqué avant connexion.
      await page2.evaluate((k) => window.localStorage.setItem(k, 'light'), STORAGE_KEY)
      await page2.reload({ waitUntil: 'domcontentloaded' })
      expect(await isDark(page2), 'appareil 2 avant connexion : clair (choix local)').toBe(false)

      await loginViaForm(page2, identity)

      await expect
        .poll(() => isDark(page2), {
          message: 'critère 3 : la préférence du compte (sombre) s’applique sur l’appareil 2',
        })
        .toBe(true)
      expect(await storedTheme(page2), 'le choix local est remplacé par celui du compte').toBe(
        'dark',
      )
      // Critère 2 : le choix local « clair » n'a PAS été écrit sur le compte.
      expect(writesDevice2, 'compte avec préférence : aucune écriture à la connexion').toEqual([])
      expect(await accountThemePreference(page2)).toBe('dark')
    } finally {
      await device2.close()
    }
  })
})
