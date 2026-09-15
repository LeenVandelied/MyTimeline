import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #621 (Sprint 92) — TOASTS DE CONFIRMATION SUR LES SURFACES MÉTIER, RENDU DS UNIQUE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT
 * ─────────────────────────────────────────────────────────────────────────────
 * Créer ou modifier un événement refermait le drawer SANS aucun retour. Et deux
 * mécanismes de toast coexistaient : le `ToastBar` par défaut de react-hot-toast
 * (hors DS) et `ui/toast.tsx` (DS, zéro consommateur).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE — et ce qui la fait ROUGIR
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Création (desktop) : un `role="status"` portant « Événement créé » apparaît
 *      dans `#_rht_toaster`, avec la classe DS `.mt-toast--success`. Rougit si le
 *      toast manque, ou s'il est rendu par le `ToastBar` par défaut (pas de `.mt-toast`).
 *   2. Pile : le `z-index` CALCULÉ du conteneur égale `--z-toast` résolu (jeton consommé).
 *   3. Pointeur : le conteneur plein écran `#_rht_toaster` reste en `pointer-events:none`
 *      (rien n'est bloqué hors de la carte) ; la CARTE visible est en `auto` (pause au
 *      survol, WCAG 2.2.1). Rougit si la carte repasse en `none` (pause impossible) ou si
 *      le conteneur se met à capter.
 *   4. Géométrie (desktop) : drawer « Nouvel événement » rouvert PENDANT le toast (mis en
 *      pause par survol), la boîte de la carte n'intersecte pas la cible 44px de la croix
 *      du drawer. Rougit si le décalage haut revient à 16px (carte ≈ 16–62px, cible 12–56px).
 *   5. Modification (desktop, depuis la frise du détail produit) : « Événement modifié ».
 *   6. Mobile (390px) : le toast ne recouvre ni le bouton flottant « Nouvel événement » ni
 *      le hamburger du header du tableau de bord.
 *
 * CE QU'ELLE NE PROUVE PAS : l'annonce réelle par un lecteur d'écran ; l'archivage
 * (couvert unitairement, `TimelineEditHost.test.tsx`) ; produit / catégorie
 * (unitaires `ProductDrawer.test.tsx` / `CategoryDrawer.test.tsx`).
 *
 * FENÊTRE : un toast success vit 4 s (+1 s de retrait). Les assertions suivent
 * immédiatement la réponse réseau ; elles ne dépendent d'aucun délai fixe.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }
const MOBILE_PORTRAIT = { width: 390, height: 844 }

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** Le toast DS portant `text`, cherché DANS l'hôte unique (`#_rht_toaster`). */
function businessToast(page: Page, text: string): Locator {
  return page.locator('#_rht_toaster').getByRole('status').filter({ hasText: text })
}

async function seed(page: Page, label: string) {
  await neutralizeDevToolingPointerEvents(page)
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique(`621 ${label} Cat`))
  const product = await seedProduct(page, {
    userId,
    name: unique(`621 ${label} Prod`),
    categoryId: cat.id,
  })
  return { userId, product }
}

type Box = { x: number; y: number; width: number; height: number }

/** Deux boîtes se chevauchent-elles (bords jointifs = pas de chevauchement) ? */
function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/** Boîte agrandie à la cible tactile minimale (44px, centrée) — cf. `.mt-drawer__close::before`. */
function hitArea(box: Box, min = 44): Box {
  const dw = Math.max(0, min - box.width) / 2
  const dh = Math.max(0, min - box.height) / 2
  return { x: box.x - dw, y: box.y - dh, width: box.width + 2 * dw, height: box.height + 2 * dh }
}

/**
 * Boîte STABILISÉE (PIT-S54-003) : deux lectures consécutives égales. Le drawer formulaire
 * entre en `translateX(28px)` : une lecture prise pendant l'animation serait transitoire.
 */
async function stableBox(locator: Locator): Promise<Box> {
  const reads: { previous: Box | null; stable: Box | null } = { previous: null, stable: null }
  await expect
    .poll(
      async () => {
        const current = await locator.boundingBox()
        const last = reads.previous
        const same =
          current !== null &&
          last !== null &&
          current.x === last.x &&
          current.y === last.y &&
          current.width === last.width &&
          current.height === last.height
        reads.previous = current
        if (same) reads.stable = current
        return same
      },
      { timeout: CLICK_BUDGET },
    )
    .toBe(true)
  if (!reads.stable) throw new Error('boîte non stabilisée')
  return reads.stable
}

/** Remplit le drawer de création (produit + titre) et soumet ; attend le POST 2xx. */
async function createEventThroughDrawer(page: Page, productId: string, title: string) {
  const panel = page.getByTestId('shell-new-event-drawer')
  await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
  await page.getByTestId('shell-new-event-drawer-product-trigger').click({ timeout: CLICK_BUDGET })
  await page.getByTestId(`product-option-${productId}`).click({ timeout: CLICK_BUDGET })
  await page.getByTestId('event-form-title-input').fill(title)

  const created = page.waitForResponse(
    (r) => r.url().includes('/api/events') && r.request().method() === 'POST',
  )
  await page.getByTestId('event-form-submit').click({ timeout: CLICK_BUDGET })
  expect((await created).status(), 'POST /api/events doit créer (2xx)').toBeLessThan(300)
  await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })
}

test.describe('#621 — toasts métier (desktop)', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('création d’un événement : toast DS « Événement créé », au jeton --z-toast, carte captante (conteneur transparent au pointeur) hors de la croix du drawer', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { product } = await seed(page, 'Create')

    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })

    await createEventThroughDrawer(page, product.id, unique('621 Event Desktop'))

    // (1) Le toast existe, rendu par le DS.
    const toast = businessToast(page, 'Événement créé')
    await expect(toast, 'LE DÉFAUT DE #621 : aucune confirmation après création').toBeVisible()
    await expect(toast).toHaveClass(/(^|\s)mt-toast--success(\s|$)/)
    await expect(toast).toHaveAttribute('data-testid', 'app-toast')

    // (2) Pile : z-index calculé du conteneur = `--z-toast` résolu.
    const layers = await page.evaluate(() => {
      const host = document.getElementById('_rht_toaster')
      return {
        computed: host ? getComputedStyle(host).zIndex : null,
        token: getComputedStyle(document.documentElement).getPropertyValue('--z-toast').trim(),
      }
    })
    expect(layers.token, '`--z-toast` doit être défini par le DS').not.toBe('')
    expect(layers.computed, 'le conteneur doit consommer `--z-toast`').toBe(layers.token)

    // (3) Pointeur : conteneur plein écran non bloquant, carte captante (pause au survol).
    const pointer = await toast.evaluate((el) => ({
      card: getComputedStyle(el).pointerEvents,
      host: getComputedStyle(document.getElementById('_rht_toaster') as HTMLElement).pointerEvents,
    }))
    expect(pointer.host, 'le conteneur plein écran ne doit rien capter').toBe('none')
    expect(pointer.card, 'la carte visible capte le pointeur (pause au survol)').toBe('auto')

    // (4) Géométrie : drawer rouvert PENDANT le toast. Le survol suspend le décompte (4 s),
    // donc la mesure ne court pas contre l'expiration.
    await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    await toast.hover({ timeout: CLICK_BUDGET })
    await expect(toast, 'le toast doit encore être affiché pendant la mesure').toBeVisible()

    const close = page.getByTestId('shell-new-event-drawer-close')
    await expect(close).toBeVisible({ timeout: CLICK_BUDGET })
    const closeHit = hitArea(await stableBox(close))
    const cardBox = await stableBox(toast)
    expect(
      intersects(cardBox, closeHit),
      `la carte (${JSON.stringify(cardBox)}) ne doit pas recouvrir la cible de la croix du drawer (${JSON.stringify(closeHit)})`,
    ).toBe(false)
    // Même colonne (bord droit) : sans ce contrôle, un toast parti ailleurs rendrait
    // l'absence d'intersection triviale.
    expect(cardBox.x + cardBox.width).toBeGreaterThan(closeHit.x)

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })
  })

  test('modification d’un événement depuis la frise : toast « Événement modifié »', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { userId, product } = await seed(page, 'Edit')

    const listed = await page.request.get(`/api/users/${userId}/products/${product.id}/events`)
    expect(listed.ok(), `GET events doit réussir (obtenu ${listed.status()})`).toBeTruthy()
    const [seeded] = (await listed.json()) as Array<{ id: string; title: string }>
    expect(seeded?.id, 'événement seedé requis').toBeTruthy()

    await page.goto(`/fr/products/${product.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await page
      .locator(`[data-testid="timeline-event"][data-event-title="${seeded.title}"]`)
      .first()
      .click({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

    const dialog = page.getByTestId('timeline-edit-dialog')
    await expect(dialog).toBeVisible({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-form-title-input').fill(unique('621 Edited'))

    const patched = page.waitForResponse(
      (r) => r.url().includes(`/api/events/${seeded.id}`) && r.request().method() === 'PATCH',
    )
    await page.getByTestId('event-form-submit').click({ timeout: CLICK_BUDGET })
    expect((await patched).status(), 'PATCH /api/events/{id} doit réussir').toBe(200)
    await expect(dialog).toBeHidden({ timeout: CLICK_BUDGET })

    const toast = businessToast(page, 'Événement modifié')
    await expect(toast, 'LE DÉFAUT DE #621 : aucune confirmation après modification').toBeVisible()
    await expect(toast).toHaveClass(/(^|\s)mt-toast--success(\s|$)/)
  })
})

test.describe('#621 — toasts métier (mobile portrait)', () => {
  test.use({ storageState: PROD.storageState, viewport: MOBILE_PORTRAIT })

  test('le toast de création ne recouvre pas le bouton flottant « Nouvel événement »', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const { product } = await seed(page, 'Mobile')

    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    const fab = page.getByTestId('shell-mobile-new-event-button')
    await fab.click({ timeout: CLICK_BUDGET })

    await createEventThroughDrawer(page, product.id, unique('621 Event Mobile'))

    const toast = businessToast(page, 'Événement créé')
    await expect(toast).toBeVisible()
    await expect(fab).toBeVisible()

    const toastBox = await toast.boundingBox()
    const fabBox = await fab.boundingBox()
    expect(toastBox, 'le toast doit avoir une boîte').not.toBeNull()
    expect(fabBox, 'le FAB doit avoir une boîte').not.toBeNull()
    if (!toastBox || !fabBox) return
    expect(
      intersects(toastBox, fabBox),
      `le toast (${JSON.stringify(toastBox)}) ne doit pas recouvrir le FAB (${JSON.stringify(fabBox)})`,
    ).toBe(false)

    // Hamburger du header mobile (44px, 6–50px) : la carte capte le pointeur, elle ne doit
    // pas s'y poser (décalage haut 72px, arbitrage 2026-09-15).
    const hamburger = page.getByTestId('dashboard-mobile-menu-button')
    await expect(hamburger).toBeVisible()
    const hamburgerBox = hitArea(await stableBox(hamburger))
    expect(
      intersects(toastBox, hamburgerBox),
      `le toast (${JSON.stringify(toastBox)}) ne doit pas recouvrir le hamburger (${JSON.stringify(hamburgerBox)})`,
    ).toBe(false)
    // Même colonne : la carte couvre l'abscisse du hamburger (sinon oracle trivial).
    expect(toastBox.x).toBeLessThan(hamburgerBox.x + hamburgerBox.width)
    // Le toast reste dans la largeur du viewport (aucun débordement horizontal).
    expect(toastBox.x).toBeGreaterThanOrEqual(0)
    expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(MOBILE_PORTRAIT.width)
  })
})
