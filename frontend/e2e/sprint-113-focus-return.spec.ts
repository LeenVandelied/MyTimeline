import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { openSettingsChapter, openSettingsPage } from './support/auth'
import { sessionState } from './support/session'
import {
  deleteProduct,
  getUserId,
  gotoProducts,
  openCategoriesTab,
  seedCategory,
  seedProduct,
  todayIsoDate,
  unique,
} from './support/products'

/**
 * #836 (Sprint 113) — RETOUR DU FOCUS AU DÉCLENCHEUR à la fermeture de TOUS les
 * dialogues, suite de #700 (qui ne couvrait que les tiroirs de CRÉATION).
 *
 * POURQUOI UN E2E RÉEL (PIT-S112-002) : un dialogue contrôlé sans `Dialog.Trigger`
 * (aucun dans le front) voit Radix Dialog 1.1.6 annuler `onCloseAutoFocus` puis
 * focaliser `triggerRef` — NUL — donc le focus tombait sur `body` (PIT-S112-001). Seul
 * le vrai `FocusScope` de Radix, dans un vrai navigateur, dit où va le focus. Aucun
 * composant n'est mocké ici ; seul un 409 est provoqué par une VRAIE écriture
 * concurrente (PATCH API) pour ouvrir le `ConflictDialog`.
 *
 * MESURE AVANT CORRECTIF (premier run, `ui/dialog.tsx` d'origine) : voir le retour de
 * #836 — tous les dialogues Radix rougissaient, le `BottomSheet` maison (mobile) non.
 *
 * CORRECTIF SOUS TEST : `DialogContent` (`src/components/ui/dialog.tsx`) capture
 * l'élément actif dans `onOpenAutoFocus` (le `FocusScope` de Radix le déclenche AVANT
 * de déplacer le focus) et le rend dans `onCloseAutoFocus` s'il est encore dans le DOM.
 * Un hôte qui place lui-même le focus (#700, `preventDefault`) garde la main.
 *
 * CHAQUE CAS : ouverture AU CLAVIER depuis le déclencheur, fermeture par le bouton
 * d'annulation, puis réouverture et fermeture par Échap ; après chaque fermeture le
 * déclencheur DOIT détenir le focus.
 *
 * SESSION : `sessionState(PROD)` (#832). ÉCRITURES : catégories/produits semés par API
 * (purge `seed-cleanup` via la fixture auto) ; un PATCH de titre d'événement (conflit) ;
 * un archivage de produit par API (restauration). Aucune suppression de compte : le
 * dialogue de suppression n'est qu'ouvert puis annulé.
 */

test.use({ storageState: sessionState(PROD) })

const DESKTOP = { width: 1280, height: 900 }
const MOBILE = { width: 375, height: 812 }

interface FocusReturnCase {
  page: Page
  /** Élément qui ouvre le dialogue ; il doit retrouver le focus à la fermeture. */
  trigger: Locator
  /** Le dialogue ouvert (visible après ouverture, caché après fermeture). */
  dialog: Locator
  /** Ferme le dialogue par son bouton d'annulation (ou de fermeture). */
  cancel: (dialog: Locator) => Promise<void>
  /** Touche d'ouverture au clavier : Entrée (bouton) ou Espace (case à cocher). */
  openKey?: 'Enter' | ' '
  /** Attente supplémentaire après l'ouverture (ex. réponse 409). */
  afterOpen?: () => Promise<void>
}

/** Ouvre AU CLAVIER : focus sur le déclencheur puis touche, comme un utilisateur clavier. */
async function openWithKeyboard(c: FocusReturnCase): Promise<void> {
  await c.trigger.focus()
  await expect(c.trigger).toBeFocused()
  await c.page.keyboard.press(c.openKey ?? 'Enter')
  if (c.afterOpen) await c.afterOpen()
  await expect(c.dialog).toBeVisible()
}

/** Annulation puis Échap : le focus revient au déclencheur dans les deux cas. */
async function expectFocusReturnOnBothCloses(c: FocusReturnCase): Promise<void> {
  await openWithKeyboard(c)
  await c.cancel(c.dialog)
  await expect(c.dialog).toBeHidden()
  await expect(c.trigger, 'focus rendu au déclencheur après annulation').toBeFocused()

  await openWithKeyboard(c)
  await c.page.keyboard.press('Escape')
  await expect(c.dialog).toBeHidden()
  await expect(c.trigger, 'focus rendu au déclencheur après Échap').toBeFocused()
}

/** Bouton « Annuler » du dialogue (libellé fr figé, `exact` : évite « Annuler l'archivage »). */
const cancelButton = (dialog: Locator) =>
  dialog.getByRole('button', { name: 'Annuler', exact: true })
const clickCancel = async (dialog: Locator) => cancelButton(dialog).click()

/**
 * Dialogues ciblés par leur CONTENU, jamais `getByRole('dialog')` seul : avant #836, Entrée
 * sur la corbeille d'une carte catégorie ouvrait le tiroir d'ÉDITION (keydown remonté à la
 * carte) — un localisateur générique aurait validé le mauvais dialogue.
 */
const deleteDialog = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('delete-confirm-button') })
const productDrawer = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('product-name-input') })
const categoryDrawer = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('category-name-input') })

/** Sème une catégorie + un produit (avec son événement) ; renvoie leurs ids. */
async function seedProductFixture(page: Page, label: string) {
  const userId = await getUserId(page)
  const category = await seedCategory(page, unique(`${label} Cat`))
  const product = await seedProduct(page, {
    userId,
    name: unique(`${label} Prod`),
    categoryId: category.id,
    eventDate: todayIsoDate(),
  })
  return { userId, category, product }
}

/** Ouvre le formulaire d'édition d'événement (détail produit → frise → drawer → Éditer). */
async function openEventEditForm(page: Page, productId: string): Promise<Locator> {
  await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('product-detail-view')).toBeVisible()
  await page.getByTestId('timeline-event').first().click()
  await page.getByTestId('event-drawer-edit').click()
  const form = page.getByTestId('event-form')
  await expect(form).toBeVisible()
  return form
}

// ═══════════════════════════════════════════════════════════════════════════════
// Desktop — dialogues Radix (`ui/dialog.tsx` DialogContent)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#836 — desktop : le focus revient au déclencheur', () => {
  test.use({ viewport: DESKTOP })

  test('ProductDrawer (édition) depuis la liste produits', async ({ page }) => {
    const { product } = await seedProductFixture(page, 'S113 Edit')
    await gotoProducts(page)
    const trigger = page.getByTestId(`products-edit-${product.id}`)
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: productDrawer(page),
      cancel: clickCancel,
    })
  })

  test('DeleteConfirmDialog (archivage produit) depuis la liste produits', async ({ page }) => {
    const { product } = await seedProductFixture(page, 'S113 Archive')
    await gotoProducts(page)
    const trigger = page.getByTestId(`products-archive-${product.id}`)
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: deleteDialog(page),
      cancel: clickCancel,
    })
  })

  test('CategoryDrawer (édition) depuis la carte catégorie', async ({ page }) => {
    const category = await seedCategory(page, unique('S113 EditCat'))
    await openCategoriesTab(page)
    const trigger = page.getByTestId(`categories-card-${category.id}`)
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: categoryDrawer(page),
      cancel: clickCancel,
    })
  })

  test('DeleteConfirmDialog (catégorie) depuis la corbeille de la carte', async ({ page }) => {
    const category = await seedCategory(page, unique('S113 DelCat'))
    await openCategoriesTab(page)
    const trigger = page.getByTestId(`categories-delete-${category.id}`)
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: deleteDialog(page),
      cancel: clickCancel,
    })
  })

  test('RestoreProductDialog depuis l’onglet Archivés', async ({ page }) => {
    const { userId, product } = await seedProductFixture(page, 'S113 Restore')
    // Archivage par API (soft delete #50) : le produit passe dans l'onglet Archivés.
    await deleteProduct(page, { userId, productId: product.id })
    await gotoProducts(page)
    await page.getByTestId('products-tabs').getByRole('tab', { name: 'Archivés' }).click()
    const trigger = page.getByTestId(`products-archived-restore-${product.id}`)
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: page.getByTestId('product-restore-confirm'),
      cancel: async (dialog) => dialog.getByTestId('product-restore-cancel').click(),
    })
  })

  test('ArchiveConfirmDialog (imbriqué) depuis l’interrupteur « archivé »', async ({ page }) => {
    const { product } = await seedProductFixture(page, 'S113 ArchEvt')
    await openEventEditForm(page, product.id)
    await expectFocusReturnOnBothCloses({
      page,
      trigger: page.getByTestId('event-form-archived-toggle'),
      dialog: page.getByTestId('event-archive-confirm'),
      cancel: async (dialog) => dialog.getByTestId('event-archive-cancel').click(),
      openKey: ' ',
    })
  })

  test('DeleteConfirmDialog (événement, imbriqué) depuis « Supprimer »', async ({ page }) => {
    const { product } = await seedProductFixture(page, 'S113 DelEvt')
    await openEventEditForm(page, product.id)
    const trigger = page.getByTestId('event-form-delete')
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: deleteDialog(page),
      cancel: clickCancel,
    })
  })

  test('ConflictDialog (imbriqué) depuis « Enregistrer » sur un vrai 409', async ({ page }) => {
    const { userId, product } = await seedProductFixture(page, 'S113 Conflict')
    const form = await openEventEditForm(page, product.id)

    // Écriture CONCURRENTE par API : la version chargée par le formulaire devient périmée.
    const list = await page.request.get(`/api/users/${userId}/products/${product.id}/events`)
    const [event] = (await list.json()) as { id: string; version: number }[]
    const bump = await page.request.patch(`/api/events/${event.id}`, {
      data: { title: unique('S113 Server'), version: event.version },
    })
    expect(bump.status(), 'PATCH concurrent par API doit réussir').toBe(200)

    await form.getByTestId('event-form-title-input').fill(unique('S113 Local'))
    const trigger = page.getByTestId('event-form-submit')
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: page.getByTestId('event-form-conflict'),
      // Mode comparatif : pas de bouton « Annuler », la croix du dialogue ferme.
      cancel: async (dialog) => dialog.getByRole('button', { name: 'Close' }).click(),
      afterOpen: async () => {
        await page.waitForResponse(
          (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
        )
      },
    })
  })

  test('AccountSection (suppression du compte) — dialogue desktop', async ({ page }) => {
    await openSettingsChapter(page, 'account')
    const trigger = page.getByTestId('delete-account-open')
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: page.getByTestId('delete-account-dialog'),
      cancel: clickCancel,
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Mobile — `BottomSheet` maison (hors Radix) de la suppression de compte
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#836 — mobile : le focus revient au déclencheur', () => {
  test.use({ viewport: MOBILE })

  test('AccountSection (suppression du compte) — BottomSheet', async ({ page }) => {
    await openSettingsPage(page)
    await expect(page.getByTestId('settings-index')).toBeVisible()
    await page.getByTestId('settings-index-account').click()
    await expect(page.getByTestId('mobile-settings-detail-account')).toBeVisible()
    const trigger = page.getByTestId('delete-account-open')
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: page.getByTestId('delete-account-sheet'),
      cancel: clickCancel,
    })
    // Troisième fermeture : la croix du sheet.
    await openWithKeyboard({
      page,
      trigger,
      dialog: page.getByTestId('delete-account-sheet'),
      cancel: clickCancel,
    })
    await page.getByTestId('delete-account-sheet-close').click()
    await expect(page.getByTestId('delete-account-sheet')).toBeHidden()
    await expect(trigger, 'focus rendu au déclencheur après la croix').toBeFocused()
  })

  test('DeleteConfirmDialog (bottom sheet Radix) depuis la liste produits', async ({ page }) => {
    const { product } = await seedProductFixture(page, 'S113 MArchive')
    await gotoProducts(page)
    const trigger = page.getByTestId(`products-archive-${product.id}`)
    await expect(trigger).toBeVisible()
    await expectFocusReturnOnBothCloses({
      page,
      trigger,
      dialog: deleteDialog(page),
      cancel: clickCancel,
    })
  })
})
