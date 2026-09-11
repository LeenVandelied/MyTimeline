import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { readAtRest, describeRendering, WCAG_AA_NORMAL } from './support/contrast'

/**
 * #601 (Sprint 85) — En-tête de catégorie de la frise : pastille, compteur de
 * PRODUITS (DEC-S85-001), résumé compact à l'état plié (maquette §B/§C).
 *
 * CE QUE LES TESTS UNITAIRES NE DISENT PAS (`TimelineGroupHead.test.tsx`).
 * jsdom ne fait aucune mise en page : il ne voit ni le GLISSEMENT de la cellule
 * sticky quand la frise défile (`scrollLeft > 0` — le défaut signalé par #592 :
 * le bouton sticky avait la largeur du rail et ne glissait pas), ni l'alignement
 * au pixel des traits du résumé sur les pastilles, ni la hauteur rendue de la
 * rangée (40 px, identique pliée et dépliée), ni la cohérence des cales de la
 * virtualisation verticale (#69) quand une catégorie se replie.
 *
 * DÉTERMINISME — listing produits STUBBÉ (motif de `sprint-85-timeline-sidebar`).
 * Aucune écriture sur le compte PROD partagé. Deux jeux :
 *  - `SMALL` : 3 catégories, 4 produits, événements autour d'aujourd'hui ;
 *  - `LARGE` : 88 lanes (≥ `LANE_VIRTUALIZATION_MIN_ROWS = 60`) → la
 *    virtualisation verticale est ACTIVE, ce que la suite réelle ne garantit
 *    plus depuis le nettoyage #463 (PIT-S64-009 inversé).
 *
 * HYDRATATION (PIT-S83-001) — replier est une BASCULE : un clic perdu ne se
 * rattrape pas par un réessai. Barrière structurelle : `timeline/page.tsx` rend
 * `null` tant que l'utilisateur n'est pas chargé côté client ; la sidebar et les
 * en-têtes n'existent donc qu'après montage React (`waitForTimelineMounted`).
 *
 * CLICS SUR LA CELLULE — la rangée-bouton a la largeur du RAIL (des milliers de
 * px) : un clic Playwright sur elle peut déclencher un `scrollIntoView` qui
 * déplace le défilement horizontal que l'on mesure. On clique la cellule sticky,
 * toujours dans le viewport ; le clic remonte au bouton.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

/** Gouttière de piste = `--lane-header-w` = `LANE_TRACK_OFFSET_PX`. */
const GUTTER_PX = 168
const HEAD_HEIGHT_PX = 40

type Category = { id: string; name: string; color: string | null }

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

/** Un événement = [décalage de début en jours, durée en jours (0 = ponctuel)]. */
function product(n: number, name: string, category: Category, spans: Array<[number, number]>) {
  const id = uuid('85b60100', n)
  return {
    id,
    name,
    color: null,
    category,
    events: spans.map(([start, days], i) => ({
      id: uuid('85c60100', n * 100 + i),
      title: `${name} · ${i + 1}`,
      type: days === 0 ? 'single' : 'duration',
      startDate: isoDay(start),
      endDate: isoDay(start + days),
      productId: id,
      // Encre AA dans la pastille : pas de libellé extérieur (#81).
      color: i % 2 === 0 ? '#1D4ED8' : '#7E22CE',
      archived: false,
    })),
  }
}

const CAT = {
  vehicles: { id: uuid('85a60100', 1), name: 'S85 Véhicules', color: '#1D4ED8' },
  health: { id: uuid('85a60100', 2), name: 'S85 Santé', color: '#15803D' },
  // SANS couleur (DEC-S85-006) : contour neutre, aucun aplat.
  neutral: { id: uuid('85a60100', 3), name: 'S85 Neutre', color: null },
} as const satisfies Record<string, Category>

/**
 * Véhicules : 2 PRODUITS, 4 ÉVÉNEMENTS (compteur ≠ événements). Tous proches
 * d'aujourd'hui : la frise s'ouvre centrée dessus, les pastilles sont montées
 * (fenêtrage horizontal) et visibles sans défiler.
 */
const SMALL = [
  product(1, 'S85 Voiture', CAT.vehicles, [
    [-3, 4],
    [4, 0],
  ]),
  product(2, 'S85 Moto', CAT.vehicles, [
    [-1, 2],
    [6, 3],
  ]),
  product(3, 'S85 Mutuelle', CAT.health, [[2, 0]]),
  // Étendue élargie des deux côtés : la piste dépasse franchement le viewport,
  // le défilement horizontal est possible dans les deux sens.
  product(4, 'S85 Divers', CAT.neutral, [
    [-200, 0],
    [200, 0],
  ]),
]

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

async function gotoTimeline(page: Page, products: unknown[], headCount: number): Promise<void> {
  await stubProducts(page, products)
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()
  await waitForTimelineMounted(page, headCount)
}

/** Barrière d'hydratation NOMMÉE (PIT-S83-001) : cf. en-tête du fichier. */
async function waitForTimelineMounted(page: Page, headCount: number): Promise<void> {
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-sidebar')).toBeVisible()
  await expect(page.getByTestId('timeline-group-head')).toHaveCount(headCount)
}

const head = (page: Page, category: string): Locator =>
  page.locator(`[data-testid="timeline-group-head"][data-category="${category}"]`)
const cell = (page: Page, category: string): Locator =>
  head(page, category).getByTestId('timeline-group-cell')
const pill = (page: Page, title: string): Locator =>
  page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)
const bar = (page: Page, eventId: string): Locator =>
  page.locator(`[data-testid="timeline-group-summary-bar"][data-event-id="${eventId}"]`)

/** Pose `scrollLeft` sans animation (le conteneur est en `scroll-behavior:smooth`). */
async function setScrollLeft(page: Page, left: number): Promise<number> {
  const scroll = page.getByTestId('timeline-scroll')
  await scroll.evaluate((el, x) => el.scrollTo({ left: x, behavior: 'instant' }), left)
  // Laisse passer la frame de synchronisation (rAF) de la frise.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))
  return scroll.evaluate((el) => el.scrollLeft)
}

/** Centre la frise sur aujourd'hui (repère PISTE de la ligne TODAY + gouttière). */
async function centerOnToday(page: Page): Promise<void> {
  const todayLeft = await page
    .locator('.mt-tlv__ruler > .mt-tlv__today')
    .evaluate((el) => parseFloat((el as HTMLElement).style.left))
  const clientWidth = await page.getByTestId('timeline-scroll').evaluate((el) => el.clientWidth)
  await setScrollLeft(page, GUTTER_PX + todayLeft - clientWidth / 2)
}

async function box(locator: Locator) {
  const b = await locator.boundingBox()
  expect(b, 'élément mesurable').not.toBeNull()
  return b!
}

async function toggle(page: Page, category: string, expanded: boolean): Promise<void> {
  await cell(page, category).click()
  await expect(head(page, category)).toHaveAttribute('aria-expanded', String(expanded))
}

const VEHICLE_EVENTS = SMALL.slice(0, 2).flatMap((p) =>
  p.events.map((e) => ({ id: e.id, title: e.title })),
)

/** `x` rendu + largeur temporelle (`style.width` = `widthPx`) des pastilles de Véhicules. */
async function pillGeometry(page: Page, ids?: string[]) {
  const out = new Map<string, { x: number; widthPx: number }>()
  for (const e of VEHICLE_EVENTS) {
    if (ids && !ids.includes(e.id)) continue
    const p = pill(page, e.title)
    const b = await box(p)
    const widthPx = await p.evaluate((el) => parseFloat((el as HTMLElement).style.width))
    out.set(e.id, { x: b.x, widthPx })
  }
  return out
}

test.describe('#601 /timeline — en-tête de catégorie', () => {
  test('pastille + compteur de produits, et ils RESTENT à l’écran quand la frise défile', async ({
    page,
  }) => {
    await gotoTimeline(page, SMALL, 3)

    // Contenu : pastille couleur de catégorie, contour neutre sans couleur,
    // compteur = PRODUITS (2, alors que Véhicules porte 4 événements).
    const swatch = (c: string) => head(page, c).getByTestId('timeline-group-swatch')
    const count = (c: string) => head(page, c).getByTestId('timeline-group-count')
    await expect(swatch(CAT.vehicles.name)).toHaveCSS('background-color', 'rgb(29, 78, 216)')
    await expect(swatch(CAT.neutral.name)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(count(CAT.vehicles.name)).toHaveText('2')
    await expect(count(CAT.health.name)).toHaveText('1')
    await expect(head(page, CAT.vehicles.name)).toHaveAccessibleName(
      `${CAT.vehicles.name}, 2 produits`,
    )
    await expect(head(page, CAT.health.name)).toHaveAccessibleName(`${CAT.health.name}, 1 produit`)

    const scroll = page.getByTestId('timeline-scroll')
    const maxLeft = await scroll.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(maxLeft, 'la piste doit dépasser le viewport').toBeGreaterThan(1000)

    // Trois positions : bord gauche, milieu, bord droit. À chacune la cellule
    // tient le bord gauche du viewport de la frise, pastille et compteur dedans.
    for (const target of [0, Math.round(maxLeft / 2), maxLeft]) {
      const left = await setScrollLeft(page, target)
      const viewport = await box(scroll)
      for (const c of [CAT.vehicles.name, CAT.health.name, CAT.neutral.name]) {
        const cellBox = await box(cell(page, c))
        expect(
          Math.abs(cellBox.x - viewport.x),
          `${c} : cellule collée au bord (scrollLeft ${left})`,
        ).toBeLessThanOrEqual(1)
        expect(Math.round(cellBox.width)).toBe(GUTTER_PX)
        for (const part of [swatch(c), count(c)]) {
          const b = await box(part)
          expect(b.x, `${c} : visible à gauche (scrollLeft ${left})`).toBeGreaterThanOrEqual(
            viewport.x,
          )
          expect(
            b.x + b.width,
            `${c} : dans la gouttière (scrollLeft ${left})`,
          ).toBeLessThanOrEqual(viewport.x + GUTTER_PX)
        }
        await expect(head(page, c).locator('.mt-tlv__group-label')).toBeInViewport()
      }
    }
  })

  test('replier : résumé dans la piste, un trait par événement, aligné en x sur les pastilles', async ({
    page,
  }) => {
    await gotoTimeline(page, SMALL, 3)
    const vehicles = head(page, CAT.vehicles.name)
    const heightOpen = (await box(vehicles)).height
    expect(Math.round(heightOpen)).toBe(HEAD_HEIGHT_PX)

    // Déplié : aucun résumé.
    await expect(vehicles.getByTestId('timeline-group-summary')).toHaveCount(0)
    // Référence = `x` RENDU de la pastille et sa largeur TEMPORELLE (`widthPx`,
    // posée en style). Pas sa largeur rendue : `.mt-tlv__evt` a 20 px de padding
    // horizontal en border-box, une pastille d'un jour au zoom Mois (12 px/j) est
    // donc PEINTE sur 20 px. Le trait, lui, dit la durée (maquette §C).
    const pills = await pillGeometry(page)
    const leftBefore = await page.getByTestId('timeline-scroll').evaluate((el) => el.scrollLeft)

    await toggle(page, CAT.vehicles.name, false)
    // Le repli ne touche pas le défilement horizontal.
    expect(await page.getByTestId('timeline-scroll').evaluate((el) => el.scrollLeft)).toBe(
      leftBefore,
    )
    // Hauteur de rangée identique pliée (critère 4 : le modèle vertical ne saute pas).
    const headBox = await box(vehicles)
    expect(headBox.height).toBeCloseTo(heightOpen, 1)
    await expect(
      page.getByTestId('timeline-resource-title').filter({ hasText: 'S85 Voiture' }),
    ).toHaveCount(0)

    await expect(vehicles.getByTestId('timeline-group-summary-bar')).toHaveCount(
      VEHICLE_EVENTS.length,
    )
    for (const e of VEHICLE_EVENTS) {
      const b = await box(bar(page, e.id))
      const p = pills.get(e.id)!
      expect(Math.abs(b.x - p.x), `trait ${e.title} : même x que la pastille`).toBeLessThanOrEqual(
        0.5,
      )
      expect(
        Math.abs(b.width - p.widthPx),
        `trait ${e.title} : largeur = durée`,
      ).toBeLessThanOrEqual(0.5)
      // Maquette §C : 8 px, centré dans la rangée.
      expect(Math.round(b.height)).toBe(8)
      const rowCenter = headBox.y + (headBox.height - 1) / 2 // filet bas exclu
      expect(Math.abs(b.y + b.height / 2 - rowCenter)).toBeLessThanOrEqual(1)
    }

    // Redéplier : le résumé disparaît, les lanes reviennent.
    await toggle(page, CAT.vehicles.name, true)
    await expect(vehicles.getByTestId('timeline-group-summary')).toHaveCount(0)
    await expect(
      page.getByTestId('timeline-resource-title').filter({ hasText: 'S85 Voiture' }),
    ).toBeVisible()
  })

  test('le résumé suit le défilement et le zoom comme les pastilles', async ({ page }) => {
    await gotoTimeline(page, SMALL, 3)
    const first = VEHICLE_EVENTS[0]
    await toggle(page, CAT.vehicles.name, false)

    // DÉFILEMENT : le trait se déplace exactement comme le contenu défilé ; la
    // cellule, elle, reste en place et recouvre ce qui passe dessous.
    const scroll = page.getByTestId('timeline-scroll')
    const left0 = await scroll.evaluate((el) => el.scrollLeft)
    const x0 = (await box(bar(page, first.id))).x
    const left1 = await setScrollLeft(page, left0 + 150)
    expect(left1 - left0, 'défilement effectif').toBeGreaterThan(100)
    const x1 = (await box(bar(page, first.id))).x
    expect(Math.abs(x0 - x1 - (left1 - left0))).toBeLessThanOrEqual(0.5)
    await setScrollLeft(page, left0)

    // ZOOM : au niveau suivant, trait replié et pastille dépliée coïncident encore.
    const widthBefore = (await box(bar(page, first.id))).width
    const level = page.getByTestId('timeline-zoom-level')
    const levelBefore = await level.textContent()
    await page.getByTestId('timeline-zoom-in').click()
    await expect(level).not.toHaveText(levelBefore ?? '')
    // Le zoom ré-ancre le défilement sur le jour du bord gauche (#449) : les
    // événements, groupés autour d'aujourd'hui, peuvent sortir de la fenêtre de
    // rendu. On recentre sur aujourd'hui (graduation TODAY, toujours rendue).
    await centerOnToday(page)
    await expect
      .poll(async () => (await box(bar(page, first.id))).width, {
        message: 'le trait suit l’échelle',
      })
      .toBeGreaterThan(widthBefore)
    // Les pastilles dépliées au MÊME défilement servent de référence.
    const bars = new Map<string, { x: number; width: number }>()
    for (const e of VEHICLE_EVENTS) {
      if ((await bar(page, e.id).count()) === 0) continue // hors fenêtre horizontale
      const b = await box(bar(page, e.id))
      bars.set(e.id, { x: b.x, width: b.width })
    }
    expect(bars.size, 'au moins un trait monté après zoom').toBeGreaterThan(0)
    const leftZoomed = await scroll.evaluate((el) => el.scrollLeft)
    await toggle(page, CAT.vehicles.name, true)
    expect(await scroll.evaluate((el) => el.scrollLeft)).toBe(leftZoomed)
    const pills = await pillGeometry(page, [...bars.keys()])
    for (const [id, expected] of bars) {
      const p = pills.get(id)!
      expect(Math.abs(p.x - expected.x), `${id} : x après zoom`).toBeLessThanOrEqual(0.5)
      expect(
        Math.abs(p.widthPx - expected.width),
        `${id} : largeur après zoom`,
      ).toBeLessThanOrEqual(0.5)
    }
  })

  test('focus clavier : l’anneau est peint sur la cellule sticky, visible en entier', async ({
    page,
  }) => {
    await gotoTimeline(page, SMALL, 3)
    const leftBeforeTab = await setScrollLeft(page, 900)
    // Vraie navigation clavier (PIT-S83-014 : `focus()` ne déclenche pas
    // `:focus-visible`). Départ : le curseur de la minimap, dernier arrêt de la
    // barre d'outils avant la frise ; puis Tab jusqu'au premier en-tête.
    await page.locator('.mt-minimap__vp').focus()
    const first = head(page, CAT.vehicles.name)
    for (let i = 0; i < 8; i++) {
      if (await first.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(first).toBeFocused()
    // La rangée-bouton est plus large que le viewport : son focus ne doit pas
    // ramener la frise au début (mesuré : 900 → 900).
    expect(await page.getByTestId('timeline-scroll').evaluate((el) => el.scrollLeft)).toBe(
      leftBeforeTab,
    )
    expect(await first.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    const ring = await cell(page, CAT.vehicles.name).evaluate((el) => {
      const cs = getComputedStyle(el)
      return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor }
    })
    expect(ring.style).toBe('solid')
    expect(ring.width).toBe('2px')
    expect(ring.color).not.toBe('rgba(0, 0, 0, 0)')
    // La cellule — donc l'anneau — est entièrement dans le viewport de la frise.
    const viewport = await box(page.getByTestId('timeline-scroll'))
    const c = await box(cell(page, CAT.vehicles.name))
    expect(c.x).toBeGreaterThanOrEqual(viewport.x - 0.5)
    expect(c.x + c.width).toBeLessThanOrEqual(viewport.x + viewport.width)
    // Entrée replie (bouton natif), sans déplacer le défilement horizontal.
    const left = await page.getByTestId('timeline-scroll').evaluate((el) => el.scrollLeft)
    await page.keyboard.press('Enter')
    await expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(await page.getByTestId('timeline-scroll').evaluate((el) => el.scrollLeft)).toBe(left)
  })

  test('contraste : libellé et compteur de l’en-tête ≥ 4,5:1 (clair et sombre)', async ({
    page,
  }) => {
    await gotoTimeline(page, SMALL, 3)
    const targets: Array<[string, Locator]> = [
      ['libellé d’en-tête', head(page, CAT.vehicles.name).locator('.mt-tlv__group-label')],
      ['compteur d’en-tête', head(page, CAT.vehicles.name).getByTestId('timeline-group-count')],
    ]
    for (const theme of ['light', 'dark'] as const) {
      // `next-themes` est en `defaultTheme="system"` : l'émulation suffit à poser
      // `.dark` sur <html> (précédent : `sprint-70-preview-visual.spec.ts`).
      await page.emulateMedia({ colorScheme: theme })
      await expect
        .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
        .toBe(theme === 'dark')
      for (const [label, locator] of targets) {
        const r = await readAtRest(page, locator)
        test.info().annotations.push({
          type: 'contrast',
          description: describeRendering(`${label} (${theme})`, r),
        })
        expect(r.ratio, describeRendering(`${label} (${theme})`, r)).toBeGreaterThanOrEqual(
          WCAG_AA_NORMAL,
        )
      }
    }
  })

  test('correctif hiérarchie : cellule de lane ≠ en-tête de catégorie (fond, graisse, retrait)', async ({
    page,
  }) => {
    await gotoTimeline(page, SMALL, 3)
    const groupCell = cell(page, CAT.vehicles.name)
    const laneHead = page.getByTestId('timeline-resource-head').first()
    const groupLabel = head(page, CAT.vehicles.name).locator('.mt-tlv__group-label')

    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme })
      await expect
        .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
        .toBe(theme === 'dark')

      const groupCs = await groupCell.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { bg: cs.backgroundColor, paddingLeft: parseFloat(cs.paddingLeft) }
      })
      const laneCs = await laneHead.evaluate((el) => {
        const cs = getComputedStyle(el)
        return {
          bg: cs.backgroundColor,
          fontWeight: cs.fontWeight,
          paddingLeft: parseFloat(cs.paddingLeft),
        }
      })
      const groupLabelWeight = await groupLabel.evaluate((el) => getComputedStyle(el).fontWeight)

      test.info().annotations.push({
        type: 'hierarchy',
        description: `${theme} — lane bg=${laneCs.bg} pl=${laneCs.paddingLeft} weight=${laneCs.fontWeight} · catégorie bg=${groupCs.bg} pl=${groupCs.paddingLeft} weight=${groupLabelWeight}`,
      })

      // FOND — les deux niveaux ne partagent plus la même surface.
      expect(laneCs.bg, `fond lane ≠ fond catégorie (${theme})`).not.toBe(groupCs.bg)
      // GRAISSE — maquette §B-bis : lane 500, catégorie 600.
      expect(laneCs.fontWeight, `graisse lane (${theme})`).toBe('500')
      expect(groupLabelWeight, `graisse catégorie (${theme})`).toBe('600')
      // RETRAIT — la lane est en retrait par rapport à la catégorie.
      expect(laneCs.paddingLeft, `retrait lane > retrait catégorie (${theme})`).toBeGreaterThan(
        groupCs.paddingLeft,
      )
    }

    // ALIGNEMENT — le chevron de lane tombe sous la pastille de catégorie.
    const swatchBox = await box(head(page, CAT.vehicles.name).getByTestId('timeline-group-swatch'))
    const chevBox = await box(laneHead.locator('.mt-tlv__chev'))
    expect(
      Math.abs(chevBox.x - swatchBox.x),
      `chevron de lane (x=${chevBox.x}) aligné sous la pastille (x=${swatchBox.x})`,
    ).toBeLessThanOrEqual(1)
  })
})

/* ---------------------------------------------------------------------------
 * Mobile portrait (DEC-S85-005 : l'en-tête est partagé par les trois écrans ;
 * en mobile il n'y a pas de repli de catégorie, donc pas de résumé).
 * ------------------------------------------------------------------------- */

test.describe('#601 /timeline — en-tête de catégorie mobile portrait', () => {
  // Viewport posée AVANT `goto` : `TimelineResponsive` choisit la variante par
  // `matchMedia` (cf. `timeline-mobile.spec.ts`, « piège viewport »).
  test.use({ viewport: { width: 390, height: 844 } })

  test('pastille + compteur, et la cellule tient le bord gauche au défilement', async ({
    page,
  }) => {
    await stubProducts(page, SMALL)
    await ensureAuthenticated(page)
    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-mobile-portrait')).toBeVisible()
    await expect(page.getByTestId('timeline-group-head')).toHaveCount(3)

    const vehicles = head(page, CAT.vehicles.name)
    await expect(vehicles.getByTestId('timeline-group-count')).toHaveText('2')
    await expect(vehicles.getByTestId('timeline-group-swatch')).toHaveCSS(
      'background-color',
      'rgb(29, 78, 216)',
    )
    await expect(vehicles.locator('.sr-only')).toHaveText(`${CAT.vehicles.name}, 2 produits`)
    await expect(vehicles.getByTestId('timeline-group-summary')).toHaveCount(0)

    const scroll = page.getByTestId('timeline-scroll')
    const maxLeft = await scroll.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(maxLeft).toBeGreaterThan(1000)
    for (const target of [0, maxLeft]) {
      const left = await setScrollLeft(page, target)
      const viewport = await box(scroll)
      const cellBox = await box(vehicles.locator('.mt-tlm__group-cell'))
      expect(
        Math.abs(cellBox.x - viewport.x),
        `cellule mobile collée au bord (scrollLeft ${left})`,
      ).toBeLessThanOrEqual(1)
      await expect(vehicles.getByTestId('timeline-group-count')).toBeInViewport()
      await expect(vehicles.getByTestId('timeline-group-swatch')).toBeInViewport()
    }
  })
})

/* ---------------------------------------------------------------------------
 * Critère 4 — virtualisation verticale (#69) ACTIVE : 88 lanes.
 * ------------------------------------------------------------------------- */

const BIG = {
  top: { id: uuid('85a60200', 1), name: 'S85 Haut', color: '#1D4ED8' },
  middle: { id: uuid('85a60200', 2), name: 'S85 Milieu', color: '#15803D' },
  bottom: { id: uuid('85a60200', 3), name: 'S85 Bas', color: '#7E22CE' },
} as const satisfies Record<string, Category>

const TOP_LANES = 8
const MIDDLE_LANES = 60
const BOTTOM_LANES = 20
const LARGE = [
  ...Array.from({ length: TOP_LANES }, (_, i) =>
    product(100 + i, `S85 H${String(i).padStart(2, '0')}`, BIG.top, [[i % 5, 1]]),
  ),
  ...Array.from({ length: MIDDLE_LANES }, (_, i) =>
    product(200 + i, `S85 M${String(i).padStart(2, '0')}`, BIG.middle, [[i % 7, 1]]),
  ),
  // Assez de lanes SOUS le milieu pour que replier celui-ci ne raccourcisse pas
  // la page au point que le navigateur rabatte `scrollY` (ce serait lui qui
  // déplacerait l'en-tête, pas la frise).
  ...Array.from({ length: BOTTOM_LANES }, (_, i) =>
    product(300 + i, `S85 B${String(i).padStart(2, '0')}`, BIG.bottom, [[i % 3, 2]]),
  ),
]

/**
 * Invariant de la virtualisation : chaque lane MONTÉE d'une catégorie est à
 * `bas de l'en-tête + (rang - 1) × hauteur de lane`. Une cale fausse (modèle
 * vertical ≠ DOM, p. ex. un en-tête plus haut une fois plié) décale TOUTES les
 * lanes qui suivent — c'est ça, le « saut ».
 */
async function expectLanesWhereTheModelSaysSo(page: Page, category: string): Promise<number> {
  const offsets = await head(page, category).evaluate((headEl) => {
    const group = headEl.parentElement!
    const headBottom = headEl.getBoundingClientRect().bottom
    return Array.from(
      group.querySelectorAll<HTMLElement>('[data-testid="timeline-resource-row"]'),
    ).map((row) => ({
      rank: Number(row.getAttribute('aria-posinset')),
      top: row.getBoundingClientRect().top - headBottom,
      height: row.getBoundingClientRect().height,
    }))
  })
  expect(offsets.length, `${category} : des lanes sont montées`).toBeGreaterThan(0)
  for (const { rank, top, height } of offsets) {
    expect(Math.abs(top - (rank - 1) * height), `${category} lane ${rank}`).toBeLessThanOrEqual(1)
  }
  return offsets.length
}

/**
 * Ce qui est peint dans la piste, du HAUT au BAS du viewport (sous l'en-tête
 * d'application sticky) : jamais une cale vide.
 *
 * ⚠ PORTÉE MESURÉE (contrôle négatif, S85) : retirer `collapsed` de
 * `geometryKey` ne fait PAS rougir ce test. La bande verticale est en repère
 * RAIL et un repli AU-DESSUS du viewport ne déplace ni le rail ni `scrollY` :
 * la bande reste juste, seul le modèle change, et `windowLanes` le suit. Ce qui
 * fait rougir ce scénario, c'est un en-tête dont la hauteur change au repli
 * (décalage ≠ N lanes, assertion ci-dessous). Cet échantillonnage reste comme
 * invariant de principe, pas comme garde du `geometryKey`.
 */
async function paintedRows(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const scroll = document
      .querySelector('[data-testid="timeline-scroll"]')!
      .getBoundingClientRect()
    const ys = [140, window.innerHeight / 2, window.innerHeight - 6]
    return ys.map((y) => {
      const el = document.elementFromPoint(scroll.left + 400, y)
      const row = el?.closest(
        '[data-testid="timeline-resource-row"], [data-testid="timeline-group-head"]',
      )
      return row ? 'rangée' : `VIDE@${y}:${el?.getAttribute('data-testid') ?? el?.tagName}`
    })
  })
}
const ALL_PAINTED = ['rangée', 'rangée', 'rangée']

test.describe('#601 — repli et virtualisation verticale (#69, 88 lanes)', () => {
  test('replier / déplier au-dessus de la zone visible : cales exactes, aucune zone vide', async ({
    page,
  }) => {
    await gotoTimeline(page, LARGE, 3)
    const middleTitle = (n: number) => `S85 M${String(n).padStart(2, '0')}`
    // Virtualisation active : la dernière lane du milieu n'est PAS montée au chargement.
    await expect(
      page
        .getByTestId('timeline-resource-title')
        .filter({ hasText: middleTitle(MIDDLE_LANES - 1) }),
    ).toHaveCount(0)

    // Amène la lane M30 au centre du viewport (défilement de PAGE).
    const headMiddle = await box(head(page, BIG.middle.name))
    const laneHeight = 46
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      headMiddle.y +
        (await page.evaluate(() => window.scrollY)) +
        HEAD_HEIGHT_PX +
        30 * laneHeight -
        360,
    )
    const m30 = page.getByTestId('timeline-resource-title').filter({ hasText: middleTitle(30) })
    await expect(m30).toBeInViewport()
    await expect(head(page, BIG.top.name)).not.toBeInViewport()
    expect(await paintedRows(page)).toEqual(ALL_PAINTED)
    await expectLanesWhereTheModelSaysSo(page, BIG.middle.name)
    const scrollYBefore = await page.evaluate(() => window.scrollY)
    const yBefore = (await box(m30)).y

    // Replie la catégorie du HAUT, hors écran, au clavier : `focus` sans défilement
    // puis Entrée (un clic Playwright ramènerait l'en-tête dans le viewport).
    await head(page, BIG.top.name).evaluate((el: HTMLElement) => el.focus({ preventScroll: true }))
    await page.keyboard.press('Enter')
    await expect(head(page, BIG.top.name)).toHaveAttribute('aria-expanded', 'false')
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))

    const scrollYAfter = await page.evaluate(() => window.scrollY)
    const yAfter = (await box(m30)).y
    test.info().annotations.push({
      type: 'collapse-above',
      description: `scrollY ${scrollYBefore} → ${scrollYAfter} ; M30 y ${yBefore} → ${yAfter}`,
    })
    // Le seul déplacement admis est le retrait EXACT des lanes repliées (le
    // navigateur peut aussi le compenser par ancrage de défilement : 0).
    const shift = yBefore - yAfter
    expect(
      [0, TOP_LANES * laneHeight].some((d) => Math.abs(shift - d) <= 1),
      `M30 décalée de ${shift}px : ni 0 (ancrage) ni ${TOP_LANES * laneHeight}px (lanes retirées)`,
    ).toBe(true)
    // Les cales suivent le nouveau modèle : aucune lane mal placée, rien de vide.
    await expect.poll(() => paintedRows(page)).toEqual(ALL_PAINTED)
    await expectLanesWhereTheModelSaysSo(page, BIG.middle.name)

    // Et retour : déplier, même invariant.
    await page.keyboard.press('Enter')
    await expect(head(page, BIG.top.name)).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(() => paintedRows(page)).toEqual(ALL_PAINTED)
    await expectLanesWhereTheModelSaysSo(page, BIG.middle.name)
  })

  test('replier la catégorie visible : l’en-tête ne bouge pas, la suivante vient se coller dessous', async ({
    page,
  }) => {
    await gotoTimeline(page, LARGE, 3)
    // En-tête du milieu vers le haut du viewport, ses lanes remplissent l'écran.
    const y0 =
      (await box(head(page, BIG.middle.name))).y + (await page.evaluate(() => window.scrollY))
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y0 - 120)
    const before = await box(head(page, BIG.middle.name))

    await toggle(page, BIG.middle.name, false)
    const after = await box(head(page, BIG.middle.name))
    expect(Math.abs(after.y - before.y), 'l’en-tête replié reste en place').toBeLessThanOrEqual(1)
    expect(after.height).toBeCloseTo(before.height, 1)
    // Le résumé des 60 produits est monté (fenêtré horizontalement).
    expect(
      await head(page, BIG.middle.name).getByTestId('timeline-group-summary-bar').count(),
    ).toBeGreaterThan(0)
    // La catégorie suivante suit immédiatement : aucune cale résiduelle.
    const next = await box(head(page, BIG.bottom.name))
    expect(Math.abs(next.y - (after.y + after.height))).toBeLessThanOrEqual(1)
    await expectLanesWhereTheModelSaysSo(page, BIG.bottom.name)

    await toggle(page, BIG.middle.name, true)
    const reopened = await box(head(page, BIG.middle.name))
    expect(Math.abs(reopened.y - before.y)).toBeLessThanOrEqual(1)
    await expect.poll(() => paintedRows(page)).toEqual(ALL_PAINTED)
    await expectLanesWhereTheModelSaysSo(page, BIG.middle.name)
  })
})
