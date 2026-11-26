import { test, expect } from './support/fixtures'
import { type CDPSession, type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'

/**
 * #750 — Frises mobiles : un PINCEMENT à deux doigts qui change le zoom garde au centre
 * de la piste la date qui y était (pendant au geste de #747, prouvé aux boutons par
 * `sprint-98-mobile-zoom-anchor.spec.ts`, dont cette spec reprend mesure et fixture).
 *
 * GESTE — vrais points tactiles émis par le navigateur (CDP `Input.dispatchTouchEvent`,
 * deux `touchPoints` d'identifiants distincts, contexte `hasTouch`). Chromium les
 * convertit en `pointerdown/move/up` de type touch, captés par le scroller
 * (`useTimelineMobileGestures`) : c'est le parcours réel, pas un appel du handler.
 * Les doigts s'écartent ou se rapprochent symétriquement autour du centre de la zone de
 * piste (barycentre fixe : aucun défilement `pan-x` ne démarre, donc pas de
 * `pointercancel`). Écarts choisis pour UN seul niveau par geste : 100 → 140 px
 * (ratio 1,4, au-delà de `PINCH_IN_RATIO` 1,22 et en deçà de 1,22²), puis 140 → 100 px
 * (0,71, en deçà de `PINCH_OUT_RATIO` 0,82 et au-delà de 0,82²).
 *
 * MESURE — boîte (`getBoundingClientRect`) du début de « S750 Cible », comparée au
 * centre de la zone de piste (viewport du scroller privé des 120 px de la colonne
 * sticky, PIT-S94-004 : jamais `elementFromPoint`). Tolérance 3 px : arrondi de
 * `scrollLeft`, comme la spec 98.
 *
 * FIXTURE — listing produits STUBBÉ, aucune écriture sur le compte PROD.
 *
 * CONTRÔLE NÉGATIF (joué une fois, consigné dans le dossier du ticket) : sans
 * `captureZoomAnchor()` dans `onPinchZoom`, le pincement fermant rabat la frise au bord
 * droit (rail rétréci sous `scrollLeft`). Le pincement ouvrant, lui, reste ancré par le
 * repli de relecture du DOM, exact au zoom avant.
 */

test.use({ storageState: sessionState(PROD), hasTouch: true })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const TARGET = 'S750 Cible'
const TARGET_OFFSET_DAYS = 150
/** `DAY_WIDTH_PX.month` : niveau par défaut au chargement. */
const MONTH_DAY_WIDTH = 12
/** `MOBILE_LANE_TRACK_OFFSET_PX` / `--lane-header-w-m`. */
const GUTTER_PX = 120
const TOLERANCE_PX = 3
/** Écart entre les doigts (px) : pincement fermé, puis ouvert. */
const PINCH_NEAR_PX = 100
const PINCH_FAR_PX = 140
const PINCH_STEPS = 4

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CAT = { id: uuid('75a75000', 1), name: 'S750 Ancre', color: '#1D4ED8' }

function product(
  n: number,
  name: string,
  events: Array<{ title: string; offset: number; days: number }>,
) {
  const id = uuid('75b75000', n)
  return {
    id,
    name,
    color: null,
    category: CAT,
    events: events.map((event, i) => ({
      id: uuid('75c75000', n * 10 + i),
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
  product(1, 'S750 Prod ancrée', [{ title: TARGET, offset: TARGET_OFFSET_DAYS, days: 10 }]),
  // Bornes : la piste reste plus large que le viewport à tout zoom, sans clamp autour
  // de J+150 (même parade que la spec 98).
  product(2, 'S750 Prod bornes', [
    { title: 'S750 Borne passé', offset: -400, days: 1 },
    { title: 'S750 Borne futur', offset: 400, days: 1 },
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
  /** Abscisse (viewport) du début de l'occurrence cible, `null` si non montée. */
  startX: number | null
  /** Zone de piste visible : viewport du scroller privé de la colonne sticky. */
  zoneLeft: number
  zoneRight: number
  zoneCenter: number
  /** Ordonnée médiane du scroller, sous la règle : là où posent les doigts. */
  midY: number
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
        midY: r.top + r.height / 2,
      }
    },
    { title: TARGET, gutter: GUTTER_PX },
  )
}

/** Amène le DÉBUT de la cible exactement au centre de la zone de piste. */
async function anchorTargetAtCenter(page: Page): Promise<void> {
  const scroll = page.getByTestId('timeline-scroll')
  // 1. Approche par le calcul : la cible n'est pas encore montée (hors bande de rendu).
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

/**
 * Pincement à deux doigts réels, symétrique autour de (cx, cy), de l'écart `from` à
 * l'écart `to` (px), en `PINCH_STEPS` mouvements.
 */
async function pinch(
  cdp: CDPSession,
  cx: number,
  cy: number,
  from: number,
  to: number,
): Promise<void> {
  const points = (gap: number) => [
    { x: cx - gap / 2, y: cy, id: 1 },
    { x: cx + gap / 2, y: cy, id: 2 },
  ]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from) })
  for (let i = 1; i <= PINCH_STEPS; i++) {
    const gap = from + ((to - from) * i) / PINCH_STEPS
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(gap) })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

for (const variant of [
  { name: 'portrait', label: 'portrait', viewport: { width: 390, height: 844 } },
  { name: 'landscape', label: 'paysage', viewport: { width: 844, height: 520 } },
] as const) {
  test.describe(`#750 frise mobile ${variant.label}`, () => {
    test.use({ viewport: variant.viewport })

    test(`#750 frise mobile ${variant.label} - pincement : la date au centre de la piste y reste, pincement ouvrant puis fermant`, async ({
      page,
    }) => {
      await stubProducts(page)
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()

      const level = page.getByTestId('timeline-zoom-level')
      await expect(level).toHaveText('Mois')
      await anchorTargetAtCenter(page)
      await expectAnchored(page, `${variant.label} Mois (référence)`)

      const cdp = await page.context().newCDPSession(page)
      const steps = [
        { gesture: 'ouvrant', from: PINCH_NEAR_PX, to: PINCH_FAR_PX, label: 'Semaine' },
        { gesture: 'fermant', from: PINCH_FAR_PX, to: PINCH_NEAR_PX, label: 'Mois' },
      ] as const
      for (const step of steps) {
        const m = await measure(page)
        await pinch(cdp, m.zoneCenter, m.midY, step.from, step.to)
        // Le zoom a réellement changé, sinon l'ancrage serait trivialement tenu.
        await expect(level).toHaveText(step.label)
        await expectAnchored(page, `${variant.label} pincement ${step.gesture} → ${step.label}`)
      }
    })
  })
}
