import { expect, test } from './support/fixtures'
import { type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { deleteProduct, getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #480 (Sprint 100) — RÉSERVE BASSE SOUS LE FAB MOBILE.
 *
 * LE DÉFAUT COUVERT. Sous 768 px (`md`, et non `lg` comme l'énonçait l'issue : le
 * FAB est `md:hidden` depuis #298), le bouton flottant « Nouvel événement »
 * (`shell-mobile-new-event-button`, 52 px, `fixed`, `bottom: --space-6 + safe-area`)
 * est peint par-dessus le contenu. Sans réserve, une fois la page défilée tout en
 * bas, le dernier élément de l'écran (liens de l'`AppFooter` compris) pouvait finir
 * SOUS le bouton : visible mais inatteignable. Correctif : `shell-main` porte un
 * `max-md:pb-[calc(--space-13 + --space-6 + --space-4 + safe-area)]`.
 *
 * TROIS ORACLES PAR ÉCRAN (dashboard, timeline, produits, fiche produit, réglages) :
 *   1. SONDE SYNTHÉTIQUE — un bouton pleine largeur est ajouté EN FIN de
 *      `shell-main`, c.-à-d. au point le plus bas que le contenu d'un écran puisse
 *      atteindre. Page défilée en bas, il doit finir AU-DESSUS du haut du FAB et
 *      recevoir le pointeur à son centre ET sous l'aplomb du FAB.
 *   2. TÉMOIN — même mesure après avoir forcé `padding-bottom: 0` sur `shell-main` :
 *      la sonde DOIT alors croiser le FAB. Sans ce témoin, l'oracle 1 pourrait être
 *      vert parce que la page ne défile pas ou parce que le FAB n'est pas peint
 *      (famille [[PIT-S54-003]] : oracle positif obligatoire).
 *   3. ÉLÉMENT RÉEL — le plus bas des éléments focusables de `shell-main` qui sont
 *      dans la fenêtre en largeur (les carrousels et la frise défilent en X) doit
 *      finir au-dessus du FAB et recevoir le pointeur à son centre. Oracle NON armé
 *      par construction sur les écrans dont le dernier élément est loin du bas (ex.
 *      état vide centré de la frise) — c'est la sonde 1+2 qui porte la preuve.
 *
 * `elementFromPoint` n'est utilisé que sur des éléments qui reçoivent le pointeur
 * ([[PIT-S94-004]] : `.mt-tlm__lane-label` est `pointer-events:none`) : les candidats
 * de l'oracle 3 sont filtrés pour que le point désigne l'élément OU le FAB (ce qui
 * écarte les éléments rognés par un défileur, et garde ceux que le FAB masquerait).
 *
 * DESKTOP (1280 px) : `padding-bottom` calculé de `shell-main` = 0 et FAB non peint.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (cf. `playwright.config.ts`).
 */

test.use({ storageState: PROD.storageState })

/** Portrait mobile de référence (iPhone 14). */
const MOBILE_PORTRAIT = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 900 }
const FIRST_NAV_BUDGET = 60_000
const READY_BUDGET = 30_000
const PROBE_ID = 'zz-s100-fab-probe'

interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

interface Screen {
  name: string
  path: (productId: string) => string
  ready: string
  loading: string
}

const SCREENS: readonly Screen[] = [
  {
    name: 'dashboard',
    path: () => '/fr/dashboard',
    ready: 'dashboard',
    loading: 'dashboard-loading',
  },
  {
    name: 'timeline',
    path: () => '/fr/timeline',
    ready: 'timeline-screen',
    loading: 'timeline-data-loading',
  },
  {
    name: 'products',
    path: () => '/fr/products',
    ready: 'products-page',
    loading: 'products-page-loading',
  },
  {
    name: 'product-detail',
    path: (id) => `/fr/products/${id}`,
    ready: 'product-detail-page',
    loading: 'product-detail-page-loading',
  },
  { name: 'settings', path: () => '/fr/settings', ready: 'settings-page', loading: '' },
]

async function gotoReady(page: Page, screen: Screen, productId: string): Promise<void> {
  await page.goto(screen.path(productId), {
    waitUntil: 'domcontentloaded',
    timeout: FIRST_NAV_BUDGET,
  })
  await expect(page.getByTestId(screen.ready)).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  if (screen.loading) {
    await expect(page.getByTestId(screen.loading)).toHaveCount(0, { timeout: READY_BUDGET })
  }
}

/** Défile tout en bas puis attend deux lectures consécutives égales ([[PIT-S54-003]]). */
async function scrollToBottomStable(page: Page): Promise<void> {
  let previous = -1
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight)
          return Math.round(window.scrollY) * 100_000 + document.documentElement.scrollHeight
        })
        const stable = y === previous
        previous = y
        return stable
      },
      { message: 'le défilement bas doit se stabiliser', timeout: READY_BUDGET, intervals: [250] },
    )
    .toBe(true)
}

async function fabBox(page: Page): Promise<Box> {
  const fab = page.getByTestId('shell-mobile-new-event-button')
  await expect(fab).toBeVisible()
  return fab.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
  })
}

/** Ajoute la sonde en DERNIER enfant de `shell-main` (point le plus bas du contenu). */
async function appendProbe(page: Page): Promise<void> {
  await page.getByTestId('shell-main').evaluate((main, id) => {
    document.getElementById(id)?.remove()
    const probe = document.createElement('button')
    probe.id = id
    probe.type = 'button'
    probe.textContent = 'probe'
    probe.style.display = 'block'
    probe.style.width = '100%'
    probe.style.height = '44px'
    main.append(probe)
  }, PROBE_ID)
}

interface ProbeReading {
  box: Box
  hitAtCenter: boolean
  hitUnderFab: boolean
}

async function readProbe(page: Page, fab: Box): Promise<ProbeReading> {
  return page.evaluate(
    ({ id, fabBox: f }) => {
      const probe = document.getElementById(id)
      if (!probe) throw new Error('sonde absente')
      const r = probe.getBoundingClientRect()
      const cy = (r.top + r.bottom) / 2
      const hit = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y)
        return el !== null && probe.contains(el)
      }
      // À l'aplomb du FAB, au milieu de la bande verticale commune s'il y en a une
      // (sinon au centre de la sonde) : c'est là que le recouvrement mord. Le centre
      // de la sonde seul peut tomber SOUS le FAB (820 px) alors que son haut est
      // recouvert — le témoin serait alors faux.
      const top = Math.max(r.top, f.top)
      const bottom = Math.min(r.bottom, f.bottom)
      const yUnder = bottom > top ? (top + bottom) / 2 : cy
      return {
        box: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
        hitAtCenter: hit((r.left + r.right) / 2, cy),
        hitUnderFab: hit((f.left + f.right) / 2, yUnder),
      }
    },
    { id: PROBE_ID, fabBox: fab },
  )
}

interface RealReading {
  found: boolean
  description: string
  box: Box
  hitAtCenter: boolean
}

/**
 * Le plus bas des focusables de `shell-main` dans la fenêtre en largeur, dont le
 * centre désigne l'élément lui-même OU le FAB (écarte les éléments rognés par un
 * défileur interne, garde ceux que le FAB recouvrirait).
 */
async function readLowestRealFocusable(page: Page): Promise<RealReading> {
  return page.evaluate((probeId) => {
    const main = document.querySelector('[data-testid="shell-main"]')
    const fab = document.querySelector('[data-testid="shell-mobile-new-event-button"]')
    const empty = { top: 0, bottom: 0, left: 0, right: 0 }
    if (!main || !fab)
      return { found: false, description: 'shell absent', box: empty, hitAtCenter: false }
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    let best: { el: Element; r: DOMRect } | null = null
    for (const el of Array.from(main.querySelectorAll(selector))) {
      if (el.id === probeId) continue
      if (el.closest('[aria-hidden="true"], [inert]')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.left < 0 || r.right > window.innerWidth) continue
      if (r.top < 0 || r.bottom > window.innerHeight + 200) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.pointerEvents === 'none') continue
      const cx = (r.left + r.right) / 2
      const cy = Math.min((r.top + r.bottom) / 2, window.innerHeight - 1)
      const hit = document.elementFromPoint(cx, cy)
      if (!hit || !(el.contains(hit) || fab.contains(hit))) continue
      if (!best || r.bottom >= best.r.bottom) best = { el, r }
    }
    if (!best)
      return { found: false, description: 'aucun candidat', box: empty, hitAtCenter: false }
    const { el, r } = best
    const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)
    const testid = el.getAttribute('data-testid')
    return {
      found: true,
      description: `${el.tagName.toLowerCase()}${testid ? `[data-testid=${testid}]` : ''} « ${(el.textContent ?? '').trim().slice(0, 40)} »`,
      box: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
      hitAtCenter: hit !== null && el.contains(hit),
    }
  }, PROBE_ID)
}

function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

test.describe('#480 — le dernier élément reste au-dessus du FAB (390 px)', () => {
  test.use({ viewport: MOBILE_PORTRAIT })

  let userId = ''
  let productId = ''

  test.beforeEach(async ({ page }) => {
    await neutralizeDevToolingPointerEvents(page)
    // Warm-up : absorbe la compilation à froid de `next dev`.
    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await ensureAuthenticated(page)
    // Un produit garantit une frise et une fiche produit non vides (et une route
    // `products/[id]` à mesurer), quel que soit l'état du compte partagé.
    userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S100 FAB Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S100 FAB Prod'),
      categoryId: cat.id,
    })
    productId = product.id
  })

  test.afterEach(async ({ page }) => {
    if (userId && productId) await deleteProduct(page, { userId, productId })
  })

  for (const screen of SCREENS) {
    test(`${screen.name} : sonde et dernier focusable dégagés du FAB, témoin sans réserve`, async ({
      page,
    }) => {
      test.setTimeout(150_000)
      await gotoReady(page, screen, productId)

      // Réserve effectivement appliquée (> hauteur du FAB).
      const reserve = await page
        .getByTestId('shell-main')
        .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
      expect(reserve, 'padding-bottom de shell-main sous md').toBeGreaterThan(52)

      // ── (3) Élément réel ──────────────────────────────────────────────────────
      await scrollToBottomStable(page)
      const fab = await fabBox(page)
      const real = await readLowestRealFocusable(page)
      expect(real.found, `${screen.name} : un focusable doit être mesurable`).toBe(true)
      expect(
        real.box.bottom,
        `${screen.name} : ${real.description} doit finir au-dessus du FAB (top ${fab.top})`,
      ).toBeLessThanOrEqual(fab.top)
      expect(intersects(real.box, fab), `${screen.name} : ${real.description} croise le FAB`).toBe(
        false,
      )
      expect(
        real.hitAtCenter,
        `${screen.name} : ${real.description} doit recevoir le pointeur`,
      ).toBe(true)

      // ── (1) Sonde en fin de contenu ───────────────────────────────────────────
      await appendProbe(page)
      await scrollToBottomStable(page)
      const probe = await readProbe(page, await fabBox(page))
      expect(
        probe.box.bottom,
        `${screen.name} : la sonde doit finir au-dessus du FAB`,
      ).toBeLessThanOrEqual(fab.top)
      expect(intersects(probe.box, fab)).toBe(false)
      expect(probe.hitAtCenter, `${screen.name} : sonde cliquable au centre`).toBe(true)
      expect(probe.hitUnderFab, `${screen.name} : sonde cliquable à l'aplomb du FAB`).toBe(true)

      // ── (2) Témoin : sans réserve, la sonde DOIT passer sous le FAB ────────────
      await page.getByTestId('shell-main').evaluate((el) => {
        ;(el as HTMLElement).style.paddingBottom = '0px'
      })
      await scrollToBottomStable(page)
      const witness = await readProbe(page, await fabBox(page))
      expect(
        intersects(witness.box, fab),
        `${screen.name} : TÉMOIN — sans réserve, la sonde doit croiser le FAB (sinon l'oracle est vacant)`,
      ).toBe(true)
      expect(witness.hitUnderFab, `${screen.name} : TÉMOIN — le FAB doit masquer la sonde`).toBe(
        false,
      )
    })
  }
})

test.describe('#480 — non-régression desktop (1280 px)', () => {
  test.use({ viewport: DESKTOP })

  test('shell-main sans padding bas et FAB non peint sur les écrans enveloppés', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)
    for (const screen of SCREENS.filter((s) => s.name !== 'product-detail')) {
      await gotoReady(page, screen, '')
      const padding = await page
        .getByTestId('shell-main')
        .evaluate((el) => getComputedStyle(el).paddingBottom)
      expect(padding, `${screen.name} : padding-bottom desktop`).toBe('0px')
      await expect(page.getByTestId('shell-mobile-new-event-button')).toBeHidden()
    }
  })
})
