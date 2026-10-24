import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { waitForFonts } from './support/contrast'
import { PROD } from './support/accounts'

/**
 * Sprint 108 — #623 : ruban du tableau de bord = les 30 PROCHAINS jours, avec une
 * RÈGLE graduée et un VIEWPORT de 9 jours déplaçable (DEC-S108-003, maquette
 * `Dashboard.dc.html` § Hero, extrait `docs/memory/sprints/sprint-108/maquette-dashboard.md`).
 *
 * Ce que jsdom ne peut pas prouver et que cette spec mesure : le glisser RÉEL à la
 * souris (px → jours sur la vraie largeur de piste), le clamp aux bords, le
 * défilement natif du rail à 375 px, la hauteur de la carte (budget `h-24`
 * inchangé : `sprint-84-section-titles` exige les 4 titres de section ≤ 800 px à
 * 1280×800) et le contour de focus du DS sur le slider.
 *
 * Testids couverts (8) : `dashboard-density-ruler`, `dashboard-density-tick`,
 * `dashboard-density-viewport`, `dashboard-density-range`, `dashboard-density-track`,
 * `dashboard-density-plot`, `dashboard-density-ribbon-scroll`, `dashboard-density-today`.
 *
 * Données : le listing `GET /api/users/{userId}/products` est STUBBÉ (motif
 * `sprint-108-en-bref.spec.ts`) : PROD est alimenté par d'autres specs, un compte vide
 * n'y est pas atteignable autrement. « Aujourd'hui » est lu DANS LE NAVIGATEUR.
 */

test.use({
  storageState: PROD.storageState,
  timezoneId: 'Europe/Paris',
})

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

async function stubProducts(page: Page, items: unknown[]): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    })
  })
}

/** Jour civil du NAVIGATEUR décalé de `offset` jours, au format `YYYY-MM-DD`. */
async function browserDay(page: Page, offset: number): Promise<string> {
  return page.evaluate((o) => {
    const d = new Date()
    d.setDate(d.getDate() + o)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, offset)
}

/** Plage attendue, calculée par le NAVIGATEUR avec le même formateur que la page. */
async function expectedRange(page: Page, a: number, b: number): Promise<string> {
  return page.evaluate(
    ([from, to]) => {
      const day = (n: number) => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
      }
      return new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short' }).formatRange(
        day(from),
        day(to),
      )
    },
    [a, b] as const,
  )
}

async function openDashboard(page: Page): Promise<void> {
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('dashboard-density-ribbon')).toBeVisible()
  await waitForFonts(page)
}

async function box(loc: Locator) {
  const b = await loc.boundingBox()
  expect(b, 'élément peint').not.toBeNull()
  return b as { x: number; y: number; width: number; height: number }
}

const EVENT_BASE = {
  type: 'single',
  archived: false,
  isRecurring: false,
  recurrenceUnit: null,
  recurrenceEndDate: null,
  color: null,
}

/* ------------------------------------------------ DESKTOP 1280×800 */

test.describe('#623 — ruban desktop : règle + viewport', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('règle : 7 libellés, « AUJ. » au bord gauche, J+30 au bord droit, sans chevauchement', async ({
    page,
  }) => {
    await stubProducts(page, [])
    await openDashboard(page)

    const ruler = page.getByTestId('dashboard-density-ruler')
    const ticks = ruler.getByTestId('dashboard-density-tick')
    await expect(ticks).toHaveCount(7)
    // Capitales par `.mt-eyebrow` : `innerText` applique `text-transform`.
    expect(await ticks.first().evaluate((el) => (el as HTMLElement).innerText)).toBe('AUJ.')

    const track = await box(page.getByTestId('dashboard-density-track'))
    const first = await box(ticks.first())
    const last = await box(ticks.last())
    expect(Math.abs(first.x - track.x), 'AUJ. aligné à gauche').toBeLessThanOrEqual(1)
    expect(
      Math.abs(last.x + last.width - (track.x + track.width)),
      'J+30 aligné à droite',
    ).toBeLessThanOrEqual(1)

    const boxes = []
    for (let i = 0; i < 7; i++) boxes.push(await box(ticks.nth(i)))
    for (let i = 1; i < 7; i++) {
      expect(
        boxes[i - 1].x + boxes[i - 1].width,
        `libellés ${i - 1}/${i} se chevauchent`,
      ).toBeLessThanOrEqual(boxes[i].x)
    }
    // Style : mono 10 px (`.mt-eyebrow`, plus petit pas mono du DS).
    const typo = await ticks.nth(3).evaluate((el) => {
      const cs = getComputedStyle(el)
      return { size: cs.fontSize, transform: cs.textTransform }
    })
    expect(typo).toEqual({ size: '10px', transform: 'uppercase' })

    // Le trait TODAY est au bord gauche de la piste.
    const today = await box(page.getByTestId('dashboard-density-today'))
    expect(Math.abs(today.x - track.x)).toBeLessThanOrEqual(1)
  })

  test('glisser à la souris : le libellé suit, clamp aux deux bords, calé au jour au lâcher', async ({
    page,
  }) => {
    await stubProducts(page, [])
    await openDashboard(page)

    const vp = page.getByTestId('dashboard-density-viewport')
    const label = page.getByTestId('dashboard-density-range')
    await expect(vp).toHaveAttribute('aria-valuenow', '0')
    await expect(label).toHaveText(`Fenêtre · ${await expectedRange(page, 0, 9)}`)
    expect(await vp.evaluate((el) => getComputedStyle(el).cursor)).toBe('grab')
    expect(await vp.evaluate((el) => getComputedStyle(el).touchAction)).toBe('none')
    expect(
      await page
        .getByTestId('dashboard-density-track')
        .evaluate((el) => getComputedStyle(el).touchAction),
      'la piste garde le geste natif',
    ).toBe('auto')

    const track = await box(page.getByTestId('dashboard-density-track'))
    const dayPx = track.width / 30
    const v0 = await box(vp)
    const y = v0.y + v0.height / 2
    const x = v0.x + v0.width / 2

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dayPx * 3, y, { steps: 6 })
    await expect(vp).toHaveAttribute('aria-valuenow', '3')
    await expect(vp).toHaveAttribute('data-dragging', 'true')
    expect(await vp.evaluate((el) => getComputedStyle(el).cursor)).toBe('grabbing')
    await expect(label).toHaveText(`Fenêtre · ${await expectedRange(page, 3, 12)}`)

    // Bien au-delà du bord droit : borné à 21 (J+21 → J+30), bord droit = piste.
    await page.mouse.move(x + track.width * 2, y, { steps: 6 })
    await expect(vp).toHaveAttribute('aria-valuenow', '21')
    await expect(label).toHaveText(`Fenêtre · ${await expectedRange(page, 21, 30)}`)
    const right = await box(vp)
    expect(Math.abs(right.x + right.width - (track.x + track.width))).toBeLessThanOrEqual(1)

    // Bien au-delà du bord gauche : borné à 0.
    await page.mouse.move(x - track.width * 2, y, { steps: 6 })
    await expect(vp).toHaveAttribute('aria-valuenow', '0')
    const left = await box(vp)
    expect(Math.abs(left.x - track.x)).toBeLessThanOrEqual(1)

    // Lâcher à 5,4 jours : calé sur J+5, position = 5/30 de la piste.
    await page.mouse.move(x + dayPx * 5.4, y, { steps: 6 })
    await page.mouse.up()
    await expect(vp).not.toHaveAttribute('data-dragging', 'true')
    await expect(vp).toHaveAttribute('aria-valuenow', '5')
    const snapped = await box(vp)
    expect(Math.abs(snapped.x - (track.x + dayPx * 5))).toBeLessThanOrEqual(1.5)
    await expect(label).toHaveText(`Fenêtre · ${await expectedRange(page, 5, 14)}`)
  })

  test('clavier : ←/→, Home/End, focus visible du DS', async ({ page }) => {
    await stubProducts(page, [])
    await openDashboard(page)

    const vp = page.getByRole('slider', { name: 'Fenêtre d’aperçu de 9 jours' })
    await expect(vp).toHaveAttribute('data-testid', 'dashboard-density-viewport')
    await vp.focus()
    const outline = await vp.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { style: cs.outlineStyle, width: cs.outlineWidth }
    })
    expect(outline, 'contour de focus DS (`:focus-visible`, 2px solid)').toEqual({
      style: 'solid',
      width: '2px',
    })

    await page.keyboard.press('ArrowRight')
    await expect(vp).toHaveAttribute('aria-valuenow', '1')
    await expect(page.getByTestId('dashboard-density-range')).toHaveText(
      `Fenêtre · ${await expectedRange(page, 1, 10)}`,
    )
    await page.keyboard.press('End')
    await expect(vp).toHaveAttribute('aria-valuenow', '21')
    await page.keyboard.press('ArrowRight')
    await expect(vp).toHaveAttribute('aria-valuenow', '21')
    await page.keyboard.press('ArrowLeft')
    await expect(vp).toHaveAttribute('aria-valuenow', '20')
    await page.keyboard.press('Home')
    await expect(vp).toHaveAttribute('aria-valuenow', '0')
    await expect(vp).toHaveAttribute('aria-valuetext', await expectedRange(page, 0, 9))
  })

  test('hauteur : règle + barres tiennent dans l’ancien bloc de 96 px, la carte ne grandit pas', async ({
    page,
  }) => {
    await stubProducts(page, [])
    await openDashboard(page)

    const ribbon = page.getByTestId('dashboard-density-ribbon')
    const plot = await box(page.getByTestId('dashboard-density-plot'))
    const ruler = await box(page.getByTestId('dashboard-density-ruler'))
    const vp = await box(page.getByTestId('dashboard-density-viewport'))
    const r = await box(ribbon)
    const header = await box(ribbon.locator(':scope > div').first())

    // Avant #623 : barres `h-24` = 96 px sous l'en-tête. Le bloc règle + barres
    // occupe EXACTEMENT ce budget.
    expect(Math.abs(plot.height - 96), JSON.stringify(plot)).toBeLessThanOrEqual(0.5)
    // Carte = bordure 1 + padding 16 + en-tête + gap 8 + 96 + padding 16 + bordure 1.
    expect(r.height, JSON.stringify({ r, header })).toBeLessThanOrEqual(
      header.height + 8 + 96 + 34 + 1,
    )
    // Le viewport déborde la piste de 4 px, mais pas au-dessus de la règle.
    expect(vp.y).toBeGreaterThanOrEqual(ruler.y + ruler.height - 0.5)
    expect(vp.y + vp.height).toBeLessThanOrEqual(r.y + r.height)
    test.info().annotations.push({
      type: 'hauteur-ruban',
      description: `carte ${r.height}px · en-tête ${header.height}px · bloc ${plot.height}px`,
    })

    // Aucun titre de section ne passe sous la flottaison (garde de sprint-84).
    const h2 = await box(page.getByTestId('dashboard-product-list').locator('h2'))
    expect(h2.y + h2.height).toBeLessThanOrEqual(800)
    // Aucun débordement horizontal du ruban (libellés de bord ancrés dedans).
    const overflow = await ribbon.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('données : fenêtre FUTURE — un événement d’hier n’apparaît pas, J+3 oui', async ({
    page,
  }) => {
    await page.goto('about:blank')
    const yesterday = await browserDay(page, -1)
    const in3 = await browserDay(page, 3)
    const P = '00000000-0000-7000-8000-000000623001'
    await stubProducts(page, [
      {
        id: P,
        name: 'S108 ruban',
        color: null,
        category: { id: '00000000-0000-7000-8000-000000623101', name: 'S108 Ruban', color: null },
        events: [
          {
            ...EVENT_BASE,
            id: '00000000-0000-7000-8000-000000623011',
            title: 'S108 hier',
            startDate: yesterday,
            endDate: yesterday,
            productId: P,
          },
          {
            ...EVENT_BASE,
            id: '00000000-0000-7000-8000-000000623012',
            title: 'S108 J+3',
            startDate: in3,
            endDate: in3,
            productId: P,
          },
        ],
      },
    ])
    await openDashboard(page)

    const bars = page.getByTestId('dashboard-density-track').locator('[title]')
    await expect(bars).toHaveCount(30)
    const titles = await bars.evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''))
    const counts = titles.map((t) => Number(t.split(' · ')[1]))
    expect(counts[3], titles[3]).toBe(1)
    expect(
      counts.reduce((a, b) => a + b, 0),
      'hier est hors fenêtre',
    ).toBe(1)
    await expect(page.getByTestId('dashboard-density-eyebrow')).toHaveText(/30 prochains jours/i)
  })
})

/* ------------------------------------------------ MOBILE 375 px */

test.describe('#623 — ruban mobile portrait : défilement natif, pas de viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('rail scrollable, règle qui défile avec les barres, libellé = fenêtre complète', async ({
    page,
  }) => {
    await stubProducts(page, [])
    await openDashboard(page)
    await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()

    await expect(page.getByTestId('dashboard-density-viewport')).toHaveCount(0)
    await expect(page.getByTestId('dashboard-density-range')).toHaveText(
      `Fenêtre · ${await expectedRange(page, 0, 30)}`,
    )

    const rail = page.getByTestId('dashboard-density-ribbon-scroll')
    expect(await rail.evaluate((el) => getComputedStyle(el).touchAction)).toBe('auto')
    const dims = await rail.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
    expect(dims.sw, 'le rail déborde, donc défile').toBeGreaterThan(dims.cw)
    await expect(rail.getByTestId('dashboard-density-ruler')).toBeVisible()
    await expect(rail.getByTestId('dashboard-density-tick')).toHaveCount(7)

    const tick = rail.getByTestId('dashboard-density-tick').nth(1)
    const before = await box(tick)
    const scrolled = await rail.evaluate((el) => {
      el.scrollLeft = 60
      return el.scrollLeft
    })
    expect(scrolled, 'défilement natif effectif').toBeGreaterThan(0)
    await expect
      .poll(async () => before.x - (await box(tick)).x, { message: 'la règle défile avec le rail' })
      .toBeCloseTo(scrolled, 0)

    const doc = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }))
    expect(doc.sw, 'débordement horizontal de page').toBeLessThanOrEqual(doc.cw)
  })
})
