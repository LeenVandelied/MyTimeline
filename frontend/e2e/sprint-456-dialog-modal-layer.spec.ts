import { test, expect } from './support/fixtures'
import { type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import { openCategoriesTab, seedCategory, gotoProducts, unique } from './support/products'
import { readStrip, settleForMeasurement, type Rgb } from './support/pixel'

/**
 * #456 — la modale générique (`ui/dialog.tsx`) passe du `z-50` d'origine du modèle au
 * palier modal (`--z-modal`, 70, ADR-008). Deux garanties mesurées AU PIXEL (la lecture
 * de `elementFromPoint` ment sous une couche Radix : `body { pointer-events: none }`,
 * cf. `PIT-S62-001`) :
 *
 *  · T3 — une liste ouverte depuis la fiche produit reste peinte AU-DESSUS de la fenêtre
 *    (palier 75 > 70) : le centre d'une option montre la couleur de la liste, pas celle
 *    de la fenêtre ;
 *  · T4 — la confirmation de suppression et son fond recouvrent la page entière : aucun
 *    élément de la page ne passe par-dessus le fond assombri.
 */
test.use({ storageState: sessionState(PROD) })

const SCHEMES = ['light', 'dark'] as const

/** Couleur peinte que `color-mix()` / `oklch()` donnent à un fond déclaré (canvas 1×1). */
async function declaredBackground(locator: Locator): Promise<Rgb> {
  return locator.evaluate((el) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx == null) throw new Error('canvas 2d indisponible')
    ctx.fillStyle = '#000'
    ctx.fillStyle = getComputedStyle(el).backgroundColor
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return { r, g, b }
  })
}

const maxChannelGap = (a: Rgb, b: Rgb): number =>
  Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))

for (const scheme of SCHEMES) {
  test.describe(`#456 palier modal des fenêtres génériques — thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    test(`popover opened over the product dialog is painted above it — ${scheme}`, async ({
      page,
    }) => {
      // Deux catégories : Radix met en avant l'option focalisée à l'ouverture, il en faut
      // une autre, au repos, pour lire le fond de la liste.
      const cat = await seedCategory(page, unique('456 Cat'))
      await seedCategory(page, unique('456 Cat bis'))
      await gotoProducts(page)
      await page.getByTestId('products-new-button').click()
      await expect(page.getByTestId('product-drawer-form')).toBeVisible()

      await page.getByTestId('product-category-trigger').click()
      const listbox = page.locator('[role="listbox"]')
      await expect(listbox).toBeVisible()
      await expect(page.getByTestId(`product-category-option-${cat.id}`)).toBeVisible()
      // La souris reste sur le déclencheur, que la liste peut recouvrir : l'option dessous
      // prendrait le fond de survol. On l'écarte, puis on mesure une option ni survolée
      // ni focalisée (état `data-highlighted` de Radix) : on lit le fond de repos.
      await page.mouse.move(2, 2)
      await settleForMeasurement(page)
      const option = listbox.locator('[role="option"]:not([data-highlighted])').first()
      await expect(option).toBeVisible()

      // Sélecteur CSS et non `getByRole` : la liste ouverte pose `aria-hidden` sur la fenêtre.
      const dialogBg = await declaredBackground(page.locator('[role="dialog"]'))
      const listBg = await declaredBackground(listbox)
      // ORACLE (fonds unis : lecture exacte, écart de 3 niveaux en clair) : identiques, la mesure ne distinguerait rien.
      expect(
        maxChannelGap(dialogBg, listBg),
        `fond de la fenêtre ${JSON.stringify(dialogBg)} et fond de la liste ` +
          `${JSON.stringify(listBg)} indiscernables : la lecture de pixel ne prouverait rien`,
      ).toBeGreaterThanOrEqual(2)

      // Bande verticale dans la moitié droite de l'option : hors du libellé, au centre
      // de sa hauteur, sur le fond de l'option (transparent -> fond de la liste).
      const strip = await readStrip(page, option, {
        side: 'right',
        offsetPx: -8,
        samples: 5,
        edgeGuardPx: 6,
      })
      const toDialog = maxChannelGap(strip.dominant, dialogBg)
      const toList = maxChannelGap(strip.dominant, listBg)
      expect(
        strip.unanimity,
        `unanimité trop basse sur l'option (${strip.dominantHex})`,
      ).toBeGreaterThanOrEqual(0.8)
      expect(
        toList,
        `Le centre de l'option est peint ${strip.dominantHex} : fond de la liste attendu ` +
          `${JSON.stringify(listBg)}, fond de la fenêtre ${JSON.stringify(dialogBg)} ` +
          `(écart à la fenêtre ${toDialog}, à la liste ${toList}). La liste passe sous la fenêtre.`,
      ).toBeLessThan(toDialog)
      expect(toList).toBeLessThanOrEqual(1)
    })

    test(`delete confirmation dialog covers the page — ${scheme}`, async ({ page }) => {
      const cat = await seedCategory(page, unique('456 Del'))
      await openCategoriesTab(page)
      await expect(page.getByTestId(`categories-card-${cat.id}`)).toBeVisible()

      const viewport = page.viewportSize()
      if (viewport == null) throw new Error('viewport inconnu')
      await page.mouse.move(0, 0)
      await settleForMeasurement(page)
      const before = await readViewport(page)

      await page.getByTestId(`categories-delete-${cat.id}`).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await page.mouse.move(0, 0)
      await settleForMeasurement(page)
      const box = await dialog.boundingBox()
      if (box == null) throw new Error('boundingBox() nulle sur la fenêtre')
      const after = await readViewport(page)

      // Grille de points sur toute la page, hors de la boîte de la fenêtre. Fond
      // `bg-black/80` : chaque pixel doit valoir 20 % de celui d'avant (±8), quel que
      // soit l'élément de page dessous. Un élément qui passe par-dessus reste à sa
      // couleur d'origine et écarte le point.
      const COLS = 9
      const ROWS = 7
      const margin = 6
      const offenders: string[] = []
      let checked = 0
      for (let i = 0; i < COLS; i += 1) {
        for (let j = 0; j < ROWS; j += 1) {
          const x = Math.round(((i + 0.5) * viewport.width) / COLS)
          const y = Math.round(((j + 0.5) * viewport.height) / ROWS)
          const inside =
            x >= box.x - margin &&
            x <= box.x + box.width + margin &&
            y >= box.y - margin &&
            y <= box.y + box.height + margin
          if (inside) continue
          checked += 1
          const b = before(x, y)
          const a = after(x, y)
          const expected = { r: b.r * 0.2, g: b.g * 0.2, b: b.b * 0.2 }
          if (maxChannelGap(a, expected) > 8) {
            offenders.push(
              `(${x},${y}) avant rgb(${b.r},${b.g},${b.b}) après rgb(${a.r},${a.g},${a.b})`,
            )
          }
        }
      }
      expect(checked, 'trop peu de points hors fenêtre pour conclure').toBeGreaterThanOrEqual(30)
      expect(
        offenders,
        `${offenders.length}/${checked} points ne sont pas assombris par le fond : un élément ` +
          `de la page passe par-dessus la modale.`,
      ).toEqual([])

      // La boîte elle-même est peinte à son fond déclaré (rien ne la recouvre).
      const dialogBg = await declaredBackground(dialog)
      const inner = after(Math.round(box.x + box.width / 2), Math.round(box.y + box.height - 6))
      expect(
        maxChannelGap(inner, dialogBg),
        `le bas de la fenêtre est peint rgb(${inner.r},${inner.g},${inner.b}), fond attendu ` +
          JSON.stringify(dialogBg),
      ).toBeLessThanOrEqual(3)
    })
  })
}

/** Capture du viewport entier, rendue sous forme de lecteur de pixel (coordonnées CSS). */
async function readViewport(page: Page): Promise<(x: number, y: number) => Rgb> {
  const png = (await page.screenshot()).toString('base64')
  const decoded = await page.evaluate(async (b64: string) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx == null) throw new Error('canvas 2d indisponible')
    ctx.drawImage(bitmap, 0, 0)
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    return { width: bitmap.width, height: bitmap.height, data: Array.from(data) }
  }, png)
  const viewport = page.viewportSize()
  if (viewport == null) throw new Error('viewport inconnu')
  const scale = decoded.width / viewport.width
  return (x, y) => {
    const px = Math.min(decoded.width - 1, Math.round(x * scale))
    const py = Math.min(decoded.height - 1, Math.round(y * scale))
    const i = (py * decoded.width + px) * 4
    return { r: decoded.data[i], g: decoded.data[i + 1], b: decoded.data[i + 2] }
  }
}
