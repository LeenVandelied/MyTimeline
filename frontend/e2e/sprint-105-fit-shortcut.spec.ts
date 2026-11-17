import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'

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

test.use({ storageState: sessionState(PROD) })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
/** Gouttière sticky des lanes (`LANE_TRACK_OFFSET_PX`, #674). */
const GUTTER_PX = 176
/**
 * #804 — Marges de cadrage ASYMÉTRIQUES (`FIT_MARGINS_PX.desktop`, `zoom.ts`) : à gauche
 * demi-pin 5 + air 35 ; à droite emprise plancher pin + libellé 100 + air 35. Recopiées
 * (et non importées : `zoom.ts` tire `@/…` à l'exécution) — à tenir alignées.
 */
const FIT_LEAD_PX = 40
const FIT_TRAIL_PX = 135
/** #804 — Air minimal entre l'emprise extrême et le bord de la piste (`FIT_EDGE_AIR_PX`). */
const FIT_EDGE_AIR_PX = 35

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
  const usable = (await readFrame(page, [])).usablePx - FIT_LEAD_PX - FIT_TRAIL_PX
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
    // #804 : marges asymétriques ⇒ les centres des pins extrêmes sont décalés de
    // `FIT_TRAIL_PX − FIT_LEAD_PX` = 95 px vers la gauche (c'est l'EMPRISE pin + libellé
    // qui est centrée, pas les dates).
    const g = gaps(framed)
    expect(
      Math.abs(g.right - g.left - (FIT_TRAIL_PX - FIT_LEAD_PX)),
      `centrage ${g.left} vs ${g.right} (écart attendu ${FIT_TRAIL_PX - FIT_LEAD_PX})`,
    ).toBeLessThanOrEqual(1.5)

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

/* ============================================================================
 * #804 — après `F`, le LIBELLÉ du pin de queue est ENTIER dans la piste.
 *
 * Avant #804 la marge de cadrage valait 40 px des deux côtés : le libellé du dernier
 * pin (posé ≈ 100 px à droite de sa date) sortait par le bord droit. Oracle mesuré sur
 * rendu réel (jsdom ne mesure aucun libellé) :
 *  - pin de QUEUE : `.mt-evt-pin__label` à droite ≤ bord de piste − 35 px d'air (à 1 px
 *    près), et pas d'ellipse (`scrollWidth ≤ clientWidth`) ;
 *  - événement de TÊTE : bord gauche − bord de piste ≥ 35 px.
 *
 * JEUX SERRÉS, calculés depuis la piste MESURÉE (`usablePx`) : les niveaux étant discrets,
 * une étendue quelconque laisse jusqu'à un niveau entier de mou et le libellé tient même
 * avec les marges d'avant #804 (mesuré : 150 à 570 px d'air à 1920 px — spec vacante).
 * L'étendue retenue est donc la PLUS GRANDE qui tient au niveau visé avec les marges
 * réelles (mou < 1 jour) : toute marge droite plus petite ferait déborder le libellé.
 * Le pin SEUL n'a pas d'étendue : son oracle est le CENTRAGE de l'emprise pin + libellé
 * (`[date − 5, date + 100]`), qu'une marge symétrique décale de 95 px.
 * Jamais en niveau `year` (30 j de marge de rail = 66 px < 135 : le navigateur rabattrait
 * le défilement, PIT-S105-003) — prémisse assertée par le libellé du niveau.
 * Le 4e jeu porte un titre de queue de 31 caractères (> 19) : au-delà du plancher de
 * 100 px, seule la réserve réelle du libellé (#804 suite, `trailingLabelReservePx`, même
 * estimation 11 + ⌈31 × 6,3⌉ = 207 px) le garde entier.
 *
 * CONTRÔLES NÉGATIFS (consignés au done.md de #805) : marges 40 / 40 ⇒ jeux 1 à 4 rouges ;
 * réserve réelle ignorée (marge droite 135) ⇒ jeu 4 rouge.
 * ========================================================================== */

/** Emprise plancher d'un pin après sa date (`PIN_FOOTPRINT_PX.desktop`). */
const PIN_FOOTPRINT_PX = 100
/** Réserve estimée du libellé long du jeu 4 (`pinFootprintPx`, 31 car. × 6,3 + 11). */
const LONG_TAIL_RESERVE_PX = 11 + Math.ceil(31 * 6.3)
const DAY_WIDTH = { day: 96, week: 34, quarter: 5 } as const

type FitEvent = { title: string; start: number; end?: number }

function fitProduct(n: number, events: FitEvent[]) {
  const id = uuid('117b0804', n)
  const category = { id: uuid('117a0804', n), name: `S117 Libellé Cat ${n}`, color: '#1D4ED8' }
  return {
    id,
    name: `S117 Libellé Produit ${n}`,
    color: null,
    category,
    events: events.map((e, i) => ({
      id: uuid('117c0804', n * 10 + i),
      title: e.title,
      type: e.end === undefined ? 'single' : 'duration',
      startDate: isoDay(e.start),
      endDate: isoDay(e.end ?? e.start),
      productId: id,
      color: category.color,
      archived: false,
    })),
  }
}

/**
 * Ouvre la frise avec un produit provisoire, MESURE la piste, puis recharge avec le jeu
 * calculé pour cette piste (le listing stubbé relit `current` à chaque requête).
 */
async function gotoTimelineSized(
  page: Page,
  build: (usablePx: number) => unknown[],
): Promise<number> {
  let current: unknown[] = [fitProduct(9, [{ title: 'S117 Provisoire', start: 15 }])]
  await page.setViewportSize({ width: 1920, height: 900 })
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(current),
    })
  })
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-group-head')).toHaveCount(1)
  const usablePx = (await readFrame(page, [])).usablePx
  current = build(usablePx)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-group-head')).toHaveCount(current.length)
  await expect(page.getByTestId('timeline-group-head')).toHaveAttribute(
    'data-category',
    /^S117 Libellé Cat [1-4]$/,
  )
  return usablePx
}

async function readLabelFrame(page: Page, head: string, tail: string) {
  return page.getByTestId('timeline-scroll').evaluate(
    (el, { head, tail, gutter }) => {
      const x0 = el.getBoundingClientRect().left + el.clientLeft
      const pill = (title: string) =>
        el.querySelector(`[data-testid="timeline-event"][data-event-title="${title}"]`)
      const headPill = pill(head)
      // Tête : le pin s'il y en a un (il déborde de 5 px à gauche de sa date), sinon la barre.
      const headBox = (headPill?.querySelector('.mt-evt-pin') ?? headPill)?.getBoundingClientRect()
      const tailPin = pill(tail)?.querySelector('.mt-evt-pin')?.getBoundingClientRect()
      const label = pill(tail)?.querySelector<HTMLElement>('.mt-evt-pin__label')
      const labelBox = label?.getBoundingClientRect()
      // Largeur RÉSERVÉE du libellé (`--mt-label-max`, #746) : fixée par l'estimation de
      // `label-reserve.ts`, indépendante de la police réellement chargée.
      const labelMax = label ? parseFloat(getComputedStyle(label).maxWidth) : NaN
      return {
        trackLeft: x0 + gutter,
        trackRight: x0 + el.clientWidth,
        headLeft: headBox ? headBox.left : null,
        tailDate: tailPin ? (tailPin.left + tailPin.right) / 2 : null,
        labelRight: labelBox ? labelBox.right : null,
        reserveRight: labelBox && Number.isFinite(labelMax) ? labelBox.left + labelMax : null,
        labelMaxWidth: Number.isFinite(labelMax) ? labelMax : null,
        labelScrollWidth: label ? label.scrollWidth : null,
        labelClientWidth: label ? label.clientWidth : null,
      }
    },
    { head, tail, gutter: GUTTER_PX },
  )
}

/** Plus grande étendue (jours) qui tient à `dayWidth` avec les marges `lead` / `trail`. */
const tightSpan = (usablePx: number, trailPx: number, dayWidth: number) =>
  Math.floor((usablePx - FIT_LEAD_PX - trailPx) / dayWidth)

const LABEL_CASES: ReadonlyArray<{
  name: string
  level: string
  head: string
  tail: string
  events: (usablePx: number) => FitEvent[]
  /** Pin seul : l'oracle est le centrage de l'emprise, pas l'air (toujours large). */
  centered?: boolean
  /**
   * Titre dont la largeur RENDUE dépend de la police au point de dépasser l'estimation
   * #746 (6,3 px/car.) : le libellé peut alors être coupé par SA réserve (`--mt-label-max`,
   * ellipse + `title`, DEC-S98), pas par le bord de piste. Mesuré au S117 : 188 px sur
   * macOS, 205 px sur la CI Linux pour 196 réservés. La non-troncature n'est pas l'objet
   * de #804 : l'oracle porte alors sur la RÉSERVE entière dans la piste.
   */
  fontDependentWidth?: boolean
}> = [
  {
    name: '2 pins, étendue serrée en `week`',
    level: 'Semaine',
    head: 'S117 Tête A',
    tail: 'S117 Queue A',
    events: (u) => [
      { title: 'S117 Tête A', start: 15 },
      { title: 'S117 Queue A', start: 15 + tightSpan(u, FIT_TRAIL_PX, DAY_WIDTH.week) },
    ],
  },
  {
    name: 'barre + pin, étendue serrée en `quarter`',
    level: 'Trimestre',
    head: 'S117 Barre B',
    tail: 'S117 Queue B',
    events: (u) => [
      { title: 'S117 Barre B', start: 20, end: 50 },
      { title: 'S117 Queue B', start: 20 + tightSpan(u, FIT_TRAIL_PX, DAY_WIDTH.quarter) },
    ],
  },
  {
    name: 'pin seul (emprise centrée)',
    level: 'Jour',
    head: 'S117 Seul C',
    tail: 'S117 Seul C',
    events: () => [{ title: 'S117 Seul C', start: 40 }],
    centered: true,
  },
  {
    name: '2 pins, titre de queue de 31 caractères, étendue serrée en `week`',
    level: 'Semaine',
    head: 'S117 Tête D',
    tail: 'S117 échéance de queue allongée',
    fontDependentWidth: true,
    events: (u) => [
      { title: 'S117 Tête D', start: 15 },
      {
        title: 'S117 échéance de queue allongée',
        start:
          15 +
          tightSpan(
            u,
            Math.max(FIT_TRAIL_PX, LONG_TAIL_RESERVE_PX + FIT_EDGE_AIR_PX),
            DAY_WIDTH.week,
          ),
      },
    ],
  },
]

test.describe('#804 — touche F : libellé du pin de queue entier', () => {
  LABEL_CASES.forEach((c, i) => {
    test(`${c.name} : libellé de queue entier, tête à ≥ 35 px de la gouttière`, async ({
      page,
    }) => {
      await gotoTimelineSized(page, (usablePx) => [fitProduct(i + 1, c.events(usablePx))])
      const level = page.getByTestId('timeline-zoom-level')
      await expect(level).toHaveText('Mois')
      await page.keyboard.press('f')
      // Chaque jeu se cadre à un AUTRE niveau que `month` (initial) : l'attendre prouve que
      // le cadrage est appliqué — et que le jeu n'est pas tombé en `year` (rail rabattu).
      await expect(level).toHaveText(c.level)
      await expect
        .poll(async () => {
          const f = await readLabelFrame(page, c.head, c.tail)
          return f.labelRight !== null && f.headLeft !== null && f.tailDate !== null
        })
        .toBe(true)
      const f = await readLabelFrame(page, c.head, c.tail)
      const tailAir = f.trackRight - (f.labelRight ?? Infinity)
      const headAir = (f.headLeft ?? -Infinity) - f.trackLeft
      expect(
        tailAir,
        `${c.name} : libellé « ${c.tail} » à ${tailAir} px du bord droit de la piste`,
      ).toBeGreaterThanOrEqual(FIT_EDGE_AIR_PX - 1)
      // Oracle INDÉPENDANT DE LA POLICE : la place réservée au libellé (départ du libellé +
      // `--mt-label-max`) tient dans la piste, avec l'air. C'est ce que garantit le cadrage F.
      const reserveAir = f.trackRight - (f.reserveRight ?? Infinity)
      expect(
        reserveAir,
        `${c.name} : réserve du libellé (${f.labelMaxWidth} px) à ${reserveAir} px du bord droit`,
      ).toBeGreaterThanOrEqual(FIT_EDGE_AIR_PX - 1)
      if (c.fontDependentWidth) {
        // Si le texte est coupé, il ne l'est QUE par sa propre réserve (jamais au-delà).
        expect(
          Math.abs(
            (f.labelClientWidth ?? 0) - Math.min(f.labelScrollWidth ?? 0, f.labelMaxWidth ?? 0),
          ),
          `${c.name} : largeur du libellé = min(texte, réserve)`,
        ).toBeLessThanOrEqual(1)
      } else {
        expect(
          f.labelScrollWidth ?? Infinity,
          `${c.name} : libellé « ${c.tail} » non tronqué (scrollWidth ≤ clientWidth)`,
        ).toBeLessThanOrEqual(f.labelClientWidth ?? 0)
      }
      expect(
        headAir,
        `${c.name} : « ${c.head} » à ${headAir} px de la gouttière`,
      ).toBeGreaterThanOrEqual(FIT_EDGE_AIR_PX - 1)
      if (c.centered) {
        // Emprise `[date − 5, date + 100]` centrée : même air des deux côtés.
        const emprRightAir = f.trackRight - ((f.tailDate ?? 0) + PIN_FOOTPRINT_PX)
        expect(
          Math.abs(headAir - emprRightAir),
          `${c.name} : emprise centrée (${headAir} px à gauche, ${emprRightAir} px à droite)`,
        ).toBeLessThanOrEqual(1.5)
      }
    })
  })
})
