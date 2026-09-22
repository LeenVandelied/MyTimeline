import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { gotoProducts, openCategoriesTab, seedCategory, unique } from './support/products'

/**
 * #732 + #740 (Sprint 100) — LA CROIX DE `DialogContent` RESTE ATTEIGNABLE APRÈS DÉFILEMENT.
 *
 * LE DÉFAUT. La croix « ✕ » de `ui/dialog.tsx` était `absolute top-4 right-4` À
 * L'INTÉRIEUR du `[role="dialog"]`. Les bottom sheets `ProductDrawer` et
 * `CategoryDrawer` posent `overflow-y-auto` sur ce MÊME élément : il est donc le
 * conteneur défilant, et un descendant `absolute` d'un conteneur défilant défile
 * avec le contenu (PIT-S96-004). Mesuré au S95 (#714) : croix à `y = -12` à
 * 390×600 une fois le formulaire défilé.
 *
 * CE QUE LA SPEC MESURE, sur un viewport COURT (390×600, sheet clampée à 92vh) :
 *   1. le dialog DÉBORDE réellement et a RÉELLEMENT défilé jusqu'en bas
 *      (`scrollTop` relu, pas supposé) — sans ces deux prémisses l'assertion
 *      suivante serait vacuous : une mesure à l'ouverture ne verrait rien ;
 *   2. la boîte de la croix, STABILISÉE (PIT-S54-003), est entièrement dans le
 *      viewport ;
 *   3. la croix est le nœud touché en son centre (`elementFromPoint`) — elle n'est
 *      pas recouverte par le contenu qui défile dessous ;
 *   4. un clic SOURIS à ses coordonnées ferme le dialog. `locator.click()` est
 *      volontairement écarté : Playwright ramène la cible dans le viewport avant de
 *      cliquer, ce qui re-défilerait le dialog et rendrait le test vert sur le code
 *      défectueux.
 *
 * NON-RÉGRESSION (sans défilement) : sur `DeleteConfirmDialog` desktop, la croix est
 * toujours à `top-4 right-4` du bord de la boîte du dialog (±2 px, même tolérance que
 * `sprint-95-toast-overlap`).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const SHORT = { width: 390, height: 600 } as const
const DESKTOP = { width: 1280, height: 800 } as const
const CLICK_BUDGET = 15_000
/** `top-4` / `right-4` de la croix (`ui/dialog.tsx`). */
const CLOSE_INSET = 16
/** Tolérance de sous-pixel / bordure 1 px. Jamais un moyen d'absorber une dérive. */
const EPSILON = 2

type Box = { x: number; y: number; width: number; height: number }

const fmt = (b: Box) =>
  `x=${Math.round(b.x)} y=${Math.round(b.y)} w=${Math.round(b.width)} h=${Math.round(b.height)}`

/** Boîte STABILISÉE (PIT-S54-003) : deux lectures consécutives égales. */
async function stableBox(locator: Locator, label: string): Promise<Box> {
  const reads: { previous: Box | null; stable: Box | null } = { previous: null, stable: null }
  await expect
    .poll(
      async () => {
        const current = await locator.boundingBox()
        const last = reads.previous
        const same =
          current !== null &&
          last !== null &&
          Math.abs(current.x - last.x) < 0.5 &&
          Math.abs(current.y - last.y) < 0.5 &&
          Math.abs(current.width - last.width) < 0.5 &&
          Math.abs(current.height - last.height) < 0.5
        reads.previous = current
        if (same) reads.stable = current
        return same
      },
      { timeout: CLICK_BUDGET, message: `boîte de « ${label} » jamais stabilisée` },
    )
    .toBe(true)
  if (!reads.stable) throw new Error(`boîte de « ${label} » non stabilisée`)
  return reads.stable
}

/**
 * Défile le dialog jusqu'en bas, puis relit l'état : le test n'a de sens que si le
 * contenu DÉBORDE et si le défilement a EU LIEU.
 */
async function scrollDialogToBottom(dialog: Locator, label: string): Promise<void> {
  const m = await dialog.evaluate((el) => {
    el.scrollTop = el.scrollHeight
    return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
  })
  expect(
    m.scrollHeight,
    `${label} : le contenu doit DÉBORDER à ${SHORT.width}×${SHORT.height} (scrollHeight=${m.scrollHeight}, clientHeight=${m.clientHeight}), sinon la mesure est vacuous`,
  ).toBeGreaterThan(m.clientHeight)
  await expect
    .poll(() => dialog.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop), {
      timeout: CLICK_BUDGET,
      message: `${label} : le dialog doit être défilé jusqu'en bas`,
    })
    .toBeLessThanOrEqual(1)
}

/** Croix dans le viewport, non recouverte, et qui ferme le dialog au clic souris. */
async function expectCloseReachable(page: Page, dialog: Locator, label: string): Promise<void> {
  const close = dialog.getByRole('button', { name: 'Close' })
  const box = await stableBox(close, `croix ${label}`)
  const vp = page.viewportSize()
  if (!vp) throw new Error('viewport inconnu')

  expect(box.y, `${label} : croix au-dessus du viewport (${fmt(box)})`).toBeGreaterThanOrEqual(0)
  expect(box.x, `${label} : croix à gauche du viewport (${fmt(box)})`).toBeGreaterThanOrEqual(0)
  expect(
    box.y + box.height,
    `${label} : croix sous le viewport (${fmt(box)}, H=${vp.height})`,
  ).toBeLessThanOrEqual(vp.height)
  expect(
    box.x + box.width,
    `${label} : croix à droite du viewport (${fmt(box)}, W=${vp.width})`,
  ).toBeLessThanOrEqual(vp.width)

  // L'invariant « croix à `top-4` du haut du dialog » tient désormais À TOUT
  // `scrollTop`, pas seulement à défilement nul (PIT-S96-004).
  const dialogBox = await stableBox(dialog, `dialog ${label}`)
  expect(
    Math.abs(box.y - (dialogBox.y + CLOSE_INSET)),
    `${label} : croix à top-4 du dialog APRÈS défilement (dialog ${fmt(dialogBox)}, croix ${fmt(box)})`,
  ).toBeLessThanOrEqual(EPSILON)

  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const hitsClose = await close.evaluate(
    (el, p) => {
      const hit = document.elementFromPoint(p.x, p.y)
      return hit !== null && (hit === el || el.contains(hit))
    },
    { x: cx, y: cy },
  )
  expect(hitsClose, `${label} : le centre de la croix doit toucher la croix, pas le contenu`).toBe(
    true,
  )

  await page.mouse.click(cx, cy)
  await expect(dialog, `${label} : le clic sur la croix doit fermer le dialog`).toBeHidden({
    timeout: CLICK_BUDGET,
  })
}

test.describe('#732/#740 — croix atteignable après défilement (390×600)', () => {
  test.use({ storageState: PROD.storageState, viewport: SHORT })

  test('ProductDrawer : croix dans le viewport et cliquable, formulaire défilé en bas', async ({
    page,
  }) => {
    await neutralizeDevToolingPointerEvents(page)
    await gotoProducts(page)
    await page.getByTestId('products-new-button').click({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('product-drawer-form')).toBeVisible({ timeout: CLICK_BUDGET })
    const dialog = page
      .locator('[role="dialog"]')
      .filter({ has: page.getByTestId('product-drawer-form') })
    await stableBox(dialog, 'sheet ProductDrawer')

    await scrollDialogToBottom(dialog, 'ProductDrawer')
    await expectCloseReachable(page, dialog, 'ProductDrawer')
  })

  test('CategoryDrawer : croix dans le viewport et cliquable, formulaire défilé en bas', async ({
    page,
  }) => {
    await neutralizeDevToolingPointerEvents(page)
    await openCategoriesTab(page)
    await page.getByTestId('categories-new-button').click({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('category-drawer-form')).toBeVisible({ timeout: CLICK_BUDGET })
    const dialog = page.getByTestId('category-drawer')
    await stableBox(dialog, 'sheet CategoryDrawer')

    await scrollDialogToBottom(dialog, 'CategoryDrawer')
    await expectCloseReachable(page, dialog, 'CategoryDrawer')
  })
})

test.describe('#732/#740 — non-régression sans défilement (desktop)', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('DeleteConfirmDialog : croix à top-4 right-4 du dialog', async ({ page }) => {
    await neutralizeDevToolingPointerEvents(page)
    const cat = await seedCategory(page, unique('S100 Close Cat'))
    await openCategoriesTab(page)
    await page.getByTestId(`categories-delete-${cat.id}`).click({ timeout: CLICK_BUDGET })
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: CLICK_BUDGET })

    const dialogBox = await stableBox(dialog, 'DeleteConfirmDialog')
    const close = dialog.getByRole('button', { name: 'Close' })
    const box = await stableBox(close, 'croix DeleteConfirmDialog')

    expect(
      Math.abs(box.y - (dialogBox.y + CLOSE_INSET)),
      `croix à top-4 (dialog ${fmt(dialogBox)}, croix ${fmt(box)})`,
    ).toBeLessThanOrEqual(EPSILON)
    expect(
      Math.abs(dialogBox.x + dialogBox.width - (box.x + box.width) - CLOSE_INSET),
      `croix à right-4 (dialog ${fmt(dialogBox)}, croix ${fmt(box)})`,
    ).toBeLessThanOrEqual(EPSILON)

    await close.click({ timeout: CLICK_BUDGET })
    await expect(dialog).toBeHidden({ timeout: CLICK_BUDGET })
  })
})
