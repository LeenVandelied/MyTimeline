import { type Locator, type Page, type Route } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { expectAllTouchable, expectClickableBox, expectHitbox } from './support/touch-targets'

/**
 * #837 (Sprint 117) — CIBLES TACTILES RESTANTES : tiroir mobile du tableau de bord et
 * `⋯` de la frise PAYSAGE. Suite de #767 (`sprint-112-touch-targets.spec.ts`).
 *
 * MESURER D'ABORD (PAT-S99-001) : cette spec est l'oracle, les chiffres relevés avant
 * correction sont dans `docs/memory/sprints/sprint-117/issue-837-done.md`.
 *
 * SURFACES :
 *  1. TIROIR (`dashboard-mobile-drawer`, 375 px) : TOUS ses contrôles (fermer,
 *     langue, thème, déconnexion) par requête DOM, profil complet (`expectAllTouchable`).
 *     Le bouton de déconnexion est un `<Button>` sans `size` (cva `h-9` = 36 px) : il
 *     reçoit `TOUCH_TARGET_BUTTON` (`max-md:h-11`). Garde desktop : le même tiroir,
 *     viewport élargi à 1024 px, rend la déconnexion à 36 px (le `max-md:` est inerte).
 *  2. `⋯` DE LA FRISE PAYSAGE (`TimelineMobileLandscape`, 844×390) : la boîte fait 44×44
 *     (`.mt-tlm__evt-more`) mais la lane dense n'en fait que 34 — elle déborde de 5 px de
 *     chaque côté, et la lane SUIVANTE (`position:relative`, plus loin dans le DOM) se
 *     peint par-dessus le débordement bas (PIT-S91-003). `expectClickableBox` sonde 8
 *     points de bord par `elementFromPoint` : la boîte seule ne verrait rien. Mesuré sur
 *     un PONCTUEL (wrap `--pin`, déjà en `z-index:1` depuis #594) ET sur une DURÉE, chacun
 *     suivi d'une lane — sans lane au-dessous la mesure serait vacante.
 *
 * DONNÉES. Tiroir : compte `SHARED`, aucune action (on ne bascule ni thème ni langue,
 * on ne se déconnecte pas). Frise : listing produits STUBBÉ (motif `sprint-91-event-pin`),
 * aucune écriture sur le compte.
 *
 * CE QUE LA SPEC NE PROUVE PAS : deux `⋯` À LA MÊME DATE dans deux lanes paysage
 * adjacentes (pas de 34 px pour deux cibles de 44) se chevauchent forcément de 10 px —
 * limite géométrique de la densité paysage, pas un recouvrement par la lane.
 */

const TOUCH = { tag: '#837' } as const
const BUDGET = 30_000

test.describe('#837 — tiroir mobile du tableau de bord (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 }, storageState: sessionState(SHARED) })

  async function openDrawer(page: Page): Promise<Locator> {
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)
    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: BUDGET })
    const hamburger = page.getByTestId('dashboard-mobile-menu-button')
    const drawer = page.getByTestId('dashboard-mobile-drawer')
    await expect(hamburger).toBeVisible()
    // Ouvrir est IDEMPOTENT : le réessai absorbe un premier clic perdu avant hydratation
    // (motif `sprint-111-theme-toggle-unified`).
    await expect(async () => {
      if (!(await drawer.isVisible())) await hamburger.click()
      await expect(drawer).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: BUDGET })
    return drawer
  }

  test('tous les contrôles du tiroir >= 44×44', async ({ page }) => {
    const drawer = await openDrawer(page)
    await expect(drawer.getByTestId('dashboard-mobile-drawer-logout')).toBeVisible()
    // fermer + déclencheur de langue + bascule de thème + déconnexion.
    await expectAllTouchable('tiroir', drawer, 4, TOUCH)
    // Le déclencheur de langue n'atteint 44 px que par son `::before` (compté par le
    // profil complet) : sa zone CLIQUABLE se prouve à part, un ancêtre pourrait la rogner.
    await expectHitbox(
      'tiroir — langue',
      drawer.getByRole('button', { name: 'Changer de langue' }),
      TOUCH,
    )
  })

  test('desktop : la déconnexion du tiroir garde la hauteur de la cva (36 px)', async ({
    page,
  }) => {
    const drawer = await openDrawer(page)
    // Le tiroir ne s'ouvre que sous 768 px (hamburger `md:hidden`) : on l'élargit APRÈS
    // ouverture pour prouver que `max-md:h-11` ne change rien au-dessus de 768 px.
    await page.setViewportSize({ width: 1024, height: 768 })
    const logout = drawer.getByTestId('dashboard-mobile-drawer-logout')
    await expect(logout).toBeVisible()
    await expect.poll(async () => (await logout.boundingBox())?.height).toBe(36)
  })
})

/* ------------------------------------------------------------------------------- */

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
const PIN_TITLE = 'S117 Ponctuel'
const BAR_TITLE = 'S117 Durée'

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CAT = { id: uuid('83700000', 1), name: 'S117 Cibles', color: '#1D4ED8' }

function product(
  n: number,
  name: string,
  events: Array<{ title: string; type: 'single' | 'duration'; offset: number; days: number }>,
) {
  const id = uuid('83710000', n)
  return {
    id,
    name,
    color: null,
    category: CAT,
    events: events.map((event, i) => ({
      id: uuid('83720000', n * 10 + i),
      title: event.title,
      type: event.type,
      startDate: isoDay(event.offset),
      endDate: isoDay(event.offset + event.days),
      productId: id,
      color: '#1D4ED8',
      archived: false,
    })),
  }
}

/**
 * Ordre des lanes = ordre du listing. Chaque lane mesurée a une lane EN DESSOUS (sinon
 * rien ne pourrait recouvrir son débordement bas). Dates distinctes (+5 j / +20 j) : les
 * deux `⋯` mesurés ne sont pas à l'aplomb l'un de l'autre. Bornes ±400 j : la piste
 * défile horizontalement, la cible peut être amenée hors de la colonne sticky.
 */
const PRODUCTS = [
  product(1, 'S117 Prod pin', [{ title: PIN_TITLE, type: 'single', offset: 5, days: 0 }]),
  product(2, 'S117 Prod barre', [{ title: BAR_TITLE, type: 'duration', offset: 20, days: 1 }]),
  product(3, 'S117 Prod dessous', [{ title: 'S117 Loin', type: 'duration', offset: -60, days: 1 }]),
  product(4, 'S117 Prod bornes', [
    { title: 'S117 Borne passé', type: 'duration', offset: -400, days: 1 },
    { title: 'S117 Borne futur', type: 'duration', offset: 400, days: 1 },
  ]),
]

async function stubProducts(page: Page): Promise<void> {
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

/** `⋯` de l'événement `title` (frère du bouton événement dans `.mt-tlm__evt-wrap`). */
function eventMore(page: Page, title: string): Locator {
  return page
    .locator('.mt-tlm__evt-wrap')
    .filter({ has: page.locator(`[data-event-title="${title}"]`) })
    .getByTestId('timeline-event-more')
}

test.describe('#837 — frise mobile PAYSAGE (844×390) : `⋯` cliquable sur 44×44', () => {
  test.use({ viewport: { width: 844, height: 390 }, storageState: sessionState(SHARED) })

  for (const { name, title } of [
    { name: 'ponctuel', title: PIN_TITLE },
    { name: 'durée', title: BAR_TITLE },
  ] as const) {
    test(`⋯ d’un ${name}, lane suivante en dessous`, async ({ page }) => {
      await neutralizeDevToolingPointerEvents(page)
      await stubProducts(page)
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('timeline-mobile-landscape')).toBeVisible({ timeout: BUDGET })
      await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Mois')
      // Prémisse : la lane paysage fait bien 34 px (sinon il n'y a rien à mesurer).
      const lane = page
        .getByTestId('timeline-resource-row')
        .filter({ has: page.locator(`[data-event-title="${title}"]`) })
      await expect(lane).toHaveCount(1)
      expect((await lane.boundingBox())?.height, 'hauteur de la lane paysage').toBeCloseTo(34, 0)
      await expectClickableBox(`timeline-event-more (${name})`, eventMore(page, title), TOUCH)
    })
  }
})
