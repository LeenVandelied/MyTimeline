import { test, expect, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'

/**
 * #341 — Verrou de non-régression : aucun débordement horizontal de la landing
 * aux largeurs mobiles.
 *
 * ORIGINE — MESURE NÉGATIVE. L'issue #341 signalait « 4 éléments `<g>` d'un SVG
 * inline finissant à x = 384 pour un viewport de 375 px ». L'investigation a
 * localisé ces `<g>` : ils appartiennent au **bouton flottant des TanStack Query
 * Devtools** (`.tsqd-parent-container`, logo TanStack = 4 `<g>` + 3 `<ellipse>` +
 * 1 `<circle>`), monté par `src/contexts/QueryProvider.tsx` UNIQUEMENT sous
 * `NODE_ENV === 'development'`. Ce n'est donc ni un SVG applicatif, ni un défaut
 * de la landing, et il n'existe pas dans le bundle de production.
 *
 * ⚠ PIÈGE DE MESURE, C'EST LA RAISON D'ÊTRE DE CE FICHIER : un balayage
 * `getBoundingClientRect().right > clientWidth` exécuté sur un `npm run dev`
 * REMONTE ce bouton et ressemble trait pour trait à un vrai débordement (le
 * décalage suit la largeur du viewport : 329@320, 384@375, 399@390). Il n'en
 * produit pourtant aucun : `scrollWidth === clientWidth` et le défilement
 * horizontal est nul. Tout futur audit de débordement doit donc EXCLURE
 * `.tsqd-parent-container` et `nextjs-portal` (overlay de dev Next.js) avant de
 * conclure — sans quoi il rouvrira #341 à l'identique.
 *
 * Ce que la spec vérifie, sur le rendu réel :
 *  1. `documentElement.scrollWidth <= clientWidth` ;
 *  2. le défilement horizontal effectif est nul — sonde réelle, `window.scrollTo`
 *     puis relecture de `window.scrollX`. Chromium clampe `scrollX` ; `jsdom` NON
 *     (on y écrit 400 et on relit 400), d'où l'obligation d'un E2E ici ;
 *  3. aucun élément applicatif ne dépasse le bord droit du document ;
 *  4. auto-contrôle : une largeur excessive injectée EST détectée (sinon la spec
 *     serait verte par aveuglement).
 *
 * Locales : `fr` (principale) et `de` (la plus large — c'est elle qui casse les
 * budgets de largeur, cf. l'échec CI Ubuntu du Sprint 52 à 1 px près en `de`).
 */

/** Largeurs de référence : 320 = plus petit mobile supporté, 414 = grand mobile. */
const WIDTHS = [320, 360, 375, 390, 414] as const
const LOCALES = ['fr', 'de'] as const

/** Tolérance sub-pixel : les arrondis de rendu produisent des écarts < 1 px. */
const SUBPIXEL_TOLERANCE_PX = 0.5

interface OverflowReport {
  clientWidth: number
  scrollWidth: number
  maxScrollX: number
  offenders: Array<{ tag: string; cls: string; right: number; width: number }>
}

/**
 * Fait défiler la page de bout en bout puis revient en haut.
 *
 * `useSectionAnimation` révèle les sections au défilement (`opacity: 0` →
 * `visible`). La révélation ne joue que sur `opacity` et `translateY`, donc pas
 * sur la géométrie horizontale — mais mesurer une page dont la moitié des
 * sections n'a jamais été observée laisserait un doute inutile.
 */
async function revealWholePage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    }
    window.scrollTo(0, 0)
  })
}

async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate((tolerance) => {
    const de = document.documentElement
    const clientWidth = de.clientWidth
    const offenders: Array<{ tag: string; cls: string; right: number; width: number }> = []

    for (const el of Array.from(document.querySelectorAll('*'))) {
      // Outillage de DÉVELOPPEMENT, absent du bundle de production : le bouton
      // des TanStack Query Devtools et l'overlay Next.js. Les inclure, c'est
      // rouvrir #341 sur un faux positif.
      if (el.closest('.tsqd-parent-container')) continue
      if (el.tagName.toLowerCase() === 'nextjs-portal' || el.closest('nextjs-portal')) continue

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      if (rect.right > clientWidth + tolerance) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') ?? '').slice(0, 80),
          right: Math.round(rect.right * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
        })
      }
    }

    // Sonde de défilement RÉEL : Chromium clampe `scrollX` à l'amplitude
    // effective, une page sans débordement renvoie donc 0.
    const previousY = window.scrollY
    window.scrollTo(5_000, previousY)
    const maxScrollX = window.scrollX
    window.scrollTo(0, previousY)

    return { clientWidth, scrollWidth: de.scrollWidth, maxScrollX, offenders }
  }, SUBPIXEL_TOLERANCE_PX)
}

for (const locale of LOCALES) {
  test.describe(`Landing — débordement horizontal, locale ${locale}`, () => {
    for (const width of WIDTHS) {
      test.describe(`viewport ${width}px`, () => {
        test.use({ viewport: { width, height: 800 } })

        test('aucun débordement horizontal', async ({ page }) => {
          await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
          await waitForFonts(page)
          await revealWholePage(page)
          // Mesure au repos : le curseur reste où Playwright l'a laissé et un
          // élément survolé peut être mesuré dans un état `:hover` élargi.
          await page.mouse.move(0, 0)

          const report = await measureOverflow(page)

          expect(
            report.offenders,
            `éléments dépassant le bord droit à ${width}px (${locale}) : ${JSON.stringify(report.offenders)}`,
          ).toEqual([])
          expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth)
          expect(report.maxScrollX).toBe(0)
        })
      })
    }
  })
}

test.describe('Landing — auto-contrôle du harnais de débordement', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('un élément trop large injecté EST détecté', async ({ page }) => {
    await page.goto('/fr', { waitUntil: 'domcontentloaded' })
    await waitForFonts(page)
    await page.mouse.move(0, 0)

    await expect
      .poll(async () => (await measureOverflow(page)).offenders.length)
      .toBe(0)

    // `transition: none` + `min-width: 0` : une mutation injectée peut être
    // avalée par une transition en cours ou un `min-width` concurrent.
    await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.id = 'overflow-self-check'
      probe.style.cssText =
        'position:absolute;top:0;left:0;width:9999px;height:4px;transition:none;min-width:0;'
      document.body.appendChild(probe)
    })

    const degraded = await measureOverflow(page)
    expect(degraded.offenders.some((o) => o.tag === 'div')).toBe(true)

    await page.evaluate(() => document.getElementById('overflow-self-check')?.remove())
  })
})
