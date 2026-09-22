import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #608 + #609 (Sprint 107) — liste produits à 390 px : mini-frise conservée, en-têtes DS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC GARDE
 * ─────────────────────────────────────────────────────────────────────────────
 * #608 — la mini-frise 90 j était `hidden md:table-cell` : elle disparaissait sous
 * 768 px, contre le handoff §5 (« frise = ADN, conservée sur mobile »). Arbitrage :
 * CONSERVÉE sous `md`, en densité compacte (SVG 64×24, géométrie recalculée, points
 * r=3), 220×40 dès `md`. Contrainte : à 390 px la colonne ne doit PAS faire défiler
 * le tableau, même avec un nom de produit et un titre d'événement longs.
 * #609 — en-têtes au motif DS `.mt-table th` (mono 9 px, capitales).
 *
 * ORACLES
 *   · frise : le SVG VISIBLE de la ligne a une boîte de largeur > 0 entièrement dans
 *     le viewport, et porte ≥ 2 cercles (2 événements passés dans la fenêtre) ;
 *   · pas de défilement : `scrollWidth <= clientWidth` du conteneur `overflow-x-auto`
 *     de la table (et du document) ;
 *   · en-têtes : `text-transform: uppercase` + police mono calculées sur chaque `th`.
 *
 * AUTO-CONTRÔLE : le 3e test force la frise compacte à 220 px à 390 et exige que
 * l'oracle de défilement rougisse. Sans lui, une sonde aveugle passerait verte.
 *
 * CE QU'ELLE NE PROUVE PAS : le débordement ≥ `sm` avec des noms longs (préexistant,
 * hors #608 — cf. done.md), le thème sombre, Firefox.
 */

test.use({ storageState: PROD.storageState, colorScheme: 'light' })

const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 900 }
const BUDGET = 60_000

/** ISO datetime d'il y a `days` jours (négatif = futur). */
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

async function seedEvent(page: Page, productId: string, name: string, date: string) {
  const res = await page.request.post('/api/events', {
    data: {
      name,
      type: 'single',
      durationValue: 1,
      durationUnit: 'days',
      isRecurring: false,
      date,
      productId,
    },
  })
  expect(res.status(), `seed événement doit renvoyer 201 (obtenu ${res.status()})`).toBe(201)
}

const LONG_NAME = 'S107 Aspirateur robot laveur de la cuisine du rez-de-chaussée'

/** Produit (nom LONG par défaut), 2 ponctuels passés (J-40, J-10) + 1 à venir au titre long. */
async function openListWithProduct(page: Page, name = LONG_NAME): Promise<string> {
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('S107 Liste mobile catégorie au nom long'))
  const product = await seedProduct(page, {
    userId,
    name: unique(name),
    categoryId: cat.id,
    eventDate: daysAgo(40).slice(0, 10),
  })
  await seedEvent(page, product.id, 'Nettoyage des brosses', daysAgo(10))
  await seedEvent(page, product.id, 'Révision annuelle complète du moteur principal', daysAgo(-20))
  await page.goto('/fr/products', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId(`products-row-${product.id}`)).toBeVisible({ timeout: BUDGET })
  return product.id
}

/** Frise AFFICHÉE de la ligne (deux rendus basculés en CSS, un seul visible). */
function visibleSparkline(page: Page, productId: string) {
  return page.getByTestId(`products-row-activity-${productId}`).getByRole('img')
}

async function expectSparklineInViewport(
  page: Page,
  productId: string,
  width: number,
  { scroll = false } = {},
) {
  const svg = visibleSparkline(page, productId)
  await expect(svg).toHaveCount(1)
  await expect(svg).toBeVisible()
  if (scroll) await svg.scrollIntoViewIfNeeded()
  const box = await svg.boundingBox()
  expect(box, 'la frise doit avoir une boîte').not.toBeNull()
  expect(box!.width).toBe(width)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(await svg.locator('circle').count()).toBeGreaterThanOrEqual(2)
}

async function measureOverflow(page: Page) {
  return page.getByTestId('products-table').evaluate((table) => {
    const box = table.parentElement as HTMLElement
    return {
      containerScroll: box.scrollWidth,
      containerClient: box.clientWidth,
      docScroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }
  })
}

async function expectDsHeaders(page: Page) {
  const headers = await page
    .getByTestId('products-table')
    .locator('thead th')
    .evaluateAll((ths) =>
      ths.map((th) => {
        const cs = getComputedStyle(th)
        return {
          display: cs.display,
          textTransform: cs.textTransform,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
        }
      }),
    )
  expect(headers.length).toBe(5)
  for (const h of headers.filter((x) => x.display !== 'none')) {
    expect(h.textTransform).toBe('uppercase')
    expect(h.fontFamily).toMatch(/mono/i)
    expect(h.fontSize).toBe('9px')
  }
  return headers
}

test.describe('#608/#609 — liste produits à 390 px', () => {
  test.use({ viewport: MOBILE })

  test('mini-frise compacte visible, sans défilement horizontal, en-têtes DS', async ({ page }) => {
    const productId = await openListWithProduct(page)

    await expectSparklineInViewport(page, productId, 64)
    // L'en-tête de la colonne frise est visible aussi (pas de colonne sans en-tête).
    const headers = await expectDsHeaders(page)
    expect(headers[2].display).toBe('table-cell')
    // Le compteur reste `sm:` : masqué à 390.
    expect(headers[3].display).toBe('none')

    const o = await measureOverflow(page)
    console.log(`[#608 390] ${JSON.stringify(o)}`)
    expect(o.containerScroll, 'le tableau ne doit pas défiler à 390').toBeLessThanOrEqual(
      o.containerClient,
    )
    expect(o.docScroll, 'la page ne doit pas défiler à 390').toBeLessThanOrEqual(o.viewport)
  })

  test('auto-contrôle : une frise de 220 px à 390 fait rougir la sonde de défilement', async ({
    page,
  }) => {
    const productId = await openListWithProduct(page)
    await visibleSparkline(page, productId).evaluate((svg) => {
      svg.setAttribute('width', '220')
    })
    const o = await measureOverflow(page)
    console.log(`[#608 armement 220 px] ${JSON.stringify(o)}`)
    expect(o.containerScroll).toBeGreaterThan(o.containerClient)
  })
})

test.describe('#608/#609 — non-régression desktop', () => {
  test.use({ viewport: DESKTOP })

  // Le compte PROD est partagé entre workers : les produits aux noms longs des tests
  // mobiles peuvent être listés ici, et ≥ `sm` un nom long fait déjà déborder la table
  // (préexistant, hors #608). On amène donc la frise dans le conteneur avant de mesurer.
  test('dès md : frise pleine 220 px, en-têtes DS', async ({ page }) => {
    const productId = await openListWithProduct(page, 'S107 Robot')
    await expectSparklineInViewport(page, productId, 220, { scroll: true })
    const headers = await expectDsHeaders(page)
    expect(headers.every((h) => h.display === 'table-cell')).toBe(true)
  })
})
