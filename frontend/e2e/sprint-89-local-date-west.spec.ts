import type { Page } from '@playwright/test'
import { test, expect } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { getUserId, gotoProducts, seedCategory, seedProduct, unique } from './support/products'
import { revealSeededLane } from './support/timeline-lanes'

/**
 * #652 — Une `LocalDate` s'affiche au BON jour civil à l'ouest de Greenwich.
 *
 * LE DÉFAUT : `new Date("2026-06-24")` est lue en UTC ; à New York (UTC−4/−5)
 * minuit UTC tombe la VEILLE au soir, et chaque écran qui relisait `startDate`
 * ainsi affichait le 23. Invisible en CI (UTC) et depuis Paris (à l'est) : seul
 * un `timezoneId` négatif le rend observable. Correctif : `parseLocalDate`
 * (`src/lib/date-iso.ts`), lecture à minuit LOCAL.
 *
 * CE QUE LA SPEC PROUVE, écran par écran (même événement semé) : l'attribut
 * `datetime` ET le libellé visible nomment le jour civil semé — tableau de bord
 * (liste produits), liste Produits (dernière activité), détail produit
 * (historique), frise (drawer de la pastille).
 *
 * NON-VACANCE, vérifiée DANS le navigateur avant toute assertion : l'offset est
 * positif et la lecture naïve `new Date(iso)` y recule bien d'un jour. Si
 * l'émulation de fuseau tombait, la spec échouerait là, pas en vert silencieux.
 *
 * CE QU'ELLE NE PROUVE PAS : la géométrie fine de la frise (colonne exacte de
 * la pastille) — couverte en unitaire (`src/lib/date-iso.local-date.test.tsx`).
 *
 * Budget rate-limit : AUCUN register/login/reset ajouté (compte PROD,
 * `storageState` partagé).
 */

const WEST_TZ = 'America/New_York'

test.use({ storageState: PROD.storageState, timezoneId: WEST_TZ })

/**
 * Jour civil de test = aujourd'hui + 3 jours À NEW YORK : futur (« prochain
 * événement » du tableau de bord) et proche d'aujourd'hui (la pastille reste dans
 * la zone initialement rendue de la frise).
 */
function civilDateInWestTz(offsetDays: number): string {
  // `en-CA` formate en `YYYY-MM-DD`.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WEST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(Date.now() + offsetDays * 86_400_000)
}

/** Libellé attendu, calculé HORS fuseau (UTC épinglé sur le jour civil). */
function label(iso: string, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('fr', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}

async function assertWestTimezoneIsActive(page: Page, iso: string): Promise<void> {
  const probe = await page.evaluate((value) => {
    const [y, m, d] = value.split('-').map(Number)
    return {
      offset: new Date(y, m - 1, d).getTimezoneOffset(),
      naive: new Date(value).getDate(),
      civil: d,
    }
  }, iso)
  expect(probe.offset, 'fuseau navigateur à l’OUEST de Greenwich').toBeGreaterThan(0)
  expect(probe.naive, 'la lecture naïve `new Date(iso)` recule bien d’un jour ici').not.toBe(
    probe.civil,
  )
}

test.describe('#652 — LocalDate affichée au jour civil sous America/New_York', () => {
  test('tableau de bord, liste Produits, détail produit et frise nomment le même jour', async ({
    page,
  }) => {
    const civil = civilDateInWestTz(3)
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('TZ Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('TZ Prod'),
      categoryId: cat.id,
      eventDate: civil,
    })

    // Source de vérité : le backend a bien persisté CE jour civil. Sans ce contrôle,
    // un seed décalé se déguiserait en défaut d'affichage (ou le masquerait).
    const res = await page.request.get(`/api/users/${userId}/products/${product.id}/events`)
    expect(res.ok(), `GET events doit réussir (obtenu ${res.status()})`).toBeTruthy()
    const events = (await res.json()) as Array<{ id: string; startDate: string }>
    expect(events).toHaveLength(1)
    expect(events[0].startDate).toBe(civil)
    const eventId = events[0].id

    // --- Tableau de bord (desktop : ProductList) --------------------------------
    await ensureAuthenticated(page)
    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dashboard')).toBeVisible()
    await assertWestTimezoneIsActive(page, civil)
    const dashTime = page.getByTestId(`dashboard-product-list-row-${product.id}`).locator('time')
    await expect(dashTime).toHaveAttribute('datetime', civil)
    await expect(dashTime).toHaveText(label(civil, { day: 'numeric', month: 'short' }))

    // --- Liste Produits (prochain événement, date ISO depuis #603) ---------------
    await gotoProducts(page)
    const listTime = page.getByTestId(`products-row-next-${product.id}`).locator('time')
    await expect(listTime).toHaveAttribute('datetime', civil)
    await expect(listTime).toHaveText(civil)

    // --- Détail produit (historique) --------------------------------------------
    await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('product-detail-view')).toBeVisible()
    const historyTime = page.getByTestId(`product-detail-history-row-${eventId}`).locator('time')
    await expect(historyTime).toHaveAttribute('datetime', civil)
    await expect(historyTime).toHaveText(
      label(civil, { day: 'numeric', month: 'short', year: 'numeric' }),
    )

    // --- Frise : drawer de la pastille ------------------------------------------
    // Même séquence que `gotoTimeline` (timeline.spec.ts) : auth stabilisée AVANT goto.
    await ensureAuthenticated(page)
    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    await revealSeededLane(page, { category: cat.name, product: product.name })
    const pill = page.locator(`[data-testid="timeline-event"][data-event-title="${product.name}"]`)
    await expect(pill).toBeVisible()
    await pill.click()
    const drawerTimes = page.getByTestId('timeline-drawer').locator('time')
    await expect(drawerTimes).toHaveCount(2)
    const medium = label(civil, { dateStyle: 'medium' })
    for (const time of await drawerTimes.all()) {
      await expect(time).toHaveAttribute('datetime', civil)
      await expect(time).toHaveText(medium)
    }
  })
})
