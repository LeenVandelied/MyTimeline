import { test, expect, type Page } from '@playwright/test'

/**
 * #616 — La landing est plafonnée à 1340 px (handoff : `max-width:1340px;margin:0 auto`).
 *
 * Avant #616, les sections utilisaient le `container` Tailwind, qui monte à 1536 px
 * au-delà de `2xl` : à 1920 px la page s'étalait ~200 px trop large. Le plafond vient
 * désormais du token `--container-landing` (`globals.css`, `@theme`), porté par
 * l'utilitaire `container-landing`, réservé aux 5 conteneurs de la landing.
 *
 * Ce que la spec verrouille :
 *  1. à 1920 px, CHAQUE conteneur de la landing mesure 1340 px et est centré ;
 *  2. sous le seuil (1280, 375), le rendu est celui d'avant (paliers `container`
 *     inchangés) et la page ne défile pas horizontalement ;
 *  3. le plafond ne fuit PAS hors landing : `/fr/privacy` (qui garde `container`)
 *     mesure toujours 1536 px à 1920 ;
 *  4. auto-contrôle : plafond retiré par feuille injectée → la mesure le voit.
 *
 * Landing publique : aucun `storageState` requis.
 */

const LANDING_MAX_PX = 1340
/** Header, hero, frise de cas d'usage, CTA, footer. */
const LANDING_CONTAINERS = 5
const SUBPIXEL_TOLERANCE_PX = 0.5

interface Box {
  left: number
  width: number
}

interface Measure {
  viewport: number
  scrollWidth: number
  boxes: Box[]
}

async function measureLanding(page: Page): Promise<Measure> {
  return page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    boxes: [...document.querySelectorAll<HTMLElement>('.container-landing')].map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, width: r.width }
    }),
  }))
}

test.describe('#616 — largeur maximale de la landing', () => {
  test.describe('à 1920 px', () => {
    test.use({ viewport: { width: 1920, height: 1000 } })

    test('chaque conteneur de la landing mesure 1340 px et est centré', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.container-landing')).toHaveCount(LANDING_CONTAINERS)

      const m = await measureLanding(page)
      const expectedLeft = (m.viewport - LANDING_MAX_PX) / 2
      for (const box of m.boxes) {
        expect(box.width).toBeCloseTo(LANDING_MAX_PX, 0)
        expect(Math.abs(box.left - expectedLeft)).toBeLessThanOrEqual(SUBPIXEL_TOLERANCE_PX)
      }
      expect(m.scrollWidth).toBeLessThanOrEqual(m.viewport)
    })

    test('auto-contrôle : sans plafond, la mesure dépasse 1340 px', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.container-landing')).toHaveCount(LANDING_CONTAINERS)
      await page.addStyleTag({ content: '.container-landing { max-width: none !important; }' })

      const m = await measureLanding(page)
      for (const box of m.boxes) {
        expect(box.width).toBeGreaterThan(LANDING_MAX_PX)
      }
    })

    test('hors landing, `/fr/privacy` garde le `container` Tailwind (1536 px)', async ({
      page,
    }) => {
      await page.goto('/fr/privacy', { waitUntil: 'domcontentloaded' })
      const widths = await page
        .locator('.container')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width))
      expect(widths.length).toBeGreaterThan(0)
      for (const w of widths) expect(w).toBeCloseTo(1536, 0)
      await expect(page.locator('.container-landing')).toHaveCount(0)
    })
  })

  for (const width of [1280, 375] as const) {
    test.describe(`à ${width} px`, () => {
      test.use({ viewport: { width, height: 900 } })

      test('rendu sous le seuil inchangé, sans débordement horizontal', async ({ page }) => {
        await page.goto('/fr', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('.container-landing')).toHaveCount(LANDING_CONTAINERS)

        const m = await measureLanding(page)
        for (const box of m.boxes) {
          // Sous 1340 px, le palier `container` courant s'applique : ici il vaut la
          // largeur de la fenêtre (1280 = palier `xl`, 375 < palier `sm`).
          expect(box.width).toBeLessThanOrEqual(m.viewport + SUBPIXEL_TOLERANCE_PX)
          expect(box.width).toBeCloseTo(Math.min(m.viewport, 1280), 0)
        }
        expect(m.scrollWidth).toBeLessThanOrEqual(m.viewport)
      })
    })
  }
})
