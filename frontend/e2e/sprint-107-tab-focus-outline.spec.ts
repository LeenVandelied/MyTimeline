import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { dumpOutwardProfile, formatProfile, settleForMeasurement } from './support/pixel'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #524 (Sprint 107) — le contour de focus de `.mt-tab` n'est rogné par AUCUN ancêtre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC GARDE
 * ─────────────────────────────────────────────────────────────────────────────
 * `.mt-tab:focus-visible` pose `outline:2px` + `outline-offset:3px` : le trait sort
 * de 5px de la boîte de l'onglet. #417 (S74) a trouvé ce même contour rogné dans
 * deux autres zones (`.mt-zoom{overflow:hidden}` et le tablist `overflow-x-auto` des
 * réglages). Mesuré au S107 sur les deux consommateurs de `Tabs` — `/products` et
 * la fiche produit —, desktop 1280 et mobile 390, clair et sombre : aucun ancêtre
 * ne clippe, 4 côtés peints sur 4. Relevé complet : `ds/a11y-audit.md` §8ter.
 *
 * Le remède de #417 (offset NÉGATIF) est INTERDIT ici : le trait recouvrirait le
 * soulignement d'accent de l'onglet sélectionné et, avec 1px de padding latéral,
 * tomberait sur le libellé. La seule protection possible est donc de ne JAMAIS
 * clipper la tablist — c'est ce que la spec fait rougir : un `overflow-x:auto` (le
 * réflexe « la barre d'onglets déborde à 390px ») ou un `overflow:hidden` posé sur
 * la tablist ou un ancêtre.
 *
 * DEUX ORACLES, qui doivent dire la même chose (PAT-S74-004) :
 *   · GÉOMÉTRIE — rect du contour (`rect ± (offset + largeur)`) comparé, face par
 *     face, à la boîte de rembourrage de chaque ancêtre dont `overflow` ≠ visible ;
 *   · PIXELS — la couleur calculée du contour est lue sur les 4 côtés (dump brut
 *     0..8px vers l'extérieur, `support/pixel.ts`). Attrape aussi un recouvrement
 *     par un frère peint par-dessus, que la géométrie ne voit pas.
 * `:focus-visible` est armé par un vrai `Shift+Tab` / `Tab` : un `.focus()`
 * programmatique ne l'arme pas.
 *
 * AUTO-CONTRÔLE : le dernier test injecte `overflow-x:auto` sur la tablist et exige
 * que les DEUX oracles voient le rognage (haut, bas, gauche). Sans lui, une sonde
 * aveugle passerait verte.
 *
 * CE QU'ELLE NE PROUVE PAS : le thème sombre (la géométrie n'en dépend pas ; il a
 * été mesuré une fois au S107, cf. §8ter), Firefox, et un dpr fractionnaire.
 */

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

type Route = 'list' | 'detail'
const TABLIST_TESTID: Record<Route, string> = {
  list: 'products-tabs',
  detail: 'product-detail-filter',
}

async function openTablist(page: Page, route: Route): Promise<Locator> {
  await ensureAuthenticated(page)
  if (route === 'list') {
    await page.goto('/fr/products', { waitUntil: 'domcontentloaded' })
  } else {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S107 Tab'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S107 Tab'),
      categoryId: cat.id,
    })
    await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
  }
  const tablist = page.getByTestId(TABLIST_TESTID[route])
  await expect(tablist).toBeVisible({ timeout: 60_000 })
  return tablist
}

/** Clic (sélectionne, sans `:focus-visible`), puis Shift+Tab / Tab : focus CLAVIER. */
async function armByKeyboard(page: Page, tab: Locator): Promise<void> {
  await tab.click()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(tab).toBeFocused()
  expect(await tab.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
}

/** Faces du contour qui sortent de la boîte de clip d'un ancêtre (ou du viewport). */
async function clippedFaces(tab: Locator): Promise<string[]> {
  return tab.evaluate((el) => {
    const cs = getComputedStyle(el)
    const d = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset)
    const r = el.getBoundingClientRect()
    const ring = { top: r.top - d, bottom: r.bottom + d, left: r.left - d, right: r.right + d }
    const faces: string[] = []
    const vw = document.documentElement.clientWidth
    if (ring.left < 0) faces.push('viewport:left')
    if (ring.right > vw) faces.push('viewport:right')
    for (let a = el.parentElement; a; a = a.parentElement) {
      // La racine et `body` propagent leur `overflow` au viewport, déjà traité.
      if (a === document.documentElement || a === document.body) continue
      const s = getComputedStyle(a)
      const other = s.clipPath !== 'none' || /paint|strict|content/.test(s.contain)
      const cx = other || s.overflowX !== 'visible'
      const cy = other || s.overflowY !== 'visible'
      if (!cx && !cy) continue
      const b = a.getBoundingClientRect()
      const left = b.left + a.clientLeft
      const top = b.top + a.clientTop
      const tag = `<${a.tagName.toLowerCase()} ${s.overflowX}/${s.overflowY}>`
      if (cx && ring.left < left) faces.push(`${tag}:left`)
      if (cx && ring.right > left + a.clientWidth) faces.push(`${tag}:right`)
      if (cy && ring.top < top) faces.push(`${tag}:top`)
      if (cy && ring.bottom > top + a.clientHeight) faces.push(`${tag}:bottom`)
    }
    return faces
  })
}

/** Côtés où la couleur du contour est RÉELLEMENT peinte, entre 2 et 6px dehors. */
async function paintedSides(page: Page, tab: Locator): Promise<Record<string, boolean>> {
  const css = await tab.evaluate((el) => getComputedStyle(el).outlineColor)
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m == null) throw new Error(`couleur de contour non parsable : ${css}`)
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const out: Record<string, boolean> = {}
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    const profile = await dumpOutwardProfile(page, tab, side, 8, { samples: 9, edgeGuard: 0.2 })
    out[side] = profile
      .slice(2, 7)
      .some(
        (s) =>
          s.unanimity >= 0.6 &&
          Math.abs(s.dominant.r - r) <= 24 &&
          Math.abs(s.dominant.g - g) <= 24 &&
          Math.abs(s.dominant.b - b) <= 24,
      )
    if (!out[side]) console.log(`[#524] ${side} non peint :\n${formatProfile(profile)}`)
  }
  return out
}

test.use({ storageState: PROD.storageState, colorScheme: 'light' })

for (const route of ['list', 'detail'] as const) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`#524 — ${route} ${vpName}`, () => {
      test.use({ viewport })

      test('1er et dernier onglet : contour de focus entier, 4 côtés peints', async ({ page }) => {
        test.setTimeout(90_000)
        const tabs = (await openTablist(page, route)).getByRole('tab')
        const n = await tabs.count()
        expect(n, 'la tablist doit porter au moins 2 onglets').toBeGreaterThanOrEqual(2)
        for (const idx of [0, n - 1]) {
          const tab = tabs.nth(idx)
          await armByKeyboard(page, tab)
          await settleForMeasurement(page)
          expect(await clippedFaces(tab), `onglet ${idx} : aucune face rognée`).toEqual([])
          expect(await paintedSides(page, tab), `onglet ${idx} : 4 côtés peints`).toEqual({
            top: true,
            bottom: true,
            left: true,
            right: true,
          })
        }
      })
    })
  }
}

test.describe('#524 — auto-contrôle des oracles', () => {
  test.use({ viewport: VIEWPORTS.desktop })

  test('tablist passée en overflow-x:auto → rognage vu par la géométrie ET les pixels', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const tablist = await openTablist(page, 'list')
    await page.addStyleTag({ content: `[data-testid="products-tabs"]{overflow-x:auto}` })
    const tab = tablist.getByRole('tab').first()
    await armByKeyboard(page, tab)
    await settleForMeasurement(page)
    const faces = await clippedFaces(tab)
    expect(faces.some((f) => f.endsWith(':top'))).toBe(true)
    expect(faces.some((f) => f.endsWith(':bottom'))).toBe(true)
    expect(faces.some((f) => f.endsWith(':left'))).toBe(true)
    const painted = await paintedSides(page, tab)
    expect(painted.top).toBe(false)
    expect(painted.bottom).toBe(false)
    expect(painted.left).toBe(false)
  })
})
