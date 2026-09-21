import { type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import {
  getUserId,
  gotoProducts,
  openCategoriesTab,
  seedCategory,
  seedProduct,
  unique,
} from './support/products'

/**
 * #754 (Sprint 101) — CIBLES TACTILES 44 px HORS RÉGLAGES (WCAG 2.5.5), à 375 px.
 *
 * SUITE DE #738 (DEC-S99-001, réglages seulement). Arbitrage ui-design S101 :
 *  - pieds des drawers mobiles et des dialogues de confirmation : croissance RÉELLE
 *    `max-md:h-11` (constante `TOUCH_TARGET_BUTTON`, `src/lib/touchTarget.ts`) ;
 *  - croix de `DialogContent` : 16×16 → 44×44 sous 768 px, coin haut-droit ancré ;
 *  - boutons `size="sm"` des rangées DENSES (listes produits/catégories/archivés,
 *    ruban du dashboard) : cible étendue par pseudo-élément `::before` 44×44
 *    (`TOUCH_TARGET_HITBOX`, PAT-S24-002), sans changer la boîte visible.
 *
 * ORACLES :
 *  1. surfaces spacieuses — la boîte RENDUE (`getBoundingClientRect`) de TOUS les
 *     contrôles du dialog/drawer, liste construite par REQUÊTE DOM (PAT-S99-001) avec
 *     garde anti-vacuité par étape ;
 *  2. rangées denses — la zone CLIQUABLE, pas la taille déclarée du pseudo : on lit
 *     la boîte du `::before`, puis `elementFromPoint` aux 4 coins (1 px à l'intérieur)
 *     de la zone 44×44 centrée sur l'hôte doit désigner l'hôte. Un ancêtre
 *     `overflow:hidden`/`auto` qui rognerait le pseudo (PIT-S41-001) fait rougir.
 *
 * EXEMPTIONS (explicites, et seulement celles-ci) :
 *  - `sr-only` et `aria-hidden="true"` : jamais ciblés au doigt (select natif
 *    « bulle » de Radix Select dans un `<form>`, input `sr-only`) ;
 *  - poignée des bottom sheets (`*-grabber`, DEC-S99-002) ;
 *  - `timeline/TimelineView.tsx` `timeline-new-event` : `hidden md:inline-flex`,
 *    jamais peint sous 768 px (non mesuré ici, il n'existe pas à l'écran).
 *
 * DESKTOP (1280×800) : hauteurs d'AVANT #754 (cva `h-9` = 36, `sm` = 32, croix 16×16,
 * aucun pseudo peint) — un `max-md:` devenu utilitaire nu ferait rougir.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const MIN_TARGET = 44
/** Tolérance sous-pixel : `h-11` = 2.75rem = 44 px exacts à dpr 1. */
const EPS = 0.01
const MOBILE = { width: 375, height: 812 } as const
const DESKTOP = { width: 1280, height: 800 } as const
const BUDGET = 15_000
const API = '/api'

interface Measured {
  label: string
  width: number
  height: number
}

/** Mesure TOUS les contrôles interactifs visibles sous `root` (motif PAT-S99-001). */
async function measureControls(root: Locator): Promise<Measured[]> {
  return root.evaluate((el) => {
    const SELECTOR = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'textarea',
      'select',
      '[role="button"]',
      '[role="combobox"]',
      '[role="option"]',
      '[role="switch"]',
      '[role="checkbox"]',
      // `ui/switch.tsx` : l'input est à 0×0 (opacity 0), la cible visible est le label.
      'label.mt-switch',
    ].join(',')
    const isExempt = (node: Element): boolean =>
      node.classList.contains('sr-only') ||
      node.closest('[aria-hidden="true"]') !== null ||
      (node.getAttribute('data-testid') ?? '').endsWith('-grabber')
    const nodes = [el, ...Array.from(el.querySelectorAll(SELECTOR))].filter((n) =>
      n.matches(SELECTOR),
    )
    return nodes
      .filter((n) => !isExempt(n))
      .map((n) => {
        const r = n.getBoundingClientRect()
        const style = getComputedStyle(n)
        // Cible étendue par `::before` (TOUCH_TARGET_HITBOX) : la taille EFFECTIVE est
        // celle du pseudo. Sa zone réellement cliquable (non rognée) est prouvée à part
        // par `expectHitbox` sur chaque cible concernée.
        const pseudo = getComputedStyle(n, '::before')
        const extended = pseudo.content !== 'none' && pseudo.position === 'absolute'
        const text = (n.textContent ?? '').trim().slice(0, 30)
        const label =
          n.getAttribute('data-testid') ?? n.getAttribute('aria-label') ?? (text || n.tagName)
        return {
          label: `${n.tagName.toLowerCase()}[${label}]${extended ? '(::before)' : ''}`,
          width: extended ? Math.max(r.width, parseFloat(pseudo.width) || 0) : r.width,
          height: extended ? Math.max(r.height, parseFloat(pseudo.height) || 0) : r.height,
          visible:
            r.width > 0 &&
            r.height > 0 &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            style.display !== 'none',
        }
      })
      .filter((m) => m.visible)
      .map(({ label, width, height }) => ({ label, width, height }))
  })
}

function report(step: string, measured: Measured[]): void {
  const rows = measured.map((m) => `${m.label}=${Math.round(m.width)}x${m.height.toFixed(1)}`)
  console.log(`[#754 ${step}] ${rows.join(' | ')}`)
}

/** Au moins `min` contrôles mesurés (anti-vacuité), chacun >= 44×44. */
async function expectAllTouchable(step: string, root: Locator, min: number): Promise<void> {
  const measured = await measureControls(root)
  report(step, measured)
  expect
    .soft(measured.length, `${step} : nombre de contrôles mesurés (garde anti-vacuité)`)
    .toBeGreaterThanOrEqual(min)
  const undersized = measured.filter(
    (m) => m.height < MIN_TARGET - EPS || m.width < MIN_TARGET - EPS,
  )
  expect.soft(undersized, `${step} : contrôles sous 44×44 px`).toEqual([])
}

interface HitboxMeasure {
  content: string
  pseudoWidth: number
  pseudoHeight: number
  host: string
  /** Coins de la zone 44×44 où `elementFromPoint` désigne l'hôte (4 attendus). */
  cornersHit: boolean[]
  /** Nœud touché au centre puis aux 4 coins — diagnostic d'un coin rogné. */
  debug: string[]
}

/**
 * Zone cliquable d'une cible dense : boîte du `::before` + preuve par
 * `elementFromPoint` aux 4 coins de la zone 44×44 centrée sur l'hôte. Le pseudo
 * est attribué à l'hôte par le hit-testing : un coin qui désigne l'hôte HORS de
 * sa boîte visible ne peut venir que du pseudo, et un ancêtre qui le rogne
 * (PIT-S41-001) fait désigner autre chose.
 */
async function measureHitbox(target: Locator): Promise<HitboxMeasure> {
  // `behavior: 'instant'` : un `scroll-behavior: smooth` hérité animerait le
  // défilement et la mesure lirait une position intermédiaire (hors viewport).
  await target.evaluate((el) =>
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  )
  await expect
    .poll(() => target.evaluate((el) => el.getBoundingClientRect().bottom <= window.innerHeight))
    .toBe(true)
  return target.evaluate((el, size) => {
    const host = el.getBoundingClientRect()
    const pseudo = getComputedStyle(el, '::before')
    const cx = host.left + host.width / 2
    const cy = host.top + host.height / 2
    const half = size / 2 - 1
    const corners: Array<[number, number]> = [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx - half, cy + half],
      [cx + half, cy + half],
    ]
    return {
      content: pseudo.content,
      pseudoWidth: parseFloat(pseudo.width) || 0,
      pseudoHeight: parseFloat(pseudo.height) || 0,
      host: `${host.width.toFixed(1)}x${host.height.toFixed(1)}`,
      cornersHit: corners.map(([x, y]) => {
        const hit = document.elementFromPoint(x, y)
        return hit !== null && (hit === el || el.contains(hit))
      }),
      debug: [[cx, cy], ...corners].map(([x, y]) => {
        const hit = document.elementFromPoint(x, y)
        return `${Math.round(x)},${Math.round(y)}:${hit ? hit.tagName + '.' + (hit.getAttribute('class') ?? '').slice(0, 40) + '#' + (hit.getAttribute('data-testid') ?? '') : 'null'}`
      }),
    }
  }, MIN_TARGET)
}

async function expectHitbox(label: string, target: Locator): Promise<void> {
  await expect(target).toBeVisible({ timeout: BUDGET })
  const m = await measureHitbox(target)
  console.log(
    `[#754 hitbox ${label}] hôte=${m.host} ::before=${m.pseudoWidth}x${m.pseudoHeight} coins=${m.cornersHit.join(',')}${m.cornersHit.every(Boolean) ? '' : ` — nœuds touchés (centre puis coins) : ${m.debug.join(' ; ')}`}`,
  )
  expect.soft(m.pseudoWidth, `${label} : largeur du ::before`).toBeGreaterThanOrEqual(MIN_TARGET)
  expect.soft(m.pseudoHeight, `${label} : hauteur du ::before`).toBeGreaterThanOrEqual(MIN_TARGET)
  expect
    .soft(m.cornersHit, `${label} : zone 44×44 cliquable aux 4 coins (hôte ${m.host})`)
    .toEqual([true, true, true, true])
}

/** Le dialog Radix qui contient `testId`. */
function dialogWith(page: Page, testId: string): Locator {
  return page.locator('[role="dialog"]').filter({ has: page.getByTestId(testId) })
}

/** Révèle le bouton « réinitialiser la couleur » (rendu seulement si une pastille est choisie). */
async function pickFirstSwatch(dialog: Locator, prefix: 'product' | 'category'): Promise<void> {
  await dialog.locator(`[data-testid^="${prefix}-swatch-"]`).first().click({ timeout: BUDGET })
}

interface ApiEvent {
  id: string
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

/**
 * Détail produit → `EventEditForm`. Desktop : pastille → `EventDrawer` → « Éditer ».
 * Portrait mobile : la pastille ouvre une sheet en LECTURE SEULE ; l'édition passe
 * par « ⋯ » (`timeline-event-more`) puis la feuille d'actions (cf.
 * `sprint-63-de-overflow-audit.spec.ts`).
 */
async function openEventEditForm(page: Page, productId: string, mobile: boolean): Promise<void> {
  await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: 30_000 })
  if (mobile) {
    await page.getByTestId('timeline-event-more').first().click({ timeout: BUDGET })
    await page.getByTestId('timeline-actionsheet-edit').click({ timeout: BUDGET })
  } else {
    await page.getByTestId('timeline-event').first().click({ timeout: BUDGET })
    await page.getByTestId('event-drawer-edit').click({ timeout: BUDGET })
  }
  await expect(page.getByTestId('event-form')).toBeVisible({ timeout: BUDGET })
}

test.describe('#754 — drawers et dialogues mobiles (375 px) : cibles >= 44 px', () => {
  test.use({ viewport: MOBILE, storageState: PROD.storageState })

  test('ProductDrawer (création puis édition), archivage, restauration', async ({ page }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S101 Touch Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S101 Touch Prod'),
      categoryId: cat.id,
    })

    // Création : champs + pastilles + « réinitialiser la couleur » + pied + croix.
    await gotoProducts(page)
    await page.getByTestId('products-new-button').click({ timeout: BUDGET })
    const create = dialogWith(page, 'product-drawer-form')
    await expect(create).toBeVisible({ timeout: BUDGET })
    await pickFirstSwatch(create, 'product')
    await expect(create.getByRole('button', { name: 'Réinitialiser' })).toBeVisible()
    // croix + nom + catégorie + pastilles + reset + date + annuler + créer.
    await expectAllTouchable('ProductDrawer (création)', create, 10)
    await page.keyboard.press('Escape')
    await expect(create).toBeHidden({ timeout: BUDGET })

    // Rangée dense de la liste : icônes éditer / archiver (pseudo-hitbox).
    await expectHitbox('products-edit', page.getByTestId(`products-edit-${product.id}`))
    await expectHitbox('products-archive', page.getByTestId(`products-archive-${product.id}`))
    // Review S101 — deux zones 44×44 VOISINES ne doivent pas se toucher : l'icône
    // « archiver », peinte après, capterait sinon le bord de « éditer ». Zones
    // centrées sur leur hôte ⇒ écart entre zones = entraxe − 44. Avec `gap-1` il
    // valait 0 (bord à bord) ; on exige un dégagement franc de 2 px au moins.
    const centerX = (id: string) =>
      page
        .getByTestId(id)
        .evaluate((el) => el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2)
    const pitch =
      (await centerX(`products-archive-${product.id}`)) -
      (await centerX(`products-edit-${product.id}`))
    console.log(`[#754 hitbox products-edit/archive] entraxe=${pitch.toFixed(1)} px`)
    expect(
      pitch - MIN_TARGET,
      'dégagement entre les zones éditer / archiver',
    ).toBeGreaterThanOrEqual(2)

    // Édition : + « Archiver » en pied.
    await page.getByTestId(`products-edit-${product.id}`).click({ timeout: BUDGET })
    const edit = dialogWith(page, 'product-drawer-form')
    await expect(edit.getByTestId('product-drawer-archive')).toBeVisible({ timeout: BUDGET })
    await expectAllTouchable('ProductDrawer (édition)', edit, 6)

    // Archivage : DeleteConfirmDialog (variante archive), confirmé pour atteindre la restauration.
    await edit.getByTestId('product-drawer-archive').click({ timeout: BUDGET })
    const archive = dialogWith(page, 'delete-confirm-button')
    await expect(archive).toBeVisible({ timeout: BUDGET })
    await expectAllTouchable('DeleteConfirmDialog (archivage produit)', archive, 3)
    await archive.getByTestId('delete-confirm-button').click({ timeout: BUDGET })
    await expect(archive).toBeHidden({ timeout: BUDGET })

    // Onglet Archivés : bouton « Désarchiver » de la table dense, puis RestoreProductDialog.
    await page.keyboard.press('Escape')
    await page
      .getByTestId('products-tabs')
      .getByRole('tab', { name: 'Archivés' })
      .click({ timeout: BUDGET })
    const restore = page.getByTestId(`products-archived-restore-${product.id}`)
    await expectHitbox('products-archived-restore', restore)
    await restore.click({ timeout: BUDGET })
    const restoreDialog = page.getByTestId('product-restore-confirm')
    await expect(restoreDialog).toBeVisible({ timeout: BUDGET })
    // croix + annuler + confirmer.
    await expectAllTouchable('RestoreProductDialog', restoreDialog, 3)
    await page.getByTestId('product-restore-cancel').click({ timeout: BUDGET })
  })

  test('CategoryDrawer (création puis édition) et suppression', async ({ page }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)
    const cat = await seedCategory(page, unique('S101 Touch Cat'))
    await openCategoriesTab(page)

    await page.getByTestId('categories-new-button').click({ timeout: BUDGET })
    const create = page.getByTestId('category-drawer')
    await expect(create).toBeVisible({ timeout: BUDGET })
    await pickFirstSwatch(create, 'category')
    await expect(create.getByRole('button', { name: 'Réinitialiser' })).toBeVisible()
    // croix + nom + pastilles + reset + description + annuler + créer.
    await expectAllTouchable('CategoryDrawer (création)', create, 10)
    await page.keyboard.press('Escape')
    await expect(create).toBeHidden({ timeout: BUDGET })

    // Rangée dense : icône de suppression (pseudo-hitbox).
    await expectHitbox('categories-delete', page.getByTestId(`categories-delete-${cat.id}`))

    await page.getByTestId(`categories-card-${cat.id}`).click({ timeout: BUDGET })
    const edit = page.getByTestId('category-drawer')
    await expect(edit.getByTestId('category-delete-button')).toBeVisible({ timeout: BUDGET })
    await expectAllTouchable('CategoryDrawer (édition)', edit, 6)
    await page.keyboard.press('Escape')
    await expect(edit).toBeHidden({ timeout: BUDGET })

    await page.getByTestId(`categories-delete-${cat.id}`).click({ timeout: BUDGET })
    const del = dialogWith(page, 'delete-confirm-button')
    await expect(del).toBeVisible({ timeout: BUDGET })
    await expectAllTouchable('DeleteConfirmDialog (catégorie)', del, 3)
  })

  test('drawer de création d’événement (FAB) et lien « Ouvrir la frise »', async ({ page }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await ensureAuthenticated(page)
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S101 Touch Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S101 Touch Prod'),
      categoryId: cat.id,
    })

    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: BUDGET })
    // Ruban : « Ouvrir la frise », `size="sm"` dans la rangée d'en-tête (pseudo-hitbox).
    await expectHitbox('dashboard-open-timeline', page.getByTestId('dashboard-open-timeline'))

    await page.getByTestId('shell-mobile-new-event-button').click({ timeout: BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: BUDGET })
    await page.getByTestId('shell-new-event-drawer-product-trigger').click({ timeout: BUDGET })
    await page.getByTestId(`product-option-${product.id}`).click({ timeout: BUDGET })
    await expect(page.getByTestId('event-form')).toBeVisible({ timeout: BUDGET })
    await expect(page.getByTestId('event-form-submit')).toBeVisible({ timeout: BUDGET })
    await expectAllTouchable('NewEventDrawer (création)', panel, 6)
    // Case « récurrent » 16×16 : zone tactile par pseudo, non rognée par la sheet.
    await expectHitbox(
      'event-form-recurring-toggle',
      page.getByTestId('event-form-recurring-toggle'),
    )
  })

  test('édition d’événement : pied, confirmation d’archivage, conflit 409', async ({ browser }) => {
    test.setTimeout(150_000)
    const ctxA = await browser.newContext({ storageState: PROD.storageState, viewport: DESKTOP })
    const ctxB = await browser.newContext({ storageState: PROD.storageState, viewport: MOBILE })
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()
    try {
      await neutralizeDevToolingPointerEvents(pageB)
      const userId = await getUserId(pageA)
      const cat = await seedCategory(pageA, unique('S101 Touch Cat'))
      const product = await seedProduct(pageA, {
        userId,
        name: unique('S101 Touch Prod'),
        categoryId: cat.id,
      })
      const [seeded] = await fetchProductEvents(pageA.request, userId, product.id)
      expect(seeded?.id, 'event seedé requis').toBeTruthy()

      await openEventEditForm(pageB, product.id, true)
      const submit = pageB.getByTestId('event-form-submit')
      await expect(submit).toBeVisible({ timeout: BUDGET })
      const editDialog = pageB
        .locator('[role="dialog"]')
        .filter({ has: pageB.getByTestId('event-form') })
      // Pied en portail (supprimer + annuler + enregistrer) + champs + croix.
      await expectAllTouchable('EventEditForm (édition)', editDialog, 6)
      await expectHitbox(
        'event-form-archived-toggle (label)',
        pageB.getByTestId('event-form-archived-toggle').locator('xpath=ancestor::label[1]'),
      )

      // Confirmation d'archivage : cocher le toggle (surface visible = label parent).
      await pageB
        .getByTestId('event-form-archived-toggle')
        .locator('xpath=ancestor::label[1]')
        .click({ timeout: BUDGET })
      const archive = pageB.getByTestId('event-archive-confirm')
      await expect(archive).toBeVisible({ timeout: BUDGET })
      // croix + annuler + confirmer.
      await expectAllTouchable('ArchiveConfirmDialog', archive, 3)
      await pageB.getByTestId('event-archive-cancel').click({ timeout: BUDGET })
      await expect(archive).toHaveCount(0)

      // Conflit : A sauvegarde d'abord, B (version périmée) reçoit le 409.
      await openEventEditForm(pageA, product.id, false)
      const patchA = pageA.waitForResponse(
        (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
      )
      await pageA.getByTestId('event-form-title-input').fill(unique('S101 Titre A'))
      await pageA.getByTestId('event-form-submit').click({ timeout: BUDGET })
      expect((await patchA).status(), 'PATCH A doit réussir').toBe(200)

      const patchB = pageB.waitForResponse(
        (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
      )
      await pageB.getByTestId('event-form-title-input').fill(unique('S101 Titre B'))
      await submit.click({ timeout: BUDGET })
      expect((await patchB).status(), 'PATCH B concurrent doit renvoyer 409').toBe(409)
      const conflict = pageB.getByTestId('event-form-conflict')
      await expect(conflict).toBeVisible({ timeout: BUDGET })
      // croix + prendre la version serveur + garder la mienne.
      await expectAllTouchable('ConflictDialog (comparatif)', conflict, 3)
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })
})

/**
 * Rendu DESKTOP inchangé (1280×800) : hauteurs d'avant #754. Cva `h-9` = 36,
 * `sm` = `h-8` = 32, croix 16×16, et AUCUN pseudo peint sur les cibles denses
 * (`content: none` : le `max-md:before:content-['']` ne s'applique pas).
 */
test.describe('#754 — desktop (1280×800) : géométrie inchangée', () => {
  test.use({ viewport: DESKTOP, storageState: PROD.storageState })

  test('DeleteConfirmDialog 36 px + croix 16×16, cibles denses 32 px sans pseudo', async ({
    page,
  }) => {
    await neutralizeDevToolingPointerEvents(page)
    const cat = await seedCategory(page, unique('S101 Desk Cat'))
    await openCategoriesTab(page)
    const denseDelete = page.getByTestId(`categories-delete-${cat.id}`)
    await expect(denseDelete).toBeVisible({ timeout: BUDGET })
    expect.soft((await denseDelete.boundingBox())!.height).toBe(32)
    expect
      .soft(await denseDelete.evaluate((el) => getComputedStyle(el, '::before').content))
      .toBe('none')

    await denseDelete.click({ timeout: BUDGET })
    const dialog = dialogWith(page, 'delete-confirm-button')
    await expect(dialog).toBeVisible({ timeout: BUDGET })
    expect.soft((await dialog.getByTestId('delete-confirm-button').boundingBox())!.height).toBe(36)
    expect
      .soft((await dialog.getByRole('button', { name: 'Annuler' }).boundingBox())!.height)
      .toBe(36)
    const close = await dialog.getByRole('button', { name: 'Close' }).boundingBox()
    expect(close).not.toBeNull()
    expect.soft(close!.width).toBe(16)
    expect.soft(close!.height).toBe(16)
  })

  test('ProductDrawer : pied 36 px, croix 16×16', async ({ page }) => {
    await neutralizeDevToolingPointerEvents(page)
    await gotoProducts(page)
    await page.getByTestId('products-new-button').click({ timeout: BUDGET })
    const dialog = dialogWith(page, 'product-drawer-form')
    await expect(dialog).toBeVisible({ timeout: BUDGET })
    expect.soft((await dialog.getByTestId('product-submit').boundingBox())!.height).toBe(36)
    const close = await dialog.getByRole('button', { name: 'Close' }).boundingBox()
    expect(close).not.toBeNull()
    expect.soft(close!.width).toBe(16)
    expect.soft(close!.height).toBe(16)
  })
})
