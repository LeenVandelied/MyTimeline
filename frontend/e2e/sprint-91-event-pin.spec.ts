import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'

/**
 * #594 (Sprint 91) — Frise : un événement PONCTUEL est un PIN, pas une barre.
 *
 * Maquette (`docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md` §2) :
 * pin 10 px centré sur la date + libellé À DROITE, en encre de page ; une durée reste
 * une barre pleine proportionnelle à sa durée. Distinction instant/durée, sur les
 * TROIS frises (desktop, mobile portrait, mobile paysage — arbitrage dev 2026-09-14).
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER (d'où cette spec) : la taille PEINTE du pin à
 * chaque zoom, la zone de frappe ≥ 44 px (le pin n'en fait que 10), le fait que le
 * libellé est posé sur le fond de lane et non sur la couleur de l'événement, et
 * qu'un clic sur le LIBELLÉ atteint bien l'événement (hit-test réel).
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-85-timeline-*`), aucune écriture sur
 * le compte PROD. Deux produits d'une même catégorie, deux événements À LA MÊME DATE
 * (aujourd'hui + 5 j) dans deux lanes adjacentes :
 *  - « S91 Ponctuel » : `single`, couleur `#787878` — un gris qui fait sortir le
 *    titre d'une BARRE (4.43:1) : si le libellé du pin était peint sur la couleur,
 *    ou si le libellé de secours des barres s'y appliquait, la spec le verrait ;
 *  - « S91 Durée 1 j » : `duration` d'un jour — l'événement qu'un pin ne doit JAMAIS
 *    ressembler (c'est exactement ce que rendait le code avant #594).
 * Même date ⇒ le centre du pin doit coïncider avec le bord gauche de la barre.
 * +5 j plutôt qu'aujourd'hui : au zoom Année (2,2 px/j) le pin reste à 11 px de la
 * ligne TODAY, qui ne peut donc pas intercepter le hit-test.
 *
 * GÉOMÉTRIE MESURÉE (PIT-S85-004) : la barre a 20 px de padding, sa largeur RENDUE
 * n'est pas sa durée. On asserte la DURÉE sur `style.width` (= `widthPx`) et le RENDU
 * du pin sur la boîte de `.mt-evt-pin`.
 *
 * CE QUE LA SPEC NE PROUVE PAS : le non-chevauchement d'un libellé de pin avec
 * l'événement SUIVANT de la même lane — la prod n'empile pas les événements en
 * rangées (tous à `top` fixe), la maquette si (`layoutLane`). Hors périmètre #594.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const PIN_TITLE = 'S91 Ponctuel'
const BAR_TITLE = 'S91 Durée 1 j'
const PIN_RGB = 'rgb(120, 120, 120)'
const CATEGORY = 'S91 Pins'
const EVENT_OFFSET_DAYS = 5

/** Libellés FR des niveaux de zoom (du plus fin au plus large) et px/jour (`DAY_WIDTH_PX`). */
const LEVELS = [
  { label: 'Jour', dayWidth: 96 },
  { label: 'Semaine', dayWidth: 34 },
  { label: 'Mois', dayWidth: 12 },
  { label: 'Trimestre', dayWidth: 5 },
  { label: 'Année', dayWidth: 2.2 },
] as const
/** Plancher de largeur d'une barre de durée (`DEFAULT_MIN_WIDTH_PX`). */
const MIN_BAR_WIDTH_PX = 6

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CAT = { id: uuid('91a59400', 1), name: CATEGORY, color: '#1D4ED8' }

function product(
  n: number,
  name: string,
  events: Array<{
    title: string
    type: 'single' | 'duration'
    offset: number
    days: number
    color: string
  }>,
) {
  const id = uuid('91b59400', n)
  return {
    id,
    name,
    color: null,
    category: CAT,
    events: events.map((event, i) => ({
      id: uuid('91c59400', n * 10 + i),
      title: event.title,
      type: event.type,
      startDate: isoDay(event.offset),
      endDate: isoDay(event.offset + event.days),
      productId: id,
      color: event.color,
      archived: false,
    })),
  }
}

/**
 * Ordre de la frise = ordre du listing : pin, barre (lanes ADJACENTES), puis bornes.
 *
 * BORNES (±400 j, dernière lane, loin du couple mesuré) : sans elles l'étendue ne fait
 * que ~70 j, et au zoom Année (2,2 px/j) la piste MOBILE tient dans le viewport — aucun
 * défilement ne peut sortir le pin de sous la colonne sticky (étiquette de lane + cellule
 * de catégorie), qui masque le pin et intercepte le haut de sa cible. Mesuré au premier
 * run : `elementFromPoint` au bord haut ne rendait plus le pin en paysage/Année. Défaut
 * MOBILE préexistant (#392 n'a corrigé que le desktop, gouttière), signalé en suite de
 * #594 — ce n'est pas l'objet de cette spec. 800 j × 96 px/j au zoom Jour ≈ 800
 * graduations rendues (PIT-S82-003) : acceptable.
 */
const PRODUCTS = [
  product(1, 'S91 Prod pin', [
    { title: PIN_TITLE, type: 'single', offset: EVENT_OFFSET_DAYS, days: 0, color: '#787878' },
  ]),
  product(2, 'S91 Prod barre', [
    { title: BAR_TITLE, type: 'duration', offset: EVENT_OFFSET_DAYS, days: 1, color: '#1D4ED8' },
  ]),
  product(3, 'S91 Prod bornes', [
    { title: 'S91 Borne passé', type: 'duration', offset: -400, days: 1, color: '#1D4ED8' },
    { title: 'S91 Borne futur', type: 'duration', offset: 400, days: 1, color: '#1D4ED8' },
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

type Rect = { x: number; y: number; w: number; h: number }

interface PinMeasure {
  kind: string | null
  button: Rect
  mark: Rect
  label: Rect
  row: Rect
  labelColor: string
  markBackground: string
  buttonBackground: string
  pageInk: string
  /** Titre de l'événement atteint par `elementFromPoint` en chaque point sondé. */
  hits: { markTop: string | null; markBottom: string | null; label: string | null }
}

/** Amène l'événement au centre du viewport, sans animation, puis laisse passer 2 frames. */
async function centerOn(page: Page, target: Locator): Promise<void> {
  await expect(target).toHaveCount(1)
  await target.evaluate((el) =>
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  )
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  )
}

async function measurePin(pin: Locator): Promise<PinMeasure> {
  return pin.evaluate((el) => {
    const rect = (node: Element | null): Rect => {
      if (!node) throw new Error('nœud absent')
      const b = node.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }
    const mark = el.querySelector('.mt-evt-pin')
    const label = el.querySelector('.mt-evt-pin__label')
    const row = el.closest('[data-testid="timeline-resource-row"]')
    // Encre de page résolue dans la MÊME cascade (thème compris) que le libellé.
    const probe = document.createElement('span')
    probe.style.color = 'var(--color-ink)'
    el.parentElement!.appendChild(probe)
    const pageInk = getComputedStyle(probe).color
    probe.remove()

    const button = rect(el)
    const m = rect(mark)
    const l = rect(label)
    const hit = (x: number, y: number) =>
      document
        .elementFromPoint(x, y)
        ?.closest('[data-testid="timeline-event"]')
        ?.getAttribute('data-event-title') ?? null
    const markCenterX = m.x + m.w / 2
    return {
      kind: el.getAttribute('data-event-kind'),
      button,
      mark: m,
      label: l,
      row: rect(row),
      labelColor: getComputedStyle(label!).color,
      markBackground: getComputedStyle(mark!).backgroundColor,
      buttonBackground: getComputedStyle(el).backgroundColor,
      pageInk,
      hits: {
        // Bords haut/bas de la ZONE DE FRAPPE, à l'aplomb du pin (hors pin visuel).
        markTop: hit(markCenterX, button.y + 1),
        markBottom: hit(markCenterX, button.y + button.h - 1),
        label: hit(l.x + l.w / 2, l.y + l.h / 2),
      },
    }
  })
}

/** Assertions communes aux trois frises, pour UN niveau de zoom. */
async function assertPinVersusBar(
  page: Page,
  ctx: {
    where: string
    barHeight: number
    dayWidth: number
    /**
     * Débordement vertical ADMIS de la cible hors de sa lane (px, de chaque côté).
     * 0 là où la lane fait ≥ 44 px (desktop 46, portrait 44). 5 en paysage : la lane
     * dense fait 34 px, une cible de 44 px ne peut qu'en déborder — même arbitrage que
     * la hitbox des barres paysage (`::before` −10 px, `timeline.css`).
     */
    laneOverflowPx: number
  },
): Promise<PinMeasure> {
  const pin = eventLocator(page, PIN_TITLE)
  const bar = eventLocator(page, BAR_TITLE)
  await centerOn(page, pin)
  const m = await measurePin(pin)
  const tag = `[${ctx.where}]`

  // 1. Nature : un pin (attribut, pas un testid — PIT-S46-001).
  expect(m.kind, `${tag} data-event-kind du ponctuel`).toBe('single')
  // 2. Pin peint : 10 px × hauteur de barre, couleur de l'événement.
  expect(Math.abs(m.mark.w - 10), `${tag} largeur peinte du pin = 10 px`).toBeLessThanOrEqual(0.5)
  expect(Math.round(m.mark.h), `${tag} hauteur du pin`).toBe(ctx.barHeight)
  expect(m.markBackground, `${tag} pin à la couleur de l'événement`).toBe(PIN_RGB)
  // 3. Libellé HORS du pin, à droite, en encre de page, sur fond transparent.
  expect(m.label.x, `${tag} libellé à droite du pin`).toBeGreaterThanOrEqual(m.mark.x + m.mark.w)
  expect(m.label.w, `${tag} libellé rendu`).toBeGreaterThan(20)
  expect(m.labelColor, `${tag} libellé en --color-ink`).toBe(m.pageInk)
  expect(m.labelColor, `${tag} libellé PAS à la couleur de l'événement`).not.toBe(PIN_RGB)
  expect(m.buttonBackground, `${tag} aucun aplat de barre derrière le libellé`).toBe(
    'rgba(0, 0, 0, 0)',
  )
  // 4. Cible ≥ 44 × 44, contenue dans sa lane au débordement admis près.
  const slack = ctx.laneOverflowPx + 0.5
  expect(m.button.h, `${tag} hauteur de la zone de frappe`).toBeGreaterThanOrEqual(44)
  expect(m.button.w, `${tag} largeur de la zone de frappe`).toBeGreaterThanOrEqual(44)
  expect(m.button.y, `${tag} cible sous le haut de sa lane`).toBeGreaterThanOrEqual(m.row.y - slack)
  expect(m.button.y + m.button.h, `${tag} cible au-dessus du bas de sa lane`).toBeLessThanOrEqual(
    m.row.y + m.row.h + slack,
  )
  // 5. Hit-test réel : bords de la zone de frappe ET libellé atteignent le ponctuel.
  expect(m.hits, `${tag} elementFromPoint`).toEqual({
    markTop: PIN_TITLE,
    markBottom: PIN_TITLE,
    label: PIN_TITLE,
  })
  await expect(page.getByTestId('timeline-event-outside-label')).toHaveCount(0)

  // 6. La durée d'un jour, elle, reste une barre — et c'est ce qui les distingue.
  await expect(bar).toHaveAttribute('data-event-kind', 'duration')
  await expect(bar.locator('.mt-evt-pin')).toHaveCount(0)
  const barGeometry = await bar.evaluate((el) => {
    const b = el.getBoundingClientRect()
    return {
      x: b.x,
      y: b.y,
      h: b.height,
      durationPx: parseFloat((el as HTMLElement).style.width),
      background: getComputedStyle(el).backgroundColor,
    }
  })
  expect(barGeometry.durationPx, `${tag} durée de la barre = max(6, 1 j × px/j)`).toBeCloseTo(
    Math.max(MIN_BAR_WIDTH_PX, ctx.dayWidth),
    5,
  )
  expect(barGeometry.background, `${tag} barre pleine à la couleur de l'événement`).toBe(
    'rgb(29, 78, 216)',
  )
  // Même date : le CENTRE du pin est à l'aplomb du BORD GAUCHE de la barre.
  expect(
    Math.abs(m.mark.x + m.mark.w / 2 - barGeometry.x),
    `${tag} pin centré sur la date (bord gauche de la barre du même jour)`,
  ).toBeLessThanOrEqual(0.5)
  // Cibles verticalement disjointes : la barre PEINTE de la lane voisine commence sous
  // la cible du pin (1 px de tolérance d'arrondi sur le centrage flex en paysage).
  expect(
    barGeometry.y,
    `${tag} la barre voisine commence sous la cible du pin`,
  ).toBeGreaterThanOrEqual(m.button.y + m.button.h - 1)
  return m
}

test.describe('#594 frise desktop — ponctuel = pin, durée = barre', () => {
  test('les 5 niveaux de zoom : pin 10 px non étiré, libellé en encre, cible ≥ 44 px', async ({
    page,
  }) => {
    await stubProducts(page)
    await ensureAuthenticated(page)
    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    // Barrière d'hydratation (PIT-S83-001), cf. `sprint-85-timeline-group-head`.
    await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
    await expect(page.getByTestId('timeline-group-head')).toHaveCount(1)

    const level = page.getByTestId('timeline-zoom-level')
    await expect(level).toHaveText('Mois')
    await page.getByTestId('timeline-zoom-in').click()
    await page.getByTestId('timeline-zoom-in').click()

    const markWidths: number[] = []
    for (const [i, { label, dayWidth }] of LEVELS.entries()) {
      if (i > 0) await page.getByTestId('timeline-zoom-out').click()
      await expect(level).toHaveText(label)
      // Raccourci « T » : ramène la fenêtre de rendu sur aujourd'hui (chemin produit).
      await page.keyboard.press('t')
      const m = await assertPinVersusBar(page, {
        where: `desktop ${label}`,
        barHeight: 26,
        dayWidth,
        laneOverflowPx: 0,
      })
      markWidths.push(m.mark.w)
    }
    // Zooms extrêmes : le pin ne s'étire pas (même largeur peinte de Jour à Année).
    expect(Math.max(...markWidths) - Math.min(...markWidths)).toBeLessThanOrEqual(0.5)

    // Le LIBELLÉ fait partie de la cible : un clic dessus ouvre le détail.
    const pin = eventLocator(page, PIN_TITLE)
    await centerOn(page, pin)
    await pin.locator('.mt-evt-pin__label').click()
    await expect(page.getByTestId('timeline-drawer')).toBeVisible()
    await expect(page.getByTestId('timeline-drawer')).toContainText(PIN_TITLE)
  })
})

for (const variant of [
  {
    name: 'portrait',
    viewport: { width: 390, height: 844 },
    detail: 'timeline-sheet',
    barHeight: 28,
    laneOverflowPx: 0,
  },
  {
    name: 'landscape',
    viewport: { width: 844, height: 520 },
    detail: 'timeline-landscape-drawer',
    barHeight: 24,
    laneOverflowPx: 5,
  },
] as const) {
  test.describe(`#594 frise mobile ${variant.name} — ponctuel = pin, durée = barre`, () => {
    test.use({ viewport: variant.viewport })

    test('les 5 niveaux de zoom : pin 10 px non étiré, libellé en encre, cible ≥ 44 px', async ({
      page,
    }) => {
      await stubProducts(page)
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()

      const level = page.getByTestId('timeline-zoom-level')
      await expect(level).toHaveText('Mois')
      await page.getByTestId('timeline-zoom-in').click()
      await page.getByTestId('timeline-zoom-in').click()

      const scroll = page.getByTestId('timeline-scroll')
      const markWidths: number[] = []
      for (const [i, { label, dayWidth }] of LEVELS.entries()) {
        if (i > 0) await page.getByTestId('timeline-zoom-out').click()
        await expect(level).toHaveText(label)
        // Pas de raccourci « T » en mobile : on recentre sur la graduation TODAY
        // (toujours rendue) pour ramener les événements dans la bande de rendu.
        const todayLeft = await page
          .locator('.mt-tlm__ruler .mt-tlm__today')
          .evaluate((el) => parseFloat((el as HTMLElement).style.left))
        await scroll.evaluate(
          (el, x) =>
            el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'instant' }),
          todayLeft,
        )
        const m = await assertPinVersusBar(page, {
          where: `mobile ${variant.name} ${label}`,
          barHeight: variant.barHeight,
          dayWidth,
          laneOverflowPx: variant.laneOverflowPx,
        })
        markWidths.push(m.mark.w)
      }
      expect(Math.max(...markWidths) - Math.min(...markWidths)).toBeLessThanOrEqual(0.5)

      // `⋯` (alternative a11y au long-press) toujours présent à côté du pin.
      const pin = eventLocator(page, PIN_TITLE)
      await expect(
        page.locator('.mt-tlm__evt-wrap').filter({ has: pin }).getByTestId('timeline-event-more'),
      ).toHaveCount(1)

      await centerOn(page, pin)
      await pin.locator('.mt-evt-pin__label').click()
      await expect(page.getByTestId(variant.detail)).toBeVisible()
      await expect(page.getByTestId(variant.detail)).toContainText(PIN_TITLE)
    })
  })
}
