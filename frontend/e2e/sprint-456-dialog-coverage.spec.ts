import { test, expect } from './support/fixtures'
import { type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, gotoProducts, seedCategory, seedProduct, unique } from './support/products'
import { readViewport, settleForMeasurement, type Rgb } from './support/pixel'

/**
 * #456 — couverture des consommateurs réels de `ui/dialog.tsx` au palier modal
 * (`--z-modal`, 70, ADR-008). Complète `sprint-456-dialog-modal-layer.spec.ts` (verrouillée),
 * qui ne mesure que la confirmation de suppression de catégorie. Deux surfaces de plus, au
 * pixel (`elementFromPoint` ment sous une couche Radix, `PIT-S62-001`) :
 *
 *  · (a) le `ProductDrawer` (un `Dialog` générique) recouvre la page entière ;
 *  · (b) la confirmation de suppression d'événement, ouverte DEPUIS le tiroir d'édition
 *    (`EventFormDrawer`, `.mt-drawer` à 70, rendu en ligne), recouvre ce tiroir. C'est le
 *    scénario que le changement corrige : à `z-50`, la boîte et son fond passaient dessous.
 *
 * MÉTHODE. Capture du viewport avant et après l'ouverture. Le fond `bg-black/80` laisse 20 %
 * de la couleur d'origine : tout point hors de la boîte doit valoir 0,2 × sa valeur d'avant
 * (±8). Un élément qui passe par-dessus garde sa couleur et écarte le point.
 */
test.use({ storageState: sessionState(PROD), viewport: { width: 1280, height: 720 } })

const SCHEMES = ['light', 'dark'] as const
const FIRST_NAV_BUDGET = 60_000
const CLICK_BUDGET = 15_000

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const maxChannelGap = (a: Rgb, b: Rgb): number =>
  Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))

/**
 * Grille de points hors de `box` : chacun doit être assombri à 20 % par le fond.
 * Rend les points écartés, le nombre de points lus, ceux qui sont réellement discriminants
 * (assez clairs avant, sinon 20 % ne se distingue pas de 100 %) et ceux situés dans `zone`.
 */
function checkDarkened(
  page: Page,
  before: (x: number, y: number) => Rgb,
  after: (x: number, y: number) => Rgb,
  box: Rect,
  zone?: Rect,
) {
  const viewport = page.viewportSize()
  if (viewport == null) throw new Error('viewport inconnu')
  const COLS = 9
  const ROWS = 7
  const margin = 6
  const offenders: string[] = []
  let checked = 0
  let discriminating = 0
  let inZone = 0
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
      // 0,8 × canal > 8 (le seuil d'écart) : en dessous, 20 % et 100 % se confondent.
      if (Math.max(b.r, b.g, b.b) >= 12) discriminating += 1
      if (
        zone &&
        x >= zone.x &&
        x <= zone.x + zone.width &&
        y >= zone.y &&
        y <= zone.y + zone.height
      )
        inZone += 1
      const expected = { r: b.r * 0.2, g: b.g * 0.2, b: b.b * 0.2 }
      if (maxChannelGap(a, expected) > 8) {
        offenders.push(
          `(${x},${y}) avant rgb(${b.r},${b.g},${b.b}) après rgb(${a.r},${a.g},${a.b})`,
        )
      }
    }
  }
  return { offenders, checked, discriminating, inZone }
}

for (const scheme of SCHEMES) {
  test.describe(`#456 couverture des fenêtres génériques — thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    test(`product drawer covers the page — ${scheme}`, async ({ page }) => {
      test.setTimeout(120_000)
      await neutralizeDevToolingPointerEvents(page)
      await ensureAuthenticated(page)
      // Un produit seedé : la liste a du contenu à recouvrir, quel que soit le compte.
      const userId = await getUserId(page)
      const cat = await seedCategory(page, unique('456 Cov Cat'))
      await seedProduct(page, { userId, name: unique('456 Cov Prod'), categoryId: cat.id })
      await gotoProducts(page)

      await page.mouse.move(0, 0)
      await settleForMeasurement(page)
      const before = await readViewport(page)

      await page.getByTestId('products-new-button').click({ timeout: CLICK_BUDGET })
      await expect(page.getByTestId('product-drawer-form')).toBeVisible()
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()
      await page.mouse.move(0, 0)
      await settleForMeasurement(page)
      const box = await dialog.boundingBox()
      if (box == null) throw new Error('boundingBox() nulle sur le tiroir produit')
      const after = await readViewport(page)

      const r = checkDarkened(page, before, after, box)
      expect(r.checked, 'trop peu de points hors boîte pour conclure').toBeGreaterThanOrEqual(30)
      expect(
        r.discriminating,
        'trop peu de points clairs : la mesure ne distinguerait rien',
      ).toBeGreaterThanOrEqual(20)
      expect(
        r.offenders,
        `${r.offenders.length}/${r.checked} points ne sont pas assombris par le fond : un ` +
          `élément de la page passe par-dessus le tiroir produit.`,
      ).toEqual([])
    })

    test(`event delete confirmation covers the edit drawer — ${scheme}`, async ({ page }) => {
      test.setTimeout(150_000)
      await neutralizeDevToolingPointerEvents(page)
      await ensureAuthenticated(page)
      const userId = await getUserId(page)
      const cat = await seedCategory(page, unique('456 Ev Cat'))
      const product = await seedProduct(page, {
        userId,
        name: unique('456 Ev Prod'),
        categoryId: cat.id,
      })

      // Chemin desktop d'ouverture de l'édition : frise du détail produit -> détail -> « Éditer ».
      await page.goto(`/fr/products/${product.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: FIRST_NAV_BUDGET,
      })
      await expect(page.getByTestId('product-detail-timeline')).toBeVisible({
        timeout: FIRST_NAV_BUDGET,
      })
      await page.getByTestId('timeline-event').first().click({ timeout: CLICK_BUDGET })
      await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })
      const drawer = page.getByTestId('timeline-edit-dialog')
      await expect(drawer).toBeVisible({ timeout: CLICK_BUDGET })
      await expect(page.getByTestId('event-form')).toBeVisible()

      // Le formulaire se remplit après l'ouverture (aperçu, catégories) : sans attente, la
      // capture « avant » diffère de la capture « après » hors de toute superposition.
      await page.waitForLoadState('networkidle')
      // Le bouton Supprimer est en bas du corps défilant : le clic le ferait défiler entre les
      // deux captures. On l'amène en vue AVANT la capture « avant ».
      await page.getByTestId('event-form-delete').scrollIntoViewIfNeeded()
      await page.mouse.move(0, 0)
      await settleForMeasurement(page, 1500)
      const drawerBox = await drawer.boundingBox()
      if (drawerBox == null) throw new Error('boundingBox() nulle sur le tiroir d’édition')
      const before = await readViewport(page)

      await page.getByTestId('event-form-delete').click({ timeout: CLICK_BUDGET })
      // `data-state` : seule la boîte Radix le porte (le tiroir est un `role="dialog"` maison,
      // et la boîte ouverte le rend `aria-hidden`, donc `getByRole` ne le verrait plus).
      const dialog = page.locator('[role="dialog"][data-state="open"]')
      await expect(dialog).toBeVisible()
      await page.mouse.move(0, 0)
      await settleForMeasurement(page, 1500)
      const box = await dialog.boundingBox()
      if (box == null) throw new Error('boundingBox() nulle sur la confirmation')
      const after = await readViewport(page)

      // Précondition : la boîte chevauche bien le tiroir, sinon le scénario n'existe pas.
      expect(
        drawerBox.x,
        `le tiroir (x=${drawerBox.x}) ne chevauche pas la boîte (jusqu'à ${box.x + box.width})`,
      ).toBeLessThan(box.x + box.width - 10)

      const r = checkDarkened(page, before, after, box, drawerBox)
      expect(r.checked, 'trop peu de points hors boîte pour conclure').toBeGreaterThanOrEqual(30)
      expect(
        r.discriminating,
        'trop peu de points clairs : la mesure ne distinguerait rien',
      ).toBeGreaterThanOrEqual(20)
      expect(r.inZone, 'trop peu de points sur le tiroir pour conclure').toBeGreaterThanOrEqual(12)
      expect(
        r.offenders,
        `${r.offenders.length}/${r.checked} points ne sont pas assombris par le fond : le tiroir ` +
          `d'édition passe par-dessus la confirmation.`,
      ).toEqual([])

      // La boîte est peinte d'une pièce : marge haute lue à gauche (hors tiroir) et à droite
      // (sur le tiroir, si la boîte passe dessous elle prend la couleur du tiroir).
      const left = after(Math.round(box.x + 10), Math.round(box.y + 10))
      const right = after(Math.round(box.x + box.width - 10), Math.round(box.y + 10))
      expect(
        maxChannelGap(left, right),
        `marge gauche rgb(${left.r},${left.g},${left.b}), marge droite ` +
          `rgb(${right.r},${right.g},${right.b}) : la boîte est recouverte en partie.`,
      ).toBeLessThanOrEqual(3)
    })
  })
}
