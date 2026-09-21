import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { WCAG_AA_NON_TEXT } from './support/contrast'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { readStrip, settleForMeasurement } from './support/pixel'
import { gotoProducts } from './support/products'

/**
 * #757 (Sprint 101) — LA CROIX DE `DialogContent` RESTE LISIBLE QUAND LE CONTENU DÉFILE DESSOUS.
 *
 * LE DÉFAUT. Depuis #732/#740 la croix est portée par une ancre `sticky` : elle reste en
 * haut du dialog pendant le défilement, donc le contenu passe DESSOUS. Elle était peinte
 * à opacité réduite et SANS fond propre : son contraste dépendait de ce qui défilait
 * sous elle, et n'avait jamais été mesuré.
 *
 * CORRECTIF (arbitrage ui-design S101) : fond OPAQUE `bg-background` derrière l'icône,
 * encre `text-muted-foreground` (`--color-ink-muted`), pleine opacité ; au survol, SEULE
 * la surface change (`hover:bg-accent-soft`, jamais l'encre — PIT-S49-001).
 *
 * CE QUE LA SPEC MESURE, sur la sheet produit mobile (390×600, formulaire qui déborde),
 * en thème clair ET sombre :
 *   1. à défilement NUL, la géométrie de la croix est celle d'avant (bord haut à
 *      sheet.y + 16, bord droit à 16 px du bord droit de la sheet) — prémisses
 *      `scrollTop = scrollLeft = 0` et aucun débordement horizontal (PIT-S96-004,
 *      PIT-S100-004) ;
 *   2. le formulaire est défilé jusqu'en bas ET un nœud du formulaire est RÉELLEMENT
 *      sous la croix (`elementsFromPoint`) — sans cette prémisse la mesure de contraste
 *      serait vacuous ;
 *   3. le fond calculé de la croix est OPAQUE (alpha = 1) : c'est ce qui rend le
 *      contraste indépendant de ce qui défile dessous ;
 *   4. les PIXELS peints dans l'anneau de fond (entre l'icône et le bord du disque) ont
 *      la couleur de ce fond — lu à l'écran, par-dessus le contenu défilé ;
 *   5. contraste encre de l'icône / fond >= 3:1 (WCAG 1.4.11, composant non textuel),
 *      au repos ET au survol.
 *
 * L'encre est lue sur le `svg` (`stroke = currentColor`) et non en pixels : un trait de
 * 2 px sur une icône de 16 px est anticrénelé à dpr 1, un pixel lu y sous-estimerait
 * l'encre réelle.
 *
 * CONTRÔLE NÉGATIF (joué au S101, cf. `issue-757-done.md`) : contre 449ad984, les deux
 * thèmes rougissent sur le fond (alpha 0), l'opacité effective (0,7 au repos) et la
 * taille (16 px, pas d'anneau) ; la géométrie à défilement nul, elle, reste verte.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const SHORT = { width: 390, height: 600 } as const
const BUDGET = 15_000
/** Bord haut / bord droit de la croix par rapport à la sheet (`ui/dialog.tsx`). */
const CLOSE_INSET = 16
const EPSILON = 2

interface Paint {
  /** Fond calculé de la croix, `#rrggbb`. */
  background: string
  /** Alpha du fond calculé, dans [0, 1]. */
  backgroundAlpha: number
  /** Encre calculée de l'icône (`stroke` du svg), `#rrggbb`. */
  ink: string
  inkAlpha: number
}

/** Fond de la croix et encre de son icône, normalisés par canvas (oklch, color-mix…). */
async function readPaint(close: Locator): Promise<Paint> {
  return close.evaluate((el) => {
    const toRgba = (value: string): [number, number, number, number] => {
      const ctx = document.createElement('canvas').getContext('2d')
      if (ctx === null) throw new Error('canvas 2d indisponible')
      ctx.fillStyle = '#000000'
      ctx.fillStyle = value
      const a = String(ctx.fillStyle)
      ctx.fillStyle = '#ffffff'
      ctx.fillStyle = value
      if (String(ctx.fillStyle) !== a) throw new Error(`couleur non analysable : ${value}`)
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const hex = (c: number[]): string =>
      `#${c
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`
    const svg = el.querySelector('svg')
    if (svg === null) throw new Error('icône de la croix introuvable')
    const bg = toRgba(getComputedStyle(el).backgroundColor)
    const ink = toRgba(getComputedStyle(svg).stroke)
    return { background: hex(bg), backgroundAlpha: bg[3], ink: hex(ink), inkAlpha: ink[3] }
  })
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Opacité effective de la croix et de ses ancêtres (une opacité < 1 re-rendrait le fond translucide). */
async function effectiveOpacity(close: Locator): Promise<number> {
  return close.evaluate((el) => {
    let o = 1
    for (let n: Element | null = el; n !== null; n = n.parentElement) {
      o *= parseFloat(getComputedStyle(n).opacity)
    }
    return o
  })
}

async function expectPaint(
  page: Page,
  close: Locator,
  scheme: string,
  state: 'repos' | 'survol',
): Promise<void> {
  const paint = await readPaint(close)
  const r = ratio(paint.ink, paint.background)
  const opacity = await effectiveOpacity(close)
  const tag = `[${scheme}/${state}]`
  const line =
    `${tag} encre ${paint.ink} sur fond ${paint.background} (alpha ${paint.backgroundAlpha}) ` +
    `= ${r.toFixed(2)}:1 ; opacité effective ${opacity}`
  console.log(`[#757] ${line}`)
  test.info().annotations.push({ type: 'contraste croix', description: line })

  expect.soft(paint.backgroundAlpha, `${tag} fond de la croix OPAQUE`).toBe(1)
  expect.soft(paint.inkAlpha, `${tag} encre de l'icône opaque`).toBe(1)
  expect.soft(opacity, `${tag} aucune opacité réduite sur la croix ni ses ancêtres`).toBe(1)
  expect.soft(r, `${tag} contraste icône/fond >= 3:1`).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)

  // Pixels réellement peints dans l'anneau de fond : bande verticale à 4 px à
  // l'intérieur du bord gauche du disque de 44 px (l'icône de 16 px est centrée,
  // donc à 14 px du bord), resserrée sur ±6 px autour du centre (corde du disque).
  // Sous 44 px il n'y a pas d'anneau à lire : c'est déjà un échec (#754).
  const box = await close.boundingBox()
  if (box === null || box.width < 40) {
    expect
      .soft(box?.width ?? 0, `${tag} croix de 44 px (anneau de fond lisible)`)
      .toBeGreaterThanOrEqual(40)
    return
  }
  const ring = await readStrip(page, close, {
    side: 'left',
    offsetPx: -4,
    edgeGuardPx: 16,
    samples: 7,
  })
  console.log(
    `[#757] ${tag} anneau peint ${ring.dominantHex} (unanimité ${ring.unanimity.toFixed(2)})`,
  )
  expect
    .soft(ring.dominantHex, `${tag} l'anneau peint est le fond de la croix, pas le contenu défilé`)
    .toBe(paint.background)
  expect.soft(ring.unanimity, `${tag} anneau uniforme`).toBeGreaterThanOrEqual(0.85)
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`#757 — croix lisible sur contenu défilé — thème ${scheme}`, () => {
    test.use({ storageState: PROD.storageState, viewport: SHORT, colorScheme: scheme })

    test('sheet produit : géométrie à défilement nul inchangée, contraste >= 3:1 défilée', async ({
      page,
    }) => {
      await neutralizeDevToolingPointerEvents(page)
      await gotoProducts(page)
      if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
      else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

      await page.getByTestId('products-new-button').click({ timeout: BUDGET })
      const form = page.getByTestId('product-drawer-form')
      await expect(form).toBeVisible({ timeout: BUDGET })
      const dialog = page.locator('[role="dialog"]').filter({ has: form })
      const close = dialog.getByRole('button', { name: 'Close' })
      await settleForMeasurement(page)

      // 1. Défilement NUL : géométrie d'avant #757 (prémisses mesurées, pas supposées).
      const scroll = await dialog.evaluate((el) => ({
        top: el.scrollTop,
        left: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }))
      expect(scroll.top, 'prémisse : défilement vertical nul').toBe(0)
      expect(scroll.left, 'prémisse : défilement horizontal nul').toBe(0)
      expect(scroll.scrollWidth, 'aucun débordement horizontal (PIT-S100-004)').toBeLessThanOrEqual(
        scroll.clientWidth,
      )
      const dialogBox = await dialog.boundingBox()
      const closeBox = await close.boundingBox()
      if (dialogBox === null || closeBox === null) throw new Error('boîtes introuvables')
      expect(
        Math.abs(closeBox.y - (dialogBox.y + CLOSE_INSET)),
        `bord haut de la croix à sheet.y + 16 (sheet y=${dialogBox.y}, croix y=${closeBox.y})`,
      ).toBeLessThanOrEqual(EPSILON)
      expect(
        Math.abs(dialogBox.x + dialogBox.width - (closeBox.x + closeBox.width) - CLOSE_INSET),
        `bord droit de la croix à 16 px du bord droit de la sheet`,
      ).toBeLessThanOrEqual(EPSILON)

      // 2. Défilement au maximum, et un nœud du formulaire RÉELLEMENT sous la croix.
      const scrolled = await dialog.evaluate((el) => {
        el.scrollTop = el.scrollHeight
        return { overflow: el.scrollHeight > el.clientHeight, top: el.scrollTop }
      })
      expect(scrolled.overflow, 'le formulaire doit DÉBORDER à 390×600').toBe(true)
      expect(scrolled.top, 'le formulaire doit avoir défilé').toBeGreaterThan(0)
      await settleForMeasurement(page)
      const under = await close.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const formEl = document.querySelector('[data-testid="product-drawer-form"]')
        const stack = document.elementsFromPoint(r.left + 4, r.top + r.height / 2)
        return {
          onTop: stack[0] === el || el.contains(stack[0] ?? null),
          formUnder: stack.some((n) => formEl !== null && formEl.contains(n)),
        }
      })
      expect(under.onTop, 'la croix est peinte AU-DESSUS du contenu défilé').toBe(true)
      expect(under.formUnder, 'un nœud du formulaire défile SOUS la croix').toBe(true)

      // 3-5. Fond opaque + contraste, au repos puis au survol.
      await page.mouse.move(0, SHORT.height - 1)
      await expectPaint(page, close, scheme, 'repos')
      const box = await close.boundingBox()
      if (box === null) throw new Error('croix introuvable')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await settleForMeasurement(page)
      await expectPaint(page, close, scheme, 'survol')
    })
  })
}
