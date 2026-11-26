import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'

/**
 * #673 — Pied de la frise `/timeline` : collé au bas de la fenêtre (P1), minimap non
 * écrasée par le compteur (P2), barre sur une ligne aux deux bornes du zoom et dans les
 * quatre langues (P3).
 *
 * Fichier SÉPARÉ de `sprint-85-timeline-toolbar.spec.ts` (verrouillé par la validation
 * des tests). Listing produits STUBBÉ : aucune écriture sur le compte PROD partagé.
 * PIT-S85-002 : un contrôle élastique écrasé ne déborde pas, on mesure donc la ligne et
 * l'écrasement, pas seulement `scrollWidth`.
 */

test.use({ storageState: sessionState(PROD) })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const hex = (n: number, width = 12) => n.toString(16).padStart(width, '0')

/** `count` produits répartis sur 5 catégories, chacun avec 3 événements. */
function buildProducts(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const productId = `67300000-0000-4000-8000-${hex(i)}`
    const cat = i % 5
    return {
      id: productId,
      name: `S673 Produit ${i + 1}`,
      color: null,
      category: {
        id: `67310000-0000-4000-8000-${hex(cat)}`,
        name: `S673 Catégorie ${cat + 1}`,
        color: '#1D4ED8',
      },
      events: [-200, 0, 200].map((day, j) => ({
        id: `67320000-0000-4000-8000-${hex(i * 3 + j)}`,
        title: `S673 ${i + 1} · ${j + 1}`,
        type: 'single',
        startDate: isoDay(day),
        endDate: isoDay(day),
        productId,
        color: '#1D4ED8',
        archived: false,
      })),
    }
  })
}

async function gotoTimeline(page: Page, locale: string, productCount: number): Promise<void> {
  const body = JSON.stringify(buildProducts(productCount))
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body })
  })
  await ensureAuthenticated(page)
  await page.goto(`/${locale}/timeline`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-today-button')).toHaveCount(1)
  await expect(page.getByTestId('timeline-footer')).toBeVisible()
}

test.describe('#673 /timeline — pied collé au bas de la fenêtre (P1)', () => {
  test('footer bottom stays inside the window with many lanes, 1280x900', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await gotoTimeline(page, 'fr', 40)
    const footer = page.getByTestId('timeline-footer')
    const overflows = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    )
    expect(overflows, 'assez de lanes pour dépasser la fenêtre').toBe(true)

    const bottom = async () => {
      const box = (await footer.boundingBox())!
      return box.y + box.height
    }
    // En haut de page, puis à mi-parcours : le bas du pied reste dans la fenêtre.
    expect(await bottom(), 'haut de page').toBeLessThanOrEqual(900)
    expect(await bottom(), 'haut de page').toBeGreaterThan(900 - 80)
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(150)
    expect(await bottom(), 'mi-parcours').toBeLessThanOrEqual(900)
    expect(await bottom(), 'mi-parcours').toBeGreaterThan(900 - 80)
    // Bas de page : le pied clôt la frise, sans la recouvrir.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(150)
    const end = await page.evaluate(() => {
      const f = document.querySelector('[data-testid="timeline-footer"]')!.getBoundingClientRect()
      const s = document.querySelector('[data-testid="timeline-scroll"]')!.getBoundingClientRect()
      return {
        footerBottom: f.bottom,
        footerTop: f.top,
        scrollBottom: s.bottom,
        vh: window.innerHeight,
      }
    })
    expect(end.footerBottom).toBeLessThanOrEqual(end.vh)
    expect(end.footerTop).toBeGreaterThanOrEqual(end.scrollBottom - 1)
    // Fond opaque : la frise ne transparaît pas sous le pied collé.
    const bg = await footer.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toMatch(/rgba\(.*,\s*0\)$|transparent/)
  })
})

const WIDTHS = [768, 900, 1024, 1100, 1280]
const LOCALES = ['fr', 'en', 'de', 'es']

test.describe('#673 /timeline — minimap du pied non écrasée (P2)', () => {
  for (const locale of ['fr', 'de']) {
    test(`${locale}: footer minimap keeps 160 px from 768 to 1280 px`, async ({ page }) => {
      for (const width of [768, 900, 1024, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        await gotoTimeline(page, locale, 3)
        const m = await page.getByTestId('timeline-footer').evaluate((el) => {
          const slot = el.querySelector('.mt-tlv__minimap-slot')!.getBoundingClientRect()
          const counter = el.querySelector('[data-testid="timeline-footer-counter"]')!
          const c = counter.getBoundingClientRect()
          return {
            slotWidth: slot.width,
            overflow: el.scrollWidth - el.clientWidth,
            counterCrushed: counter.scrollWidth > counter.clientWidth + 1,
            sameLine: Math.abs(slot.top + slot.height / 2 - (c.top + c.height / 2)),
            counterRight: c.right,
            footerRight: el.getBoundingClientRect().right,
          }
        })
        const at = `${locale} ${width} px`
        expect(m.slotWidth, `${at} : minimap utilisable`).toBeGreaterThanOrEqual(160)
        expect(m.overflow, `${at} : pied sans débordement`).toBeLessThanOrEqual(0)
        expect(m.counterCrushed, `${at} : compteur entier`).toBe(false)
        expect(m.sameLine, `${at} : minimap et compteur alignés`).toBeLessThanOrEqual(2)
        expect(m.counterRight, `${at} : compteur dans le pied`).toBeLessThanOrEqual(m.footerRight)
      }
    })
  }
})

test.describe('#673 /timeline — barre sur une ligne aux bornes du zoom (P3)', () => {
  for (const locale of LOCALES) {
    test(`${locale}: toolbar stays on one line at both zoom bounds`, async ({ page }) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await gotoTimeline(page, locale, 3)
        const toolbar = page.locator('.mt-tlv__toolbar')
        const labels: string[] = []
        for (const bound of ['out', 'in'] as const) {
          const button = page.getByTestId(`timeline-zoom-${bound}`)
          for (let i = 0; i < 40 && (await button.isEnabled()); i++) await button.click()
          const label = (await page.getByTestId('timeline-zoom-level').textContent()) ?? ''
          labels.push(label)
          const m = await toolbar.evaluate((el) => {
            const bar = el.getBoundingClientRect()
            const painted = Array.from(el.children)
              .map((c) => ({ c, r: c.getBoundingClientRect() }))
              .filter(({ r }) => r.width > 0 && r.height > 0)
            return {
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              barHeight: bar.height,
              centers: painted.map(({ r }) => r.top + r.height / 2),
              tallest: Math.max(...painted.map(({ r }) => r.height)),
              crushed: painted
                .filter(({ c }) => c.scrollWidth > c.clientWidth + 1)
                .map(({ c }) => c.getAttribute('data-testid') ?? c.className),
            }
          })
          const at = `${locale} ${width} px, zoom ${bound} (${label.trim()})`
          expect(m.scrollWidth, `${at} : sans débordement`).toBeLessThanOrEqual(m.clientWidth)
          expect(m.crushed, `${at} : aucun contrôle écrasé`).toEqual([])
          expect(
            Math.max(...m.centers) - Math.min(...m.centers),
            `${at} : une seule ligne`,
          ).toBeLessThanOrEqual(2)
          expect(m.barHeight, `${at} : barre d'une ligne`).toBeLessThan(m.tallest + 16 + 8)
        }
        // Les deux bornes donnent deux libellés distincts : le test mesure bien deux largeurs.
        expect(new Set(labels).size, `${locale} ${width} px : deux libellés de zoom`).toBe(2)
      }
    })
  }
})
