import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { PROD } from './support/accounts'
import { gotoProducts } from './support/products'

/**
 * #603 (Sprint 92) — Liste Produits : « Prochain événement » regarde l'AVENIR.
 *
 * Handoff §5 : colonnes Produit · Prochain événement (titre + date ISO) · mini-frise 90 j ·
 * nb d'événements ; tri Nom / Prochain événement.
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER (d'où cette spec) : le tri réel via le Select Radix
 * (portail), les paliers responsive (`hidden sm:table-cell`) réellement appliqués par
 * Tailwind, et le rendu dans le vrai navigateur avec l'horloge réelle.
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-91-recurrence-marks`), aucune écriture :
 *  - « S92 C Mensuel » : série MENSUELLE partie il y a 3 mois, un 10 (aucun clamp de fin
 *    de mois) + un événement ARCHIVÉ demain (doit être ignoré) → prochaine occurrence ;
 *  - « S92 A Futur » : ponctuel à J+40, forcément APRÈS la prochaine mensuelle (≤ 31 j) ;
 *  - « S92 B Passé » : ponctuel à J−10 + série mensuelle BORNÉE terminée → aucune échéance.
 * Ordre attendu : Prochain événement = C, A, B ; Nom (A→Z) = A, B, C.
 *
 * CE QUE LA SPEC NE PROUVE PAS : le calcul pour les fins de mois, les séries annuelles ou
 * hebdomadaires, le changement d'heure (unitaires `src/lib/next-occurrence.test.ts`) ; le
 * tableau de bord ; un run qui franchit minuit entre le calcul de la fixture et le rendu.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

/* ---------------------------- dates civiles locales ---------------------------- */

function today(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
/** Même clamp de fin de mois que `lib/recurrence.ts` (sans objet ici : départ au 10). */
function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1)
  r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()))
  return r
}
function iso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const TODAY = today()
const MONTHLY_START = new Date(TODAY.getFullYear(), TODAY.getMonth() - 3, 10)
/** Oracle indépendant : première occurrence ≥ aujourd'hui, calculée depuis l'origine. */
const MONTHLY_NEXT = (() => {
  for (let k = 0; ; k++) {
    const occurrence = addMonths(MONTHLY_START, k)
    if (occurrence.getTime() >= TODAY.getTime()) return iso(occurrence)
  }
})()
const FUTURE_SINGLE = iso(addDays(TODAY, 40))
const EXPIRED_START = new Date(TODAY.getFullYear(), TODAY.getMonth() - 6, 10)

const uuid = (n: number) => `92a60300-0000-4000-8000-${String(n).padStart(12, '0')}`
const CAT = { id: uuid(100), name: 'S92 Catégorie', color: '#1D4ED8' }
const MONTHLY_ID = uuid(1)
const FUTURE_ID = uuid(2)
const PAST_ID = uuid(3)

function apiEvent(e: {
  id: string
  title: string
  productId: string
  start: string
  unit?: 'MONTH'
  seriesEnd?: string
  archived?: boolean
}) {
  return {
    id: e.id,
    title: e.title,
    type: 'single',
    startDate: e.start,
    endDate: e.start,
    productId: e.productId,
    color: null,
    archived: e.archived ?? false,
    isRecurring: e.unit !== undefined,
    recurrenceUnit: e.unit ?? null,
    recurrenceEndDate: e.seriesEnd ?? null,
  }
}

const PRODUCTS = [
  {
    id: PAST_ID,
    name: 'S92 B Passé',
    color: null,
    category: CAT,
    events: [
      apiEvent({
        id: uuid(31),
        title: 'S92 Ponctuel passé',
        productId: PAST_ID,
        start: iso(addDays(TODAY, -10)),
      }),
      apiEvent({
        id: uuid(32),
        title: 'S92 Série terminée',
        productId: PAST_ID,
        start: iso(EXPIRED_START),
        unit: 'MONTH',
        seriesEnd: iso(addMonths(EXPIRED_START, 3)),
      }),
    ],
  },
  {
    id: MONTHLY_ID,
    name: 'S92 C Mensuel',
    color: null,
    category: CAT,
    events: [
      apiEvent({
        id: uuid(11),
        title: 'S92 Mensuel',
        productId: MONTHLY_ID,
        start: iso(MONTHLY_START),
        unit: 'MONTH',
      }),
      apiEvent({
        id: uuid(12),
        title: 'S92 Archivé demain',
        productId: MONTHLY_ID,
        start: iso(addDays(TODAY, 1)),
        archived: true,
      }),
    ],
  },
  {
    id: FUTURE_ID,
    name: 'S92 A Futur',
    color: null,
    category: CAT,
    events: [
      apiEvent({ id: uuid(21), title: 'S92 Futur', productId: FUTURE_ID, start: FUTURE_SINGLE }),
    ],
  },
]

async function stubProductsList(page: Page): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PRODUCTS),
    })
  })
}

function rowIds(page: Page): Promise<Array<string | null>> {
  return page
    .getByTestId('products-table')
    .locator('tbody tr')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid')))
}

async function chooseSort(page: Page, key: 'nextEvent' | 'nameAsc'): Promise<void> {
  await page.getByTestId('products-sort-trigger').click()
  await page.getByTestId(`products-sort-option-${key}`).click()
}

test.describe('#603 — liste Produits : prochain événement (récurrences comprises)', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('série passée → prochaine occurrence ISO ; tri par défaut et tri Nom', async ({ page }) => {
    await stubProductsList(page)
    await gotoProducts(page)

    // Prochaine occurrence de la série (l'archivé de demain est ignoré).
    const monthly = page.getByTestId(`products-row-next-${MONTHLY_ID}`)
    await expect(monthly).toContainText('S92 Mensuel')
    await expect(monthly.locator('time')).toHaveAttribute('datetime', MONTHLY_NEXT)
    await expect(monthly.locator('time')).toHaveText(MONTHLY_NEXT)

    await expect(page.getByTestId(`products-row-next-${FUTURE_ID}`).locator('time')).toHaveText(
      FUTURE_SINGLE,
    )

    // Sans échéance : pas de date, texte accessible défini.
    const past = page.getByTestId(`products-row-next-${PAST_ID}`)
    await expect(past.locator('time')).toHaveCount(0)
    await expect(past).toContainText('Aucune échéance à venir')

    // Nombre d'événements NON archivés.
    const count = page.getByTestId(`products-row-events-count-${MONTHLY_ID}`)
    await expect(count).toBeVisible()
    await expect(count).toContainText('1 événement')

    // Tri par défaut = prochain événement.
    await expect(page.getByTestId('products-sort-trigger')).toContainText('Prochain événement')
    await expect
      .poll(() => rowIds(page))
      .toEqual([
        `products-row-${MONTHLY_ID}`,
        `products-row-${FUTURE_ID}`,
        `products-row-${PAST_ID}`,
      ])

    await chooseSort(page, 'nameAsc')
    await expect
      .poll(() => rowIds(page))
      .toEqual([
        `products-row-${FUTURE_ID}`,
        `products-row-${PAST_ID}`,
        `products-row-${MONTHLY_ID}`,
      ])

    await chooseSort(page, 'nextEvent')
    await expect
      .poll(() => rowIds(page))
      .toEqual([
        `products-row-${MONTHLY_ID}`,
        `products-row-${FUTURE_ID}`,
        `products-row-${PAST_ID}`,
      ])
  })
})

test.describe('#603 — liste Produits en portrait mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la prochaine échéance reste visible ; compteur et mini-frise masqués', async ({ page }) => {
    await stubProductsList(page)
    await gotoProducts(page)

    const monthly = page.getByTestId(`products-row-next-${MONTHLY_ID}`)
    await expect(monthly).toBeVisible()
    await expect(monthly.locator('time')).toHaveText(MONTHLY_NEXT)
    await expect(page.getByTestId(`products-row-events-count-${MONTHLY_ID}`)).toBeHidden()
    await expect(
      page.getByTestId(`products-row-${MONTHLY_ID}`).getByRole('img', { includeHidden: false }),
    ).toHaveCount(0)
  })
})
