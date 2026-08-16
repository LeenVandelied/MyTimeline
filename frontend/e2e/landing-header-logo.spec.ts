import { test, expect, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'

/**
 * #381 — ÉCHELLE ET INTÉGRITÉ DU WORDMARK DU HEADER, TOUS PALIERS × 4 LOCALES.
 *
 * POURQUOI CETTE SPEC EXISTE. Le seul filet posé par #347 est
 * `scrollWidth <= clientWidth` (cf. `landing-mobile-menu.spec.ts`). Il est
 * **structurellement aveugle au défaut cherché ici** : un logo qui se coupe en
 * deux lignes SATISFAIT l'assertion, puisque le retour à la ligne est
 * précisément ce qui empêche le débordement. Mesuré au navigateur avant
 * correctif, à 1024 px : `fr`, `de` et `es` rendaient le wordmark sur DEUX
 * lignes (header 184,8 px de haut au lieu de 116,4) avec 0 px entre le logo et
 * la navigation — et la suite était VERTE.
 *
 * Ce que cette spec ajoute, et que `scrollWidth` ne peut pas voir :
 *   1. le nombre de LIGNES du wordmark (compté sur les boîtes de ligne réelles,
 *      via `Range.getClientRects()`, pas déduit d'une hauteur) ;
 *   2. la TAILLE RENDUE (`getComputedStyle().fontSize`) — jamais déduite de la
 *      classe utilitaire : l'échelle du DS Graphite n'est pas celle de Tailwind
 *      (`text-lg` = 27 px ici, pas 18) et un `text-*` peut apparier un
 *      `line-height` plutôt qu'une taille ;
 *   3. une marge MINIMALE non nulle entre le logo et le bloc suivant.
 *
 * ⚠ CETTE MESURE EXIGE PLAYWRIGHT. jsdom ne résout ni la mise en page ni les
 * media queries et ne produit aucune boîte de ligne : un test unitaire serait
 * vert quoi qu'il arrive (PIT S48/S51).
 *
 * ⚠ ET ELLE EXIGE LINUX. Les métriques de police de macOS sont plus étroites :
 * #334 (S49) puis #347 (S52) ont conclu « écart 0 partout » depuis macOS et ont
 * été démentis les deux fois par la CI Ubuntu (PIT-S52-001). Chiffres de
 * référence ci-dessous relevés dans `mcr.microsoft.com/playwright:v1.61.1-jammy`.
 */

const LOCALES = ['fr', 'en', 'de', 'es'] as const
const SCHEMES = ['light', 'dark'] as const

/**
 * Paliers couverts. 320/375/390 = non-régression #334 ; 768/820/1023 = palier
 * tablette de #347 ; 1024 = premier pixel desktop, celui où le wordmark se
 * coupait en deux ; 1280 = desktop nominal.
 */
const WIDTHS = [320, 375, 390, 768, 820, 1023, 1024, 1280] as const

/** Point de bascule `sm` de Tailwind — seul palier d'échelle du wordmark. */
const SM_BREAKPOINT = 640

/**
 * Échelle DS attendue (`ds/tokens/typography.css`) : `text-md` sous `sm`,
 * `text-lg` au-dessus. **Une seule bascule, et elle ne dépend pas de `lg`.**
 */
const EXPECTED_FONT_PX = (width: number) => (width < SM_BREAKPOINT ? 21 : 27)

/**
 * Marge minimale entre le bord droit du logo et le bloc suivant.
 *
 * Sous 768 px le header est déjà contraint par le palier `max-[360px]` de #347
 * (mesuré : 5 px en `de` à 320 px — c'est son terrain, pas celui-ci), on exige
 * donc seulement une marge STRICTEMENT positive. À partir de 768 px le relevé
 * jammy donne 58,5 px au pire (`fr` à 1024 px) : le plancher à 24 px laisse de
 * la place aux métriques de police sans tolérer un retour à la case 0 px.
 */
const MIN_GAP_PX = (width: number) => (width < 768 ? 1 : 24)

interface LogoMetrics {
  fontSizePx: number
  lines: number
  widthPx: number
  heightPx: number
  gapToNextPx: number
  navVisible: boolean
  headerHeightPx: number
  scrollWidth: number
  clientWidth: number
}

/**
 * Relève les métriques du wordmark.
 *
 * Ancrage STRUCTUREL (`header > div:first-child > div`) et non sur le libellé :
 * la spec doit rester valable dans les 4 locales. Le nombre de lignes est
 * compté sur les boîtes de ligne d'un `Range` couvrant le contenu — c'est la
 * seule lecture qui distingue « une ligne haute » de « deux lignes ».
 */
async function readLogo(page: Page): Promise<LogoMetrics> {
  return page.evaluate(() => {
    const header = document.querySelector('header')
    if (!header) throw new Error('header introuvable')
    const logo = header.querySelector(':scope > div:first-child > div')
    if (!logo) throw new Error('wordmark introuvable')

    const range = document.createRange()
    range.selectNodeContents(logo)
    const lineBoxes = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0)

    const logoBox = logo.getBoundingClientRect()
    const nav = header.querySelector(':scope > nav')
    const group = header.querySelector(':scope > div:nth-of-type(2)')
    if (!nav || !group) throw new Error('navigation ou groupe droit introuvable')

    const navVisible = getComputedStyle(nav).display !== 'none'
    // Le bloc qui suit le logo est la nav quand elle est affichée, sinon le
    // groupe droit — c'est contre LUI que la marge doit être mesurée.
    const next = (navVisible ? nav : group).getBoundingClientRect()

    return {
      fontSizePx: parseFloat(getComputedStyle(logo).fontSize),
      lines: lineBoxes.length,
      widthPx: +logoBox.width.toFixed(1),
      heightPx: +logoBox.height.toFixed(1),
      gapToNextPx: +(next.left - logoBox.right).toFixed(1),
      navVisible,
      headerHeightPx: +header.getBoundingClientRect().height.toFixed(1),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }
  })
}

for (const scheme of SCHEMES) {
  test.describe(`Landing — wordmark du header, thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    for (const width of WIDTHS) {
      test(`${width} px — une seule ligne, échelle DS et marge, les 4 locales`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        const expectedFont = EXPECTED_FONT_PX(width)
        const minGap = MIN_GAP_PX(width)
        const relevé: string[] = []

        for (const locale of LOCALES) {
          await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
          await waitForFonts(page)
          // Le curseur reste où Playwright l'a laissé : sans cela un élément
          // peut être mesuré dans son état `:hover`.
          await page.mouse.move(0, 0)

          const m = await readLogo(page)
          relevé.push(
            `${locale}: ${m.fontSizePx}px, ${m.lines} ligne(s), ${m.widthPx}x${m.heightPx}, ` +
              `marge ${m.gapToNextPx}px, header ${m.headerHeightPx}px`,
          )

          // `expect.soft` : on veut le tableau COMPLET des locales fautives, pas
          // seulement la première. Corriger `fr` sans regarder `de`/`es` a déjà
          // produit un faux « corrigé » au S49.
          expect
            .soft(
              m.lines,
              `le wordmark doit tenir sur UNE ligne à ${width} px en ${locale} — ` +
                `mesuré ${m.lines} ligne(s), boîte ${m.widthPx}x${m.heightPx}px. ` +
                `C'est le défaut que \`scrollWidth <= clientWidth\` ne peut pas voir.`,
            )
            .toBe(1)

          expect
            .soft(
              m.fontSizePx,
              `échelle DS du wordmark à ${width} px en ${locale} — attendu ${expectedFont}px ` +
                `(${width < SM_BREAKPOINT ? 'text-md' : 'text-lg'} de ds/tokens/typography.css), ` +
                `mesuré ${m.fontSizePx}px`,
            )
            .toBe(expectedFont)

          expect
            .soft(
              m.gapToNextPx,
              `marge entre le wordmark et le bloc suivant à ${width} px en ${locale} — ` +
                `mesuré ${m.gapToNextPx}px, plancher ${minGap}px`,
            )
            .toBeGreaterThanOrEqual(minGap)

          // Garde-fou historique de #347, conservé : il ne prouve pas l'absence
          // du défaut ci-dessus, mais son absence prouverait autre chose encore.
          expect
            .soft(
              m.scrollWidth,
              `débordement horizontal à ${width} px en ${locale} : ${m.scrollWidth} > ${m.clientWidth}`,
            )
            .toBeLessThanOrEqual(m.clientWidth)
        }

        test.info().annotations.push({
          type: `wordmark-${width}px-${scheme}`,
          description: relevé.join(' | '),
        })
      })
    }
  })
}

/**
 * FRONTIÈRE EXACTE DE L'ÉCHELLE — le garde-fou anti-#381.
 *
 * Le défaut d'origine n'était pas une largeur mais un DÉSALIGNEMENT DE PALIERS :
 * le wordmark bougeait d'échelle à `md` (768 px) pendant que le burger, la
 * navigation, le groupe droit et `LG_BREAKPOINT_QUERY` basculaient à `lg`
 * (1024 px). Rien dans le typage ne relie une classe utilitaire à une autre :
 * ils peuvent rediverger silencieusement au prochain refactor.
 *
 * On fige donc les deux propriétés qui définissent « le wordmark n'a plus de
 * palier propre » :
 *   - il ne change PAS d'échelle en franchissant le seuil burger/nav
 *     (1023 → 1024), contrairement à ce que faisait `md:text-3xl` ;
 *   - sa seule bascule est `sm` (639 → 640), et elle est franche.
 */
test.describe('Landing — le wordmark n’a pas de palier propre', () => {
  const fontAt = async (page: Page, width: number) => {
    await page.setViewportSize({ width, height: 900 })
    await waitForFonts(page)
    return (await readLogo(page)).fontSizePx
  }

  test('l’échelle du wordmark ne bouge pas au seuil burger/nav (1023/1024)', async ({ page }) => {
    await page.goto('/de', { waitUntil: 'domcontentloaded' })

    const tablet = await fontAt(page, 1023)
    const desktop = await fontAt(page, 1024)

    // C'est LE régression-test de #381 : avant correctif le wordmark valait
    // 57 px des deux côtés parce qu'il avait basculé 256 px plus tôt, à `md`.
    // Aujourd'hui il vaut 27 px des deux côtés — l'invariant à tenir est
    // l'ÉGALITÉ, pas la valeur : le wordmark n'a aucun palier ici.
    expect(
      desktop,
      `le wordmark ne doit pas changer d'échelle au seuil burger/nav — ` +
        `1023 px : ${tablet}px, 1024 px : ${desktop}px`,
    ).toBe(tablet)

    // Et il reste sur une ligne des deux côtés de la frontière.
    expect((await readLogo(page)).lines, 'wordmark sur une ligne à 1024 px en `de`').toBe(1)
  })

  test('la seule bascule d’échelle du wordmark est `sm` (639/640)', async ({ page }) => {
    await page.goto('/de', { waitUntil: 'domcontentloaded' })

    const below = await fontAt(page, SM_BREAKPOINT - 1)
    const above = await fontAt(page, SM_BREAKPOINT)

    expect(below, `text-md attendu à ${SM_BREAKPOINT - 1} px`).toBe(21)
    expect(above, `text-lg attendu à ${SM_BREAKPOINT} px`).toBe(27)
  })
})
