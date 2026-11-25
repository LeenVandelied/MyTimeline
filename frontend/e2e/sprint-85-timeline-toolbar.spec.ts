import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'

/**
 * #602 (Sprint 85) — Barre d'outils de l'écran Vue Timeline : boutons
 * « Aujourd'hui » et « Nouvel événement » (maquette §D, DEC-S85-003 / 005).
 *
 * CE QUE LES TESTS UNITAIRES NE DISENT PAS. `TimelineView.test.tsx` prouve le
 * câblage (même effet que `T`, un appel au shell), `AppShell.test.tsx` qu'un
 * seul drawer est monté. Mais jsdom n'applique aucune feuille : `hidden
 * md:inline-flex` n'y est qu'une chaîne. Seul un vrai moteur dit (1) qu'un seul
 * déclencheur de création est PEINT sous 768 px, (2) que le drawer ouvert par la
 * barre est bien CELUI du shell, focus rendu au bouton de la barre, (3) que la
 * ligne TODAY revient réellement dans la frise, (4) que la minimap n'est pas
 * écrasée par les deux boutons (défaut MESURÉ pendant #602 : 9 px de large à
 * 1024 px en français, sans aucun débordement pour le trahir).
 *
 * DÉTERMINISME — listing produits STUBBÉ (motif de `sprint-85-timeline-sidebar`) :
 * aucune écriture sur le compte PROD partagé. Événements à ±400 jours : l'étendue
 * de la frise est large, « loin d'aujourd'hui » a un sens.
 *
 * HYDRATATION (PIT-S83-001). `timeline/page.tsx` rend `null` tant que
 * l'utilisateur n'est pas chargé CÔTÉ CLIENT : la frise n'existe jamais dans le
 * HTML serveur, et `data-layout="screen"` prouve un montage React.
 * `waitForToolbarMounted` nomme cette barrière avant tout clic.
 */

test.use({ storageState: sessionState(PROD) })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const PRODUCT_ID = '60200000-0000-4000-8000-000000000001'
const PRODUCTS = [
  {
    id: PRODUCT_ID,
    name: 'S85 Frise barre',
    color: null,
    category: { id: '60210000-0000-4000-8000-000000000001', name: 'S85 Barre', color: '#1D4ED8' },
    events: [-400, 0, 400].map((day, i) => ({
      id: `60220000-0000-4000-8000-00000000000${i}`,
      title: `S85 Barre · ${i + 1}`,
      type: 'single',
      startDate: isoDay(day),
      endDate: isoDay(day),
      productId: PRODUCT_ID,
      color: '#1D4ED8',
      archived: false,
    })),
  },
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

async function waitForToolbarMounted(page: Page): Promise<void> {
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-today-button')).toHaveCount(1)
}

async function gotoTimeline(page: Page, locale = 'fr'): Promise<void> {
  await stubProducts(page)
  await ensureAuthenticated(page)
  await page.goto(`/${locale}/timeline`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()
  await waitForToolbarMounted(page)
}

/** Déclencheurs de création RÉELLEMENT peints (visibles), tous confondus. */
async function paintedCreateTriggers(page: Page): Promise<string[]> {
  const ids = [
    'timeline-new-event',
    'shell-sidebar-new-event-button',
    'shell-mobile-new-event-button',
  ]
  const painted: string[] = []
  for (const id of ids) {
    if (await page.getByTestId(id).isVisible()) painted.push(id)
  }
  return painted
}

/** Centre horizontal de la ligne TODAY relativement à la zone visible de la frise. */
async function todayLineWithinScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scroll = document.querySelector('[data-testid="timeline-scroll"]')
    const badge = document.querySelector('.mt-tlv__today-badge')
    if (!scroll || !badge) return false
    const s = scroll.getBoundingClientRect()
    const b = badge.getBoundingClientRect()
    const cx = b.left + b.width / 2
    return cx >= s.left && cx <= s.right
  })
}

test.describe('#602 /timeline ≥ 768 px — « Nouvel événement » ouvre LE drawer du shell', () => {
  test('1280 px : même drawer (un seul dans le DOM), Échap rend le focus au bouton de la barre', async ({
    page,
  }) => {
    await gotoTimeline(page)
    const create = page.getByTestId('timeline-new-event')
    await expect(create).toBeVisible()
    await expect(create).toHaveText('Nouvel événement')
    await expect(create).toHaveAttribute('aria-haspopup', 'dialog')
    // DEC-S85-003 : ≥ 768 px, il COEXISTE avec le bouton de nav du shell (maquette) ;
    // le FAB n'est pas peint.
    expect(await paintedCreateTriggers(page)).toEqual([
      'timeline-new-event',
      'shell-sidebar-new-event-button',
    ])
    // Dernier élément de la barre (maquette §D), à droite de tous les autres.
    const createBox = (await create.boundingBox())!
    const fullscreenBox = (await page.getByTestId('timeline-fullscreen').boundingBox())!
    expect(createBox.x).toBeGreaterThan(fullscreenBox.x)

    await create.click()
    const drawer = page.getByTestId('shell-new-event-drawer')
    await expect(drawer).toBeVisible()
    // Le MÊME composant que celui du shell (même testid), et un seul.
    await expect(drawer).toHaveCount(1)
    // Le drawer est monté par le shell, HORS de la frise.
    await expect(
      page.getByTestId('timeline-view').getByTestId('shell-new-event-drawer'),
    ).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(create).toBeFocused()
  })

  test('768 px (borne basse du palier) : bouton de barre + bouton de nav, jamais le FAB', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    await gotoTimeline(page)
    expect(await paintedCreateTriggers(page)).toEqual([
      'timeline-new-event',
      'shell-sidebar-new-event-button',
    ])
  })
})

test.describe('#602 /timeline < 768 px — un seul déclencheur peint (le FAB du shell)', () => {
  for (const width of [700, 767]) {
    test(`${width} px (frise desktop) : bouton de barre NON peint, FAB seul`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await gotoTimeline(page)
      // Frise DESKTOP (pas la variante mobile portrait, réservée à ≤ 640 px) :
      // le bouton est dans le DOM, c'est bien le CSS qui le retire.
      await expect(page.getByTestId('timeline-new-event')).toHaveCount(1)
      await expect(page.getByTestId('timeline-new-event')).toBeHidden()
      expect(await paintedCreateTriggers(page)).toEqual(['shell-mobile-new-event-button'])
      // « Aujourd'hui », lui, reste disponible.
      await expect(page.getByTestId('timeline-today-button')).toBeVisible()
    })
  }
})

test.describe('#602 /timeline — « Aujourd’hui »', () => {
  test('après un défilement loin d’aujourd’hui, ramène la ligne TODAY dans la frise', async ({
    page,
  }) => {
    await gotoTimeline(page)
    const today = page.getByTestId('timeline-today-button')
    await expect(today).toHaveText("Aujourd'hui")
    // Centrage initial sur aujourd'hui (#449).
    await expect.poll(() => todayLineWithinScroll(page)).toBe(true)

    // Loin dans le passé : début de l'étendue (≈ 400 jours avant aujourd'hui).
    await page.getByTestId('timeline-scroll').evaluate((el) => {
      el.scrollTo({ left: 0, behavior: 'instant' })
    })
    await expect.poll(() => todayLineWithinScroll(page)).toBe(false)

    await today.click()
    await expect.poll(() => todayLineWithinScroll(page), { timeout: 5_000 }).toBe(true)

    // Et depuis la fin de l'étendue (≈ 400 jours après).
    await page.getByTestId('timeline-scroll').evaluate((el) => {
      el.scrollTo({ left: el.scrollWidth, behavior: 'instant' })
    })
    await expect.poll(() => todayLineWithinScroll(page)).toBe(false)
    await today.click()
    await expect.poll(() => todayLineWithinScroll(page), { timeout: 5_000 }).toBe(true)
  })
})

/**
 * #673 — la minimap quitte la barre pour un pied : la barre ne porte plus de contrôle
 * élastique et doit tenir sur UNE ligne à toute largeur (PIT-S85-002 : un contrôle
 * élastique écrasé ne se voit pas comme un débordement, `scrollWidth` reste juste).
 * On mesure donc aussi la ligne (même centre vertical pour tous les contrôles peints,
 * hauteur de barre d'une seule ligne) et l'absence d'écrasement (aucun contrôle dont le
 * contenu est plus large que sa boîte).
 */
test.describe('#673 /timeline — la barre tient sur une seule ligne sans débordement', () => {
  for (const locale of ['fr', 'de']) {
    test(`${locale}: toolbar stays on one line without overflow from 768 to 1280 px`, async ({
      page,
    }) => {
      for (const width of [768, 900, 1024, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        await gotoTimeline(page, locale)
        const toolbar = page.locator('.mt-tlv__toolbar')
        const m = await toolbar.evaluate((el) => {
          const bar = el.getBoundingClientRect()
          const painted = Array.from(el.children)
            .map((c) => ({ c, r: c.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && r.height > 0)
          return {
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            barHeight: bar.height,
            count: painted.length,
            centers: painted.map(({ r }) => r.top + r.height / 2),
            tallest: Math.max(...painted.map(({ r }) => r.height)),
            // Contrôle écrasé : son contenu dépasse sa boîte.
            crushed: painted
              .filter(({ c }) => c.scrollWidth > c.clientWidth + 1)
              .map(({ c }) => c.getAttribute('data-testid') ?? c.className),
          }
        })
        const at = `${locale} ${width} px`
        expect(m.scrollWidth, `${at} : barre sans débordement`).toBeLessThanOrEqual(m.clientWidth)
        expect(m.crushed, `${at} : aucun contrôle écrasé`).toEqual([])
        expect(
          Math.max(...m.centers) - Math.min(...m.centers),
          `${at} : tous les contrôles sur la même ligne`,
        ).toBeLessThanOrEqual(2)
        // Une seule ligne = hauteur de la barre ≈ contrôle le plus haut + son padding (2 × 8 px)
        // + bordure basse ; une 2e ligne ajouterait au moins une hauteur de contrôle.
        expect(m.barHeight, `${at} : barre d'une seule ligne`).toBeLessThan(m.tallest + 16 + 8)
        const bar = (await toolbar.boundingBox())!
        const create = (await page.getByTestId('timeline-new-event').boundingBox())!
        expect(
          create.x + create.width,
          `${at} : « Nouvel événement » dans la barre`,
        ).toBeLessThanOrEqual(bar.x + bar.width)
        // R5 : la vue d'ensemble n'est plus dans la barre (le correctif #602 n'a plus d'objet).
        await expect(
          toolbar.getByTestId('timeline-minimap'),
          `${at} : minimap hors barre`,
        ).toHaveCount(0)
      }
    })
  }
})

// #624 — Ce describe visait le dashboard, qui ne monte plus de frise (aperçu = ruban).
// La fiche produit est désormais la seule frise INCRUSTÉE : l'invariant DEC-S85-005 y
// est vérifié. Le listing stubbé alimente aussi la fiche (même endpoint).
test.describe('#602 frise incrustée (fiche produit) — SANS les boutons de l’écran (DEC-S85-005)', () => {
  test('ni « Aujourd’hui » ni « Nouvel événement » dans la barre de la frise', async ({ page }) => {
    await stubProducts(page)
    await ensureAuthenticated(page)
    await page.goto(`/fr/products/${PRODUCT_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('product-detail-timeline')).toBeVisible()
    await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'embedded')
    await expect(page.getByTestId('timeline-today-button')).toHaveCount(0)
    await expect(page.getByTestId('timeline-new-event')).toHaveCount(0)
    // Le déclencheur du shell, lui, reste là.
    await expect(page.getByTestId('shell-sidebar-new-event-button')).toBeVisible()
  })
})
