import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'

/**
 * #595 (Sprint 91) — Frise : une série récurrente est identifiable SANS lecteur d'écran.
 *
 * Maquette (`docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md` §1-§5) : occurrence
 * réelle pleine + glyphe `↻`, occurrences FANTÔMES (barre en pointillé / petit carré) reliées
 * par un CONNECTEUR pointillé. Trois frises : desktop, mobile portrait, mobile paysage.
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER (d'où cette spec) :
 *  - l'ORDRE DE PEINTURE et la NON-CAPTATION du clic : la prod n'empile pas les événements
 *    d'une lane (arbitrage dev 2026-09-15), fantômes et connecteurs d'une série passent donc
 *    SOUS les occurrences réelles d'une autre. Preuve par `elementFromPoint` : au centre de
 *    chaque occurrence réelle, et en chaque point où une marque croise une occurrence réelle,
 *    le hit-test rend l'occurrence réelle ;
 *  - la VIRTUALISATION réelle des fantômes (bande mesurée, pas `UNBOUNDED_BAND`) ;
 *  - que le glyphe `↻` est effectivement PEINT (visible), pas seulement présent au DOM.
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-91-event-pin`), aucune écriture. Une lane
 * « S91 Lane séries » porte TROIS séries qui se chevauchent :
 *  - A « S91 Série durée » : durée 10 j, MENSUELLE, bornée à A + 3 mois (fin INCLUSE) ;
 *  - B « S91 Série ponctuelle » : ponctuel HEBDOMADAIRE posé 3 j après A + 1 mois — donc
 *    DANS le 1er fantôme de A — borné à B + 21 j (fin incluse) ;
 *  - C « S91 Hebdo » : ponctuel hebdomadaire NON BORNÉ commençant 21 j avant A — ses
 *    fantômes du jour A et de A + 7 tombent DANS la barre réelle de A.
 * A démarre un 5 du mois (aucun clamp de fin de mois) et ≥ 41 j après aujourd'hui (C reste
 * à ≥ 20 j de la ligne TODAY, qui intercepterait sinon le hit-test). Une seconde lane porte
 * deux bornes ±400 j (étendue large : la piste doit défiler, cf. `sprint-91-event-pin`).
 *
 * CE QUE LA SPEC NE PROUVE PAS : la lisibilité de deux occurrences RÉELLES superposées
 * (pas d'empilage en rangées, issue dédiée) ; le rendu en thème sombre du contour planché.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const CATEGORY = 'S91 Séries'
const LANE_TITLE = 'S91 Lane séries'
const A_TITLE = 'S91 Série durée'
const B_TITLE = 'S91 Série ponctuelle'
const C_TITLE = 'S91 Hebdo'

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

/* ---------------------------- dates civiles locales ---------------------------- */

function today(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
/** Même clamp de fin de mois que `lib/recurrence.ts` (sans objet ici : départ au 5). */
function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1)
  r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()))
  return r
}
function iso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const TODAY = today()
const BASE = addDays(TODAY, 40)
const A_START = new Date(BASE.getFullYear(), BASE.getMonth() + 1, 5)
const A_SERIES_END = addMonths(A_START, 3)
const B_START = addDays(addMonths(A_START, 1), 3)
const B_SERIES_END = addDays(B_START, 21)
const C_START = addDays(A_START, -21)
const BOUND_PAST = addDays(TODAY, -400)
const BOUND_FUTURE = addDays(TODAY, 400)

const A_ID = uuid('91d59500', 1)
const B_ID = uuid('91d59500', 2)
const C_ID = uuid('91d59500', 3)

/** Fantômes attendus (fin de série INCLUSE, BR-EVE-012). */
const A_GHOSTS = [1, 2, 3].map((k) => iso(addMonths(A_START, k)))
const B_GHOSTS = [7, 14, 21].map((n) => iso(addDays(B_START, n)))

/**
 * Fantômes de C, série non bornée : coupés à la FIN DE L'ÉTENDUE existante
 * (`computeRange` : fin max + 30 j ; la borne future dure 1 j) — jamais étirée.
 */
const RANGE_END = addDays(BOUND_FUTURE, 1 + 30)
const C_GHOST_COUNT = (() => {
  let n = 0
  for (let d = addDays(C_START, 7); d.getTime() <= RANGE_END.getTime(); d = addDays(d, 7)) n++
  return n
})()

const CAT = { id: uuid('91a59500', 1), name: CATEGORY, color: '#1D4ED8' }

function apiEvent(e: {
  id: string
  title: string
  type: 'single' | 'duration'
  start: Date
  end: Date
  color: string
  unit?: 'WEEK' | 'MONTH'
  seriesEnd?: Date | null
  productId: string
}) {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    startDate: iso(e.start),
    endDate: iso(e.end),
    productId: e.productId,
    color: e.color,
    archived: false,
    isRecurring: e.unit !== undefined,
    recurrenceUnit: e.unit ?? null,
    recurrenceEndDate: e.seriesEnd ? iso(e.seriesEnd) : null,
  }
}

const LANE_ID = uuid('91b59500', 1)
const BOUNDS_ID = uuid('91b59500', 2)

const PRODUCTS = [
  {
    id: LANE_ID,
    name: LANE_TITLE,
    color: null,
    category: CAT,
    events: [
      apiEvent({
        id: A_ID,
        title: A_TITLE,
        type: 'duration',
        start: A_START,
        end: addDays(A_START, 10),
        color: '#1D4ED8',
        unit: 'MONTH',
        seriesEnd: A_SERIES_END,
        productId: LANE_ID,
      }),
      apiEvent({
        id: B_ID,
        title: B_TITLE,
        type: 'single',
        start: B_START,
        end: B_START,
        color: '#B4442E',
        unit: 'WEEK',
        seriesEnd: B_SERIES_END,
        productId: LANE_ID,
      }),
      apiEvent({
        id: C_ID,
        title: C_TITLE,
        type: 'single',
        start: C_START,
        end: C_START,
        color: '#2F7D4F',
        unit: 'WEEK',
        seriesEnd: null,
        productId: LANE_ID,
      }),
    ],
  },
  {
    id: BOUNDS_ID,
    name: 'S91 Séries bornes',
    color: null,
    category: CAT,
    events: [
      apiEvent({
        id: uuid('91c59500', 1),
        title: 'S91 Borne passé série',
        type: 'duration',
        start: BOUND_PAST,
        end: addDays(BOUND_PAST, 1),
        color: '#1D4ED8',
        productId: BOUNDS_ID,
      }),
      apiEvent({
        id: uuid('91c59500', 2),
        title: 'S91 Borne futur série',
        type: 'duration',
        start: BOUND_FUTURE,
        end: addDays(BOUND_FUTURE, 1),
        color: '#1D4ED8',
        productId: BOUNDS_ID,
      }),
    ],
  },
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

/* --------------------------------- sondes --------------------------------- */

const eventLocator = (page: Page, title: string): Locator =>
  page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)

const seriesLane = (page: Page): Locator =>
  page
    .getByTestId('timeline-resource-row')
    .filter({ has: page.getByTestId('timeline-resource-title').filter({ hasText: LANE_TITLE }) })

async function twoFrames(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  )
}

async function centerOn(page: Page, target: Locator): Promise<void> {
  await expect(target).toHaveCount(1)
  await target.evaluate((el) =>
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  )
  await twoFrames(page)
}

/** px/jour par libellé FR du niveau de zoom (`DAY_WIDTH_PX`, `zoom.ts`). */
const DAY_WIDTH_BY_LEVEL: Record<string, number> = {
  Jour: 96,
  Semaine: 34,
  Mois: 12,
  Trimestre: 5,
  Année: 2.2,
}
/** Jour à amener au centre pour révéler chaque occurrence réelle (milieu de la barre de A). */
const EVENT_DAYS: Record<string, Date> = {
  [A_TITLE]: addDays(A_START, 5),
  [B_TITLE]: B_START,
  [C_TITLE]: C_START,
}
const daysFrom = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000)

/**
 * Amène `day` au centre de la piste AVANT toute recherche d'occurrence : la virtualisation
 * horizontale (#69) ne monte que la bande visible ± 600 px — au chargement, centré sur
 * aujourd'hui, les séries (≥ 20 j plus loin) ne sont pas toutes montées (mesuré au 1er run :
 * 2 occurrences sur 3). Position = marqueur TODAY de la règle (+ sa gouttière desktop) +
 * jours × px/jour du niveau courant.
 */
async function scrollToDay(page: Page, day: Date): Promise<void> {
  const label = ((await page.getByTestId('timeline-zoom-level').textContent()) ?? '').trim()
  const dayWidth = DAY_WIDTH_BY_LEVEL[label]
  if (!dayWidth) throw new Error(`niveau de zoom inconnu : ${label}`)
  await page.getByTestId('timeline-scroll').evaluate(
    (el, { offsetDays, width }) => {
      const today = el.querySelector<HTMLElement>(
        '.mt-tlv__ruler > .mt-tlv__today, .mt-tlm__ruler > .mt-tlm__today',
      )
      if (!today) throw new Error('marqueur TODAY introuvable')
      const gutter = parseFloat(getComputedStyle(today).marginLeft) || 0
      const x = gutter + parseFloat(today.style.left) + offsetDays * width
      el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'instant' })
    },
    { offsetDays: daysFrom(TODAY, day), width: dayWidth },
  )
  await twoFrames(page)
}

async function revealEvent(page: Page, title: string): Promise<Locator> {
  await scrollToDay(page, EVENT_DAYS[title])
  const target = eventLocator(page, title)
  await centerOn(page, target)
  return target
}

async function ghostDates(page: Page, eventId: string): Promise<string[]> {
  return page
    .locator(`[data-recurrence-mark="ghost"][data-event-id="${eventId}"]`)
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-occurrence-date') ?? ''))
}

interface HitProbe {
  realsChecked: number
  realMisses: string[]
  overlaps: number
  overlapMisses: string[]
}

/**
 * Hit-test RÉEL de la lane des séries, dans la zone visible de la piste (hors colonne
 * sticky d'en-tête, `gutterPx`) :
 *  1. au centre de chaque partie peinte d'une occurrence réelle (barre ; pin ET libellé),
 *     `elementFromPoint` doit rendre CETTE occurrence ;
 *  2. au centre de chaque fantôme, et sur chaque connecteur à l'aplomb d'une occurrence
 *     réelle, si le point tombe DANS une occurrence réelle, le hit-test doit rendre une
 *     occurrence réelle qui le contient — jamais la marque, jamais le fond de lane.
 * `overlaps` compte les cas (2) : il doit être > 0, sinon l'assertion serait vacante.
 */
async function probeLane(lane: Locator, gutterPx: number): Promise<HitProbe> {
  return lane.evaluate((row, gutter) => {
    const scroller = row.closest('.mt-tlv__scroll, .mt-tlm__scroll')
    if (!scroller) throw new Error('conteneur de défilement introuvable')
    const view = scroller.getBoundingClientRect()
    const inView = (x: number, y: number) =>
      x > view.left + gutter + 2 && x < view.right - 2 && y > 0 && y < window.innerHeight
    const reals = [...row.querySelectorAll<HTMLElement>('[data-testid="timeline-event"]')]
    const titleOf = (el: Element | null) => el?.getAttribute('data-event-title') ?? String(el)
    const partsOf = (el: HTMLElement): DOMRect[] =>
      el.getAttribute('data-event-kind') === 'single'
        ? [el.querySelector('.mt-evt-pin'), el.querySelector('.mt-evt-pin__label')].map((n) => {
            if (!n) throw new Error('pin incomplet')
            return n.getBoundingClientRect()
          })
        : [el.getBoundingClientRect()]
    const hitReal = (x: number, y: number) =>
      document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-testid="timeline-event"]') ??
      null
    const inside = (r: DOMRect, x: number, y: number) =>
      x > r.left + 1 && x < r.right - 1 && y > r.top + 1 && y < r.bottom - 1

    const out = {
      realsChecked: 0,
      realMisses: [] as string[],
      overlaps: 0,
      overlapMisses: [] as string[],
    }
    for (const real of reals) {
      for (const part of partsOf(real)) {
        const x = part.left + part.width / 2
        const y = part.top + part.height / 2
        if (!inView(x, y)) continue
        out.realsChecked++
        const hit = hitReal(x, y)
        if (hit !== real) out.realMisses.push(`${titleOf(real)} → ${titleOf(hit)}`)
      }
    }
    const checkPoint = (label: string, x: number, y: number) => {
      if (!inView(x, y)) return
      const covering = reals.filter((real) => partsOf(real).some((p) => inside(p, x, y)))
      if (covering.length === 0) return
      out.overlaps++
      const hit = hitReal(x, y)
      if (!hit || !covering.includes(hit)) {
        out.overlapMisses.push(`${label} sous ${covering.map(titleOf).join('|')} → ${titleOf(hit)}`)
      }
    }
    for (const ghost of row.querySelectorAll('[data-recurrence-mark="ghost"]')) {
      const b = ghost.getBoundingClientRect()
      checkPoint(
        `fantôme ${ghost.getAttribute('data-occurrence-date')}`,
        b.left + b.width / 2,
        b.top + b.height / 2,
      )
    }
    for (const connector of row.querySelectorAll('[data-recurrence-mark="connector"]')) {
      const c = connector.getBoundingClientRect()
      for (const real of reals) {
        for (const part of partsOf(real)) {
          const x = part.left + part.width / 2
          if (x > c.left && x < c.right)
            checkPoint(
              `connecteur ${connector.getAttribute('data-event-id')}`,
              x,
              c.top + c.height / 2,
            )
        }
      }
    }
    return out
  }, gutterPx)
}

/**
 * Assertions de hit-test agrégées sur TROIS cadrages (centré sur A, B puis C). Trois et non
 * deux : en portrait (390 px, dont 122 px de colonne sticky), la piste visible ne fait que
 * ~266 px — centré sur A puis B, seuls 2 points réels tombaient dans la zone sondable (1er run).
 */
async function assertRealOccurrencesOnTop(page: Page, where: string, gutterPx: number) {
  const lane = seriesLane(page)
  const total: HitProbe = { realsChecked: 0, realMisses: [], overlaps: 0, overlapMisses: [] }
  for (const title of [A_TITLE, B_TITLE, C_TITLE]) {
    await revealEvent(page, title)
    const p = await probeLane(lane, gutterPx)
    total.realsChecked += p.realsChecked
    total.realMisses.push(...p.realMisses)
    total.overlaps += p.overlaps
    total.overlapMisses.push(...p.overlapMisses)
  }
  expect(total.realMisses, `[${where}] centre des occurrences réelles`).toEqual([])
  expect(total.overlapMisses, `[${where}] marques sous les occurrences réelles`).toEqual([])
  // Non vacant : A (barre), B (pin + libellé) ont été sondés, et au moins deux croisements
  // marque × occurrence réelle (fantôme de C dans A, fantôme de A sous B) existent.
  expect(total.realsChecked, `[${where}] points réels sondés`).toBeGreaterThanOrEqual(3)
  expect(
    total.overlaps,
    `[${where}] croisements marque × occurrence réelle`,
  ).toBeGreaterThanOrEqual(2)
}

/** Glyphe `↻` PEINT sur les trois séries + marques non interactives, hors `timeline-event`. */
async function assertSeriesIdentifiable(page: Page, where: string) {
  const lane = seriesLane(page)
  const a = await revealEvent(page, A_TITLE)
  // Les marques ne polluent pas le compteur des occurrences (PIT-S46-001). Centré sur A,
  // les trois occurrences réelles (A − 21 j … A + 34 j) sont dans la bande rendue.
  await expect(lane.getByTestId('timeline-event'), `[${where}] occurrences réelles`).toHaveCount(3)

  const glyph = a.locator('.mt-evt-recur')
  await expect(glyph, `[${where}] ↻ de la barre`).toBeVisible()
  await expect(glyph).toHaveText('↻')
  await expect(glyph).toHaveAttribute('aria-hidden', 'true')

  for (const title of [B_TITLE, C_TITLE]) {
    const pin = eventLocator(page, title)
    await centerOn(page, pin)
    await expect(pin.locator('.mt-evt-pin__recur'), `[${where}] ↻ du pin ${title}`).toBeVisible()
    await expect(pin.locator('.mt-evt-pin__label')).toHaveText(`↻ ${title}`)
  }

  await centerOn(page, a)
  const ghost = page.locator(`[data-recurrence-mark="ghost"][data-event-id="${C_ID}"]`).first()
  await expect(ghost, `[${where}] fantôme monté près de A`).toHaveCount(1)
  const connector = page.locator(`[data-recurrence-mark="connector"][data-event-id="${A_ID}"]`)
  await expect(connector, `[${where}] connecteur de A`).toHaveCount(1)
  for (const mark of [ghost, connector]) {
    await expect(mark).toHaveAttribute('aria-hidden', 'true')
    expect(await mark.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
  }
  // Fantômes et connecteur PEINTS : contour / trait non nul, jamais une trame de stries.
  const paint = await page
    .locator(`[data-recurrence-mark="connector"][data-event-id="${A_ID}"]`)
    .evaluate((el) => {
      const s = getComputedStyle(el)
      return { top: s.borderTopStyle, width: parseFloat(s.borderTopWidth), bg: s.backgroundImage }
    })
  expect(paint.top).toBe('dashed')
  expect(paint.width).toBeGreaterThan(0)
  expect(paint.bg).toBe('none')
}

/**
 * Zoom Année : listes de fantômes EXACTES (bornes de série, coupe à l'étendue). La piste ne
 * tient pas toujours dans la bande rendue (portrait) : les fantômes de C sont réunis sur deux
 * cadrages.
 */
async function assertGhostBounds(page: Page, where: string) {
  const level = page.getByTestId('timeline-zoom-level')
  await page.getByTestId('timeline-zoom-out').click()
  await expect(level).toHaveText('Trimestre')
  await page.getByTestId('timeline-zoom-out').click()
  await expect(level).toHaveText('Année')
  await revealEvent(page, A_TITLE)

  // A et B tiennent dans la bande rendue autour de A (≤ 3 mois ≈ 200 px) : listes EXACTES.
  expect(await ghostDates(page, A_ID), `[${where}] A mensuelle, fin incluse`).toEqual(A_GHOSTS)
  expect(await ghostDates(page, B_ID), `[${where}] B hebdo, fin incluse`).toEqual(B_GHOSTS)
  for (const id of [A_ID, B_ID, C_ID]) {
    await expect(
      page.locator(`[data-recurrence-mark="connector"][data-event-id="${id}"]`),
      `[${where}] un connecteur par série`,
    ).toHaveCount(1)
  }

  // C (non bornée) court jusqu'à la fin de l'étendue : ≈ 1 830 px au zoom Année, PLUS que la
  // bande rendue en portrait (390 + 2 × 600 px) — mesuré au 2e run : 53 fantômes montés sur 57.
  // On réunit donc deux cadrages (autour de A, puis fin de l'étendue).
  const cDates = new Set(await ghostDates(page, C_ID))
  await scrollToDay(page, RANGE_END)
  await expect
    .poll(async () =>
      (await ghostDates(page, C_ID)).includes(iso(addDays(C_START, 7 * C_GHOST_COUNT))),
    )
    .toBe(true)
  for (const d of await ghostDates(page, C_ID)) cDates.add(d)
  const sorted = [...cDates].sort()
  expect(sorted, `[${where}] C non bornée, coupée à l’étendue`).toHaveLength(C_GHOST_COUNT)
  expect(sorted.every((d) => d <= iso(RANGE_END))).toBe(true)
  // Aucun fantôme avant le début de sa série.
  expect(sorted.every((d) => d > iso(C_START))).toBe(true)
}

async function openTimeline(page: Page): Promise<void> {
  await stubProducts(page)
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
}

test.describe('#595 frise desktop — ↻, fantômes et connecteur de série', () => {
  test('série identifiable, occurrences réelles jamais recouvertes, fantômes bornés et virtualisés', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openTimeline(page)
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    // Barrière d'hydratation (PIT-S83-001), cf. `sprint-85-timeline-group-head`.
    await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Mois')

    // Légende : les deux marques de récurrence rendues (DEC-S85-002).
    const legend = page.getByTestId('timeline-sidebar-legend')
    await expect(legend.locator('li')).toHaveCount(3)
    await expect(legend.locator('[data-legend="ghost"]')).toBeVisible()
    await expect(legend.locator('[data-legend="ghost"]')).toHaveText('Occurrence à venir')
    await expect(legend.locator('[data-legend="recurrence"]')).toBeVisible()
    await expect(legend.locator('[data-legend="recurrence"]')).toContainText('Récurrence')
    await expect(legend.locator('[data-legend="recurrence"]')).toContainText('↻')

    await assertSeriesIdentifiable(page, 'desktop Mois')
    await assertRealOccurrencesOnTop(page, 'desktop Mois', 168)
    await assertGhostBounds(page, 'desktop Année')

    // VIRTUALISATION : au zoom Jour (96 px/j, piste ≈ 80 000 px), seuls les fantômes de C
    // proches de la bande rendue sont montés — jamais la série entière.
    const level = page.getByTestId('timeline-zoom-level')
    for (const label of ['Trimestre', 'Mois', 'Semaine', 'Jour']) {
      await page.getByTestId('timeline-zoom-in').click()
      await expect(level).toHaveText(label)
    }
    await revealEvent(page, B_TITLE)
    const mountedC = (await ghostDates(page, C_ID)).length
    expect(mountedC, 'fantômes de C montés au zoom Jour').toBeGreaterThan(0)
    expect(mountedC, 'fantômes de C montés au zoom Jour').toBeLessThan(C_GHOST_COUNT)
    // Clic réel sur l'occurrence B (au-dessus du 1er fantôme de A) : ouvre SON détail.
    await eventLocator(page, B_TITLE).locator('.mt-evt-pin').click()
    await expect(page.getByTestId('timeline-drawer')).toContainText(B_TITLE)
  })
})

for (const variant of [
  { name: 'portrait', viewport: { width: 390, height: 844 } },
  { name: 'landscape', viewport: { width: 844, height: 520 } },
] as const) {
  test.describe(`#595 frise mobile ${variant.name} — ↻, fantômes et connecteur de série`, () => {
    test.use({ viewport: variant.viewport })

    test('série identifiable, occurrences réelles jamais recouvertes, fantômes bornés', async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await openTimeline(page)
      await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()
      await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Mois')

      await assertSeriesIdentifiable(page, `mobile ${variant.name} Mois`)
      // Colonne sticky d'étiquette de lane mobile : 120 px max.
      await assertRealOccurrencesOnTop(page, `mobile ${variant.name} Mois`, 122)
      await assertGhostBounds(page, `mobile ${variant.name} Année`)
    })
  })
}
