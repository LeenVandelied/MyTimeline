import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'

/**
 * Sprint 105 #596 — ZÉBRURES DE LANES (handoff Graphite : « Lanes en zébrures très
 * subtiles (`ink 2.6%`) pour le suivi visuel »), en REMPLACEMENT de la grille verticale
 * de jours (`linear-gradient` 1 px par jour) sur les trois frises : bureau, portrait,
 * paysage.
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER : la couleur RÉSOLUE (cascade DS + thème), et la
 * parité sous VIRTUALISATION réelle (bande mesurée au scroll de page, #69). D'où cette
 * spec sur rendu réel :
 *   1. COULEUR — deux lanes consécutives d'une catégorie : la 1re sans fond propre, la
 *      2e peinte en encre (`--color-ink` résolu) à 2,6 % ; aucune lane ne porte plus de
 *      `background-image`. Bureau : la cellule sticky d'une lane zébrée est l'aplat
 *      OPAQUE équivalent (encre 2,6 % sur `--color-surface`) — la rangée se lit d'un
 *      tenant. Mobile : la colonne reste `surface-2` (#706), zébrée ou non. 2 thèmes.
 *   2. REMISE À ZÉRO PAR CATÉGORIE — la 1re lane de chaque catégorie est claire.
 *   3. PARITÉ STABLE SOUS VIRTUALISATION — 70 lanes (> `LANE_VIRTUALIZATION_MIN_ROWS`),
 *      page défilée à deux positions distantes d'UNE lane : les lanes montées
 *      commencent au-delà du rang 1 (cale haute présente) et le 1er rang monté change
 *      de PARITÉ entre les deux positions (prémisses assertées). À chacune, une lane
 *      est PEINTE zébrée (couleur calculée, pas seulement la classe) SSI son rang
 *      (`aria-posinset`) est pair. Une parité tirée de l'index dans la fenêtre montée,
 *      ou un `:nth-child` (la cale est un enfant de la liste), s'inverse à l'une des
 *      deux positions — c'est le contrôle négatif consigné au done.md de #596.
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-91-more-contrast`), aucune écriture
 * sur le compte PROD. Événements à aujourd'hui + quelques jours (PIT-S91-005).
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
/** Aplat de zébrure (handoff) : alpha de l'encre. */
const ZEBRA_ALPHA = 0.026

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

function product(n: number, category: Category) {
  const id = uuid('105b0596', n)
  return {
    id,
    // Rang zéro-paddé : l'ordre des lanes suit le nom, quel que soit le tri appliqué.
    name: `S105 Lane ${String(n).padStart(2, '0')}`,
    color: null,
    category,
    events: [
      {
        id: uuid('105c0596', n),
        title: `S105 Zébrure ${n}`,
        type: 'duration',
        startDate: isoDay(1),
        endDate: isoDay(4),
        productId: id,
        color: '#1D4ED8',
        archived: false,
      },
    ],
  }
}

const CAT_A: Category = { id: uuid('105a0596', 1), name: 'S105 Zèbre A', color: '#1D4ED8' }
const CAT_B: Category = { id: uuid('105a0596', 2), name: 'S105 Zèbre B', color: '#15803D' }
/** 3 lanes en A, 2 en B : parité intra-catégorie + remise à zéro sur B. */
const SMALL = [1, 2, 3].map((n) => product(n, CAT_A)).concat([4, 5].map((n) => product(n, CAT_B)))
/** 70 lanes dans UNE catégorie : au-delà du seuil de virtualisation verticale (60). */
const LARGE = Array.from({ length: 70 }, (_, i) => product(i + 1, CAT_A))

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

type LaneReading = {
  category: string
  posinset: number
  alt: boolean
  image: string
  /** `backgroundColor` de la lane, en RGBA 0-255 / alpha 0-1. */
  bg: [number, number, number, number]
  /** Fond de la cellule sticky de la lane. */
  label: [number, number, number, number]
}

type Palette = {
  ink: [number, number, number, number]
  surface: [number, number, number, number]
  surface2: [number, number, number, number]
}

/**
 * Relève, dans l'ordre du DOM, chaque lane montée : catégorie, rang, modificateur, fond
 * de lane et de cellule sticky ; plus les tokens RÉSOLUS du thème courant. Les couleurs
 * sont normalisées en RGBA par `getComputedStyle` d'un témoin (Chromium rend
 * `color-mix` en `color(srgb …)`, flottants 0-1) — parse local, sans canvas (le canvas
 * quantifie un alpha de 2,6 % sur 8 bits prémultipliés).
 */
async function readLanes(
  page: Page,
  laneSel: string,
  labelSel: string,
): Promise<{ lanes: LaneReading[]; palette: Palette }> {
  return page.evaluate(
    ({ laneSel, labelSel }) => {
      const parse = (value: string): [number, number, number, number] => {
        const srgb = value.match(
          /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/,
        )
        if (srgb) {
          return [
            Number(srgb[1]) * 255,
            Number(srgb[2]) * 255,
            Number(srgb[3]) * 255,
            srgb[4] === undefined ? 1 : Number(srgb[4]),
          ]
        }
        const rgb = value.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/)
        if (rgb) {
          return [
            Number(rgb[1]),
            Number(rgb[2]),
            Number(rgb[3]),
            rgb[4] === undefined ? 1 : Number(rgb[4]),
          ]
        }
        throw new Error(`couleur non analysable : « ${value} »`)
      }
      const token = (name: string) => {
        const probe = document.createElement('div')
        probe.style.backgroundColor = `var(${name})`
        document.body.appendChild(probe)
        const value = getComputedStyle(probe).backgroundColor
        probe.remove()
        return parse(value)
      }
      const lanes = Array.from(document.querySelectorAll<HTMLElement>(laneSel)).map((lane) => {
        const style = getComputedStyle(lane)
        const label = lane.querySelector<HTMLElement>(labelSel)
        if (!label) throw new Error(`cellule sticky ${labelSel} introuvable`)
        return {
          category: lane.closest('[role="list"]')?.getAttribute('aria-label') ?? '',
          posinset: Number(lane.getAttribute('aria-posinset')),
          alt: lane.className.includes('--alt'),
          image: style.backgroundImage,
          bg: parse(style.backgroundColor),
          label: parse(getComputedStyle(label).backgroundColor),
        }
      })
      return {
        lanes,
        palette: {
          ink: token('--color-ink'),
          surface: token('--color-surface'),
          surface2: token('--color-surface-2'),
        },
      }
    },
    { laneSel, labelSel },
  )
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

/** Composition « source-over » de l'encre à `ZEBRA_ALPHA` sur un fond opaque. */
function zebraOver(ink: Palette['ink'], base: Palette['surface']): number[] {
  return [0, 1, 2].map((c) => ink[c] * ZEBRA_ALPHA + base[c] * (1 - ZEBRA_ALPHA))
}

function expectZebraColors(
  tag: string,
  { lanes, palette }: { lanes: LaneReading[]; palette: Palette },
  view: 'desktop' | 'mobile',
) {
  expect(lanes.length, `${tag} lanes montées`).toBe(SMALL.length)
  for (const lane of lanes) {
    const where = `${tag} ${lane.category} #${lane.posinset}`
    // Grille verticale de jours RETIRÉE (#596) : plus aucun dégradé de fond.
    expect(lane.image, `${where} background-image`).toBe('none')
    // Parité intra-catégorie : rang pair (2e, 4e…) ⇒ zébrée.
    expect(lane.alt, `${where} zébrée ?`).toBe(lane.posinset % 2 === 0)
    if (lane.alt) {
      // Aplat d'ENCRE (token résolu du thème) à 2,6 %.
      expect(near(lane.bg[3], ZEBRA_ALPHA, 0.001), `${where} alpha ${lane.bg[3]}`).toBe(true)
      for (let c = 0; c < 3; c += 1) {
        expect(near(lane.bg[c], palette.ink[c], 1), `${where} canal ${c} = encre`).toBe(true)
      }
    } else {
      expect(lane.bg[3], `${where} lane claire : aucun fond propre`).toBe(0)
    }
    if (view === 'desktop') {
      // Cellule sticky OPAQUE qui prolonge la zébrure (ou reste `surface`).
      expect(lane.label[3], `${where} cellule opaque`).toBe(1)
      const expected = lane.alt ? zebraOver(palette.ink, palette.surface) : palette.surface
      for (let c = 0; c < 3; c += 1) {
        expect(
          near(lane.label[c], expected[c], 1),
          `${where} cellule canal ${c} : ${lane.label[c]} vs ${expected[c]}`,
        ).toBe(true)
      }
    } else {
      // Mobile : la gouttière reste une colonne `surface-2` d'une seule teinte (#706).
      expect(lane.label.slice(0, 3), `${where} colonne surface-2`).toEqual(
        palette.surface2.slice(0, 3),
      )
    }
  }
  // Remise à zéro par catégorie + alternance réelle (non vacant : il y a des deux).
  expect(lanes.filter((l) => l.posinset === 1).every((l) => !l.alt)).toBe(true)
  expect(lanes.some((l) => l.alt) && lanes.some((l) => !l.alt)).toBe(true)
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`#596 zébrures — thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    test('bureau : une lane sur deux en encre 2,6 %, cellule sticky relayée, plus de grille', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await stubProducts(page, SMALL)
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
      await expect(page.getByTestId('timeline-group-head')).toHaveCount(2)
      await expect(page.getByTestId('timeline-resource-row')).toHaveCount(SMALL.length)
      if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
      else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

      const reading = await readLanes(page, '.mt-tlv__lane', '.mt-tlv__lane-label')
      expectZebraColors(`[bureau/${scheme}]`, reading, 'desktop')
    })

    for (const variant of [
      { name: 'portrait', viewport: { width: 390, height: 844 } },
      { name: 'landscape', viewport: { width: 844, height: 520 } },
    ] as const) {
      test(`${variant.name} : une lane sur deux en encre 2,6 %, colonne inchangée`, async ({
        page,
      }) => {
        await page.setViewportSize(variant.viewport)
        await stubProducts(page, SMALL)
        await ensureAuthenticated(page)
        await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
        await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()
        await expect(page.getByTestId('timeline-resource-row')).toHaveCount(SMALL.length)

        const reading = await readLanes(page, '.mt-tlm__lane', '.mt-tlm__lane-label')
        expectZebraColors(`[${variant.name}/${scheme}]`, reading, 'mobile')
      })
    }
  })
}

test('#596 parité STABLE sous virtualisation verticale : zébrée ⇔ rang pair', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stubProducts(page, LARGE)
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-group-head')).toHaveCount(1)
  // Prémisse : la virtualisation est ACTIVE (toutes les lanes ne sont pas montées).
  await expect
    .poll(async () => page.getByTestId('timeline-resource-row').count())
    .toBeLessThan(LARGE.length)

  // Défilement de PAGE (`.mt-tlv__scroll` est `overflow-y:hidden`) vers le milieu :
  // la bande se recale, une cale haute remplace les premières lanes.
  const ranks = async () =>
    page
      .getByTestId('timeline-resource-row')
      .evaluateAll((rows) => rows.map((r) => Number(r.getAttribute('aria-posinset'))))
  const firstRanks: number[] = []
  // Pas d'UNE lane (46 px) à partir du milieu de la frise, jusqu'à avoir vu un 1er rang
  // monté PAIR et un IMPAIR (la bande n'avance pas forcément à chaque pas : hystérésis).
  for (let step = 0; step < 12; step += 1) {
    if (new Set(firstRanks.map((r) => r % 2)).size === 2) break
    const y = 1200 + step * 46
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
    // Deux frames : l'écouteur de scroll remesure la bande à la frame suivante.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    )
    await expect.poll(async () => (await ranks())[0] ?? 0).toBeGreaterThan(1)
    await expect(page.getByTestId('timeline-lane-spacer').first()).toBeAttached()
    const rows = await page.getByTestId('timeline-resource-row').evaluateAll((els) =>
      els.map((r) => {
        // Alpha du fond PEINT (`color(srgb r g b / a)` ou `rgba(…, a)`), 0 si transparent.
        const bg = getComputedStyle(r).backgroundColor
        const alpha = bg.match(/\/ ([\d.]+)\)$/) ?? bg.match(/, ([\d.]+)\)$/)
        return {
          posinset: Number(r.getAttribute('aria-posinset')),
          painted: alpha !== null && Number(alpha[1]) > 0,
        }
      }),
    )
    firstRanks.push(rows[0].posinset)
    expect(rows.length, `[scroll ${y}] lanes montées`).toBeGreaterThan(2)
    for (const row of rows) {
      expect(row.painted, `[scroll ${y}] lane #${row.posinset} zébrée ?`).toBe(
        row.posinset % 2 === 0,
      )
    }
    // Alternance stricte entre lanes MONTÉES consécutives.
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].painted, `[scroll ${y}] alternance #${rows[i].posinset}`).toBe(
        !rows[i - 1].painted,
      )
    }
  }
  // Non vacant : au moins deux cadrages commencent sur des rangs de parités opposées.
  expect(
    new Set(firstRanks.map((r) => r % 2)).size,
    `1ers rangs montés ${firstRanks.join(' / ')} : un pair ET un impair`,
  ).toBe(2)
})
