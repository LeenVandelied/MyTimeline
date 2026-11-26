import { test, expect, type Page } from '@playwright/test'

/**
 * #800 — La landing laisse 40 px de marge horizontale de chaque côté du contenu
 * dès la largeur tablette (768 px), comme la maquette, et 16 px en dessous.
 *
 * Le plafond de 1340 px (#616) et le décompte des 5 blocs `container-landing`
 * sont verrouillés par `sprint-104-landing-container.spec.ts`. Cette spec ne
 * mesure que le padding calculé de chaque bloc.
 *
 * Sous 768 px la marge reste à 16 px : l'en-tête à 320 px n'a que 288 px utiles
 * (logo, appel à l'action, burger), il n'y a pas de place pour 40 px.
 *
 * Landing publique : aucun `storageState` requis.
 */

/** En-tête, présentation, frise, appel à l'action, pied de page. */
const LANDING_CONTAINERS = 5
const TABLET_PADDING_PX = 40
const PHONE_PADDING_PX = 16

interface Padding {
  left: number
  right: number
}

async function measurePaddings(page: Page): Promise<Padding[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.container-landing')].map((el) => {
      const cs = getComputedStyle(el)
      return { left: parseFloat(cs.paddingLeft), right: parseFloat(cs.paddingRight) }
    }),
  )
}

async function expectPadding(page: Page, expected: number): Promise<void> {
  await page.goto('/fr', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.container-landing')).toHaveCount(LANDING_CONTAINERS)

  const paddings = await measurePaddings(page)
  expect(paddings).toHaveLength(LANDING_CONTAINERS)
  for (const p of paddings) {
    expect(p.left).toBe(expected)
    expect(p.right).toBe(expected)
  }
}

test.describe('#800 — marges latérales de la landing', () => {
  for (const width of [768, 1024, 1280, 1920] as const) {
    test.describe(`à ${width} px`, () => {
      test.use({ viewport: { width, height: 1000 } })

      test('every landing container has 40px horizontal padding from tablet width up', async ({
        page,
      }) => {
        await expectPadding(page, TABLET_PADDING_PX)
      })
    })
  }

  for (const width of [320, 375, 390] as const) {
    test.describe(`à ${width} px`, () => {
      test.use({ viewport: { width, height: 900 } })

      test('landing containers keep 16px horizontal padding below tablet width', async ({
        page,
      }) => {
        await expectPadding(page, PHONE_PADDING_PX)
      })
    })
  }
})
