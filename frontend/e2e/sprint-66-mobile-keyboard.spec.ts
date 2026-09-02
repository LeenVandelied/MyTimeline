import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { PROD, SHARED } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #79 (Sprint 66) — ÉVITEMENT DU CLAVIER VIRTUEL DANS LES BOTTOM SHEETS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CETTE SPEC PROUVE — ET SURTOUT CE QU'ELLE NE PROUVE PAS
 * ─────────────────────────────────────────────────────────────────────────────
 * AUCUN moteur d'automatisation n'ouvre un clavier virtuel : ni Playwright, ni
 * jsdom. Le clavier est donc SIMULÉ — on substitue `window.visualViewport` par un
 * faux viewport dont on pilote la hauteur, exactement l'information sur laquelle
 * le code de production s'appuie. Ce que l'on prouve ici est donc :
 *   1. que le panneau RÉAGIT à `visualViewport` (et non à `focus`/`blur`) ;
 *   2. que sa géométrie RÉELLE, mesurée par le moteur de rendu, tient dans la
 *      hauteur visible restante — c'est-à-dire que la rangée d'actions cesse
 *      d'être peinte SOUS le clavier ; c'est LE défaut de l'issue ;
 *   3. que l'aperçu réduit retire bien des champs, et que le formulaire reste
 *      SOUMETTANT (relecture serveur) après un cycle ouverture/fermeture.
 * Ce que l'on ne prouve PAS : que iOS Safari et Android Chrome rapportent les
 * valeurs postulées ici, ni le comportement du scroll simultané sur iOS. Seul un
 * appareil réel en juge (limite assumée, cf. `issue-79-done.md`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRAINTE DE SIMULATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Le hook s'abonne à l'objet `window.visualViewport` PRÉSENT AU MONTAGE de la
 * sheet. La substitution passe donc par `addInitScript` (exécuté avant tout script
 * de la page, à chaque navigation), jamais par un `page.evaluate` post-ouverture
 * qui remplacerait un objet déjà écouté. Le faux viewport DISPATCHE `resize` à
 * chaque mutation : un stub qui muterait la hauteur en silence ferait rougir une
 * implémentation correcte et passer une fausse ([[PIT-S56-002]]).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (401 sur `/api/auth/me`,
 * un 404 signalerait un proxy absent — [[PIT-S62-012]]).
 */

/** Portrait mobile de référence (iPhone 14) — le drawer rend `.mt-sheet` sous 1024 px. */
const MOBILE_PORTRAIT = { width: 390, height: 844 }
/** Réglages mobile : viewport de la spec #87 existante (non-régression de parcours). */
const SETTINGS_PORTRAIT = { width: 375, height: 812 }

/** Hauteur visible restante avec un clavier ~350 px : sous le palier d'aperçu réduit (600). */
const KEYBOARD_OPEN_HEIGHT = 494

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000
const API = '/api'

declare global {
  interface Window {
    /** Installé par `installFakeViewport` : mute la géométrie ET émet `resize`. */
    __mtSetVisualViewport?: (height: number, offsetTop?: number) => void
  }
}

/**
 * Substitue `window.visualViewport` par un faux viewport pilotable, AVANT tout
 * script de page. Il démarre aux dimensions réelles : tant que le test n'appelle
 * pas `__mtSetVisualViewport`, la page se comporte comme un vrai portrait sans
 * clavier (c'est ce qui rend l'assertion « fermé » de départ non triviale).
 */
async function installFakeViewport(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const bus = new EventTarget()
    const state = { height: window.innerHeight, offsetTop: 0 }
    const fake = {
      get height() {
        return state.height
      },
      get width() {
        return window.innerWidth
      },
      get offsetTop() {
        return state.offsetTop
      },
      offsetLeft: 0,
      get pageTop() {
        return state.offsetTop
      },
      pageLeft: 0,
      scale: 1,
      onresize: null,
      onscroll: null,
      addEventListener: bus.addEventListener.bind(bus),
      removeEventListener: bus.removeEventListener.bind(bus),
      dispatchEvent: bus.dispatchEvent.bind(bus),
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake })
    window.__mtSetVisualViewport = (height: number, offsetTop = 0) => {
      state.height = height
      state.offsetTop = offsetTop
      bus.dispatchEvent(new Event('resize'))
    }
  })
}

/** Ouvre le clavier simulé (hauteur visible restante en px). */
async function openKeyboard(page: Page, height = KEYBOARD_OPEN_HEIGHT): Promise<void> {
  await page.evaluate((h) => window.__mtSetVisualViewport?.(h), height)
}

/** Referme le clavier simulé (retour à la hauteur de mise en page). */
async function closeKeyboard(page: Page): Promise<void> {
  await page.evaluate(() => window.__mtSetVisualViewport?.(window.innerHeight))
}

interface ApiEvent {
  id: string
  title: string
}

async function fetchProductEvents(
  request: APIRequestContext,
  userId: string,
  productId: string,
): Promise<ApiEvent[]> {
  const res = await request.get(`${API}/users/${userId}/products/${productId}/events`)
  expect(res.ok(), `GET events doit réussir (obtenu ${res.status()})`).toBeTruthy()
  return (await res.json()) as ApiEvent[]
}

test.describe('#79 — sheet de création : le clavier ne masque plus le formulaire', () => {
  test.use({ storageState: PROD.storageState, viewport: MOBILE_PORTRAIT })

  test('borne la sheet au viewport visible, garde le pied visible et crée l’événement', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await installFakeViewport(page)
    await neutralizeDevToolingPointerEvents(page)

    // Warm-up : `next dev` recompile à froid.
    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })

    // BR-EVE-002 : sans produit, la sheet ne rend aucun formulaire.
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('79 Kbd Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('79 Kbd Prod'),
      categoryId: cat.id,
    })
    await ensureAuthenticated(page)

    // ── Ouverture par le FAB mobile (#455) ──────────────────────────────────
    await page.getByTestId('shell-mobile-new-event-button').click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    // Oracle de CHEMIN : sans `.mt-sheet`, on mesurerait le drawer desktop.
    await expect(panel).toHaveClass(/(^|\s)mt-sheet(\s|$)/)

    const productTrigger = page.getByTestId('shell-new-event-drawer-product-trigger')
    await productTrigger.click({ timeout: CLICK_BUDGET })
    await page.getByTestId(`product-option-${product.id}`).click({ timeout: CLICK_BUDGET })

    const eventTitle = unique('79 Event Clavier')
    await expect(page.getByTestId('event-form')).toBeVisible()
    await page.getByTestId('event-form-title-input').fill(eventTitle)

    // ── État de repos : clavier fermé, pied monté hors du corps défilant ─────
    await expect(panel).toHaveAttribute('data-keyboard', 'closed')
    await expect(panel).not.toHaveAttribute('data-compact', 'true')
    const footer = page.getByTestId('shell-new-event-drawer-footer')
    await expect(footer).toBeVisible()
    await expect(
      footer.getByTestId('event-form-submit'),
      'la rangée d’actions doit être PORTALISÉE dans le pied (hors `.mt-sheet__body`)',
    ).toHaveCount(1)
    await expect(page.getByTestId('event-form-color-input')).toBeVisible()

    // ── Clavier ouvert ───────────────────────────────────────────────────────
    await openKeyboard(page)
    await expect(panel).toHaveAttribute('data-keyboard', 'open')
    await expect(panel).toHaveAttribute('data-compact', 'true')
    // Champ secondaire retiré (BR neutre : `color` reste soumis, cf. relecture serveur).
    await expect(page.getByTestId('event-form-color-input')).toHaveCount(0)
    await expect(page.getByTestId('event-form-recurring-toggle')).toHaveCount(0)

    // LE DÉFAUT DE L'ISSUE, mesuré par le moteur : sans le correctif, le panneau
    // reste ancré au bas des 844 px de mise en page et son pied se peint vers
    // y≈776 — c'est-à-dire DERRIÈRE un clavier qui commence à 494.
    const panelBox = await panel.boundingBox()
    expect(panelBox, 'le panneau doit avoir une boîte').not.toBeNull()
    expect(
      panelBox!.height,
      'la sheet doit être bornée à la hauteur VISIBLE (visualViewport.height), pas à 80vh',
    ).toBeLessThanOrEqual(KEYBOARD_OPEN_HEIGHT + 1)

    const footerBox = await footer.boundingBox()
    expect(footerBox, 'le pied doit avoir une boîte').not.toBeNull()
    expect(
      footerBox!.y + footerBox!.height,
      'le bas du pied doit rester AU-DESSUS du clavier simulé : c’est la condition ' +
        'pour que les boutons d’action restent atteignables pendant la saisie',
    ).toBeLessThanOrEqual(KEYBOARD_OPEN_HEIGHT + 1)
    await expect(footer).toBeInViewport()
    await expect(footer.getByTestId('event-form-submit')).toBeVisible()

    // ── Fermeture : retour intégral (aucun style résiduel) ───────────────────
    await closeKeyboard(page)
    await expect(panel).toHaveAttribute('data-keyboard', 'closed')
    await expect(page.getByTestId('event-form-color-input')).toBeVisible()

    // ── Le formulaire reste SOUMETTANT après le cycle (source de vérité serveur) ─
    const created = page.waitForResponse(
      (r) => r.url().includes('/api/events') && r.request().method() === 'POST',
    )
    await page.getByTestId('event-form-submit').click({ timeout: CLICK_BUDGET })
    expect((await created).status(), 'POST /api/events doit créer (2xx)').toBeLessThan(300)
    await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })

    const events = await fetchProductEvents(page.request, userId, product.id)
    expect(
      events.map((e) => e.title),
      `l'événement « ${eventTitle} » doit exister dans le listing serveur`,
    ).toContain(eventTitle)
  })

  test('soumission DEPUIS le pied, clavier ouvert (le bouton portalisé reste actif)', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await installFakeViewport(page)
    await neutralizeDevToolingPointerEvents(page)

    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('79 Kbd2 Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('79 Kbd2 Prod'),
      categoryId: cat.id,
    })
    await ensureAuthenticated(page)

    await page.getByTestId('shell-mobile-new-event-button').click({ timeout: CLICK_BUDGET })
    await page
      .getByTestId('shell-new-event-drawer-product-trigger')
      .click({ timeout: CLICK_BUDGET })
    await page.getByTestId(`product-option-${product.id}`).click({ timeout: CLICK_BUDGET })
    const eventTitle = unique('79 Event Pied')
    await page.getByTestId('event-form-title-input').fill(eventTitle)

    await openKeyboard(page)
    await expect(page.getByTestId('shell-new-event-drawer')).toHaveAttribute(
      'data-keyboard',
      'open',
    )

    // Le bouton n'est plus un DESCENDANT du `<form>` (portail) : ce clic prouve que
    // l'association par l'attribut `form` soumet réellement, dans un vrai moteur.
    const created = page.waitForResponse(
      (r) => r.url().includes('/api/events') && r.request().method() === 'POST',
    )
    await page
      .getByTestId('shell-new-event-drawer-footer')
      .getByTestId('event-form-submit')
      .click({ timeout: CLICK_BUDGET })
    expect((await created).status()).toBeLessThan(300)

    // Le mode réduit ne doit RIEN retrancher au payload : la couleur par défaut
    // (BR-EVE-009) et `isRecurring=false` (BR-EVE-007) partent bien que leurs
    // champs ne soient pas montés — l'événement existe côté serveur.
    const events = await fetchProductEvents(page.request, userId, product.id)
    expect(events.map((e) => e.title)).toContain(eventTitle)
  })
})

test.describe('#79 — bottom sheet Réglages (suppression de compte)', () => {
  test.use({ storageState: SHARED.storageState, viewport: SETTINGS_PORTRAIT })

  test('la sheet de suppression réagit au clavier et garde son champ visible', async ({ page }) => {
    test.setTimeout(120_000)
    await installFakeViewport(page)
    await neutralizeDevToolingPointerEvents(page)

    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('settings-index')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await page.getByTestId('settings-index-account').click({ timeout: CLICK_BUDGET })
    await page.getByTestId('delete-account-open').click({ timeout: CLICK_BUDGET })

    const sheet = page.getByTestId('delete-account-sheet')
    await expect(sheet).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(sheet).toHaveAttribute('data-keyboard', 'closed')

    // Étape 2 : re-saisie du username (BR-AUT-001) — LA saisie qui ouvre le clavier.
    // On ne confirme JAMAIS la suppression : le compte partagé doit survivre.
    await page.getByTestId('delete-account-continue').click({ timeout: CLICK_BUDGET })
    const usernameField = page.getByTestId('delete-account-username')
    await expect(usernameField).toBeVisible()

    const visibleHeight = 462
    await openKeyboard(page, visibleHeight)
    await expect(sheet).toHaveAttribute('data-keyboard', 'open')

    const sheetBox = await sheet.boundingBox()
    expect(sheetBox).not.toBeNull()
    expect(
      sheetBox!.y + sheetBox!.height,
      'le bas de la sheet doit remonter au-dessus du clavier simulé',
    ).toBeLessThanOrEqual(visibleHeight + 1)
    // Le champ de saisie reste peint dans la zone visible : c'est le défaut couvert.
    await expect(usernameField).toBeInViewport()
    const fieldBox = await usernameField.boundingBox()
    expect(fieldBox!.y + fieldBox!.height).toBeLessThanOrEqual(visibleHeight + 1)

    // NB : `AccountSection` ne câble PAS le slot `footer` du BottomSheet (les boutons
    // vivent dans `DeleteAccountSteps`, partagé avec le Dialog desktop) — le pied
    // n'existe donc pas ici, par décision et non par oubli (cf. issue-79-done.md).
    await expect(page.getByTestId('delete-account-sheet-footer')).toHaveCount(0)

    await closeKeyboard(page)
    await expect(sheet).toHaveAttribute('data-keyboard', 'closed')
    await page.getByTestId('delete-account-sheet-backdrop').click({ timeout: CLICK_BUDGET })
    await expect(sheet).toHaveCount(0)
  })
})
