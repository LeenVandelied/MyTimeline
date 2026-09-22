import { test, expect, type Page } from '@playwright/test'

/**
 * #682 — Les deux CTA du hero tiennent sur UNE ligne entre 1024 et 1279 px.
 *
 * Depuis #610, la colonne texte du hero est bornée à 300-420 px dès `lg` (1024 px).
 * Avec l'ancien gabarit (`px-8 py-6 text-lg` : 32/24 px de padding, 27 px de corps),
 * « Commencer gratuitement » se repliait sur 2 lignes à 1024 px (396 × 132 px ; l'issue
 * annonçait 3 lignes, la mesure par rectangles de texte en compte 2 de 42 px). Les
 * CTA suivent désormais la taille `lg` du DS Graphite (`.mt-btn--lg` + `.mt-btn--wrap`
 * dans `ds/components/` : padding 12/22 px, 14 px, hauteur minimale 46 px).
 *
 * Ce que la spec verrouille, aux 4 locales et à 1024 / 1152 / 1279 / 1280 px :
 *  1. le libellé de chaque CTA occupe UNE seule ligne (lignes comptées sur les
 *     rectangles du texte, pas déduites d'une hauteur) ;
 *  2. chaque CTA mesure entre 44 px (cible tactile) et 50 px de haut ;
 *  3. aucun CTA ne dépasse de la colonne texte, et la page ne défile pas en largeur ;
 *  4. auto-contrôle : l'ancien gabarit réinjecté par feuille → la mesure voit le repli.
 *
 * Landing publique : aucun `storageState` requis.
 */

const LOCALES = ['fr', 'en', 'es', 'de'] as const
const WIDTHS = [1024, 1152, 1279, 1280] as const
const CTA_IDS = ['landing-hero-cta-primary', 'landing-hero-cta-secondary'] as const
const MIN_TARGET_PX = 44
const MAX_SINGLE_LINE_PX = 50
const SUBPIXEL_TOLERANCE_PX = 0.5

interface CtaMeasure {
  id: string
  width: number
  height: number
  lines: number
  overflowsColumn: boolean
}

interface HeroMeasure {
  viewport: number
  scrollWidth: number
  ctas: CtaMeasure[]
}

async function measureHeroCtas(page: Page): Promise<HeroMeasure> {
  return page.evaluate(
    ({ ids, tolerance }) => {
      /** Nombre de lignes du libellé : sommets distincts des rectangles de ses nœuds texte. */
      const countLines = (el: HTMLElement): number => {
        const tops = new Set<number>()
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.trim()) continue
          const range = document.createRange()
          range.selectNodeContents(n)
          for (const r of range.getClientRects()) {
            if (r.width > 0) tops.add(Math.round(r.top))
          }
        }
        return tops.size
      }
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        ctas: ids.map((id) => {
          const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
          if (!el) throw new Error(`CTA introuvable : ${id}`)
          const r = el.getBoundingClientRect()
          // Colonne texte = parent de la rangée de CTA.
          const column = el.parentElement!.parentElement!.getBoundingClientRect()
          return {
            id,
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
            lines: countLines(el),
            overflowsColumn:
              r.left < column.left - tolerance ||
              r.right > column.right + tolerance ||
              el.scrollWidth > el.clientWidth,
          }
        }),
      }
    },
    { ids: [...CTA_IDS], tolerance: SUBPIXEL_TOLERANCE_PX },
  )
}

async function gotoLanding(page: Page, locale: string): Promise<void> {
  await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
  for (const id of CTA_IDS) await expect(page.getByTestId(id)).toBeVisible()
  // Les polices auto-hébergées (next/font) changent la largeur du libellé.
  await page.evaluate(() => document.fonts.ready)
}

test.describe('#682 — CTA du hero sur une ligne entre 1024 et 1279 px', () => {
  for (const width of WIDTHS) {
    test.describe(`à ${width} px`, () => {
      test.use({ viewport: { width, height: 900 } })

      for (const locale of LOCALES) {
        test(`${locale} : chaque CTA tient sur une ligne, sans débordement`, async ({ page }) => {
          await gotoLanding(page, locale)
          const m = await measureHeroCtas(page)
          console.log(`[#682] ${width} ${locale} ${JSON.stringify(m.ctas)}`)

          for (const cta of m.ctas) {
            expect(cta.lines, `${cta.id} — nombre de lignes`).toBe(1)
            expect(cta.height, `${cta.id} — hauteur`).toBeGreaterThanOrEqual(MIN_TARGET_PX)
            expect(cta.height, `${cta.id} — hauteur`).toBeLessThanOrEqual(MAX_SINGLE_LINE_PX)
            expect(cta.overflowsColumn, `${cta.id} — débordement`).toBe(false)
          }
          expect(m.scrollWidth).toBeLessThanOrEqual(m.viewport)
        })
      }
    })
  }

  test.describe('auto-contrôle à 1024 px', () => {
    test.use({ viewport: { width: 1024, height: 900 } })

    test('fr : l’ancien gabarit réinjecté replie le CTA primaire', async ({ page }) => {
      await gotoLanding(page, 'fr')
      // Gabarit d'avant #682 (padding 32/24 px, corps DS de 27 px, interligne 1.5556,
      // flèche décalée de 8 px), reposé par CSSOM en `important` sur l'élément.
      // ⚠ `transition: none` d'abord : le CTA porte `transition-all`, qui fait aussi
      // transiter `padding` et `font-size` — mesuré sans lui, le bouton relit encore
      // 12/22 px et 14 px et l'auto-contrôle passe au rouge pour une mauvaise raison.
      await page.getByTestId(CTA_IDS[0]).evaluate((el: HTMLElement) => {
        el.style.setProperty('transition', 'none', 'important')
        el.style.setProperty('padding', '24px 32px', 'important')
        el.style.setProperty('font-size', '27px', 'important')
        el.style.setProperty('line-height', '1.5556', 'important')
        el.querySelector('svg')?.style.setProperty('margin-left', '8px', 'important')
      })
      const m = await measureHeroCtas(page)
      const primary = m.ctas[0]
      console.log(`[#682] contrôle ${JSON.stringify(primary)}`)
      expect(primary.lines).toBeGreaterThan(1)
      expect(primary.height).toBeGreaterThan(MAX_SINGLE_LINE_PX)
    })
  })
})
