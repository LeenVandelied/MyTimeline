import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #677 — le verrou modal de `EventFormDrawer` vaut aussi EN MODIFICATION et SOUS UNE
 * CONFIRMATION EMPILÉE. `sprint-86-form-drawer-modal.spec.ts` ne le prouve qu'en création.
 *
 * Trois cas, tous « cover » (le comportement existe) :
 *   1. page figée à côté du panneau, corps du panneau défilant, témoin sans panneau ;
 *   2. confirmation de suppression ouverte puis abandonnée : le panneau redevient utilisable ;
 *   3. la zone principale reste exposée sous le panneau (limite documentée de l'oracle).
 *
 * jsdom ne défile pas : seul le moteur de rendu prouve l'effet.
 *
 * OUVERTURE EN MODIFICATION : frise du détail produit, événement, bouton « Éditer »
 * (chemin desktop, comme `sprint-456-dialog-coverage.spec.ts`).
 *
 * CALE DE HAUTEUR : une cale de 2 000 px est ajoutée en FIN de `shell-main` pour garantir une
 * page défilable quel que soit le compte. Elle suit la frise, que le clic d'ouverture doit
 * atteindre sans défilement préalable.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api`.
 */

const DESKTOP_SHORT = { width: 1280, height: 700 }
const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000
/** À droite de la sidebar (248 px), à gauche du panneau (452 px sur 1280). */
const WHEEL_POINT = { x: 520, y: 400 }
/** Délai laissé à un défilement éventuel avant de relire `scrollY` (preuve négative). */
const SCROLL_SETTLE_MS = 600

test.use({ storageState: sessionState(PROD), viewport: DESKTOP_SHORT })

const readScrollY = (page: Page) => page.evaluate(() => window.scrollY)

/** Compte les ancêtres (soi compris) portant `aria-hidden="true"`. */
const hiddenChain = (locator: ReturnType<Page['locator']>) =>
  locator.locator('xpath=ancestor-or-self::*[@aria-hidden="true"]')

/** Seed, page détail produit avec cale, tiroir d'édition ouvert. */
async function openEditDrawer(page: Page, label: string) {
  await neutralizeDevToolingPointerEvents(page)
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique(`677 ${label} Cat`))
  const product = await seedProduct(page, {
    userId,
    name: unique(`677 ${label} Prod`),
    categoryId: cat.id,
  })

  await page.goto(`/fr/products/${product.id}`, {
    waitUntil: 'domcontentloaded',
    timeout: FIRST_NAV_BUDGET,
  })
  await expect(page.getByTestId('product-detail-timeline')).toBeVisible({
    timeout: FIRST_NAV_BUDGET,
  })
  await page.getByTestId('shell-main').evaluate((el) => {
    const shim = document.createElement('div')
    shim.style.height = '2000px'
    el.append(shim)
  })

  await page.getByTestId('timeline-event').first().click({ timeout: CLICK_BUDGET })
  await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })
  const drawer = page.getByTestId('timeline-edit-dialog')
  await expect(drawer).toBeVisible({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('event-form')).toBeVisible({ timeout: CLICK_BUDGET })
  // Le formulaire se remplit après l'ouverture : on attend qu'il soit stable.
  await page.waitForLoadState('networkidle')
  return { drawer }
}

test.describe('#677 coque de formulaire modale en modification', () => {
  test('edit mode freezes the page scroll while the drawer body still scrolls', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const { drawer } = await openEditDrawer(page, 'T1')
    await expect(drawer).toHaveClass(/(^|\s)mt-drawer--form(\s|$)/)

    // Page défilable : sans cela « scrollY inchangé » serait vrai à vide.
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )
    expect(pageOverflow, 'précondition : la page doit être défilable').toBeGreaterThan(500)

    // Molette À CÔTÉ du panneau : la page ne bouge pas.
    const lockedY = await readScrollY(page)
    await page.mouse.move(WHEEL_POINT.x, WHEEL_POINT.y)
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(SCROLL_SETTLE_MS)
    expect(
      await readScrollY(page),
      'LE DÉFAUT : la page défile sous le panneau en modification',
    ).toBe(lockedY)

    // Molette DANS le panneau : son corps défile, la page reste figée.
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
        message: 'le corps du panneau doit rester défilable sous le verrou',
        timeout: 5_000,
      })
      .toBeGreaterThan(0)
    expect(await readScrollY(page), 'défiler le corps ne doit pas faire défiler la page').toBe(
      lockedY,
    )

    // TÉMOIN : panneau fermé, la même molette au même point fait défiler la page.
    await page.getByTestId('timeline-edit-dialog-close').click({ timeout: CLICK_BUDGET })
    await expect(drawer).toHaveCount(0)
    await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked')
    await page.mouse.move(WHEEL_POINT.x, WHEEL_POINT.y)
    await page.mouse.wheel(0, 400)
    await expect
      .poll(() => readScrollY(page), {
        message: 'TÉMOIN : sans panneau, la molette DOIT faire défiler la page',
        timeout: 5_000,
      })
      .toBeGreaterThan(lockedY)
  })

  test('delete confirmation stacked on the edit drawer then closed leaves the drawer interactive', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const { drawer } = await openEditDrawer(page, 'T2')
    const lockedY = await readScrollY(page)

    await page.getByTestId('event-form-delete').click({ timeout: CLICK_BUDGET })
    // `data-state` : seule la boîte Radix le porte. Le tiroir est un `role="dialog"` maison,
    // rendu `aria-hidden` par la boîte ouverte (`getByRole` ne le verrait plus).
    const confirm = page.locator('[role="dialog"][data-state="open"]')
    await expect(confirm).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(
      hiddenChain(confirm),
      'la confirmation empilée doit rester exposée (non aria-hidden)',
    ).toHaveCount(0)

    await confirm.getByRole('button', { name: 'Annuler' }).click({ timeout: CLICK_BUDGET })
    await expect(confirm).toHaveCount(0)

    // Le panneau n'est plus masqué, accepte un clic et une saisie.
    // GARDE DE NON-RÉGRESSION SUR LA BIBLIOTHÈQUE : le `aria-hidden` posé sur le panneau
    // pendant la confirmation vient du `hideOthers` de Radix, et c'est lui qui le retire. Le
    // `hideOthers` de `EventFormDrawer` ne touche jamais le panneau : en retirer le nettoyage
    // laisse ce test vert (mesuré). Il ne casse que si un code applicatif garde le panneau
    // masqué, ou si Radix / `aria-hidden` cessent de restaurer l'attribut.
    await expect(
      hiddenChain(drawer),
      'le panneau doit redevenir exposé une fois la confirmation fermée',
    ).toHaveCount(0)
    const title = page.getByTestId('event-form-title-input')
    await title.click({ timeout: CLICK_BUDGET })
    // Le clic pose le curseur au milieu du texte : `End` avant de saisir.
    await title.press('End')
    await title.pressSequentially(' 677', { delay: 20 })
    await expect(title).toHaveValue(/ 677$/)

    // La page reste figée.
    await page.mouse.move(WHEEL_POINT.x, WHEEL_POINT.y)
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(SCROLL_SETTLE_MS)
    expect(await readScrollY(page), 'LE DÉFAUT : la page défile après la confirmation').toBe(
      lockedY,
    )
  })

  test('main region stays exposed under the drawer by design (documented oracle limit)', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const { drawer } = await openEditDrawer(page, 'T3')

    // La sidebar est masquée sous le panneau, le panneau ne l'est pas.
    await expect(
      hiddenChain(page.getByTestId('shell-sidebar')),
      'le reste de l’application (sidebar) doit être aria-hidden sous le panneau',
    ).not.toHaveCount(0)
    await expect(hiddenChain(drawer)).toHaveCount(0)

    // LIMITE DE L'ORACLE, VOULUE : `shell-main` reste exposé. `hideOthers` préserve tout
    // élément `[aria-live]` ET SES ANCÊTRES, et la région `aria-live` du zoom de la frise
    // (`TimelineView`, `timeline-live-region`) vit dans `<main>`. Seuls les AUTRES descendants
    // de `<main>` sont masqués. Ce n'est pas une régression : ne pas « corriger » cette
    // assertion en exigeant `main` masqué, et ne pas prendre `main` comme oracle d'inertage
    // (la sidebar en est un valable).
    await expect(
      hiddenChain(page.getByTestId('shell-main')),
      'shell-main doit rester exposé (ancêtre de la région aria-live de la frise)',
    ).toHaveCount(0)
  })
})
