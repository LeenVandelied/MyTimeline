import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #816 (Sprint 114) — liste produits ≥ `sm` : un nom long ne fait plus déborder la
 * table, et les `sr-only` des cellules ne font plus défiler la PAGE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES DEUX DÉFAUTS (mesurés au S107, cf. PIT-S107-002)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. La colonne Produit n'était plafonnée que sous `sm` (`max-sm:w-full max-sm:max-w-0`,
 *    #608) : au-delà, un nom long la portait à 633 px et la table débordait de sa
 *    boîte `overflow-x-auto`.
 * 2. Cette boîte n'était pas positionnée : les `sr-only` (absolus) des cellules avaient
 *    la PAGE pour bloc conteneur, échappaient au clip et élargissaient le document
 *    (1535 px à 1280).
 * Correctif : `relative` sur la boîte ; `w-full max-w-0` sur la cellule Produit à
 * toutes les largeurs ; titre du prochain événement plafonné à `max-w-20` jusqu'à `xl`
 * (dès `md` la frise fait 220 px et un titre de 256 px débordait seul à 1024).
 *
 * ORACLES (par largeur 640 / 1024 / 1280, plus 375 pour la non-régression #608)
 *   · page : `documentElement.scrollWidth <= innerWidth` ;
 *   · table : largeur de la table <= `clientWidth` de sa boîte, et
 *     `scrollWidth <= clientWidth` de la boîte (aucun défilement interne) ;
 *   · sr-only : son `offsetParent` EST la boîte de défilement (bloc conteneur) ;
 *   · anti-vacuité : le nom long est effectivement TRONQUÉ (`scrollWidth > clientWidth`
 *     du span) — sinon la donnée ne stresserait rien et la spec passerait à vide.
 *
 * AUTO-CONTRÔLE (dernier test) : à 1280, on rend à la cellule Produit son ancien
 * comportement (`max-width:none; width:auto`) et à la boîte `position:static` — les
 * oracles table ET page DOIVENT rougir. Sans lui, une sonde aveugle passerait verte.
 *
 * Données : compte PROD partagé entre workers ; les produits d'autres specs peuvent
 * être listés. Les oracles portent sur la table entière, qui doit tenir QUELLES que
 * soient les données (c'est le contrat). Purge par `trackSeed` (fixtures).
 *
 * CE QU'ELLE NE PROUVE PAS : la plage `md`..`lg` (768–1023), où la frise de 220 px
 * réduit le nom visible à ~30 px (la table tient, mais c'est un arbitrage design —
 * cf. done.md) ; les locales autres que `fr` ; le thème sombre ; Firefox/WebKit.
 */

test.use({ storageState: PROD.storageState, colorScheme: 'light' })

const BUDGET = 60_000

// ≤ 100 caractères suffixe `unique()` compris (BR-PRO-001) — 74 + 1 + ~16.
const LONG_NAME = 'S114 Aspirateur robot laveur de la cuisine du rez-de-chaussée et du garage'
const LONG_NEXT_TITLE = 'Révision annuelle complète du moteur principal et des filtres'

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

/**
 * Deux produits au nom LONG :
 *   · `withNext` : 1 événement passé (J-40) + 1 à venir au titre long (J+20) → stresse
 *     aussi la colonne « Prochain événement » ;
 *   · `noNext` : 1 événement passé seulement → cellule « — » + `sr-only` « Aucune
 *     échéance à venir » (le premier `sr-only` de PIT-S107-002).
 */
async function openListWithLongNames(page: Page): Promise<{ withNext: string; noNext: string }> {
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('S114 Catégorie au nom long elle aussi'))
  const withNext = await seedProduct(page, {
    userId,
    name: unique(LONG_NAME),
    categoryId: cat.id,
    eventDate: daysAgo(40).slice(0, 10),
  })
  await seedEvent(page, withNext.id, LONG_NEXT_TITLE, daysAgo(-20))
  const noNext = await seedProduct(page, {
    userId,
    name: unique(LONG_NAME),
    categoryId: cat.id,
    eventDate: daysAgo(30).slice(0, 10),
  })
  await page.goto('/fr/products', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId(`products-row-${withNext.id}`)).toBeVisible({ timeout: BUDGET })
  await expect(page.getByTestId(`products-row-${noNext.id}`)).toBeVisible({ timeout: BUDGET })
  return { withNext: withNext.id, noNext: noNext.id }
}

async function measure(page: Page, productId: string) {
  return page.getByTestId('products-table').evaluate((table, id) => {
    const box = table.parentElement as HTMLElement
    const row = table.querySelector(`[data-testid="products-row-${id}"]`) as HTMLElement
    const name = row.querySelector('td:first-child .truncate') as HTMLElement
    return {
      table: table.getBoundingClientRect().width,
      boxClient: box.clientWidth,
      boxScroll: box.scrollWidth,
      docScroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      nameScroll: name.scrollWidth,
      nameClient: name.clientWidth,
    }
  }, productId)
}

/** Le `sr-only` désigné a la boîte de défilement pour bloc conteneur, et reste exposé. */
async function expectSrOnlyContained(page: Page, testId: string, text: string) {
  const sr = page.getByTestId(testId).locator('.sr-only')
  await expect(sr).toHaveText(text)
  const info = await sr.evaluate((el) => {
    const box = document.querySelector('[data-testid="products-table"]')?.parentElement ?? null
    const cs = getComputedStyle(el)
    return {
      position: cs.position,
      display: cs.display,
      containedByScroller: (el as HTMLElement).offsetParent === box,
    }
  })
  expect(info.position).toBe('absolute')
  expect(info.display).not.toBe('none')
  expect(info.containedByScroller, `${testId} : le sr-only doit être clippé par la boîte`).toBe(
    true,
  )
}

for (const width of [640, 1024, 1280]) {
  test.describe(`#816 — liste produits à ${width} px, noms longs`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('la table tient dans sa boîte et la page ne défile pas', async ({ page }) => {
      const { withNext, noNext } = await openListWithLongNames(page)
      const m = await measure(page, withNext)
      console.log(`[#816 ${width}] ${JSON.stringify(m)}`)

      // Anti-vacuité : le nom est bien plus large que sa cellule.
      expect(m.nameScroll, 'le nom long doit être tronqué').toBeGreaterThan(m.nameClient)
      expect(m.table, 'la table ne doit pas déborder de sa boîte').toBeLessThanOrEqual(m.boxClient)
      expect(m.boxScroll, 'la boîte ne doit pas défiler').toBeLessThanOrEqual(m.boxClient)
      expect(m.docScroll, 'la page ne doit pas défiler').toBeLessThanOrEqual(m.viewport)

      await expectSrOnlyContained(page, `products-row-events-count-${withNext}`, '2 événements')
      await expectSrOnlyContained(page, `products-row-next-${noNext}`, 'Aucune échéance à venir')
    })
  })
}

test.describe('#816 — non-régression #608 sous sm (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('nom tronqué, ni la table ni la page ne défilent', async ({ page }) => {
    const { withNext, noNext } = await openListWithLongNames(page)
    const m = await measure(page, withNext)
    console.log(`[#816 375] ${JSON.stringify(m)}`)
    expect(m.nameScroll, 'le nom long doit être tronqué').toBeGreaterThan(m.nameClient)
    expect(m.nameClient, 'le nom doit rester lisible (quelques caractères)').toBeGreaterThan(0)
    expect(m.boxScroll, 'la table ne doit pas défiler à 375').toBeLessThanOrEqual(m.boxClient)
    expect(m.docScroll, 'la page ne doit pas défiler à 375').toBeLessThanOrEqual(m.viewport)
    await expectSrOnlyContained(page, `products-row-next-${noNext}`, 'Aucune échéance à venir')
  })
})

test.describe('#816 — auto-contrôle à 1280 px', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('rendre l’ancien comportement fait rougir les sondes table et page', async ({ page }) => {
    const { withNext } = await openListWithLongNames(page)
    await page.getByTestId('products-table').evaluate((table) => {
      const box = table.parentElement as HTMLElement
      box.style.position = 'static'
      for (const td of table.querySelectorAll<HTMLElement>('tbody td:first-child')) {
        td.style.maxWidth = 'none'
        td.style.width = 'auto'
      }
    })
    const m = await measure(page, withNext)
    console.log(`[#816 armement 1280] ${JSON.stringify(m)}`)
    expect(m.table).toBeGreaterThan(m.boxClient)
    expect(m.docScroll).toBeGreaterThan(m.viewport)
  })
})
