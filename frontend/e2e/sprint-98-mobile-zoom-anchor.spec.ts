import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'

/**
 * #747 (Sprint 98) — Frises mobiles : la date regardée RESTE à l'écran au changement de
 * zoom (pendant mobile de #449, PIT-S97-002).
 *
 * Avant #747 : `scrollLeft` (pixels du rail) était conservé tel quel d'une échelle à
 * l'autre ; il désignait donc une autre date après zoom — une occurrence éloignée
 * d'aujourd'hui sortait de l'écran dès le premier clic. Ancre retenue (DEC-S98) : le jour
 * au CENTRE de la zone de PISTE visible, c.-à-d. le viewport privé des 120 px de
 * l'en-tête de lane sticky (`--lane-header-w-m`, PIT-S94-004 : on compare des
 * `getBoundingClientRect`, `elementFromPoint` ne voit jamais cette colonne).
 *
 * PROTOCOLE — le DÉBUT de « S98 Cible » (J+150, loin d'aujourd'hui et du centrage
 * initial) est amené exactement au centre de la zone de piste, puis on parcourt les
 * 5 niveaux (zoom avant ×2, arrière ×4). À chaque niveau, ce point reste au centre
 * (± 3 px : arrondi de `scrollLeft`) — ce que l'ancre au centre GARANTIT, et rien de
 * plus : les autres bords de l'occurrence peuvent légitimement sortir au zoom avant.
 * Pas de clamp possible sur ce parcours : les bornes ±400 j laissent plus d'une
 * demi-zone de piste de part et d'autre de J+150 à tout zoom (Année compris).
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-97-lane-stacking`), aucune écriture
 * sur le compte PROD.
 *
 * CONTRÔLE NÉGATIF (joué une fois, consigné dans `issue-747-done.md`) : re-projection
 * neutralisée dans `useTimelineMobileState.ts`, la spec rougit en portrait ET en paysage
 * dès le premier zoom avant.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const TARGET = 'S98 Cible'
const TARGET_OFFSET_DAYS = 150
/** `DAY_WIDTH_PX.month` : niveau par défaut au chargement. */
const MONTH_DAY_WIDTH = 12
/** `MOBILE_LANE_TRACK_OFFSET_PX` / `--lane-header-w-m`. */
const GUTTER_PX = 120
const TOLERANCE_PX = 3

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CAT = { id: uuid('98a74700', 1), name: 'S98 Ancre', color: '#1D4ED8' }

function product(
  n: number,
  name: string,
  events: Array<{ title: string; offset: number; days: number }>,
) {
  const id = uuid('98b74700', n)
  return {
    id,
    name,
    color: null,
    category: CAT,
    events: events.map((event, i) => ({
      id: uuid('98c74700', n * 10 + i),
      title: event.title,
      type: 'duration',
      startDate: isoDay(event.offset),
      endDate: isoDay(event.offset + event.days),
      productId: id,
      color: '#1D4ED8',
      archived: false,
    })),
  }
}

const PRODUCTS = [
  product(1, 'S98 Prod ancrée', [{ title: TARGET, offset: TARGET_OFFSET_DAYS, days: 10 }]),
  // Bornes : la piste reste plus large que le viewport à tout zoom, sans clamp autour
  // de J+150 (cf. `sprint-91-event-pin`, même parade).
  product(2, 'S98 Prod bornes', [
    { title: 'S98 Borne passé', offset: -400, days: 1 },
    { title: 'S98 Borne futur', offset: 400, days: 1 },
  ]),
]

async function stubProducts(page: Page): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PRODUCTS),
    })
  })
}

const eventLocator = (page: Page, title: string): Locator =>
  page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)

async function twoFrames(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  )
}

interface AnchorMeasure {
  /** Abscisse (viewport) du début de l'occurrence cible ; `null` = non montée. */
  startX: number | null
  /** Zone de piste visible : viewport du scroller privé de la colonne sticky. */
  zoneLeft: number
  zoneRight: number
  zoneCenter: number
}

async function measure(page: Page): Promise<AnchorMeasure> {
  return page.getByTestId('timeline-scroll').evaluate(
    (scroller, { title, gutter }) => {
      const r = scroller.getBoundingClientRect()
      const zoneLeft = r.left + gutter
      const zoneRight = r.left + scroller.clientWidth
      const target = scroller.querySelector(
        `[data-testid="timeline-event"][data-event-title="${title}"]`,
      )
      return {
        startX: target ? target.getBoundingClientRect().left : null,
        zoneLeft,
        zoneRight,
        zoneCenter: (zoneLeft + zoneRight) / 2,
      }
    },
    { title: TARGET, gutter: GUTTER_PX },
  )
}

/** Amène le DÉBUT de la cible exactement au centre de la zone de piste. */
async function anchorTargetAtCenter(page: Page): Promise<void> {
  const scroll = page.getByTestId('timeline-scroll')
  // 1. Approche par le calcul : la cible n'est pas encore montée (hors bande de rendu,
  //    ~1 800 px à droite du centrage initial sur aujourd'hui).
  const todayLeft = await page
    .locator('.mt-tlm__ruler .mt-tlm__today')
    .evaluate((el) => parseFloat((el as HTMLElement).style.left))
  await scroll.evaluate(
    (el, { trackPx, gutter }) => {
      el.scrollLeft = Math.max(0, trackPx - (el.clientWidth - gutter) / 2)
    },
    { trackPx: todayLeft + TARGET_OFFSET_DAYS * MONTH_DAY_WIDTH, gutter: GUTTER_PX },
  )
  await expect(eventLocator(page, TARGET)).toHaveCount(1)
  await twoFrames(page)
  // 2. Ajustement exact sur la boîte réelle.
  const m = await measure(page)
  if (m.startX === null) throw new Error('cible non montée après approche')
  const delta = m.startX - m.zoneCenter
  await scroll.evaluate((el, d) => {
    el.scrollLeft += d
  }, delta)
  await twoFrames(page)
}

/** Critère d'acceptation : la date regardée reste visible, au centre de la zone de piste. */
async function expectAnchored(page: Page, where: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const m = await measure(page)
        return m.startX === null ? null : Math.round(Math.abs(m.startX - m.zoneCenter))
      },
      { message: `${where} : début de « ${TARGET} » au centre de la zone de piste` },
    )
    .toBeLessThanOrEqual(TOLERANCE_PX)
  const m = await measure(page)
  const x = m.startX as number
  // Visible dans la zone de piste, jamais sous la colonne sticky (PIT-S94-004).
  expect(x, `${where} : à droite de la colonne sticky`).toBeGreaterThan(m.zoneLeft)
  expect(x, `${where} : dans le viewport`).toBeLessThan(m.zoneRight)
}

for (const variant of [
  { name: 'portrait', viewport: { width: 390, height: 844 } },
  { name: 'landscape', viewport: { width: 844, height: 520 } },
] as const) {
  test.describe(`#747 frise mobile ${variant.name} — ré-ancrage au zoom`, () => {
    test.use({ viewport: variant.viewport })

    test('la date au centre de la piste y reste, zoom avant puis arrière', async ({ page }) => {
      await stubProducts(page)
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()

      const level = page.getByTestId('timeline-zoom-level')
      await expect(level).toHaveText('Mois')
      await anchorTargetAtCenter(page)
      await expectAnchored(page, `${variant.name} Mois (référence)`)

      const steps = [
        { button: 'timeline-zoom-in', label: 'Semaine' },
        { button: 'timeline-zoom-in', label: 'Jour' },
        { button: 'timeline-zoom-out', label: 'Semaine' },
        { button: 'timeline-zoom-out', label: 'Mois' },
        { button: 'timeline-zoom-out', label: 'Trimestre' },
        { button: 'timeline-zoom-out', label: 'Année' },
      ] as const
      for (const step of steps) {
        await page.getByTestId(step.button).click()
        await expect(level).toHaveText(step.label)
        await expectAnchored(page, `${variant.name} ${step.button} → ${step.label}`)
      }
    })
  })
}
