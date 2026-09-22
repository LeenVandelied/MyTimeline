import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'

/**
 * Sprint 105 #597 — la touche `F` RECADRE la frise bureau sur les événements AFFICHÉS
 * (handoff), au lieu de la passer en plein écran (désormais : bouton seul).
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER, et que cette spec mesure sur rendu réel :
 *  - la POSITION FINALE après un changement de niveau ET de décalage dans la même
 *    action. Le défilement est posé par trois écritures dans le même commit React (la
 *    re-projection d'ancre #449, le cadrage #597, l'effet `offsetDays` #392) et le
 *    navigateur RABAT `scrollLeft` à `scrollWidth − clientWidth` : seul un vrai rail
 *    dit si le cadrage l'emporte. Oracle : les PINS extrêmes (10 px, `.mt-evt-pin`)
 *    sont dans le viewport de la frise, à droite de la gouttière sticky (176 px) ;
 *  - la stabilité : `F` deux fois, et `F` après un défilement manuel qui ramène au
 *    bord gauche (même niveau, même `offsetDays` : un effet gardé sur leur valeur ne
 *    se redéclencherait pas) ;
 *  - le masquage : une catégorie masquée ne pèse plus sur le cadrage.
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-105-lane-zebra`) : le compte PROD
 * accumule les semis des autres specs, dont les dates fausseraient l'étendue. Ponctuels :
 * Alpha −120 j, Beta +10 j, Gamma +200 j ; et, pour la 2e spec seulement, Omega −400 j.
 *  - 1re spec (Alpha/Beta/Gamma affichés) : 320 j → `year` (2,2 px/j, 704 px ; `quarter`
 *    en demanderait 1600). Le rail entier tient alors dans le viewport : le cadrage est
 *    borné au bord gauche du rail (30 j de marge de `computeRange`), pas centré.
 *  - 2e spec : Omega et Gamma MASQUÉES → Alpha..Beta, 130 j → `quarter` (650 px), et le
 *    rail (étendu par les masquées) laisse la place de CENTRER. Un cadrage qui compterait
 *    les masquées resterait en `year` et ne centrerait pas Alpha..Beta.
 * Prémisse assertée : piste utile hors marges dans [704, 1560[ — mesurée à 798 px pour un
 * viewport de 1600 (shell + sidebar), d'où un viewport de 1920.
 *
 * CONTRÔLE NÉGATIF (consigné au done.md de #597) : `case 'f'` rebranché sur
 * `toggleFullscreen` ⇒ rouge ; effet de cadrage neutralisé ⇒ rouge sur « défilement
 * manuel puis F ».
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
/** Gouttière sticky des lanes (`LANE_TRACK_OFFSET_PX`, #674). */
const GUTTER_PX = 176
/** Marge de cadrage de chaque côté (`FIT_MARGIN_PX`). */
const FIT_MARGIN_PX = 40

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

type Category = { id: string; name: string; color: string }

const OMEGA: Category = { id: uuid('105a0597', 4), name: 'S105 Fit Omega', color: '#7C3AED' }
const CATS: Category[] = [
  { id: uuid('105a0597', 1), name: 'S105 Fit Alpha', color: '#1D4ED8' },
  { id: uuid('105a0597', 2), name: 'S105 Fit Beta', color: '#15803D' },
  { id: uuid('105a0597', 3), name: 'S105 Fit Gamma', color: '#B45309' },
]
const OFFSETS = [-120, 10, 200]
const TITLES = ['S105 Fit A', 'S105 Fit B', 'S105 Fit C']

function product(n: number, category: Category, title: string, offsetDays: number) {
  const id = uuid('105b0597', n)
  return {
    id,
    name: `S105 Fit Produit ${n}`,
    color: null,
    category,
    events: [
      {
        id: uuid('105c0597', n),
        title,
        type: 'single',
        startDate: isoDay(offsetDays),
        endDate: isoDay(offsetDays),
        productId: id,
        color: category.color,
        archived: false,
      },
    ],
  }
}

const BASE = CATS.map((category, i) => product(i + 1, category, TITLES[i], OFFSETS[i]))
const WIDE = [product(4, OMEGA, 'S105 Fit O', -400), ...BASE]

async function stubProducts(page: Page, products: unknown[]): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(products),
    })
  })
}

async function gotoTimeline(page: Page, products: unknown[]): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 900 })
  await stubProducts(page, products)
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-group-head')).toHaveCount(products.length)
}

type PinReading = { title: string; left: number; right: number } | null

/**
 * Relève, en coordonnées viewport, la bande utile de la frise (bord droit de la
 * gouttière → bord droit du conteneur) et le pin de chaque titre demandé (`null` s'il
 * n'est pas monté — virtualisation horizontale, PIT-S91-005).
 */
async function readFrame(page: Page, titles: string[]) {
  return page.getByTestId('timeline-scroll').evaluate(
    (el, { titles, gutter }) => {
      // Bord gauche du CONTENU (bordure exclue) : origine du repère rail.
      const x0 = el.getBoundingClientRect().left + el.clientLeft
      const pins = titles.map((title) => {
        const pill = el.querySelector(`[data-testid="timeline-event"][data-event-title="${title}"]`)
        const pin = pill?.querySelector('.mt-evt-pin')
        if (!pin) return null
        const r = pin.getBoundingClientRect()
        return { title, left: r.left, right: r.right }
      })
      return {
        trackLeft: x0 + gutter,
        trackRight: x0 + el.clientWidth,
        usablePx: el.clientWidth - gutter,
        scrollLeft: el.scrollLeft,
        maxScroll: el.scrollWidth - el.clientWidth,
        pins,
      }
    },
    { titles, gutter: GUTTER_PX },
  )
}

/** Attend que tous les pins demandés soient montés ET dans la bande utile. */
async function expectPinsFramed(page: Page, titles: string[], tag: string) {
  await expect
    .poll(
      async () => {
        const f = await readFrame(page, titles)
        return f.pins.map((p: PinReading) =>
          p === null ? 'absent' : p.left >= f.trackLeft && p.right <= f.trackRight ? 'in' : 'out',
        )
      },
      { message: `${tag} : pins ${titles.join(', ')} dans la frise`, timeout: 10_000 },
    )
    .toEqual(titles.map(() => 'in'))
}

const fullscreenElement = (page: Page) =>
  page.evaluate(() => document.fullscreenElement?.getAttribute('data-testid') ?? null)

/** Piste utile hors marges : `year` doit tenir 320 j, `month` ne doit pas tenir 130 j. */
async function expectUsableWidthPremise(page: Page): Promise<void> {
  const usable = (await readFrame(page, [])).usablePx - 2 * FIT_MARGIN_PX
  expect(usable, 'piste utile (px) ≥ 320 j × 2,2').toBeGreaterThanOrEqual(704)
  expect(usable, 'piste utile (px) < 130 j × 12').toBeLessThan(1560)
}

const hideCategory = (page: Page, name: string) =>
  page
    .getByTestId('timeline-sidebar-filter')
    .and(page.locator(`[data-category="${name}"]`))
    .click()

/** Écart gauche (gouttière → 1er pin) et droit (dernier pin → bord), centres des pins. */
function gaps(frame: Awaited<ReturnType<typeof readFrame>>) {
  const pins = frame.pins as NonNullable<PinReading>[]
  const first = pins[0]
  const last = pins[pins.length - 1]
  return {
    left: (first.left + first.right) / 2 - frame.trackLeft,
    right: frame.trackRight - (last.left + last.right) / 2,
  }
}

test.describe('#597 — touche F : recadrage de la frise', () => {
  test('F cadre les pins extrêmes (tout affiché) et n’ouvre plus le plein écran — le bouton, si', async ({
    page,
  }) => {
    await gotoTimeline(page, BASE)
    await expectUsableWidthPremise(page)
    const level = page.getByTestId('timeline-zoom-level')
    const initialLevel = await level.textContent()
    // Non-vacuité : au chargement (centrée sur aujourd'hui, niveau `month`), les pins
    // extrêmes ne sont pas tous montés.
    const before = await readFrame(page, TITLES)
    expect(before.pins.filter((p: PinReading) => p !== null).length).toBeLessThan(3)

    await page.keyboard.press('f')
    await expect(level).not.toHaveText(initialLevel ?? '')
    await expectPinsFramed(page, TITLES, 'F')
    expect(await fullscreenElement(page), 'F ne passe plus en plein écran').toBeNull()

    // Le plein écran reste accessible — par son bouton seulement — et Échap le quitte.
    await page.getByTestId('timeline-fullscreen').click()
    await expect.poll(() => fullscreenElement(page)).toBe('timeline-view')
    await page.keyboard.press('Escape')
    await expect.poll(() => fullscreenElement(page)).toBeNull()
  })

  test('catégories masquées ignorées ; cadrage centré, stable, ré-appliqué après défilement manuel', async ({
    page,
  }) => {
    await gotoTimeline(page, WIDE)
    await expectUsableWidthPremise(page)
    const level = page.getByTestId('timeline-zoom-level')
    const shown = TITLES.slice(0, 2)

    // Tout affiché (Omega −400 j … Gamma +200 j) : 600 j débordent même en `year`.
    await page.keyboard.press('f')
    await expect(level).not.toHaveText('')
    await expectPinsFramed(page, shown, 'tout affiché')
    const levelAll = await level.textContent()
    const all = await readFrame(page, shown)
    const spanAll = (all.pins[1]?.left ?? 0) - (all.pins[0]?.left ?? 0)

    await hideCategory(page, OMEGA.name)
    await hideCategory(page, CATS[2].name)
    await expect(page.getByTestId('timeline-group-head')).toHaveCount(2)

    await page.keyboard.press('f')
    // Masquées ignorées : 130 j tiennent au niveau plus fin (`quarter`)…
    await expect(level).not.toHaveText(levelAll ?? '')
    await expectPinsFramed(page, shown, 'Omega et Gamma masquées')
    const framed = await readFrame(page, shown)
    const spanShown = (framed.pins[1]?.left ?? 0) - (framed.pins[0]?.left ?? 0)
    // … même écart en jours, échelle 5 / 2,2 : l'écart Alpha→Beta s'élargit.
    expect(spanShown / spanAll).toBeGreaterThan(2)
    // … et Alpha..Beta est CENTRÉ (ni Omega ni Gamma ne tirent le cadrage), sans
    // rabattement du navigateur à l'un des bords du rail.
    expect(framed.scrollLeft).toBeGreaterThan(0)
    expect(framed.scrollLeft).toBeLessThan(framed.maxScroll)
    const g = gaps(framed)
    expect(Math.abs(g.left - g.right), `centrage ${g.left} vs ${g.right}`).toBeLessThanOrEqual(1.5)

    // 2e F immédiat : même cadrage.
    await page.keyboard.press('f')
    await expectPinsFramed(page, shown, '2e F')
    expect(Math.round((await readFrame(page, shown)).scrollLeft)).toBe(
      Math.round(framed.scrollLeft),
    )

    // Défilement manuel au bord gauche : même niveau, `offsetDays` inchangé — un effet
    // gardé sur leur valeur ne rejouerait rien. F doit pourtant ré-appliquer le cadrage.
    await page
      .getByTestId('timeline-scroll')
      .evaluate((el) => el.scrollTo({ left: 0, behavior: 'instant' }))
    await expect.poll(async () => (await readFrame(page, shown)).scrollLeft).toBe(0)
    await page.keyboard.press('f')
    await expect
      .poll(async () => Math.round((await readFrame(page, shown)).scrollLeft), {
        message: 'F après défilement manuel doit ré-appliquer le cadrage',
      })
      .toBe(Math.round(framed.scrollLeft))
    await expectPinsFramed(page, shown, 'F après défilement manuel')
  })
})
