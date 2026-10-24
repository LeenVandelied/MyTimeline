import { expect, test, type Locator, type Page } from '@playwright/test'
import { SHARED } from './support/accounts'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { keepThemeOffSharedAccount } from './support/theme-preference'

/**
 * #655 (Sprint 111) — LES BASCULES DE THÈME APPLICATIVES, APRÈS UNIFICATION.
 *
 * LE TROU COUVERT. `landing-auth-theme-toggle.spec.ts` (#642) exerce la bascule
 * des surfaces PUBLIQUES (gabarit `icon`). Les deux bascules derrière
 * l'authentification — pied de sidebar du shell (`shell-sidebar-theme-toggle`,
 * gabarit `square`) et tiroir mobile du dashboard
 * (`dashboard-mobile-drawer-theme-toggle`, gabarit `labeled`) — n'étaient
 * couvertes par AUCUNE spec : seuls des tests jsdom, qui ne compilent aucun CSS
 * et ne prouvent donc ni que l'icône suit le thème, ni que le bouton est
 * atteignable. #655 les a remplacées par `ui/theme-toggle.tsx` : cette spec
 * vérifie, dans un vrai moteur, qu'elles basculent toujours le thème et que leur
 * rendu suit les DEUX thèmes.
 *
 * ORACLES.
 *  - thème effectif = classe `.dark` sur `<html>` (celle que lisent les tokens du
 *    DS et la variante `dark:` de Tailwind) ;
 *  - état annoncé = `aria-pressed` (vrai ⇔ sombre) ;
 *  - rendu = l'icône PEINTE (`lucide-sun` en sombre, `lucide-moon` en clair) :
 *    les deux sont dans le DOM, c'est le CSS `dark:` qui tranche — un CSS non
 *    compilé les peindrait toutes les deux, ce que `toBeHidden` attrape ;
 *  - gabarit `labeled` : le libellé visible nomme la DESTINATION (fr : « Sombre »
 *    en clair, « Clair » en sombre — `common.theme.dark/light`) ;
 *  - cible tactile (#830, Sprint 112) : boîte >= 44×44 pour les DEUX gabarits, même
 *    assertion `boundingBox` ; `labeled` mesuré à 375 px en clair ET en sombre
 *    (36 px de haut avant #830, hérités du `h-9` de la cva `Button`).
 *
 * BARRIÈRE D'HYDRATATION (PIT-S83-001). Un clic sur un bouton rendu mais pas
 * encore hydraté est un NO-OP silencieux. La bascule ne pose `aria-pressed`
 * qu'après sa garde `mounted` : on attend donc l'attribut AVANT de cliquer,
 * jamais un réessai (la bascule n'est pas idempotente).
 *
 * ÉTAT INITIAL DÉTERMINISTE. `localStorage.theme` est semé à `light` par
 * `addInitScript` avant tout script de la page : la spec ne dépend ni de la
 * préférence OS de l'image CI ni d'un résidu du `storageState`. On ne recharge
 * pas la page après le semis (il serait rejoué et écraserait le choix).
 *
 * ⚠ COMPTE PARTAGÉ (#653). Depuis que le choix est persisté SUR LE COMPTE,
 * chaque bascule authentifiée émet `PUT /api/me/preferences`. « Restaurer en fin
 * de test » est impossible (l'API ne remet jamais une préférence à `null`) : le
 * `PUT` est donc répondu dans le navigateur par `keepThemeOffSharedAccount`
 * (`support/theme-preference.ts`) et n'atteint pas le backend — le compte
 * `SHARED` reste sans préférence. La spec vérifie en revanche que chaque bascule
 * a bien été CONFIÉE à la persistance de compte (valeurs des `PUT` émis). La
 * persistance réelle est couverte par `sprint-111-theme-account-preference`.
 *
 * PRÉREQUIS RUNTIME : backend Spring (:8080) + Postgres migré + front Next
 * (:3000) avec le proxy `/api`. Auth par `storageState` (projet `setup`).
 */

test.use({ storageState: SHARED.storageState })

/** Première navigation après une modification : `next dev` recompile (10-20 s). */
const FIRST_NAV_BUDGET = 60_000

async function seedLightTheme(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('theme', 'light')
    } catch {
      /* stockage indisponible : l'assertion d'état initial le signalera */
    }
  })
}

async function openDashboard(page: Page): Promise<string[]> {
  await neutralizeDevToolingPointerEvents(page)
  const themeWrites = await keepThemeOffSharedAccount(page)
  await seedLightTheme(page)
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  return themeWrites
}

/** #653 — chaque bascule authentifiée est confiée à la persistance de compte. */
async function expectThemeWrites(themeWrites: string[], expected: string[]): Promise<void> {
  await expect
    .poll(() => [...themeWrites], {
      message: 'chaque bascule authentifiée doit émettre PUT /api/me/preferences (#653)',
    })
    .toEqual(expected)
}

async function isDark(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains('dark'))
}

/** Barrière nommée : `aria-pressed` n'existe qu'après la garde `mounted`. */
async function waitForToggleHydrated(toggle: Locator, testId: string): Promise<void> {
  await expect(
    toggle,
    `${testId} : \`aria-pressed\` absent — sous-arbre non hydraté, un clic serait un NO-OP`,
  ).toHaveAttribute('aria-pressed', /^(true|false)$/)
}

/** Vérifie le rendu de la bascule dans le thème `dark` attendu. */
async function expectToggleRendersTheme(toggle: Locator, dark: boolean): Promise<void> {
  await expect(toggle).toHaveAttribute('aria-pressed', String(dark))
  const sun = toggle.locator('svg.lucide-sun')
  const moon = toggle.locator('svg.lucide-moon')
  if (dark) {
    await expect(sun, 'en sombre, le soleil (destination clair) est peint').toBeVisible()
    await expect(moon, 'en sombre, la lune est masquée par `dark:hidden`').toBeHidden()
  } else {
    await expect(moon, 'en clair, la lune (destination sombre) est peinte').toBeVisible()
    await expect(sun, 'en clair, le soleil est masqué (`hidden dark:block`)').toBeHidden()
  }
}

/** Clique puis attend l'inversion RÉELLE de `.dark` sur `<html>`. */
async function clickAndExpectFlip(page: Page, toggle: Locator, testId: string): Promise<boolean> {
  const before = await isDark(page)
  await toggle.click()
  await expect
    .poll(() => isDark(page), {
      message: `la classe .dark de <html> doit s'inverser après clic sur ${testId}`,
    })
    .toBe(!before)
  return !before
}

/**
 * #830 — cible tactile du gabarit `labeled` : MÊME assertion `boundingBox` que celle
 * du gabarit `square` ci-dessous, relevée dans le thème courant (le test l'appelle en
 * clair ET en sombre : la hauteur ne doit dépendre d'aucune variante `dark:`).
 */
async function expectLabeledToggleTouchable(toggle: Locator, theme: string): Promise<void> {
  const box = await toggle.boundingBox()
  console.log(`[#830 ${theme}] dashboard-mobile-drawer-theme-toggle=${box?.width}x${box?.height}`)
  expect(box?.width, `largeur de la bascule du tiroir (${theme})`).toBeGreaterThanOrEqual(44)
  expect(box?.height, `hauteur de la bascule du tiroir (${theme})`).toBeGreaterThanOrEqual(44)
}

test.describe('#655 — bascules de thème applicatives unifiées', () => {
  test.describe('shell — pied de sidebar (desktop, gabarit square)', () => {
    test.use({ viewport: { width: 1280, height: 900 } })

    test('bascule clair → sombre → clair, rendu et état suivent', async ({ page }) => {
      test.setTimeout(120_000)
      const testId = 'shell-sidebar-theme-toggle'
      const themeWrites = await openDashboard(page)

      const toggle = page.getByTestId(testId)
      await expect(toggle).toBeVisible()
      await waitForToggleHydrated(toggle, testId)

      // Cible tactile du gabarit `square` : 44×44 (h-11 w-11).
      const box = await toggle.boundingBox()
      expect(box?.width, 'largeur de la bascule du shell').toBeGreaterThanOrEqual(44)
      expect(box?.height, 'hauteur de la bascule du shell').toBeGreaterThanOrEqual(44)

      expect(await isDark(page), 'état initial semé : clair').toBe(false)
      await expectToggleRendersTheme(toggle, false)
      await expect(toggle).toHaveAttribute('aria-label', 'Passer au thème sombre')

      expect(await clickAndExpectFlip(page, toggle, testId)).toBe(true)
      await expectToggleRendersTheme(toggle, true)
      await expect(toggle).toHaveAttribute('aria-label', 'Passer au thème clair')

      expect(await clickAndExpectFlip(page, toggle, testId)).toBe(false)
      await expectToggleRendersTheme(toggle, false)
      await expectThemeWrites(themeWrites, ['dark', 'light'])
    })
  })

  test.describe('tiroir mobile du dashboard (375 px, gabarit labeled)', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('bascule clair → sombre → clair, libellé et rendu suivent', async ({ page }) => {
      test.setTimeout(120_000)
      const testId = 'dashboard-mobile-drawer-theme-toggle'
      const themeWrites = await openDashboard(page)

      const hamburger = page.getByTestId('dashboard-mobile-menu-button')
      const drawer = page.getByTestId('dashboard-mobile-drawer')
      await expect(hamburger).toBeVisible()
      // Ouvrir est IDEMPOTENT : le réessai sous `toPass` absorbe un premier clic
      // perdu avant hydratation (motif `openMenu` de `landing-mobile-menu.spec.ts`).
      await expect(async () => {
        if (!(await drawer.isVisible())) await hamburger.click()
        await expect(drawer).toBeVisible({ timeout: 2_000 })
      }).toPass({ timeout: 30_000 })

      const toggle = drawer.getByTestId(testId)
      await expect(toggle).toBeVisible()
      await waitForToggleHydrated(toggle, testId)

      expect(await isDark(page), 'état initial semé : clair').toBe(false)
      await expectToggleRendersTheme(toggle, false)
      await expect(toggle).toHaveText('Sombre')
      await expectLabeledToggleTouchable(toggle, 'clair')

      expect(await clickAndExpectFlip(page, toggle, testId)).toBe(true)
      await expectToggleRendersTheme(toggle, true)
      await expect(toggle).toHaveText('Clair')
      await expectLabeledToggleTouchable(toggle, 'sombre')
      // Le tiroir reste ouvert : la bascule ne ferme pas le dialog.
      await expect(drawer).toBeVisible()

      expect(await clickAndExpectFlip(page, toggle, testId)).toBe(false)
      await expectToggleRendersTheme(toggle, false)
      await expect(toggle).toHaveText('Sombre')
      await expectThemeWrites(themeWrites, ['dark', 'light'])
    })
  })
})
