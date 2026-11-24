import { expect, test, type Locator, type Page, type Route } from '@playwright/test'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'

/**
 * #209 — TABLEAU DE BORD MOBILE, PORTRAIT ET PAYSAGE (tests seuls, aucun code applicatif).
 *
 * Le comportement existe déjà (#83 tiroir, #85 rail, #208 focus-trap) : ces tests le
 * verrouillent de bout en bout dans un vrai moteur, là où jsdom ne fait ni layout ni
 * focus réel. Chaque cas vérifie UNE phrase validée (T1 et T3 à T14 du ticket ; T2 est
 * `sprint-108-density-ribbon.spec.ts`, inchangé).
 *
 * Portrait = 390 px de large (< 768 : branche `dashboard-mobile-portrait`, tiroir).
 * Paysage = 812×375 (`(orientation: landscape) and (max-height: 500px)` : branche
 * `dashboard-landscape`, rail 64 px).
 *
 * DONNÉES. Le listing `GET /api/users/{userId}/products` est STUBBÉ (motif
 * `sprint-102-touch-targets.spec.ts`) : un produit avec un événement aujourd'hui et un
 * demain, pour que l'agenda et les produits aient du contenu. Compte `SHARED`, session
 * par `storageState`, aucune écriture.
 *
 * DÉCONNEXION (T9). `POST /api/auth/logout` est SIMULÉ : le vrai appel révoquerait le
 * jeton du compte partagé (BR-AUT-010, cf. `support/session.ts`) et rendrait anonymes
 * les specs suivantes. On ne vérifie que le retour sur la page de connexion.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (cf. `playwright.config.ts`).
 */

test.use({ storageState: sessionState(SHARED), hasTouch: true })

const PORTRAIT = { width: 390, height: 844 } as const
const LANDSCAPE = { width: 812, height: 375 } as const
const RAIL_WIDTH = 64
const FIRST_NAV_BUDGET = 60_000

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
const LOGOUT_RE = /\/api\/auth\/logout/

/** Produit + deux événements (aujourd'hui, demain), forme de `productSchema`. */
function seededProducts(): unknown[] {
  const iso = (offset: number): string => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const P = '00000000-0000-7000-8000-000000209001'
  const base = {
    type: 'single',
    archived: false,
    isRecurring: false,
    recurrenceUnit: null,
    recurrenceEndDate: null,
    color: null,
    productId: P,
  }
  return [
    {
      id: P,
      name: 'S209 produit',
      color: null,
      category: { id: '00000000-0000-7000-8000-000000209101', name: 'S209 catégorie', color: null },
      events: [
        {
          ...base,
          id: '00000000-0000-7000-8000-000000209011',
          title: 'S209 aujourd’hui',
          startDate: iso(0),
          endDate: iso(0),
        },
        {
          ...base,
          id: '00000000-0000-7000-8000-000000209012',
          title: 'S209 demain',
          startDate: iso(1),
          endDate: iso(1),
        },
      ],
    },
  ]
}

async function stubProducts(page: Page): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(seededProducts()),
    })
  })
}

/** Ouvre le tableau de bord sur le listing stubbé, une fois les données rendues. */
async function openDashboard(page: Page): Promise<void> {
  await neutralizeDevToolingPointerEvents(page)
  await stubProducts(page)
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard-loading')).toHaveCount(0, { timeout: 30_000 })
}

async function openPortrait(page: Page): Promise<void> {
  await openDashboard(page)
  await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()
}

async function openLandscape(page: Page): Promise<void> {
  await openDashboard(page)
  await expect(page.getByTestId('dashboard-landscape')).toBeVisible()
}

/** Portrait, tiroir ouvert par le bouton menu. */
async function openDrawer(page: Page): Promise<Locator> {
  await openPortrait(page)
  await page.getByTestId('dashboard-mobile-menu-button').tap()
  const drawer = page.getByTestId('dashboard-mobile-drawer')
  await expect(drawer).toBeVisible()
  return drawer
}

/** Largeur du contenu de la page moins la largeur de l'écran (> 0 = défilement horizontal). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return Math.max(doc.scrollWidth, document.body.scrollWidth) - window.innerWidth
  })
}

async function focusIsInside(container: Locator): Promise<boolean> {
  return container.evaluate((el) => el.contains(document.activeElement))
}

async function box(loc: Locator) {
  const b = await loc.boundingBox()
  expect(b, 'élément peint').not.toBeNull()
  return b as { x: number; y: number; width: number; height: number }
}

/* ------------------------------------------------------------------------- */
/* Portrait 390 px                                                            */
/* ------------------------------------------------------------------------- */

test.describe('#209 — tableau de bord portrait (390 px)', () => {
  test.use({ viewport: PORTRAIT })

  test('T1 — la largeur du contenu ne dépasse pas la largeur de l’écran', async ({ page }) => {
    test.setTimeout(120_000)
    await openPortrait(page)
    expect(
      await horizontalOverflow(page),
      'la page ne doit pas défiler horizontalement à 390 px',
    ).toBeLessThanOrEqual(0)
  })

  test('T3 — toucher le bouton menu ouvre le tiroir avec son titre et son bouton fermer', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openPortrait(page)
    await expect(page.getByTestId('dashboard-mobile-drawer')).toHaveCount(0)

    await page.getByTestId('dashboard-mobile-menu-button').tap()

    const drawer = page.getByTestId('dashboard-mobile-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('heading', { name: 'Réglages' })).toBeVisible()
    await expect(drawer.getByTestId('dashboard-mobile-drawer-close')).toBeVisible()
  })

  test('T4 — toucher fermer fait disparaître le tiroir', async ({ page }) => {
    test.setTimeout(120_000)
    const drawer = await openDrawer(page)

    await drawer.getByTestId('dashboard-mobile-drawer-close').tap()

    await expect(page.getByTestId('dashboard-mobile-drawer')).toHaveCount(0)
  })

  test('T5 — toucher le fond assombri fait disparaître le tiroir', async ({ page }) => {
    test.setTimeout(120_000)
    await openDrawer(page)

    // Le panneau occupe min(320 px, 85 vw) à droite : on touche le fond côté gauche.
    await page.getByTestId('dashboard-mobile-drawer-overlay').tap({ position: { x: 10, y: 400 } })

    await expect(page.getByTestId('dashboard-mobile-drawer')).toHaveCount(0)
  })

  test('T6 — Échap fait disparaître le tiroir', async ({ page }) => {
    test.setTimeout(120_000)
    await openDrawer(page)

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('dashboard-mobile-drawer')).toHaveCount(0)
  })

  test('T7 — le bouton menu retrouve le focus quand Échap ferme le tiroir', async ({ page }) => {
    test.setTimeout(120_000)
    await openDrawer(page)
    const drawer = page.getByTestId('dashboard-mobile-drawer')
    // Le focus est passé dans le tiroir : le bouton menu ne l'a plus.
    await expect(page.getByTestId('dashboard-mobile-menu-button')).not.toBeFocused()
    expect(await focusIsInside(drawer)).toBe(true)

    await page.keyboard.press('Escape')

    await expect(drawer).toHaveCount(0)
    await expect(page.getByTestId('dashboard-mobile-menu-button')).toBeFocused()
  })

  test('T8 — Tab puis Maj+Tab gardent le focus dans le tiroir', async ({ page }) => {
    test.setTimeout(120_000)
    const drawer = await openDrawer(page)
    expect(await focusIsInside(drawer), 'focus initial dans le tiroir').toBe(true)

    // Plus de pressions que de contrôles (fermer, langue, thème, déconnexion) : le focus
    // doit boucler dans le tiroir au lieu de sortir vers la page.
    for (let i = 1; i <= 8; i++) {
      await page.keyboard.press('Tab')
      expect(await focusIsInside(drawer), `Tab n°${i} : focus dans le tiroir`).toBe(true)
    }
    for (let i = 1; i <= 8; i++) {
      await page.keyboard.press('Shift+Tab')
      expect(await focusIsInside(drawer), `Maj+Tab n°${i} : focus dans le tiroir`).toBe(true)
    }
  })

  test('T9 — toucher Déconnexion ramène sur /fr/login (appel serveur simulé)', async ({ page }) => {
    test.setTimeout(120_000)
    // Simulé : le vrai logout révoquerait le jeton du compte partagé.
    await page.route(LOGOUT_RE, async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    const drawer = await openDrawer(page)

    await drawer.getByTestId('dashboard-mobile-drawer-logout').tap()

    await expect(page).toHaveURL(/\/fr\/login$/, { timeout: 15_000 })
    await expect(page.getByTestId('login-form')).toBeVisible()
  })
})

/* ------------------------------------------------------------------------- */
/* Paysage 812×375                                                            */
/* ------------------------------------------------------------------------- */

test.describe('#209 — tableau de bord paysage (812×375)', () => {
  test.use({ viewport: LANDSCAPE })

  test('T10 — le rail de 64 px est visible avec Accueil, Produits et Déconnexion', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openLandscape(page)

    const rail = page.getByTestId('dashboard-rail')
    await expect(rail).toBeVisible()
    expect(Math.round((await box(rail)).width)).toBe(RAIL_WIDTH)
    await expect(rail.getByTestId('dashboard-rail-item-home')).toBeVisible()
    await expect(rail.getByTestId('dashboard-rail-item-products')).toBeVisible()
    await expect(rail.getByTestId('dashboard-rail-item-logout')).toBeVisible()
  })

  test('T11 — toucher Accueil dans le rail ouvre la page d’accueil /fr', async ({ page }) => {
    test.setTimeout(120_000)
    await openLandscape(page)

    await page.getByTestId('dashboard-rail-item-home').tap()

    await expect(page).toHaveURL(/\/fr\/?$/, { timeout: 30_000 })
  })

  test('T12 — toucher Produits dans le rail montre la colonne produits sans quitter le tableau de bord', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openLandscape(page)
    const products = page.getByTestId('dashboard-landscape-products')

    await page.getByTestId('dashboard-rail-item-products').tap()
    // Un changement d'adresse ou de rendu est asynchrone (navigation cliente, défilement fluide) :
    // on lui laisse le temps d'avoir lieu avant de constater qu'il n'a pas eu lieu.
    await page.waitForTimeout(4_000)

    // Colonne produits visible et dans la fenêtre ; l'adresse reste celle du tableau de bord.
    await expect(products).toBeVisible()
    await expect(products).toBeInViewport()
    await expect(page).toHaveURL(/\/fr\/dashboard$/)
  })

  test('T13 — agenda à gauche et produits à droite, à la même hauteur, sans défilement horizontal', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openLandscape(page)

    const agenda = await box(page.getByTestId('dashboard-landscape-agenda'))
    const products = await box(page.getByTestId('dashboard-landscape-products'))

    // Côte à côte : l'agenda finit avant que les produits commencent.
    expect(agenda.x + agenda.width, 'agenda à gauche des produits').toBeLessThanOrEqual(
      products.x + 1,
    )
    // Même hauteur : mêmes bords haut et bas.
    expect(Math.abs(agenda.y - products.y), 'même bord haut').toBeLessThanOrEqual(1)
    expect(
      Math.abs(agenda.y + agenda.height - (products.y + products.height)),
      'même bord bas',
    ).toBeLessThanOrEqual(1)
    expect(await horizontalOverflow(page), 'aucun défilement horizontal').toBeLessThanOrEqual(0)
  })
})

/* ------------------------------------------------------------------------- */
/* Bascule d'orientation                                                      */
/* ------------------------------------------------------------------------- */

test.describe('#209 — tableau de bord : bascule portrait, paysage, portrait', () => {
  test.use({ viewport: PORTRAIT })

  test('T14 — portrait, paysage, portrait : pas de rechargement, bonne disposition, rien ne déborde', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openPortrait(page)

    // Marqueur posé dans la page : un rechargement le perdrait. Navigations du cadre principal comptées.
    await page.evaluate(() => {
      ;(window as unknown as { __s209: boolean }).__s209 = true
    })
    let navigations = 0
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations += 1
    })

    const expectPortrait = async (step: string) => {
      await expect(page.getByTestId('dashboard-mobile-portrait'), step).toBeVisible()
      await expect(page.getByTestId('dashboard-mobile-menu-button'), step).toBeVisible()
      await expect(page.getByTestId('dashboard-rail'), step).toHaveCount(0)
      await expect(page.getByTestId('dashboard-landscape'), step).toHaveCount(0)
      expect(await horizontalOverflow(page), `${step} : débordement`).toBeLessThanOrEqual(0)
    }
    const expectLandscape = async (step: string) => {
      await expect(page.getByTestId('dashboard-landscape'), step).toBeVisible()
      await expect(page.getByTestId('dashboard-rail'), step).toBeVisible()
      await expect(page.getByTestId('dashboard-mobile-menu-button'), step).toHaveCount(0)
      await expect(page.getByTestId('dashboard-mobile-portrait'), step).toHaveCount(0)
      expect(await horizontalOverflow(page), `${step} : débordement`).toBeLessThanOrEqual(0)
    }

    await expectPortrait('portrait de départ')
    await page.setViewportSize(LANDSCAPE)
    await expectLandscape('bascule en paysage')
    await page.setViewportSize(PORTRAIT)
    await expectPortrait('retour en portrait')

    expect(navigations, 'aucune navigation du cadre principal').toBe(0)
    expect(
      await page.evaluate(() => (window as unknown as { __s209?: boolean }).__s209),
      'la page n’a pas été rechargée',
    ).toBe(true)
  })
})
