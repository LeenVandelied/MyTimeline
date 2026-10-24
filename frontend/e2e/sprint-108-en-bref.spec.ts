import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { PROD } from './support/accounts'

/**
 * Sprint 108 — #640 : « En bref » affiche les 4 phrases de la maquette (DEC-S82-007,
 * arbitrage DEC-S108-004) et plus aucune « série » (`currentStreak` retiré).
 *
 * Testids couverts (9) :
 *   phrases : `dashboard-kpi-week-sentence`, `dashboard-kpi-due-sentence`,
 *             `dashboard-kpi-ongoing-sentence`, `dashboard-kpi-busiest-sentence`
 *   valeurs : `dashboard-kpi-week`, `dashboard-kpi-recurring`, `dashboard-kpi-due-14d`,
 *             `dashboard-kpi-ongoing`, `dashboard-kpi-busiest-category`
 *
 * Données : le listing `GET /api/users/{userId}/products` est STUBBÉ (motif
 * `sprint-90-first-contact.spec.ts`) — PROD est alimenté par d'autres specs, un compte
 * vide ou des compteurs exacts n'y sont pas atteignables autrement. Toute autre
 * méthode passe au réseau réel ; rien n'est soumis.
 *
 * « Aujourd'hui » est lu DANS LE NAVIGATEUR (fuseau émulé), pas dans Node : le stub
 * construit ses dates sur le même jour civil que celui que la page utilisera.
 */

test.use({
  storageState: PROD.storageState,
  viewport: { width: 1280, height: 900 },
  timezoneId: 'Europe/Paris',
})

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

async function stubProducts(page: Page, items: unknown[]): Promise<void> {
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

/** Jour civil du NAVIGATEUR décalé de `offset` jours, au format `YYYY-MM-DD`. */
async function browserDay(page: Page, offset: number): Promise<string> {
  return page.evaluate((o) => {
    const d = new Date()
    d.setDate(d.getDate() + o)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, offset)
}

async function openDashboard(page: Page): Promise<void> {
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('dashboard')).toBeVisible()
  await expect(page.getByTestId('dashboard-kpi-marginalia')).toBeVisible()
}

const SENTENCES = [
  'dashboard-kpi-week-sentence',
  'dashboard-kpi-due-sentence',
  'dashboard-kpi-ongoing-sentence',
  'dashboard-kpi-busiest-sentence',
] as const

test.describe('#640 — « En bref » : 4 phrases de la maquette', () => {
  test('compte vide : 4 phrases lisibles, valeurs à zéro, catégorie « — »', async ({ page }) => {
    await stubProducts(page, [])
    await openDashboard(page)

    for (const testid of SENTENCES) await expect(page.getByTestId(testid)).toBeVisible()
    await expect(page.getByTestId('dashboard-kpi-week-sentence')).toHaveText(
      'Tu as 0 événement cette semaine, dont 0 récurrent.',
    )
    await expect(page.getByTestId('dashboard-kpi-due-sentence')).toHaveText(
      '0 arrive à échéance sous 14 jours.',
    )
    await expect(page.getByTestId('dashboard-kpi-ongoing-sentence')).toHaveText(
      '0 couverture est en cours actuellement.',
    )
    await expect(page.getByTestId('dashboard-kpi-busiest-sentence')).toHaveText(
      'Catégorie la plus chargée ce mois : —.',
    )
    for (const testid of [
      'dashboard-kpi-week',
      'dashboard-kpi-recurring',
      'dashboard-kpi-due-14d',
      'dashboard-kpi-ongoing',
    ]) {
      await expect(page.getByTestId(testid)).toHaveText('0')
    }
    await expect(page.getByTestId('dashboard-kpi-busiest-category')).toHaveText('—')
    // DEC-S82-007 : la « série » n'existe plus.
    await expect(page.getByTestId('dashboard-kpi-marginalia')).not.toContainText(/série/i)
  })

  test('données : compteurs exacts, « cette semaine » égal à la liste voisine', async ({
    page,
  }) => {
    await page.goto('about:blank')
    const today = await browserDay(page, 0)
    const in30 = await browserDay(page, 30)
    const in365 = await browserDay(page, 365)
    const in20 = await browserDay(page, 20)

    const event = (id: string, extra: Record<string, unknown>) => ({
      id: `00000000-0000-7000-8000-0000001080${id}`,
      title: `S108 event ${id}`,
      type: 'single',
      startDate: today,
      endDate: today,
      productId: extra.productId,
      archived: false,
      isRecurring: false,
      recurrenceUnit: null,
      recurrenceEndDate: null,
      color: null,
      ...extra,
    })
    const P1 = '00000000-0000-7000-8000-000000108001'
    const P2 = '00000000-0000-7000-8000-000000108002'
    await stubProducts(page, [
      {
        id: P1,
        name: 'S108 produit A',
        color: null,
        category: { id: '00000000-0000-7000-8000-000000108101', name: 'S108 Alpha', color: null },
        events: [
          // Aujourd'hui, MENSUEL : semaine + récurrent + échéance + 1 occurrence ce mois.
          event('11', { productId: P1, isRecurring: true, recurrenceUnit: 'MONTH' }),
          // Aujourd'hui, ponctuel : semaine + échéance + 1 occurrence ce mois.
          event('12', { productId: P1 }),
          // ARCHIVÉ (BR-EVE-011) : compté nulle part.
          event('13', { productId: P1, archived: true }),
        ],
      },
      {
        id: P2,
        name: 'S108 produit B',
        color: null,
        category: { id: '00000000-0000-7000-8000-000000108102', name: 'S108 Beta', color: null },
        events: [
          // Durée qui COMMENCE aujourd'hui : semaine + échéance + en cours.
          event('21', { productId: P2, type: 'duration', endDate: in30 }),
          // Durée commencée en 2020 : en cours seulement.
          event('22', { productId: P2, type: 'duration', startDate: '2020-01-01', endDate: in365 }),
          // J+20 : hors semaine, hors 14 j. S'il tombe ce mois, Beta égale Alpha (2-2)
          // et l’ex æquo retient « S108 Alpha » (ordre alphabétique) : même résultat.
          event('23', { productId: P2, startDate: in20, endDate: in20 }),
        ],
      },
    ])
    await openDashboard(page)

    await expect(page.getByTestId('dashboard-kpi-week')).toHaveText('3')
    await expect(page.getByTestId('dashboard-kpi-recurring')).toHaveText('1')
    await expect(page.getByTestId('dashboard-kpi-due-14d')).toHaveText('3')
    await expect(page.getByTestId('dashboard-kpi-ongoing')).toHaveText('2')
    await expect(page.getByTestId('dashboard-kpi-busiest-category')).toHaveText('S108 Alpha')
    await expect(page.getByTestId('dashboard-kpi-week-sentence')).toHaveText(
      'Tu as 3 événements cette semaine, dont 1 récurrent.',
    )
    await expect(page.getByTestId('dashboard-kpi-ongoing-sentence')).toHaveText(
      '2 couvertures sont en cours actuellement.',
    )

    // Cohérence exigée : le compteur égale la liste « Cette semaine » rendue à côté.
    await expect(
      page
        .getByTestId('dashboard-week-agenda')
        .locator('[data-testid^="dashboard-week-agenda-row-"]'),
    ).toHaveCount(3)

    // Style maquette : le 2e chiffre (échéances) porte l'accent, pas l'encre des autres.
    const color = (testid: string) =>
      page.getByTestId(testid).evaluate((el) => getComputedStyle(el).color)
    expect(await color('dashboard-kpi-due-14d')).not.toBe(await color('dashboard-kpi-week'))
    // La catégorie est en gras mais PAS en mono ; les chiffres sont en mono.
    const family = (testid: string) =>
      page.getByTestId(testid).evaluate((el) => getComputedStyle(el).fontFamily)
    expect(await family('dashboard-kpi-busiest-category')).not.toBe(
      await family('dashboard-kpi-week'),
    )
  })
})
