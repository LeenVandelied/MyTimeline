import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import { LANE_GUTTER_PX } from './support/timeline-lanes'

/**
 * Sprint 117 #805 — `[` / `]` ENCHAÎNÉS à `+` / `-` sans attendre : la frise ne dérive
 * plus.
 *
 * LE DÉFAUT (reproduit au navigateur avant correctif, 3 rejeux identiques à 5 px près) :
 * l'effet `offsetDays` (#392) écrivait `el.scrollLeft = offsetDays × dayWidth` sous le
 * `scroll-behavior:smooth` du conteneur. L'affectation LANCE une animation, et
 * `recordScrollAnchor()` relisait aussitôt la position de DÉPART. Un `+` / `-` frappé
 * pendant le vol re-projetait (#449) cette ancre périmée, en `behavior:'instant'`, ce qui
 * annulait aussi l'animation : le saut de période était perdu. Mesures AVANT (viewport
 * 1600, fixture ci-dessous) :
 *   `] +`        → 20 425 px au lieu de 1 020   `] -`       → 2 822 au lieu de 150 (rabattu)
 *   `] ] + ] -`  → 7 201 au lieu de 888         `]×4 … ] +` → 4 081 au lieu de 5 100
 * Une séquence qui FINIT par `[` / `]` ne dérivait pas (écriture absolue) : seules celles
 * qui finissent par un changement d'échelle le montrent, d'où le choix des séquences.
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER : jsdom n'anime ni ne rabat `scrollLeft` (son stub de
 * `scrollTo` écrit la valeur telle quelle). Seul un vrai rail montre la course.
 *
 * ORACLE : `scrollLeft` final = `jour ancré × dayWidth` (repère PISTE, #392), exact. Les
 * séquences sont frappées SANS attente entre les touches ; la mesure attend l'arrêt.
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-105-fit-shortcut`) : un produit, trois
 * ponctuels J−600, J−300, J+70. `computeRange` (30 j de marge) → étendue de 731 j
 * démarrant à J−630 : aujourd'hui au jour 630. Aucune séquence n'atteint un bord du rail
 * (prémisse assertée : `0 < attendu < maxScroll`), sinon l'oracle serait une borne.
 *
 * CONTRÔLE NÉGATIF (consigné au done.md de #805) : l'effet `offsetDays` remis en
 * `el.scrollLeft =` ⇒ les séquences finissant par `+` / `-` rougissent.
 */

test.use({ storageState: sessionState(PROD) })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
const PRODUCT_ID = '80580580-0000-4000-8000-000000000805'

/** Échelles px/jour (`DAY_WIDTH_PX`, `zoom.ts`). */
const DW = { week: 34, month: 12, quarter: 5 } as const
/** Pas de `[` / `]` par niveau (`PERIOD_STEP_DAYS`). */
const STEP = { week: 14, month: 30 } as const
/** Aujourd'hui dans l'étendue : J−600 − 30 j de marge. */
const TODAY_DAY = 630

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const event = (n: number, title: string, offsetDays: number) => ({
  id: `80580580-0000-4000-8000-000000000${String(n).padStart(3, '0')}`,
  title,
  type: 'single',
  startDate: isoDay(offsetDays),
  endDate: isoDay(offsetDays),
  productId: PRODUCT_ID,
  color: '#1D4ED8',
  archived: false,
})

const PRODUCTS = [
  {
    id: PRODUCT_ID,
    name: 'S117 Drift Produit',
    color: '#1D4ED8',
    category: {
      id: '80580580-0000-4000-8000-000000000999',
      name: 'S117 Drift Cat',
      color: '#1D4ED8',
    },
    events: [
      event(1, 'S117 Drift A', -600),
      event(2, 'S117 Drift B', -300),
      event(3, 'S117 Drift C', 70),
    ],
  },
]

async function gotoTimeline(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1600, height: 900 })
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
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-group-head')).toHaveCount(1)
  await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Mois')
  // Centrage initial sur aujourd'hui posé (#449) : sans lui, la 1re touche partirait de 0.
  await expect.poll(async () => (await settledScroll(page)).scrollLeft).toBeGreaterThan(0)
}

/**
 * Attend l'ARRÊT du défilement (deux lectures consécutives égales, 100 ms d'écart) :
 * `.mt-tlv__scroll` porte `scroll-behavior:smooth`, une mesure prise en vol lirait une
 * position transitoire (PIT-S54-003).
 */
async function settledScroll(page: Page): Promise<{ scrollLeft: number; maxScroll: number }> {
  const scroll = page.getByTestId('timeline-scroll')
  let previous = -1
  for (let i = 0; i < 40; i++) {
    const value = await scroll.evaluate((el) => el.scrollLeft)
    if (value === previous) break
    previous = value
    await page.waitForTimeout(100)
  }
  return scroll.evaluate((el) => ({
    scrollLeft: el.scrollLeft,
    maxScroll: el.scrollWidth - el.clientWidth,
  }))
}

async function pressAll(page: Page, keys: readonly string[]): Promise<void> {
  for (const key of keys) await page.keyboard.press(key)
}

async function expectAnchored(
  page: Page,
  tag: string,
  level: string,
  day: number,
  dayWidth: number,
): Promise<void> {
  await expect(page.getByTestId('timeline-zoom-level')).toHaveText(level)
  const { scrollLeft, maxScroll } = await settledScroll(page)
  const expected = day * dayWidth
  expect(expected, `${tag} : prémisse — l'attendu est DANS le rail, pas une borne`).toBeLessThan(
    maxScroll,
  )
  expect(expected).toBeGreaterThan(0)
  expect(
    Math.abs(scrollLeft - expected),
    `${tag} : scrollLeft ${scrollLeft} px, attendu ${expected} px (jour ${day} × ${dayWidth} px/j)`,
  ).toBeLessThanOrEqual(1)
}

/**
 * Séquences frappées sans attente, toutes terminées par un changement d'échelle (le seul
 * cas qui dérivait). Jour ancré attendu calculé pas à pas depuis `offsetDays = 0`.
 */
const SEQUENCES: ReadonlyArray<{
  keys: readonly string[]
  level: string
  day: number
  dayWidth: number
}> = [
  // ] (mois +30) → jour 30 ; + → semaine.
  { keys: [']', '+'], level: 'Semaine', day: STEP.month, dayWidth: DW.week },
  // ] → jour 30 ; - → trimestre.
  { keys: [']', '-'], level: 'Trimestre', day: STEP.month, dayWidth: DW.quarter },
  // ] ] → 60 ; + (semaine) ; ] → 60 + 14 = 74 ; - → mois.
  {
    keys: [']', ']', '+', ']', '-'],
    level: 'Mois',
    day: 2 * STEP.month + STEP.week,
    dayWidth: DW.month,
  },
  // ] ] ] → 90 ; [ → 60 ; + → semaine.
  { keys: [']', ']', ']', '[', '+'], level: 'Semaine', day: 2 * STEP.month, dayWidth: DW.week },
]

test.describe('#805 — [ / ] enchaînés à + / - : pas de dérive du défilement', () => {
  for (const seq of SEQUENCES) {
    test(`« ${seq.keys.join(' ')} » frappé d’une traite`, async ({ page }) => {
      await gotoTimeline(page)
      await pressAll(page, seq.keys)
      await expectAnchored(page, seq.keys.join(' '), seq.level, seq.day, seq.dayWidth)
    })
  }

  test('période posée et attendue, puis « ] + » d’une traite', async ({ page }) => {
    await gotoTimeline(page)
    await pressAll(page, [']', ']', ']', ']'])
    await expectAnchored(page, ']×4', 'Mois', 4 * STEP.month, DW.month)
    await pressAll(page, [']', '+'])
    await expectAnchored(page, ']×4 puis ] +', 'Semaine', 5 * STEP.month, DW.week)
  })

  test('non-régression : [ ] + - T pris isolément, chacun attendu', async ({ page }) => {
    await gotoTimeline(page)
    await page.keyboard.press(']')
    await expectAnchored(page, ']', 'Mois', STEP.month, DW.month)
    await page.keyboard.press(']')
    await expectAnchored(page, '] ]', 'Mois', 2 * STEP.month, DW.month)
    await page.keyboard.press('[')
    await expectAnchored(page, '[', 'Mois', STEP.month, DW.month)
    await page.keyboard.press('+')
    await expectAnchored(page, '+', 'Semaine', STEP.month, DW.week)
    await page.keyboard.press('-')
    await expectAnchored(page, '-', 'Mois', STEP.month, DW.month)
    // T : `GO_TO_TODAY` pose `offsetDays` = jour d'aujourd'hui, repère PISTE (#392).
    await page.keyboard.press('t')
    await expectAnchored(page, 'T', 'Mois', TODAY_DAY, DW.month)
    // `- T +` d'une traite. `offsetDays` vaut DÉJÀ aujourd'hui : l'effet #392 ne rejoue
    // rien et `T` se réduit à `scrollToToday`, qui CENTRE aujourd'hui (repère RAIL) au
    // niveau Trimestre. Le `+` qui suit doit re-projeter CETTE position (jour ancré =
    // scrollLeft / 5), pas l'ancre d'avant `T` — ce que faisait l'écriture smooth.
    await pressAll(page, ['-', 't', '+'])
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Mois')
    const after = await settledScroll(page)
    const expected = await page.getByTestId('timeline-scroll').evaluate(
      (el, d) => {
        const centeredQuarter = Math.max(0, d.gutter + d.day * d.quarter - el.clientWidth / 2)
        return (centeredQuarter / d.quarter) * d.month
      },
      { day: TODAY_DAY, quarter: DW.quarter, month: DW.month, gutter: LANE_GUTTER_PX },
    )
    // Avant zoom : scrollLeft entier ⇒ ±1 px × 12/5 après re-projection.
    expect(
      Math.abs(after.scrollLeft - expected),
      `- T + : attendu ${expected} px (aujourd'hui centré au Trimestre, re-projeté), lu ${after.scrollLeft} px`,
    ).toBeLessThanOrEqual(3)
    // Et la position n'est PAS celle d'avant `T` (aujourd'hui au bord de l'en-tête) :
    // sinon l'oracle ci-dessus ne distinguerait rien.
    expect(Math.abs(after.scrollLeft - TODAY_DAY * DW.month)).toBeGreaterThan(50)
  })
})
