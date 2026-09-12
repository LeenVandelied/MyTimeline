import { test, expect, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'
import { devToolingSelectors } from './support/dev-tooling'

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
 * l'outillage de dev avant de conclure — sans quoi il rouvrira #341 à
 * l'identique. La liste vit dans `support/dev-tooling.ts`, SOURCE UNIQUE
 * partagée avec `landing-typography-hierarchy.spec.ts` : elle était dupliquée
 * ici en dur et les deux copies avaient déjà divergé (Sprint 59).
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

/**
 * `id` est relevé au même titre que `tag` et `cls` : c'est le seul champ qui
 * identifie la SONDE de l'auto-contrôle (`#overflow-self-check`, sans classe).
 * Sans lui, l'auto-contrôle ne pouvait s'assurer que d'un `tag === 'div'` —
 * satisfait par n'importe quel autre `div` fautif, donc incapable de prouver
 * que c'est bien la sonde injectée qui a été détectée (review Sprint 59).
 */
interface Offender {
  tag: string
  id: string
  cls: string
  right: number
  width: number
}

interface OverflowReport {
  clientWidth: number
  scrollWidth: number
  maxScrollX: number
  offenders: Offender[]
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
  return page.evaluate(
    ({ tolerance, tooling }) => {
      const de = document.documentElement
      const clientWidth = de.clientWidth
      const offenders: Array<{
        tag: string
        id: string
        cls: string
        right: number
        width: number
      }> = []

      for (const el of Array.from(document.querySelectorAll('*'))) {
        // Outillage de DÉVELOPPEMENT, absent du bundle de production (cf.
        // `support/dev-tooling.ts`). Les inclure, c'est rouvrir #341 sur un
        // faux positif. `closest` teste aussi l'élément lui-même.
        if (tooling.some((sel) => el.closest(sel))) continue

        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) continue
        if (rect.right > clientWidth + tolerance) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
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
    },
    { tolerance: SUBPIXEL_TOLERANCE_PX, tooling: devToolingSelectors() },
  )
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

    await expect.poll(async () => (await measureOverflow(page)).offenders.length).toBe(0)

    // `transition: none` + `min-width: 0` : une mutation injectée peut être
    // avalée par une transition en cours ou un `min-width` concurrent.
    const PROBE_ID = 'overflow-self-check'
    await page.evaluate((id) => {
      const probe = document.createElement('div')
      probe.id = id
      probe.style.cssText =
        'position:absolute;top:0;left:0;width:9999px;height:4px;transition:none;min-width:0;'
      document.body.appendChild(probe)
    }, PROBE_ID)

    const degraded = await measureOverflow(page)

    /**
     * On asserte l'IDENTITÉ de la sonde, pas sa forme.
     *
     * L'assertion précédente était `offenders.some((o) => o.tag === 'div')` :
     * VACUOUS, puisque n'importe quel autre `div` réellement fautif l'aurait
     * satisfaite. Elle ne prouvait donc pas ce que ce test prétend prouver —
     * que le harnais DÉTECTE la dégradation injectée. Relevé en review S59.
     */
    expect(
      degraded.offenders.map((o) => o.id),
      `le harnais doit détecter la sonde injectée \`#${PROBE_ID}\` (9999px de large) — ` +
        `débordants relevés : ${JSON.stringify(degraded.offenders)}`,
    ).toContain(PROBE_ID)

    await page.evaluate((id) => document.getElementById(id)?.remove(), PROBE_ID)
  })
})
