import { expect, test, type Page } from '@playwright/test'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'
import { ensureAuthenticated } from './support/auth'
import { PAGE_CHUNK_MARKERS, gatePageChunk } from './support/page-chunk-gate'

/**
 * #811 — Le squelette de chargement du tableau de bord suit les mises en page portrait et
 * paysage de la page réelle : une seule des trois est visible à la fois.
 *
 * COMMENT FAIRE PEINDRE `loading.tsx`. Sur un chargement de document (`goto`), la page
 * cliente est rendue côté serveur et le fallback de segment n'apparaît jamais. Il ne se peint
 * que lors d'une NAVIGATION CLIENT où le chunk de la page suspend. On retient donc le chunk
 * client du dashboard (`gatePageChunk`, même porte que `sprint-106-product-detail`) pendant
 * un clic sur un lien interne, puis on mesure le squelette avant de relâcher le chunk.
 * Le shell n'offre aucun lien vers le dashboard sous 768 px : on part de `/fr/settings`,
 * dont `settings-back` (visible sous `lg`) pointe vers `/fr/dashboard`.
 *
 * Compte SHARED en lecture seule (aucune mutation, aucun semis).
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (cf. `playwright.config.ts`).
 */
test.use({ storageState: sessionState(SHARED), hasTouch: true })

const FIRST_NAV_BUDGET = 60_000

const DESKTOP_SKELETON = 'dashboard-loading-layout'
const PORTRAIT_SKELETON = 'dashboard-loading-portrait'
const LANDSCAPE_SKELETON = 'dashboard-loading-landscape'

/** Navigation client settings → dashboard, chunk de la page retenu : `loading.tsx` est peint. */
async function holdDashboardSkeleton(page: Page) {
  let armed = false
  const gate = await gatePageChunk(page, PAGE_CHUNK_MARKERS.dashboard, () => armed)
  await ensureAuthenticated(page)
  armed = true
  await page.goto('/fr/settings', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  const back = page.getByTestId('settings-back')
  await expect(back).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await back.click()
  await gate.held
  // Précondition : le fallback de segment est bien peint (sa région de statut est dans le
  // DOM) pendant que la porte tient. Sans elle, un échec ci-dessous pourrait venir d'une
  // porte qui n'a pas pris, et non de l'absence de la mise en page mobile.
  await expect(page.getByTestId('dashboard-loading-skeleton')).toBeAttached()
  return gate
}

test.describe('#811 squelette du dashboard, portrait et paysage', () => {
  test.describe('portrait', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('portrait viewport shows only the portrait skeleton, single column', async ({ page }) => {
      test.setTimeout(120_000)
      const gate = await holdDashboardSkeleton(page)
      try {
        await expect(page.getByTestId(PORTRAIT_SKELETON)).toBeVisible()
        await expect(page.getByTestId(DESKTOP_SKELETON)).toBeHidden()
        await expect(page.getByTestId(LANDSCAPE_SKELETON)).toBeHidden()

        // Rien ne dépasse la largeur de l'écran : ni le document, ni le squelette.
        const viewportWidth = page.viewportSize()?.width ?? 390
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }))
        expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(viewportWidth)
        const box = await page.getByTestId(PORTRAIT_SKELETON).boundingBox()
        expect(box, 'squelette portrait peint').not.toBeNull()
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewportWidth + 1)
      } finally {
        gate.release()
      }
      await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()
    })
  })

  test.describe('paysage', () => {
    test.use({ viewport: { width: 812, height: 375 } })

    test('landscape viewport shows only the landscape skeleton with a 64px rail', async ({
      page,
    }) => {
      test.setTimeout(120_000)
      const gate = await holdDashboardSkeleton(page)
      try {
        await expect(page.getByTestId(LANDSCAPE_SKELETON)).toBeVisible()
        await expect(page.getByTestId(DESKTOP_SKELETON)).toBeHidden()
        await expect(page.getByTestId(PORTRAIT_SKELETON)).toBeHidden()

        const rail = page.getByTestId('dashboard-loading-rail')
        await expect(rail).toBeVisible()
        const box = await rail.boundingBox()
        expect(box, 'rail peint').not.toBeNull()
        expect(Math.round(box?.width ?? 0)).toBe(64)

        // Conflit portrait / paysage : 740 x 360 est SOUS 768 px de large ET en paysage de
        // faible hauteur (cf. #758 dans `page.tsx`). Les deux requêtes portrait et paysage
        // s'appliquent, le paysage doit l'emporter. On redimensionne pendant que la porte
        // tient : la bascule est purement CSS, le squelette n'est pas remonté, et la
        // navigation gardée n'a pas à être rejouée.
        await page.setViewportSize({ width: 740, height: 360 })
        await expect(page.getByTestId(LANDSCAPE_SKELETON)).toBeVisible()
        await expect(page.getByTestId(PORTRAIT_SKELETON)).toBeHidden()
        await expect(page.getByTestId(DESKTOP_SKELETON)).toBeHidden()
        const narrowBox = await rail.boundingBox()
        expect(Math.round(narrowBox?.width ?? 0)).toBe(64)
      } finally {
        gate.release()
      }
      await expect(page.getByTestId('dashboard-landscape')).toBeVisible()
    })
  })
})
