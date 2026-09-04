import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #455 (Sprint 66) — CRÉATION D'ÉVÉNEMENT SOUS 1024 px.
 *
 * LE DÉFAUT COUVERT. Le seul déclencheur de `NewEventDrawer` vivait dans
 * l'`<aside>` `hidden … lg:flex` du shell : sous le palier `lg` il n'était pas
 * rendu, et aucun écran du groupe `(app)` n'en portait de substitut — créer un
 * événement était donc IMPOSSIBLE sur mobile et tablette portrait. Le correctif
 * ajoute un bouton flottant `lg:hidden` dans `AppShell`, câblé sur le MÊME état
 * `showCreate` que le bouton desktop.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE SPEC EST LE SEUL ORACLE
 * ─────────────────────────────────────────────────────────────────────────────
 * `AppShell.test.tsx` couvre le CÂBLAGE, et rien d'autre : jsdom n'applique
 * aucune feuille de style et ne fait aucun layout, donc `lg:hidden` /
 * `hidden lg:flex` y sont inertes et les DEUX boutons y sont toujours dans le
 * DOM. Une assertion RTL sur la chaîne `lg:hidden` verrouille un littéral, pas
 * un rendu (famille [[PIT-S54-002]]). « Visible et actionnable sous 1024 px »
 * ne peut donc être établi que dans un vrai moteur — ici, et aux DEUX bornes du
 * palier : 390 px (le FAB est le seul déclencheur peint) ET 1280 px (le FAB
 * disparaît, le bouton desktop reprend). Un test qui n'exercerait que la borne
 * basse ne distinguerait pas « FAB correctement `lg:hidden` » de « FAB peint
 * partout », c'est-à-dire d'une régression visuelle sur tout le desktop.
 *
 * VIEWPORT PAR `test.use` ET PAS `setViewportSize` : le drawer choisit sa
 * variante (`.mt-sheet` vs `.mt-drawer`) par `useMediaQuery`, et le shell peint
 * son déclencheur par une media-query CSS. La largeur doit être établie AVANT
 * `goto`, sinon on mesurerait le chemin desktop ([[PIT-S63-001]]).
 *
 * ORACLE DE CHEMIN CSS. Ouvrir le panneau ne suffit pas : on vérifie qu'il porte
 * bien `.mt-sheet`. Sans cela un panneau resté en `.mt-drawer` rejouerait le cas
 * desktop et rendrait un vert vide de sens.
 *
 * ASSERTION DE PERSISTANCE. La fermeture de la sheet n'est PAS une preuve de
 * création (elle suit un `onClose` local). On relit donc le listing serveur
 * `GET /api/users/{userId}/products/{productId}/events` — source de vérité
 * indépendante du DOM, comme `sprint-42-events.spec.ts`.
 *
 * PRÉREQUIS RUNTIME : backend Spring + Postgres migré + front Next avec le proxy
 * `/api`. Oracle avant toute autre hypothèse — `401` sur `/api/auth/me` = proxy
 * OK, `404` = proxy absent ([[PIT-S62-012]]).
 */

test.use({ storageState: PROD.storageState })

/** Portrait mobile de référence (iPhone 14). */
const MOBILE_PORTRAIT = { width: 390, height: 844 }
/**
 * Mobile retourné. Largeur 740 et NON 844 depuis #298 (Sprint 73) : le palier du
 * FAB est passé de `lg:hidden` à `md:hidden`, donc 844 tombe désormais dans la
 * plage TABLETTE (768–1023), où c'est la sidebar repliée icon-only qui porte le
 * déclencheur — pas le FAB. 740 reste un paysage réaliste (iPhone SE retourné)
 * et reste sous `md`, ce qui préserve l'intention d'origine du test : « le FAB
 * est atteignable en paysage ». La bascule du palier elle-même est couverte aux
 * quatre bornes par `sprint-73-tablet-sidebar.spec.ts`.
 */
const MOBILE_LANDSCAPE = { width: 740, height: 390 }
/** Desktop : au-dessus de `lg` (1024), la sidebar est dépliée et le FAB absent. */
const DESKTOP = { width: 1280, height: 900 }

/**
 * Budget par action. `actionTimeout` vaut 0 (= illimité) par défaut : sans budget
 * explicite, une cible jamais peinte consommerait tout le timeout du TEST et
 * l'échec ne nommerait pas le chemin manquant ([[PIT-S63-002]]).
 */
const CLICK_BUDGET = 15_000
/** Première navigation après une modification : `next dev` recompile (10-20 s). */
const FIRST_NAV_BUDGET = 60_000

const API = '/api'

interface ApiEvent {
  id: string
  title: string
}

/** Listing serveur des events d'un produit (cookie JWT du storageState, same-origin). */
async function fetchProductEvents(
  request: APIRequestContext,
  userId: string,
  productId: string,
): Promise<ApiEvent[]> {
  const res = await request.get(`${API}/users/${userId}/products/${productId}/events`)
  expect(res.ok(), `GET events doit réussir (obtenu ${res.status()})`).toBeTruthy()
  return (await res.json()) as ApiEvent[]
}

interface Seeded {
  userId: string
  productId: string
  productName: string
}

/**
 * Seede un produit dédié au test (BR-EVE-002 : sans produit, aucun événement
 * n'est créable — le drawer rend alors `shell-new-event-drawer-empty` et il n'y
 * a pas de formulaire à soumettre), puis stabilise l'auth.
 */
async function seedAndAuthenticate(page: Page): Promise<Seeded> {
  await neutralizeDevToolingPointerEvents(page)

  // Warm-up : absorbe la compilation à froid de `next dev` avant les attentes
  // courtes d'`ensureAuthenticated` (qui, elle, tient son budget par défaut une
  // fois la route compilée).
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })

  const userId = await getUserId(page)
  const productName = unique('455 Mobile Prod')
  const cat = await seedCategory(page, unique('455 Mobile Cat'))
  const product = await seedProduct(page, { userId, name: productName, categoryId: cat.id })

  await ensureAuthenticated(page)
  return { userId, productId: product.id, productName }
}

test.describe('#455 — création d’événement sous 1024 px (mobile portrait)', () => {
  test.use({ viewport: MOBILE_PORTRAIT })

  test('le FAB mobile est le seul déclencheur peint et crée réellement l’événement', async ({
    page,
  }) => {
    // Parcours complet (seed API + création UI + relecture serveur) sur un
    // `next dev` qui peut recompiler : budget explicite plutôt qu'un flake.
    test.setTimeout(120_000)

    const { userId, productId } = await seedAndAuthenticate(page)

    // ── Le défaut de #455, exprimé aux deux bords ────────────────────────────
    const desktopTrigger = page.getByTestId('shell-sidebar-new-event-button')
    const mobileTrigger = page.getByTestId('shell-mobile-new-event-button')
    await expect(
      desktopTrigger,
      'Sous 1024 px la sidebar est `hidden lg:flex` : son bouton ne doit pas être peint.',
    ).toBeHidden()
    await expect(
      mobileTrigger,
      "C'est LE défaut de #455 : sans ce bouton, aucun déclencheur de création n'existe " +
        'sous 1024 px et la fonctionnalité est injoignable.',
    ).toBeVisible()

    // Le FAB est `fixed` avec un offset bas exprimé en `calc(--space-6 + safe-area)`.
    // Si cette utilitaire arbitraire ne compilait pas, `bottom` resterait `auto` et
    // le bouton se peindrait au fil du document tout en restant « visible » : la
    // seule assertion de visibilité ne l'attraperait PAS.
    const box = await mobileTrigger.boundingBox()
    expect(box, 'le FAB doit avoir une boîte').not.toBeNull()
    const geometry = await mobileTrigger.evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        position: cs.position,
        bottom: cs.bottom,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      }
    })
    expect(geometry.position).toBe('fixed')
    expect(
      geometry.bottom,
      "`bottom` à `auto` = l'utilitaire arbitraire `bottom-[calc(...)]` n'a pas compilé.",
    ).not.toBe('auto')
    expect(parseFloat(geometry.bottom)).toBeGreaterThan(0)
    // WCAG 2.5.5 : cible tactile >= 44 px (la spec Designer demande 52).
    expect(geometry.width).toBeGreaterThanOrEqual(44)
    expect(geometry.height).toBeGreaterThanOrEqual(44)

    // ── Ouverture : MÊME drawer, variante sheet ─────────────────────────────
    await mobileTrigger.click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    // Un seul panneau : un second état `showCreate` en monterait deux.
    await expect(panel).toHaveCount(1)
    await expect(
      panel,
      'Sous 1024 px le panneau doit rendre la variante `.mt-sheet` (NewEventDrawer : ' +
        "useMediaQuery('(max-width: 1023px)')). S'il porte `.mt-drawer`, la mesure " +
        'porterait sur le chemin DESKTOP.',
    ).toHaveClass(/(^|\s)mt-sheet(\s|$)/)

    // ── Formulaire : produit (BR-EVE-002) + titre (BR-EVE-001) ──────────────
    const productTrigger = page.getByTestId('shell-new-event-drawer-product-trigger')
    await expect(productTrigger).toBeVisible({ timeout: CLICK_BUDGET })
    // Select Radix : ouvrir le trigger puis choisir l'option portalisée.
    await productTrigger.click({ timeout: CLICK_BUDGET })
    await page.getByTestId(`product-option-${productId}`).click({ timeout: CLICK_BUDGET })

    const eventTitle = unique('455 Event Mobile')
    await expect(page.getByTestId('event-form')).toBeVisible()
    await page.getByTestId('event-form-title-input').fill(eventTitle)
    // Le mode create pré-remplit `startDate` (aujourd'hui, BR-EVE-005) et le type
    // `duration` : seul le titre reste à saisir.

    const created = page.waitForResponse(
      (r) => r.url().includes('/api/events') && r.request().method() === 'POST',
    )
    await page.getByTestId('event-form-submit').click({ timeout: CLICK_BUDGET })
    const response = await created
    expect(response.status(), 'POST /api/events doit créer (2xx)').toBeLessThan(300)

    // La sheet se referme (le shell démonte le drawer sur `onClose`).
    await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })

    // ── Persistance côté serveur (source de vérité, hors DOM) ───────────────
    const events = await fetchProductEvents(page.request, userId, productId)
    expect(
      events.map((e) => e.title),
      `l'événement « ${eventTitle} » doit exister dans le listing serveur du produit`,
    ).toContain(eventTitle)
  })
})

test.describe('#455 — mobile paysage (largeur < 768 px depuis #298)', () => {
  test.use({ viewport: MOBILE_LANDSCAPE })

  test('le FAB reste atteignable et ouvre la sheet', async ({ page }) => {
    test.setTimeout(120_000)
    const { productId } = await seedAndAuthenticate(page)

    await expect(page.getByTestId('shell-sidebar-new-event-button')).toBeHidden()
    const mobileTrigger = page.getByTestId('shell-mobile-new-event-button')
    await expect(mobileTrigger).toBeVisible()

    await mobileTrigger.click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(panel).toHaveClass(/(^|\s)mt-sheet(\s|$)/)
    // Le produit seedé est bien proposé : le parcours n'est pas condamné (BR-EVE-002).
    await page
      .getByTestId('shell-new-event-drawer-product-trigger')
      .click({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId(`product-option-${productId}`)).toBeVisible({
      timeout: CLICK_BUDGET,
    })
  })
})

test.describe('#455 — non-régression desktop (>= 1024 px)', () => {
  test.use({ viewport: DESKTOP })

  test('le FAB disparaît et le bouton de la sidebar reprend la main', async ({ page }) => {
    test.setTimeout(120_000)
    await seedAndAuthenticate(page)

    await expect(
      page.getByTestId('shell-mobile-new-event-button'),
      'Au-dessus de `lg`, le FAB doit être `lg:hidden` : sinon il se superposerait à ' +
        "l'écran desktop sur TOUTES les pages du groupe (app).",
    ).toBeHidden()

    const desktopTrigger = page.getByTestId('shell-sidebar-new-event-button')
    await expect(desktopTrigger).toBeVisible()

    // Le chemin desktop reste intact : même drawer, variante latérale `.mt-drawer`.
    await desktopTrigger.click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(panel).toHaveClass(/(^|\s)mt-drawer(\s|$)/)
  })
})
