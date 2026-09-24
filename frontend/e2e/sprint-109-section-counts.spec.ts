import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { PROD } from './support/accounts'
import { waitForFonts } from './support/contrast'

/**
 * Sprint 109 — #664 : compteurs et plage à droite des titres de section (maquette
 * `Dashboard.dc.html`, `Mobile Dashboard.dc.html`, `Produits.dc.html`, relevé S109 :
 * aucune de ces sections n'a de sur-titre).
 *
 * Testids couverts (5) :
 *   `dashboard-week-count`             — « {n} événements », desktop (WeekAgenda)
 *   `dashboard-product-list-count`     — « {n} produits », desktop (ProductList)
 *   `dashboard-compact-agenda-count`   — « {n} événements », mobile (CompactAgenda)
 *   `dashboard-product-carousel-count` — « {n} produits », mobile (ProductCarousel)
 *   `product-detail-timeline-range`    — « {début} – {fin} », fiche produit (sous-frise)
 *
 * CE QUE LES TESTS UNITAIRES NE DISENT PAS (`section-counts.test.tsx`,
 * `ProductDetailView.test.tsx`) : la police mono effective, la casse peinte, et surtout
 * la TENUE à 375 px en allemand — le compteur `nowrap` doit rester dans sa section, le
 * titre (`min-w-0`) passer à la ligne plutôt que le pousser dehors (PIT-S84-004).
 *
 * Données : le listing `GET /api/users/{userId}/products` est STUBBÉ (motif
 * `sprint-108-en-bref.spec.ts`) — PROD est alimenté par d'autres specs, des compteurs
 * exacts n'y sont pas atteignables autrement. La fiche produit lit le même listing
 * (`useProductsWithEvents`) : le stub la sert aussi. Rien n'est soumis.
 *
 * « Aujourd'hui » est lu DANS LE NAVIGATEUR (fuseau émulé). La plage attendue est
 * calculée DANS LE NAVIGATEUR par le même `Intl.DateTimeFormat#formatRange` que le
 * composant (PIT-S108-002 : espaces fines U+2009 — jamais de littéral saisi à la main
 * comme oracle principal).
 *
 * Mesures, pas captures : aucune référence visuelle n'est créée ni modifiée.
 */

test.use({ storageState: PROD.storageState, timezoneId: 'Europe/Paris' })

const LOCALES = ['fr', 'de'] as const
type Locale = (typeof LOCALES)[number]

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const P1 = '00000000-0000-7000-8000-000000109001'
const P2 = '00000000-0000-7000-8000-000000109002'
const P3 = '00000000-0000-7000-8000-000000109003'

/** Libellés attendus (pluriel ICU des 2 locales jouées). */
const EVENTS = {
  fr: (n: number) => `${n} ${n === 1 ? 'événement' : 'événements'}`,
  de: (n: number) => `${n} ${n === 1 ? 'Ereignis' : 'Ereignisse'}`,
} as const
const PRODUCTS = {
  fr: (n: number) => `${n} ${n === 1 ? 'produit' : 'produits'}`,
  de: (n: number) => `${n} ${n === 1 ? 'Produkt' : 'Produkte'}`,
} as const

/** Jour civil du NAVIGATEUR décalé de `offset` jours, au format `YYYY-MM-DD`. */
async function browserDay(page: Page, offset: number): Promise<string> {
  return page.evaluate((o) => {
    const d = new Date()
    d.setDate(d.getDate() + o)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, offset)
}

/**
 * 3 produits : A (aujourd'hui + demain → agenda compact = 2), B (J+20 : hors semaine,
 * hors agenda compact), C (2 dates FIXES en 2024 → plage de la fiche, année affichée
 * puisque hors de l'année courante).
 */
async function stubProducts(page: Page): Promise<void> {
  await page.goto('about:blank')
  const today = await browserDay(page, 0)
  const tomorrow = await browserDay(page, 1)
  const in20 = await browserDay(page, 20)
  const event = (id: string, productId: string, date: string) => ({
    id: `00000000-0000-7000-8000-0000001090${id}`,
    title: `S109 event ${id}`,
    type: 'single',
    startDate: date,
    endDate: date,
    productId,
    archived: false,
    isRecurring: false,
    recurrenceUnit: null,
    recurrenceEndDate: null,
    color: null,
  })
  const category = { id: '00000000-0000-7000-8000-000000109101', name: 'S109 Cat', color: null }
  const items = [
    {
      id: P1,
      name: 'S109 produit A',
      color: null,
      category,
      events: [event('11', P1, today), event('12', P1, tomorrow)],
    },
    { id: P2, name: 'S109 produit B', color: null, category, events: [event('21', P2, in20)] },
    {
      id: P3,
      name: 'S109 produit C',
      color: null,
      category,
      events: [event('31', P3, '2024-03-05'), event('32', P3, '2024-06-20')],
    },
  ]
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    })
  })
}

async function openDashboard(page: Page, locale: Locale): Promise<void> {
  await stubProducts(page)
  await page.goto(`/${locale}/dashboard`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })
  await waitForFonts(page)
}

async function openProduct(page: Page, locale: Locale): Promise<void> {
  await stubProducts(page)
  await page.goto(`/${locale}/products/${P3}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: 30_000 })
  await waitForFonts(page)
}

/** Plage attendue, formatée PAR LE NAVIGATEUR comme le fait `formatEventSpan`. */
async function expectedRange(page: Page, locale: Locale): Promise<string> {
  return page.evaluate(
    (loc) =>
      new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(
        new Date(2024, 2, 5),
        new Date(2024, 5, 20),
      ),
    locale,
  )
}

const norm = (s: string | null) => (s ?? '').replace(/[\u2009\u202F\u00A0]/g, ' ')

interface Measure {
  fontFamily: string
  textTransform: string
  color: string
  scrollWidth: number
  clientWidth: number
}

async function measure(locator: Locator): Promise<Measure> {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      fontFamily: s.fontFamily,
      textTransform: s.textTransform,
      color: s.color,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }
  })
}

/**
 * Le compteur est un libellé mono, `ink-muted` (≠ encre du titre), sans capitales, non
 * tronqué, à DROITE du titre et DANS sa section. `mono` = police d'un élément mono voisin
 * (next/font suffixe les noms : aucune police en dur).
 */
async function expectCounterInSection(
  page: Page,
  counterId: string,
  sectionId: string,
  mono: string,
): Promise<void> {
  const counter = page.getByTestId(counterId)
  const section = page.getByTestId(sectionId)
  await expect(counter).toBeVisible()
  const c = await measure(counter)
  const h2 = await measure(section.locator('h2'))
  expect(c.fontFamily, `${counterId} : police mono`).toBe(mono)
  expect(c.textTransform, `${counterId} : pas de capitales (ce n'est pas un sur-titre)`).toBe(
    'none',
  )
  expect(c.color, `${counterId} : ink-muted, pas l'encre du titre`).not.toBe(h2.color)
  expect(c.scrollWidth, `${counterId} : texte tronqué`).toBeLessThanOrEqual(c.clientWidth + 1)

  const cb = (await counter.boundingBox())!
  const sb = (await section.boundingBox())!
  expect(cb.x, `${counterId} : sort à gauche de sa section`).toBeGreaterThanOrEqual(sb.x - 0.5)
  expect(cb.x + cb.width, `${counterId} : sort à droite de sa section`).toBeLessThanOrEqual(
    sb.x + sb.width + 0.5,
  )
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  const doc = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(doc.scrollWidth, 'débordement horizontal de page').toBeLessThanOrEqual(doc.innerWidth)
}

for (const locale of LOCALES) {
  /* ------------------------------------------------------ DESKTOP 1280 */
  test.describe(`#664 — desktop 1280 · ${locale}`, () => {
    test.use({ viewport: { width: 1280, height: 900 } })

    test(`semaine et produits : compteurs à droite du titre · ${locale}`, async ({ page }) => {
      await openDashboard(page, locale)
      const mono = (await measure(page.locator('.mt-num').first())).fontFamily

      // Semaine : le compteur égale les lignes rendues (demain peut tomber la semaine
      // suivante un dimanche : l'oracle est la liste, pas une constante).
      const rows = page
        .getByTestId('dashboard-week-agenda')
        .locator('[data-testid^="dashboard-week-agenda-row-"]')
      await expect(rows.first()).toBeVisible()
      const n = await rows.count()
      await expect(page.getByTestId('dashboard-week-count')).toHaveText(EVENTS[locale](n))
      await expectCounterInSection(page, 'dashboard-week-count', 'dashboard-week-agenda', mono)

      await expect(page.getByTestId('dashboard-product-list-count')).toHaveText(PRODUCTS[locale](3))
      await expectCounterInSection(
        page,
        'dashboard-product-list-count',
        'dashboard-product-list',
        mono,
      )

      // À 1280 px, compteur et titre partagent la rangée : compteur à droite du h2.
      for (const [counterId, sectionId] of [
        ['dashboard-week-count', 'dashboard-week-agenda'],
        ['dashboard-product-list-count', 'dashboard-product-list'],
      ] as const) {
        const cb = (await page.getByTestId(counterId).boundingBox())!
        const hb = (await page.getByTestId(sectionId).locator('h2').boundingBox())!
        expect(cb.x, `${counterId} : à droite du titre`).toBeGreaterThanOrEqual(hb.x + hb.width)
        expect(cb.y, `${counterId} : même rangée que le titre`).toBeLessThan(hb.y + hb.height)
      }

      // « En bref » : titre seul (maquette) — le h2 reste enfant DIRECT de la section,
      // sans rangée titre + compteur. (Ne pas chercher « événement » dans son voisin : la
      // 1re phrase le contient.)
      await expect(page.getByTestId('dashboard-kpi-marginalia').locator(':scope > h2')).toHaveCount(
        1,
      )
    })

    test(`fiche produit : plage des événements tracés · ${locale}`, async ({ page }) => {
      await openProduct(page, locale)
      const range = page.getByTestId('product-detail-timeline-range')
      await expect(range).toBeVisible()
      await expect(range).toHaveText(await expectedRange(page, locale))
      // Garde-fou lisible (normalisé) : l'oracle navigateur ne doit pas être vide/aberrant.
      expect(norm(await range.textContent())).toMatch(
        locale === 'fr' ? /^5 mars.*20 juin 2024$/ : /^5\. März.*20\. Juni 2024$/,
      )
      const mono = (await measure(page.getByTestId('product-detail-card').locator('dd.font-mono')))
        .fontFamily
      await expectCounterInSection(
        page,
        'product-detail-timeline-range',
        'product-detail-timeline',
        mono,
      )
    })
  })

  /* ------------------------------------------------------ MOBILE 375 */
  test.describe(`#664 — mobile portrait 375 · ${locale}`, () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test(`agenda compact et carrousel : compteurs dans leur section · ${locale}`, async ({
      page,
    }) => {
      await openDashboard(page, locale)
      await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()
      const mono = (await measure(page.locator('.mt-num').first())).fontFamily

      // Aujourd'hui + demain (A) : 2, quel que soit le jour de la semaine.
      await expect(page.getByTestId('dashboard-compact-agenda-count')).toHaveText(EVENTS[locale](2))
      await expect(
        page.locator('[data-testid^="dashboard-compact-agenda-row-"]'),
        'le compteur compte ce que la section montre',
      ).toHaveCount(2)
      await expectCounterInSection(
        page,
        'dashboard-compact-agenda-count',
        'dashboard-compact-agenda',
        mono,
      )

      await expect(page.getByTestId('dashboard-product-carousel-count')).toHaveText(
        PRODUCTS[locale](3),
      )
      await expectCounterInSection(
        page,
        'dashboard-product-carousel-count',
        'dashboard-product-carousel-section',
        mono,
      )

      for (const sectionId of ['dashboard-compact-agenda', 'dashboard-product-carousel-section']) {
        const h2 = await measure(page.getByTestId(sectionId).locator('h2'))
        expect(h2.scrollWidth, `${sectionId} : titre débordant`).toBeLessThanOrEqual(
          h2.clientWidth + 1,
        )
      }
      await expectNoPageOverflow(page)
    })

    test(`fiche produit : la plage reste dans la carte de la frise · ${locale}`, async ({
      page,
    }) => {
      await openProduct(page, locale)
      const range = page.getByTestId('product-detail-timeline-range')
      await expect(range).toHaveText(await expectedRange(page, locale))
      const mono = (await measure(page.getByTestId('product-detail-card').locator('dd.font-mono')))
        .fontFamily
      await expectCounterInSection(
        page,
        'product-detail-timeline-range',
        'product-detail-timeline',
        mono,
      )
      const h2 = await measure(page.getByTestId('product-detail-timeline').locator('h2'))
      expect(h2.scrollWidth, 'titre de la frise débordant').toBeLessThanOrEqual(h2.clientWidth + 1)
      await expectNoPageOverflow(page)
    })
  })
}
