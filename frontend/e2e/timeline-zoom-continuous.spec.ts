import { test, expect } from './support/fixtures'
import { type Locator, type Page } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #593 — Zoom CONTINU au Ctrl + molette : le point regardé reste sous le curseur.
 *
 * jsdom ne défile ni ne rabat `scrollLeft` : seul un vrai rail montre si l'ancre
 * tient. Le curseur est posé sur la date d'un ponctuel semé aujourd'hui (centre du
 * pin = bord gauche du bouton + demi-pin), puis la molette zoome plusieurs fois.
 * Après chaque cran, la date du pin doit rester sous le curseur à quelques pixels près.
 */

test.use({ storageState: sessionState(PROD) })

/** Demi-largeur du pin (`PIN_HALF_WIDTH_PX`, zoom.ts) : la date est au centre du pin. */
const PIN_HALF_WIDTH_PX = 5
/** Tolérance : `scrollLeft` est entier, la re-projection arrondit au pixel. */
const TOLERANCE_PX = 3

/** Largeur peinte du rail : étendue en jours × px par jour + gouttière, suit l'échelle. */
async function railWidth(page: Page): Promise<number> {
  return page
    .getByTestId('timeline-scroll')
    .evaluate((el) => (el.firstElementChild as HTMLElement).getBoundingClientRect().width)
}

/** Abscisse écran de la date du pin, après arrêt du défilement (deux lectures égales). */
async function settledPinDateX(page: Page, pin: Locator): Promise<number> {
  const scroll = page.getByTestId('timeline-scroll')
  let previous = Number.NaN
  for (let i = 0; i < 20; i++) {
    const current = await scroll.evaluate((el) => el.scrollLeft)
    if (current === previous) break
    previous = current
    await page.waitForTimeout(100)
  }
  const box = await pin.boundingBox()
  expect(box, 'le pin semé doit rester monté pendant le zoom').not.toBeNull()
  return box!.x + PIN_HALF_WIDTH_PX
}

test.describe('#593 — zoom continu ancré sous le curseur', () => {
  test('day under cursor stays under cursor during ctrl wheel zoom', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S593 Zoom Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S593 Zoom Prod'),
      categoryId: cat.id,
    })

    await ensureAuthenticated(page)
    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-screen')).toBeVisible()

    const pin = page.locator(
      `[data-testid="timeline-event"][data-event-title="${product.name}"]`,
    )
    await expect(pin).toBeVisible()

    const cursorX = await settledPinDateX(page, pin)
    const pinBox = await pin.boundingBox()
    const cursorY = pinBox!.y + pinBox!.height / 2
    await page.mouse.move(cursorX, cursorY)

    // Trois crans avant, puis deux arrière : chaque étape garde la date sous le curseur.
    const steps = [-100, -100, -100, 100, 100]
    await page.keyboard.down('Control')
    try {
      for (const [i, deltaY] of steps.entries()) {
        const widthBefore = await railWidth(page)
        await page.mouse.wheel(0, deltaY)
        const x = await settledPinDateX(page, pin)
        // L'utilisateur zoome bien : l'échelle change dans le sens du cran.
        const widthAfter = await railWidth(page)
        const scaleMsg = `cran ${i + 1} (deltaY ${deltaY}) : rail de ${widthBefore} px à ${widthAfter} px`
        if (deltaY < 0) expect(widthAfter, scaleMsg).toBeGreaterThan(widthBefore)
        else expect(widthAfter, scaleMsg).toBeLessThan(widthBefore)
        expect(
          Math.abs(x - cursorX),
          `cran ${i + 1} (deltaY ${deltaY}) : date du pin à ${x} px, curseur à ${cursorX} px`,
        ).toBeLessThanOrEqual(TOLERANCE_PX)
      }
    } finally {
      await page.keyboard.up('Control')
    }
  })
})
