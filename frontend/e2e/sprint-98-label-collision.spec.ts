import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'

/**
 * #746 (Sprint 98) — Frise : aucun LIBELLÉ ne se peint sur l'occurrence suivante de sa
 * rangée, sur les TROIS frises.
 *
 * Depuis l'empilage #709 (`lane-layout.ts`), une occurrence n'ouvre une rangée que si
 * elle tombe dans l'EMPRISE de la précédente. Deux libellés dépassaient cette emprise :
 *  1. le libellé d'un pin plus long que la réserve constante 100 / 90 px (le CSS le
 *     laissait courir jusqu'à 240 px) ;
 *  2. le libellé EXTÉRIEUR de secours d'une barre à faible contraste (desktop), réservé
 *     à 0 px.
 * Correctif (DEC-S98, `label-reserve.ts`) : réserve ESTIMÉE (caractères × chasse
 * moyenne) avant l'empilage + libellé borné à sa réserve (ellipse, `title` complet).
 *
 * Contrôle que jsdom ne peut pas faire (aucune géométrie de texte) : boîtes RENDUES du
 * libellé et des autres occurrences de la lane → aucune intersection ; `elementFromPoint`
 * au bord droit du libellé ne désigne pas l'occurrence voisine.
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-97-lane-stacking`), aucune écriture sur
 * le compte PROD. Une catégorie, trois lanes :
 *  1. « S98 Prod pin long » : un pin au titre allemand de 45 caractères (J+2), suivi à
 *     13 jours (156 px au zoom Mois) d'une barre — au-delà de l'ancienne réserve desktop
 *     (100 + 8) ET mobile (90 + ⋯ 44 + 10), en deçà du libellé peint (11 + 240) ;
 *  2. « S98 Prod contraste » : barre `#787878` (encre < 4,5:1 dedans ⇒ libellé extérieur)
 *     de 3 jours, suivie 3 jours après sa fin d'une autre barre ;
 *  3. « S98 Prod bornes » (±400 j) : sans elles la piste mobile tiendrait dans le viewport.
 *
 * CONTRÔLES NÉGATIFS (joués, consignés dans `issue-746-done.md`) :
 *  - comportement d'avant (réserve constante + libellé à 240 px) : la spec rougit sur les
 *    trois frises (collision) ;
 *  - réserve neutralisée mais libellé coupé à l'ancienne emprise (troncature 89 / 79 px,
 *    l'option écartée) : rougit sur l'assertion de largeur lisible.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const PIN_LONG = 'Steuererklärung für das Geschäftsjahr abgeben'
const AFTER_PIN = 'S98 Suivant du pin'
const OUTSIDE_BAR = 'Renouvellement assurance habitation'
const AFTER_BAR = 'S98 Suivant de la barre'
const PIN_LANE = 'S98 Prod pin long'
const BAR_LANE = 'S98 Prod contraste'

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CAT = { id: uuid('98a74600', 1), name: 'S98 Libellés', color: '#1D4ED8' }

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
  const id = uuid('98b74600', n)
  return {
    id,
    name,
    color: null,
    category: CAT,
    events: events.map((event, i) => ({
      id: uuid('98c74600', n * 10 + i),
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

const PRODUCTS = [
  product(1, PIN_LANE, [
    { title: PIN_LONG, type: 'single', offset: 2, days: 0, color: '#1D4ED8' },
    { title: AFTER_PIN, type: 'duration', offset: 15, days: 3, color: '#B45309' },
  ]),
  product(2, BAR_LANE, [
    { title: OUTSIDE_BAR, type: 'duration', offset: 2, days: 3, color: '#787878' },
    { title: AFTER_BAR, type: 'duration', offset: 8, days: 3, color: '#1D4ED8' },
  ]),
  product(3, 'S98 Prod bornes', [
    { title: 'S98 Borne passé', type: 'duration', offset: -400, days: 1, color: '#1D4ED8' },
    { title: 'S98 Borne futur', type: 'duration', offset: 400, days: 1, color: '#1D4ED8' },
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

interface LabelMeasure {
  label: Rect
  /** Texte rendu du libellé et attribut `title`. */
  text: string
  titleAttr: string | null
  /** Boîtes des AUTRES occurrences de la lane (titre → boîte). */
  others: Record<string, Rect>
  /** Occurrence atteinte par `elementFromPoint` juste avant le bord droit du libellé. */
  hitAtRightEdge: string | null
  rows: string | null
}

async function centerOn(page: Page, target: Locator): Promise<void> {
  await expect(target).toHaveCount(1)
  await target.evaluate((el) =>
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  )
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  )
}

/**
 * Mesure le libellé de l'occurrence `owner` : pin → `.mt-evt-pin__label` (dans le bouton) ;
 * barre → libellé extérieur `timeline-event-outside-label` de la même lane.
 */
async function measureLabel(
  page: Page,
  opts: { lane: string; owner: string; kind: 'pin' | 'outside' },
): Promise<LabelMeasure> {
  await centerOn(page, eventLocator(page, opts.owner))
  return page.evaluate(({ lane, owner, kind }) => {
    const laneEl =
      Array.from(document.querySelectorAll('[data-testid="timeline-resource-title"]'))
        .find((el) => el.textContent?.trim() === lane)
        ?.closest('[data-testid="timeline-resource-row"]') ?? null
    if (!laneEl) throw new Error(`lane ${lane} absente`)
    const ownerEl = laneEl.querySelector(
      `[data-testid="timeline-event"][data-event-title="${owner}"]`,
    )
    const labelEl =
      kind === 'pin'
        ? (ownerEl?.querySelector('.mt-evt-pin__label') ?? null)
        : (Array.from(laneEl.querySelectorAll('[data-testid="timeline-event-outside-label"]')).find(
            (el) => el.textContent?.includes(owner),
          ) ?? null)
    if (!labelEl) throw new Error(`libellé de ${owner} absent`)
    const rect = (node: Element): Rect => {
      const r = node.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const others: Record<string, Rect> = {}
    for (const el of laneEl.querySelectorAll('[data-testid="timeline-event"]')) {
      const title = el.getAttribute('data-event-title') ?? ''
      if (title !== owner) others[title] = rect(el)
    }
    const label = rect(labelEl)
    const hit =
      document
        .elementFromPoint(label.x + label.w - 1, label.y + label.h / 2)
        ?.closest('[data-testid="timeline-event"]')
        ?.getAttribute('data-event-title') ?? null
    return {
      label,
      text: labelEl.textContent ?? '',
      titleAttr: labelEl.getAttribute('title'),
      others,
      hitAtRightEdge: hit,
      rows: laneEl.getAttribute('data-lane-rows'),
    }
  }, opts)
}

const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

function assertNoCollision(
  m: LabelMeasure,
  ctx: { where: string; owner: string; next: string; minLabelPx: number },
): void {
  const tag = `[${ctx.where}]`
  // Garde anti-vacuité : l'occurrence suivante est bien rendue dans la lane…
  expect(Object.keys(m.others), `${tag} occurrence suivante rendue`).toContain(ctx.next)
  // … et le libellé est plus large que l'ancienne réserve (sinon rien n'est prouvé).
  // C'est AUSSI ce qui distingue la réserve estimée (retenue) de la troncature à
  // l'emprise historique (écartée) : le titre long garde une largeur lisible.
  expect(m.label.w, `${tag} libellé plus large que l'ancienne réserve`).toBeGreaterThan(
    ctx.minLabelPx,
  )
  // 1. Hit-test géométrique : la boîte RENDUE du libellé ne touche aucune autre occurrence.
  for (const [title, box] of Object.entries(m.others)) {
    expect(
      intersects(m.label, box),
      `${tag} libellé de « ${ctx.owner} » ${JSON.stringify(m.label)} ∩ « ${title} » ${JSON.stringify(box)}`,
    ).toBe(false)
  }
  // 2. Hit-test réel : au bord droit du libellé, c'est le libellé (ou le fond), pas la voisine.
  expect(m.hitAtRightEdge, `${tag} elementFromPoint au bord droit du libellé`).not.toBe(ctx.next)
  // 3. Le titre complet reste accessible quand le libellé est coupé.
  expect(m.titleAttr, `${tag} title = titre complet`).toBe(ctx.owner)
}

test.describe('#746 frise desktop — aucun libellé ne chevauche l’occurrence suivante', () => {
  test('pin à titre long et libellé extérieur de secours', async ({ page }) => {
    await stubProducts(page)
    await ensureAuthenticated(page)
    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    // Barrière d'hydratation (PIT-S83-001), cf. `sprint-85-timeline-group-head`.
    await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
    await expect(laneLocator(page, PIN_LANE)).toHaveCount(1)
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Mois')
    await page.keyboard.press('t')

    const pin = await measureLabel(page, { lane: PIN_LANE, owner: PIN_LONG, kind: 'pin' })
    assertNoCollision(pin, {
      where: 'desktop pin',
      owner: PIN_LONG,
      next: AFTER_PIN,
      minLabelPx: 100 - 11,
    })
    expect(pin.rows, '[desktop pin] la suivante passe en rangée 1').toBe('2')

    const outside = await measureLabel(page, {
      lane: BAR_LANE,
      owner: OUTSIDE_BAR,
      kind: 'outside',
    })
    assertNoCollision(outside, {
      where: 'desktop libellé extérieur',
      owner: OUTSIDE_BAR,
      next: AFTER_BAR,
      // Ancienne réserve du libellé extérieur : 0 px. Le titre (35 car.) en fait > 150.
      minLabelPx: 150,
    })
    expect(outside.rows, '[desktop libellé extérieur] la suivante passe en rangée 1').toBe('2')
  })
})

for (const variant of [
  { name: 'portrait', viewport: { width: 390, height: 844 } },
  { name: 'landscape', viewport: { width: 844, height: 520 } },
] as const) {
  test.describe(`#746 frise mobile ${variant.name} — le libellé d’un pin ne chevauche pas la suivante`, () => {
    test.use({ viewport: variant.viewport })

    test('pin à titre long', async ({ page }) => {
      await stubProducts(page)
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()
      await expect(laneLocator(page, PIN_LANE)).toHaveCount(1)
      await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Mois')
      // Pas de raccourci « T » en mobile : recentrage sur la graduation TODAY (même parade
      // que `sprint-97-lane-stacking`) pour ramener la lane dans la bande de rendu.
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

      const pin = await measureLabel(page, { lane: PIN_LANE, owner: PIN_LONG, kind: 'pin' })
      assertNoCollision(pin, {
        where: `mobile ${variant.name} pin`,
        owner: PIN_LONG,
        next: AFTER_PIN,
        minLabelPx: 90 - 11,
      })
      expect(pin.rows, `[mobile ${variant.name}] la suivante passe en rangée 1`).toBe('2')
      // Les frises mobiles ne rendent pas de libellé extérieur (titre dans la barre).
      await expect(page.getByTestId('timeline-event-outside-label')).toHaveCount(0)
    })
  })
}
