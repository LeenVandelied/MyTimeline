import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #815 (Sprint 114) — Tabs du DS : au clavier, le focus SUIT la sélection.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC GARDE
 * ─────────────────────────────────────────────────────────────────────────────
 * Motif APG « tablist à activation automatique » : après ←/→/Home/End, l'onglet
 * NOUVELLEMENT sélectionné détient le focus DOM. Avant #815, `ui/tabs.tsx` changeait
 * `aria-selected` sans `.focus()` : le focus restait sur l'onglet quitté, devenu
 * `tabIndex=-1` et non sélectionné (PIT-S107-001, 8/8 configurations au S107).
 *
 * Sur les DEUX consommateurs réels de `Tabs` — `/products` (Produits / Catégories /
 * Archivés, chaque onglet MONTE une vue différente) et la fiche produit (filtre
 * Actifs / Archivés / Tous) —, desktop 1280 et mobile 390 :
 *   · `:focus` porte `aria-selected="true"` après CHAQUE touche (oracle du lead) ;
 *   · c'est bien l'onglet attendu (index), bouclage aux deux extrémités compris ;
 *   · le focus programmatique garde `:focus-visible` (sinon l'anneau disparaît à la
 *     première flèche : régression a11y que Vitest/jsdom ne voit pas) ;
 *   · un seul onglet en `tabIndex=0` (tabIndex itinérant).
 *
 * ARMEMENT : clic sur le 1er onglet (sélection), puis Shift+Tab / Tab — même recette
 * que `sprint-107-tab-focus-outline.spec.ts` : le focus arrive par le CLAVIER, donc
 * `:focus-visible` est armé avant la 1re flèche (PIT-S83-014 : jamais via `.focus()`).
 *
 * CE QU'ELLE NE PROUVE PAS : `SettingsShell` (tablist propre, hors `ui/tabs.tsx`, déjà
 * conforme), Firefox/WebKit, les locales autres que `fr` (les libellés n'entrent pas
 * dans la logique de focus).
 */

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

type Route = 'list' | 'detail'
const TABLIST_TESTID: Record<Route, string> = {
  list: 'products-tabs',
  detail: 'product-detail-filter',
}

async function openTablist(page: Page, route: Route): Promise<Locator> {
  await ensureAuthenticated(page)
  if (route === 'list') {
    await page.goto('/fr/products', { waitUntil: 'domcontentloaded' })
  } else {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S114 Tab'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S114 Tab'),
      categoryId: cat.id,
    })
    await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
  }
  const tablist = page.getByTestId(TABLIST_TESTID[route])
  await expect(tablist).toBeVisible({ timeout: 60_000 })
  return tablist
}

/** L'onglet `idx` est sélectionné, focalisé (clavier), seul en `tabIndex=0`. */
async function expectFocusOn(page: Page, tabs: Locator, idx: number, step: string): Promise<void> {
  const target = tabs.nth(idx)
  await expect(target, `${step} : onglet ${idx} focalisé`).toBeFocused()
  await expect(page.locator(':focus'), `${step} : :focus sélectionné`).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(target, `${step} : tabIndex itinérant`).toHaveAttribute('tabindex', '0')
  expect(
    await target.evaluate((el) => el.matches(':focus-visible')),
    `${step} : :focus-visible conservé après le focus programmatique`,
  ).toBe(true)
  const roving = await tabs.evaluateAll(
    (els) => els.filter((el) => el.getAttribute('tabindex') === '0').length,
  )
  expect(roving, `${step} : un seul onglet en tabIndex=0`).toBe(1)
}

test.use({ storageState: PROD.storageState, colorScheme: 'light' })

for (const route of ['list', 'detail'] as const) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`#815 — ${route} ${vpName}`, () => {
      test.use({ viewport })

      test('←/→/Home/End : le focus suit la sélection, bouclage compris', async ({ page }) => {
        test.setTimeout(90_000)
        const tabs = (await openTablist(page, route)).getByRole('tab')
        const n = await tabs.count()
        expect(n, 'la tablist doit porter au moins 3 onglets').toBeGreaterThanOrEqual(3)
        const last = n - 1

        // Armement clavier sur le 1er onglet (cf. en-tête).
        await tabs.first().click()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        await expectFocusOn(page, tabs, 0, 'armement')

        await page.keyboard.press('ArrowRight')
        await expectFocusOn(page, tabs, 1, '→ depuis 0')

        await page.keyboard.press('ArrowLeft')
        await expectFocusOn(page, tabs, 0, '← depuis 1')

        await page.keyboard.press('ArrowLeft')
        await expectFocusOn(page, tabs, last, '← depuis 0 (bouclage)')

        await page.keyboard.press('ArrowRight')
        await expectFocusOn(page, tabs, 0, '→ depuis le dernier (bouclage)')

        await page.keyboard.press('End')
        await expectFocusOn(page, tabs, last, 'End')

        await page.keyboard.press('Home')
        await expectFocusOn(page, tabs, 0, 'Home')
      })
    })
  }
}
