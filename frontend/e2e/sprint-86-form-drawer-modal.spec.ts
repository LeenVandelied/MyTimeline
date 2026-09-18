import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * Revue S86 (MAJEUR) — LA COQUE DE FORMULAIRE EST MODALE AU SENS COMPLET.
 *
 * #618 a remplacé en édition un `Dialog` Radix par la coque maison `EventFormDrawer`,
 * sans reprendre deux acquis du `Dialog` : verrou de défilement de page
 * (`RemoveScroll`) et fond inerte (`hideOthers`). La correction les applique aux DEUX
 * modes. Les tests unitaires (`EventFormDrawer.test.tsx`) prouvent que le verrou est
 * POSÉ et LEVÉ ; jsdom ne défile pas ([[jsdom-scroll-tests-prove-nothing]]) — seul un
 * moteur de rendu prouve l'effet.
 *
 * CE QUE LA SPEC PROUVE (création, chemin atteignable >= lg, puis variante sheet par
 * rétrécissement comme `sprint-63-de-overflow-audit`) :
 *   1. TÉMOIN — sans panneau, la même molette au même point FAIT défiler la page
 *      (sans lui, « scrollY inchangé » serait vrai vacuellement) ;
 *   2. panneau ouvert, une molette sur le scrim ne fait PAS défiler la page ;
 *   3. le fond est inerte (`aria-hidden` au-dessus de la sidebar), le panneau ne l'est pas ;
 *   4. un `Select` Radix ouvert depuis le panneau n'est PAS `aria-hidden` et reste
 *      utilisable (choix d'un produit) ;
 *   5. le corps du drawer défile encore À LA MOLETTE ;
 *   6. en bottom sheet (< lg), la molette sur le scrim ne fait pas défiler la page ;
 *   7. à la fermeture, fond et page sont libérés.
 *
 * FIXTURE DE HAUTEUR : une cale de 2 000 px est insérée EN TÊTE de `shell-main` pour
 * garantir une page défilable quel que soit le volume de données du compte partagé. Elle
 * est en flux (le document défile au niveau fenêtre : `AppShell` est `min-h-screen`,
 * `<main>` sans `overflow`) et sous le point de molette, qui ne survole donc aucun
 * défileur interne de la frise.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api`.
 */

const DESKTOP_SHORT = { width: 1280, height: 700 }
const SHEET = { width: 800, height: 700 }
const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000
/** Point de molette : à droite de la sidebar (248 px), à gauche du drawer (452 px). */
const WHEEL_POINT = { x: 520, y: 400 }
/** Point de molette en sheet : au-dessus de la feuille (`max-height: 80vh`). */
const SHEET_SCRIM_POINT = { x: 400, y: 40 }
/** Délai laissé à un défilement éventuel avant de relire `scrollY` (preuve négative). */
const SCROLL_SETTLE_MS = 600
const START_SCROLL_Y = 300

test.describe('revue S86 — coque de formulaire modale (verrou de défilement + fond inerte)', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP_SHORT })

  test('la page est figée sous le scrim, le fond inerte, le Select et le corps utilisables', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)

    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S86 Modal Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S86 Modal Prod'),
      categoryId: cat.id,
    })

    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    const main = page.getByTestId('shell-main')
    await expect(main).toBeVisible({ timeout: FIRST_NAV_BUDGET })

    await main.evaluate((el) => {
      const shim = document.createElement('div')
      shim.style.height = '2000px'
      el.prepend(shim)
    })
    const readScrollY = () => page.evaluate(() => window.scrollY)

    // ── (1) TÉMOIN : sans panneau, la molette fait défiler la page ─────────────
    await page.evaluate((y) => window.scrollTo(0, y), START_SCROLL_Y)
    await expect.poll(readScrollY).toBe(START_SCROLL_Y)
    await page.mouse.move(WHEEL_POINT.x, WHEEL_POINT.y)
    await page.mouse.wheel(0, 400)
    await expect
      .poll(readScrollY, {
        message: 'TÉMOIN : sans panneau, la molette DOIT faire défiler la page',
        timeout: 5_000,
      })
      .toBeGreaterThan(START_SCROLL_Y)
    await page.evaluate((y) => window.scrollTo(0, y), START_SCROLL_Y)
    await expect.poll(readScrollY).toBe(START_SCROLL_Y)

    // ── Ouverture (bouton dans la sidebar `sticky`, visible à tout défilement) ──
    await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(panel).toHaveClass(/(^|\s)mt-drawer--form(\s|$)/)

    // ── (3) FOND INERTE ─────────────────────────────────────────────────────────
    // Oracle = le bouton de la SIDEBAR, pas `shell-main` : `hideOthers` (comme le
    // `Dialog` Radix, même appel) préserve tout élément `[aria-live]` ET SES ANCÊTRES.
    // La région `aria-live` du zoom de la frise (`TimelineView`) vit dans `<main>` :
    // `app-shell` et `<main>` restent donc exposés, leurs AUTRES descendants sont
    // masqués. Mesuré au S86 (overlay, devtools, annonceur de route : `aria-hidden`).
    const sidebarButton = page.getByTestId('shell-sidebar-new-event-button')
    await expect(
      sidebarButton.locator('xpath=ancestor-or-self::*[@aria-hidden="true"]'),
      'le reste de l’application (sidebar) doit être aria-hidden sous le panneau',
    ).not.toHaveCount(0)
    await expect(panel.locator('xpath=ancestor-or-self::*[@aria-hidden="true"]')).toHaveCount(0)

    // ── (4) SELECT RADIX ouvert depuis le panneau ───────────────────────────────
    await page
      .getByTestId('shell-new-event-drawer-product-trigger')
      .click({ timeout: CLICK_BUDGET })
    const listbox = page.getByRole('listbox')
    await expect(listbox, 'la liste du Select doit rester exposée (non aria-hidden)').toBeVisible({
      timeout: CLICK_BUDGET,
    })
    await expect(listbox.locator('xpath=ancestor-or-self::*[@aria-hidden="true"]')).toHaveCount(0)
    await page.getByTestId(`product-option-${product.id}`).click({ timeout: CLICK_BUDGET })
    await expect(listbox).toHaveCount(0)
    await expect(page.getByTestId('event-form')).toBeVisible({ timeout: CLICK_BUDGET })

    // ── (2) MOLETTE SUR LE SCRIM : la page ne bouge pas ─────────────────────────
    const lockedY = await readScrollY()
    await page.mouse.move(WHEEL_POINT.x, WHEEL_POINT.y)
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(SCROLL_SETTLE_MS)
    expect(await readScrollY(), 'LE DÉFAUT : la page défilait sous le scrim du panneau').toBe(
      lockedY,
    )

    // ── (5) LE CORPS DU DRAWER DÉFILE ENCORE, à la molette ──────────────────────
    const body = page.locator('.mt-drawer__body')
    const overflow = await body.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(
      overflow,
      'précondition : le corps doit déborder pour que son défilement prouve quelque chose',
    ).toBeGreaterThan(80)
    const bodyBox = await body.boundingBox()
    expect(bodyBox).not.toBeNull()
    await page.mouse.move(bodyBox!.x + bodyBox!.width / 2, bodyBox!.y + bodyBox!.height / 2)
    await page.mouse.wheel(0, 300)
    await expect
      .poll(() => body.evaluate((el) => el.scrollTop), {
        message: 'le corps du drawer doit rester défilable sous le verrou',
        timeout: 5_000,
      })
      .toBeGreaterThan(0)
    expect(await readScrollY(), 'défiler le corps ne doit pas faire défiler la page').toBe(lockedY)

    // ── (6) BOTTOM SHEET (< lg) : même verrou ───────────────────────────────────
    await page.setViewportSize(SHEET)
    await expect(panel).toHaveClass(/(^|\s)mt-sheet(\s|$)/)
    const sheetY = await readScrollY()
    await page.mouse.move(SHEET_SCRIM_POINT.x, SHEET_SCRIM_POINT.y)
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(SCROLL_SETTLE_MS)
    expect(await readScrollY(), 'sheet : la page défilait sous le scrim').toBe(sheetY)

    // ── (7) FERMETURE : fond et page libérés ────────────────────────────────────
    await page.getByTestId('shell-new-event-drawer-close').click({ timeout: CLICK_BUDGET })
    await expect(panel).toHaveCount(0)
    await expect(
      sidebarButton.locator('xpath=ancestor-or-self::*[@aria-hidden="true"]'),
    ).toHaveCount(0)
    await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked')
  })
})
