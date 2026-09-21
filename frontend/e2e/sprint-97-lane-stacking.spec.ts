import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'

/**
 * #709 (Sprint 97) — Frise : deux occurrences RÉELLES qui se chevauchent dans une même
 * lane sont EMPILÉES en rangées (maquette `layoutLane`,
 * `docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md`), sur les TROIS frises.
 *
 * Avant #709 : hauteur de lane fixe, toutes les occurrences à `top` fixe. La seconde,
 * plus loin dans le DOM, se peignait SUR la première et captait ses clics dans toute la
 * zone de chevauchement. Cette spec est le contrôle que jsdom ne peut pas faire (aucune
 * mise en page) : boîtes réellement disjointes, `elementFromPoint` au centre de CHAQUE
 * occurrence ET dans la zone de chevauchement horizontal, clic effectif sur chacune.
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-91-event-pin`), aucune écriture sur le
 * compte PROD. Une catégorie, trois lanes dans l'ordre du listing :
 *  1. « S97 Prod empilée » : « S97 Chevauche A » (J+3 → J+13) et « S97 Chevauche B »
 *     (J+6 → J+16) — 7 jours de chevauchement ⇒ DEUX rangées à tout zoom ;
 *  2. « S97 Prod voisine » : un événement MÊMES DATES que A — la lane suivante, qui ne doit
 *     pas être recouverte par la rangée ajoutée au-dessus d'elle ;
 *  3. « S97 Prod bornes » (±400 j) : sans elles, au zoom large la piste mobile tiendrait
 *     dans le viewport (cf. `sprint-91-event-pin`, même parade).
 *
 * Géométrie attendue (DEC-S97-003, `lane-layout.ts`) : hauteur de lane = base + pas de
 * rangée — desktop 46 + 34, portrait 44 + 35, paysage 34 + 31.
 *
 * CONTRÔLE NÉGATIF (joué une fois, consigné dans `issue-709-done.md`) : empilage neutralisé
 * (`layoutLane` qui renvoie tout en rangée 0), la spec rougit sur les trois frises.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const A = 'S97 Chevauche A'
const B = 'S97 Chevauche B'
const NEIGHBOUR = 'S97 Voisin'
const STACKED_LANE = 'S97 Prod empilée'
const NEIGHBOUR_LANE = 'S97 Prod voisine'

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CAT = { id: uuid('97a70900', 1), name: 'S97 Empilage', color: '#1D4ED8' }

function product(
  n: number,
  name: string,
  events: Array<{ title: string; offset: number; days: number; color: string }>,
) {
  const id = uuid('97b70900', n)
  return {
    id,
    name,
    color: null,
    category: CAT,
    events: events.map((event, i) => ({
      id: uuid('97c70900', n * 10 + i),
      title: event.title,
      type: 'duration',
      startDate: isoDay(event.offset),
      endDate: isoDay(event.offset + event.days),
      productId: id,
      color: event.color,
      archived: false,
    })),
  }
}

const PRODUCTS = [
  product(1, STACKED_LANE, [
    { title: A, offset: 3, days: 10, color: '#1D4ED8' },
    { title: B, offset: 6, days: 10, color: '#B45309' },
  ]),
  product(2, NEIGHBOUR_LANE, [{ title: NEIGHBOUR, offset: 3, days: 10, color: '#15803D' }]),
  product(3, 'S97 Prod bornes', [
    { title: 'S97 Borne passé', offset: -400, days: 1, color: '#1D4ED8' },
    { title: 'S97 Borne futur', offset: 400, days: 1, color: '#1D4ED8' },
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

const laneLocator = (page: Page, title: string): Locator =>
  page.locator('[data-testid="timeline-resource-row"]').filter({
    has: page.getByTestId('timeline-resource-title').getByText(title, { exact: true }),
  })

type Rect = { x: number; y: number; w: number; h: number }

interface StackMeasure {
  a: Rect
  b: Rect
  lane: Rect
  neighbourLane: Rect
  rows: string | null
  /** Titre atteint par `elementFromPoint` en chaque point sondé. */
  hits: {
    aCenter: string | null
    bCenter: string | null
    /** Même abscisse (zone de chevauchement horizontal), hauteur de A puis de B. */
    overlapAtA: string | null
    overlapAtB: string | null
  }
}

/** Amène la lane empilée au centre du viewport (sur la zone de chevauchement), 2 frames. */
async function centerOn(page: Page, target: Locator): Promise<void> {
  await expect(target).toHaveCount(1)
  await target.evaluate((el) =>
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  )
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  )
}

async function measureStack(page: Page): Promise<StackMeasure> {
  await centerOn(page, eventLocator(page, B))
  return page.evaluate(
    ({ a, b, lane, neighbourLane }) => {
      const byTitle = (title: string) =>
        document.querySelector(`[data-testid="timeline-event"][data-event-title="${title}"]`)
      const laneOf = (title: string) =>
        Array.from(document.querySelectorAll('[data-testid="timeline-resource-title"]'))
          .find((el) => el.textContent?.trim() === title)
          ?.closest('[data-testid="timeline-resource-row"]') ?? null
      const rect = (node: Element | null): Rect => {
        if (!node) throw new Error('nœud absent')
        const r = node.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      }
      const hit = (x: number, y: number) =>
        document
          .elementFromPoint(x, y)
          ?.closest('[data-testid="timeline-event"]')
          ?.getAttribute('data-event-title') ?? null
      const ra = rect(byTitle(a))
      const rb = rect(byTitle(b))
      const laneEl = laneOf(lane)
      // Abscisse au milieu de la zone où A et B se chevauchent HORIZONTALEMENT.
      const overlapX = (Math.max(ra.x, rb.x) + Math.min(ra.x + ra.w, rb.x + rb.w)) / 2
      return {
        a: ra,
        b: rb,
        lane: rect(laneEl),
        neighbourLane: rect(laneOf(neighbourLane)),
        rows: laneEl?.getAttribute('data-lane-rows') ?? null,
        hits: {
          aCenter: hit(ra.x + ra.w / 2, ra.y + ra.h / 2),
          bCenter: hit(rb.x + rb.w / 2, rb.y + rb.h / 2),
          overlapAtA: hit(overlapX, ra.y + ra.h / 2),
          overlapAtB: hit(overlapX, rb.y + rb.h / 2),
        },
      }
    },
    { a: A, b: B, lane: STACKED_LANE, neighbourLane: NEIGHBOUR_LANE },
  )
}

/** Assertions communes aux trois frises. */
function assertStacked(
  m: StackMeasure,
  ctx: { where: string; baseLane: number; pitch: number },
): void {
  const tag = `[${ctx.where}]`
  // 0. Hit-test réel EN PREMIER (c'est le critère d'acceptation, et ce que le contrôle
  //    négatif doit faire rougir) : chaque occurrence est atteignable, y compris là où
  //    elles se chevauchent horizontalement — c'est là que l'ancienne frise perdait A.
  expect(m.hits, `${tag} elementFromPoint`).toEqual({
    aCenter: A,
    bCenter: B,
    overlapAtA: A,
    overlapAtB: B,
  })
  // 1. Les deux occurrences sont VERTICALEMENT disjointes (A en rangée 0, B en rangée 1)…
  expect(m.b.y, `${tag} B commence sous A`).toBeGreaterThanOrEqual(m.a.y + m.a.h)
  expect(m.b.y - m.a.y, `${tag} décalage de rangée = pas de la vue`).toBeCloseTo(ctx.pitch, 0)
  // … et se chevauchent bien HORIZONTALEMENT (sinon la spec ne prouverait rien).
  expect(Math.min(m.a.x + m.a.w, m.b.x + m.b.w) - Math.max(m.a.x, m.b.x)).toBeGreaterThan(20)
  // 2. La lane a grandi d'un pas et contient les deux occurrences.
  expect(m.lane.h, `${tag} hauteur de lane = base + pas`).toBeCloseTo(ctx.baseLane + ctx.pitch, 0)
  expect(m.a.y, `${tag} A dans la lane`).toBeGreaterThanOrEqual(m.lane.y)
  expect(m.b.y + m.b.h, `${tag} B dans la lane`).toBeLessThanOrEqual(m.lane.y + m.lane.h)
  // 3. La lane suivante commence sous la lane empilée : rien n'y déborde.
  expect(m.neighbourLane.y, `${tag} lane voisine sous la lane empilée`).toBeGreaterThanOrEqual(
    m.lane.y + m.lane.h - 0.5,
  )
  expect(m.rows, `${tag} crochet data-lane-rows`).toBe('2')
}

/** Libellés FR des niveaux de zoom parcourus (Mois = défaut, puis Trimestre). */
const LEVELS = ['Mois', 'Trimestre'] as const

test.describe('#709 frise desktop — deux occurrences qui se chevauchent sont empilées', () => {
  test('visibles, disjointes, cliquables, et atteignables au clavier (↓ = rangée suivante)', async ({
    page,
  }) => {
    await stubProducts(page)
    await ensureAuthenticated(page)
    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    // Barrière d'hydratation (PIT-S83-001), cf. `sprint-85-timeline-group-head`.
    await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
    await expect(laneLocator(page, STACKED_LANE)).toHaveCount(1)

    const level = page.getByTestId('timeline-zoom-level')
    for (const [i, label] of LEVELS.entries()) {
      if (i > 0) await page.getByTestId('timeline-zoom-out').click()
      await expect(level).toHaveText(label)
      await page.keyboard.press('t')
      assertStacked(await measureStack(page), {
        where: `desktop ${label}`,
        baseLane: 46,
        pitch: 34,
      })
    }

    // Clic effectif sur CHAQUE occurrence : le détail ouvert est le bon.
    const drawer = page.getByTestId('timeline-drawer')
    for (const title of [A, B]) {
      await centerOn(page, eventLocator(page, title))
      await eventLocator(page, title).click()
      await expect(drawer).toBeVisible()
      await expect(drawer).toContainText(title)
      await page.keyboard.press('Escape')
      await expect(drawer).toHaveCount(0)
    }

    // Clavier (roving tabindex) : la rangée 1 est atteinte par ↓ DEPUIS la rangée 0 de la
    // même lane, avant la lane voisine.
    await eventLocator(page, A).focus()
    await page.keyboard.press('ArrowDown')
    await expect(eventLocator(page, B)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(eventLocator(page, NEIGHBOUR)).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(eventLocator(page, B)).toBeFocused()
  })
})

for (const variant of [
  {
    name: 'portrait',
    viewport: { width: 390, height: 844 },
    detail: 'timeline-sheet',
    baseLane: 44,
    pitch: 35,
  },
  {
    name: 'landscape',
    viewport: { width: 844, height: 520 },
    detail: 'timeline-landscape-drawer',
    baseLane: 34,
    pitch: 31,
  },
] as const) {
  test.describe(`#709 frise mobile ${variant.name} — occurrences qui se chevauchent empilées`, () => {
    test.use({ viewport: variant.viewport })

    test('visibles, disjointes, cliquables', async ({ page }) => {
      await stubProducts(page)
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()
      await expect(laneLocator(page, STACKED_LANE)).toHaveCount(1)

      const level = page.getByTestId('timeline-zoom-level')
      for (const [i, label] of LEVELS.entries()) {
        if (i > 0) await page.getByTestId('timeline-zoom-out').click()
        await expect(level).toHaveText(label)
        // Pas de raccourci « T » en mobile : on recentre sur la graduation TODAY (toujours
        // rendue) pour ramener A et B dans la bande de rendu (même parade que
        // `sprint-91-event-pin`). Depuis #747 le zoom mobile ré-ancre le jour au CENTRE
        // de la piste (`sprint-98-mobile-zoom-anchor`) : la parade n'est plus requise
        // par un défaut, elle est gardée pour que cette spec ne dépende pas de l'ancre
        // (elle porte sur l'empilage, pas sur le défilement).
        const todayLeft = await page
          .locator('.mt-tlm__ruler .mt-tlm__today')
          .evaluate((el) => parseFloat((el as HTMLElement).style.left))
        await page
          .getByTestId('timeline-scroll')
          .evaluate(
            (el, x) =>
              el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'instant' }),
            todayLeft,
          )
        assertStacked(await measureStack(page), {
          where: `mobile ${variant.name} ${label}`,
          baseLane: variant.baseLane,
          pitch: variant.pitch,
        })
      }

      // Ordre DOM (= ordre de tabulation mobile) : rangée 0 avant rangée 1.
      const order = await laneLocator(page, STACKED_LANE)
        .getByTestId('timeline-event')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-event-title')))
      expect(order).toEqual([A, B])

      const detail = page.getByTestId(variant.detail)
      for (const title of [A, B]) {
        await centerOn(page, eventLocator(page, title))
        await eventLocator(page, title).click()
        await expect(detail).toBeVisible()
        await expect(detail).toContainText(title)
        await page.getByTestId(`${variant.detail}-close`).click()
        await expect(detail).toHaveCount(0)
      }
    })
  })
}
