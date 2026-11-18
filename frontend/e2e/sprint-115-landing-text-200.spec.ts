import { test, expect, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'
import { applyTextX2 } from './support/text-zoom'

/**
 * #799 — WCAG 1.4.4 : la landing reste lisible SANS défilement horizontal à 200 % de
 * texte, en `fr` et en `de`, à 375 et à 1024 px.
 *
 * Simulation : tokens `--text-*` doublés (`support/text-zoom.ts`, PIT-S104-003 —
 * `html{font-size:200%}` ne change rien dans ce dépôt).
 *
 * Relevé AVANT correctif (macOS, Chromium Playwright, `next dev`) :
 *   - header 375 px : document à 504 px (`fr`) / 529 px (`de`) — logo + CTA + burger
 *     sur une ligne qui ne passait pas à la ligne ;
 *   - header 1024 px `de` : document à 1054 px (groupe langue/thème/CTA 534 px) ;
 *   - hero : `h1` 417 px pour 343 (375 px `de`), 537 / 679 px pour 396 (1024 px) —
 *     à 1024 px le texte débordait SUR la frise animée sans élargir le document ;
 *   - frise (1024 px) : `h3`/`p` de jalon à ~250 px pour une colonne de 227 ;
 *   - bandeau final (375 px) : bouton 389 px (`fr`), `h2` 398 px (`de`) pour 343 ;
 *   - pied de page : sain.
 *
 * DEUX SONDES, parce qu'une seule ment (PIT-S63-012, PIT-S77-002, et le cas « 0 fautif
 * sur une page qui déborde ») :
 *   1. le DOCUMENT : `scrollWidth <= clientWidth` (`html` et `body`) ;
 *   2. chaque élément PORTEUR DE TEXTE des 5 sections : son contenu tient dans sa boîte
 *      (`scrollWidth - clientWidth <= 1`) ET sa boîte tient dans la fenêtre. La sonde 2
 *      voit ce que la 1 rate : un `h1` qui déborde sur sa voisine sans élargir la page,
 *      ou un débordement masqué par un ancêtre `overflow:hidden`.
 * Exclusions, chacune justifiée : `.sr-only` (rogné par construction) et les sous-arbres
 * `aria-hidden="true"` — la frise animée du hero est une piste qui DÉFILE dans son
 * viewport `overflow:hidden` (1640 px de piste pour 341 visibles, identique au texte
 * nominal) : son débordement est le mécanisme de l'animation, pas un défaut.
 */

const SECTIONS = {
  header: '[data-testid="landing-header-bar"]',
  hero: 'section:has([data-testid="landing-hero-cta-primary"])',
  frieze: '#how-it-works',
  finalCta: 'section:has([data-testid="landing-final-cta-register"])',
  footer: 'footer',
} as const

const FROZEN_SECTIONS_CSS =
  '.section-animation { opacity: 1 !important; transform: none !important; transition: none !important }'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

async function gotoLandingX2(page: Page, locale: string): Promise<void> {
  await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
  await waitForFonts(page)
  await expect(page.getByTestId('landing-header-bar')).toBeVisible()
  await page.addStyleTag({ content: FROZEN_SECTIONS_CSS })

  const h1 = page.locator(SECTIONS.hero).locator('h1')
  const before = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const nominal = await applyTextX2(page)
  await waitForFonts(page)
  // Précondition : la simulation a PRIS — sans elle, tout le reste est vacant.
  await expect
    .poll(() => h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)))
    .toBe(before * 2)
  expect(nominal['2xs'], 'échelle DS lue sur :root').toBeGreaterThan(0)
}

interface Offender {
  section: string
  what: string
}

for (const locale of ['fr', 'de'] as const) {
  for (const width of [375, 1024] as const) {
    test(`${width} px, ${locale}, texte ×2 — aucun débordement horizontal (5 sections)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await gotoLandingX2(page, locale)

      // Chaque section doit exister : une section introuvable rendrait la sonde vacante.
      for (const [name, selector] of Object.entries(SECTIONS)) {
        await expect(page.locator(selector), `section ${name}`).toHaveCount(1)
      }

      const m = await page.evaluate((sections) => {
        const vw = document.documentElement.clientWidth
        const offenders: Offender[] = []
        let textElements = 0
        for (const [section, selector] of Object.entries(sections)) {
          const root = document.querySelector(selector)
          if (!root) continue
          for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]) {
            if (el.closest('.sr-only, [aria-hidden="true"]')) continue
            const hasText = Array.from(el.childNodes).some(
              (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
            )
            if (!hasText) continue
            const cs = getComputedStyle(el)
            if (cs.display === 'none' || cs.visibility === 'hidden') continue
            const r = el.getBoundingClientRect()
            if (r.width === 0 && r.height === 0) continue
            textElements++
            const label = `${el.tagName.toLowerCase()} « ${(el.textContent ?? '').trim().slice(0, 40)} »`
            if (el.clientWidth > 0 && el.scrollWidth - el.clientWidth > 1) {
              offenders.push({
                section,
                what: `${label} contenu ${el.scrollWidth} px pour ${el.clientWidth}`,
              })
            }
            if (r.right > vw + 0.5 || r.left < -0.5) {
              offenders.push({
                section,
                what: `${label} boîte ${r.left.toFixed(1)}→${r.right.toFixed(1)} pour ${vw}`,
              })
            }
          }
        }
        return {
          vw,
          docScroll: document.documentElement.scrollWidth,
          bodyScroll: document.body.scrollWidth,
          textElements,
          offenders,
        }
      }, SECTIONS)

      const detail = JSON.stringify(m.offenders, null, 1)
      // Garde de vacuité : la sonde 2 doit avoir réellement inspecté du texte.
      expect(m.textElements, 'éléments porteurs de texte inspectés').toBeGreaterThan(20)
      expect(m.docScroll, `document plus large que la fenêtre — ${detail}`).toBeLessThanOrEqual(
        m.vw,
      )
      expect(m.bodyScroll, `body plus large que la fenêtre — ${detail}`).toBeLessThanOrEqual(m.vw)
      expect(m.offenders, 'texte qui sort de sa boîte ou de la fenêtre').toEqual([])
    })
  }
}
