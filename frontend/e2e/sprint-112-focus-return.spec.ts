import { type Locator, type Page, type Response, type Route } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import {
  getUserId,
  gotoProducts,
  openCategoriesTab,
  seedCategory,
  seedProduct,
  todayIsoDate,
  unique,
} from './support/products'
import { trackSeed } from './support/seed-cleanup'

/**
 * #700 (Sprint 112) — RETOUR DU FOCUS après le tiroir de création ouvert depuis le
 * CTA d'état vide, sur `/products` (liste) et sur l'onglet Catégories. VRAI tiroir
 * Radix (`ProductDrawer` / `CategoryDrawer`), aucun mock de composant : jusqu'ici,
 * seuls `ProductsListView.test.tsx` / `CategoriesView.test.tsx` couvraient ce
 * comportement, avec un tiroir simulé qui ne prouve pas ce que fait `FocusScope`.
 *
 * CE QUE CETTE SPEC A TROUVÉ (premier run, avant correctif) : 4 rouges sur 6, plus les
 * 2 témoins du bouton permanent. Le mock unitaire supposait que Radix rend le focus à
 * l'élément actif à l'ouverture ; en réalité `DialogContent` modal (Radix Dialog 1.1.6)
 * annule l'événement et vise `triggerRef` — NUL, les tiroirs étant contrôlés sans
 * `Dialog.Trigger`. Le focus tombait sur `body` après toute annulation ; seul le chemin
 * « création » passait, grâce à l'effet de rattrapage `[hasProducts]`.
 *
 * CODE SOUS TEST (`ProductsListView.tsx`, `CategoriesView.tsx`, même logique) :
 * `onCloseAutoFocus` place TOUJOURS le focus lui-même.
 *  - annulation → CTA (ou bouton permanent s'il a ouvert le tiroir) ;
 *  - création réussie → `mutateAsync` résout AVANT le rechargement de la liste
 *    (PIT-S90-008) : à la fermeture, le CTA est donc en général ENCORE monté et reçoit
 *    le focus ; quand la liste arrive, il se démonte en le détenant (Chromium le pose
 *    alors sur `body`) et l'effet `[hasProducts]` le rend au bouton permanent. Si le
 *    CTA est déjà démonté à la fermeture, directement au bouton permanent.
 *
 * TROIS SCÉNARIOS PAR ÉCRAN (+ un témoin « bouton permanent » par écran) :
 *  1. annulation (bouton « Annuler » puis touche Échap) → focus sur le CTA ;
 *  2. création, rechargement au rythme du réseau → focus final sur le bouton permanent ;
 *  3. création, rechargement LENT → la requête GET de la liste est RETENUE par une
 *     porte (`page.route`) jusqu'à ce que le test ait constaté l'état intermédiaire
 *     (tiroir fermé, liste encore vide, focus sur le CTA). Une porte plutôt qu'un
 *     délai : l'état intermédiaire est stable tant qu'elle est close, aucune course
 *     contre une temporisation. Puis la porte s'ouvre → focus sur le bouton permanent,
 *     jamais perdu sur `body`.
 *
 * DONNÉES. L'état vide n'est pas un état déterministe du compte PROD (partagé par le
 * run) : le GET de listing est stubbé à `[]` (motif `sprint-90-first-contact`,
 * `sprint-112-touch-targets`) tant que la phase est `empty`, puis passe au RÉSEAU
 * RÉEL pour le rechargement qui suit la création (la liste réelle contient au moins
 * l'entité créée). Toutes les écritures (POST) partent au backend réel. Les entités
 * créées à la souris sont relevées sur la réponse du POST et enregistrées pour la
 * purge dans un `afterEach` INCONDITIONNEL (PIT-S73-006) ; la purge elle-même est
 * celle de la fixture auto de `support/fixtures.ts`, qui s'exécute après les hooks,
 * test rouge compris. Session : `sessionState(PROD)` (#832), aucun login par
 * formulaire, aucun register.
 *
 * BARRIÈRE D'HYDRATATION (PIT-S83-001) : l'état vide n'est rendu qu'APRÈS la réponse
 * du GET stubbé, donc côté client (le SSR rend le squelette : la requête interceptée
 * par `page.route` part du navigateur). L'état vide visible prouve que React a monté
 * l'arbre et attaché `onClick` au CTA : c'est la barrière nommée `waitForEmptyStateHydrated`.
 */

test.use({ storageState: sessionState(PROD), viewport: { width: 1280, height: 900 } })

/** `GET|POST /api/users/{userId}/products` — listing de `ProductsListView` et création. */
const PRODUCTS_RE = /\/api\/users\/([^/]+)\/products(\?.*)?$/
/** `GET|POST /api/categories` — `useCategories` et création. */
const CATEGORIES_RE = /\/api\/categories(\?.*)?$/

type Phase = 'empty' | 'network' | 'gated'

interface ListStub {
  /** Phase courante : `empty` rend `[]`, `network` laisse passer, `gated` retient. */
  setPhase: (phase: Phase) => void
  /** Résolue quand un GET a été RETENU par la porte (phase `gated`). */
  held: Promise<void>
  /** Ouvre la porte. Idempotent ; appelé aussi par l'`afterEach`. */
  release: () => void
}

/**
 * Stub du GET de listing piloté par phases. Le gestionnaire ne fait AUCUNE I/O
 * propre (PIT-S111-003) : il répond, laisse passer, ou attend la porte.
 */
async function stubList(page: Page, re: RegExp): Promise<ListStub> {
  let phase: Phase = 'empty'
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let markHeld: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    markHeld = resolve
  })
  await page.route(re, async (route: Route) => {
    if (route.request().method() !== 'GET' || phase === 'network') {
      await route.continue()
      return
    }
    if (phase === 'empty') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    markHeld()
    await gate
    await route.continue()
  })
  return {
    setPhase: (next) => {
      phase = next
    },
    held,
    release: () => release(),
  }
}

/** Barrière d'hydratation nommée : cf. en-tête. */
async function waitForEmptyStateHydrated(page: Page, emptyTestId: string): Promise<Locator> {
  await expect(page.getByTestId(emptyTestId)).toBeVisible()
  const cta = page.getByTestId(`${emptyTestId}-cta`)
  await expect(cta).toBeVisible()
  await expect(cta).toBeEnabled()
  return cta
}

/** Ouvre le tiroir AU CLAVIER depuis le CTA (focus puis Entrée), comme un utilisateur clavier. */
async function openFromCta(page: Page, cta: Locator): Promise<Locator> {
  await cta.focus()
  await expect(cta).toBeFocused()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

/** Aucun élément de la page ne détient le focus (il est « perdu » sur `body`). */
async function focusIsOnBody(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.activeElement === null || document.activeElement === document.body,
  )
}

/** Entités créées à la souris dans le test courant, relevées sur la réponse du POST. */
let createdEntries: Promise<Parameters<typeof trackSeed>[1] | null>[] = []
let stubs: ListStub[] = []

/** Relève toute création (POST 201) de produit ou de catégorie pour la purge. */
function recordCreations(page: Page): void {
  page.on('response', (res: Response) => {
    if (res.request().method() !== 'POST' || res.status() !== 201) return
    const url = res.url()
    const productMatch = PRODUCTS_RE.exec(new URL(url).pathname)
    if (productMatch) {
      const userId = productMatch[1]
      createdEntries.push(
        res
          .json()
          .then((b: { id: string }) => ({ kind: 'product' as const, userId, id: b.id }))
          .catch(() => null),
      )
    } else if (CATEGORIES_RE.test(new URL(url).pathname)) {
      createdEntries.push(
        res
          .json()
          .then((b: { id: string }) => ({ kind: 'category' as const, id: b.id }))
          .catch(() => null),
      )
    }
  })
}

test.beforeEach(async ({ page }) => {
  createdEntries = []
  stubs = []
  recordCreations(page)
})

test.afterEach(async ({ page }) => {
  // Porte ouverte AVANT de retirer les routes : un GET encore retenu (test rouge
  // avant `release`) bloquerait `unrouteAll({ behavior: 'wait' })`.
  for (const stub of stubs) stub.release()
  await page.unrouteAll({ behavior: 'wait' })
  for (const pending of createdEntries) {
    const entry = await pending
    if (entry) await trackSeed(page, entry)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// /products — onglet liste
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#700 — /products : focus au retour du tiroir ouvert depuis l’état vide', () => {
  /** Remplit et soumet le vrai formulaire de création (catégorie semée). */
  async function submitProduct(page: Page, dialog: Locator, categoryId: string): Promise<void> {
    await dialog.getByTestId('product-name-input').fill(unique('S112 Focus Prod'))
    await dialog.getByTestId('product-category-trigger').click()
    await page.getByTestId(`product-category-option-${categoryId}`).click()
    // Événement couplé : la visibilité du produit dans le listing est garantie.
    await dialog.getByTestId('product-first-event-date').fill(todayIsoDate())
    await dialog.getByTestId('product-submit').click()
  }

  test('annulation (bouton puis Échap) → focus rendu au CTA de l’état vide', async ({ page }) => {
    const stub = await stubList(page, PRODUCTS_RE)
    stubs.push(stub)
    await gotoProducts(page)
    const cta = await waitForEmptyStateHydrated(page, 'products-empty')

    const dialog = await openFromCta(page, cta)
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(cta).toBeFocused()

    const again = await openFromCta(page, cta)
    await page.keyboard.press('Escape')
    await expect(again).toBeHidden()
    await expect(cta).toBeFocused()
  })

  test('création, rechargement au rythme du réseau → focus sur le bouton permanent', async ({
    page,
  }) => {
    // Semis AVANT le premier chargement (staleTime 30 s, cf. `sprint-90`).
    const category = await seedCategory(page, unique('S112 Focus Cat'))
    const stub = await stubList(page, PRODUCTS_RE)
    stubs.push(stub)
    await gotoProducts(page)
    const cta = await waitForEmptyStateHydrated(page, 'products-empty')

    const dialog = await openFromCta(page, cta)
    stub.setPhase('network')
    await submitProduct(page, dialog, category.id)

    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('products-table')).toBeVisible()
    await expect(page.getByTestId('products-empty')).toHaveCount(0)
    await expect(page.getByTestId('products-new-button')).toBeFocused()
    expect(await focusIsOnBody(page), 'focus perdu sur body').toBe(false)
  })

  test('création, rechargement LENT (GET retenu) → CTA puis bouton permanent, jamais body', async ({
    page,
  }) => {
    const category = await seedCategory(page, unique('S112 Focus Cat'))
    const stub = await stubList(page, PRODUCTS_RE)
    stubs.push(stub)
    await gotoProducts(page)
    const cta = await waitForEmptyStateHydrated(page, 'products-empty')

    const dialog = await openFromCta(page, cta)
    stub.setPhase('gated')
    await submitProduct(page, dialog, category.id)

    // Rechargement retenu : tiroir fermé, liste ENCORE vide, focus rendu au CTA.
    await stub.held
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('products-empty')).toBeVisible()
    await expect(cta).toBeFocused()

    stub.release()
    await expect(page.getByTestId('products-table')).toBeVisible()
    await expect(page.getByTestId('products-empty')).toHaveCount(0)
    await expect(page.getByTestId('products-new-button')).toBeFocused()
    expect(await focusIsOnBody(page), 'focus perdu sur body').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// /products — onglet Catégories
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#700 — catégories vides : focus au retour du tiroir ouvert depuis l’état vide', () => {
  /** Remplit et soumet le vrai formulaire de création de catégorie. */
  async function submitCategory(dialog: Locator): Promise<void> {
    await dialog.getByTestId('category-name-input').fill(unique('S112 Focus Cat'))
    // #577 — palette du handoff (motif `categories.spec.ts`).
    await dialog.getByTestId('category-swatch-#3B62D4').click()
    await dialog.getByTestId('category-submit').click()
  }

  /** Les cartes rendues (liste non vide) : au moins une `li` dans la vue. */
  function categoryCards(page: Page): Locator {
    return page.getByTestId('categories-view').locator('li')
  }

  test('annulation (bouton puis Échap) → focus rendu au CTA de l’état vide', async ({ page }) => {
    const stub = await stubList(page, CATEGORIES_RE)
    stubs.push(stub)
    await openCategoriesTab(page)
    const cta = await waitForEmptyStateHydrated(page, 'categories-empty')

    const dialog = await openFromCta(page, cta)
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(cta).toBeFocused()

    const again = await openFromCta(page, cta)
    await page.keyboard.press('Escape')
    await expect(again).toBeHidden()
    await expect(cta).toBeFocused()
  })

  test('création, rechargement au rythme du réseau → focus sur le bouton permanent', async ({
    page,
  }) => {
    const stub = await stubList(page, CATEGORIES_RE)
    stubs.push(stub)
    await openCategoriesTab(page)
    const cta = await waitForEmptyStateHydrated(page, 'categories-empty')

    const dialog = await openFromCta(page, cta)
    stub.setPhase('network')
    await submitCategory(dialog)

    await expect(dialog).toBeHidden()
    await expect(categoryCards(page).first()).toBeVisible()
    await expect(page.getByTestId('categories-empty')).toHaveCount(0)
    await expect(page.getByTestId('categories-new-button')).toBeFocused()
    expect(await focusIsOnBody(page), 'focus perdu sur body').toBe(false)
  })

  test('création, rechargement LENT (GET retenu) → CTA puis bouton permanent, jamais body', async ({
    page,
  }) => {
    const stub = await stubList(page, CATEGORIES_RE)
    stubs.push(stub)
    await openCategoriesTab(page)
    const cta = await waitForEmptyStateHydrated(page, 'categories-empty')

    const dialog = await openFromCta(page, cta)
    stub.setPhase('gated')
    await submitCategory(dialog)

    await stub.held
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('categories-empty')).toBeVisible()
    await expect(cta).toBeFocused()

    stub.release()
    await expect(categoryCards(page).first()).toBeVisible()
    await expect(page.getByTestId('categories-empty')).toHaveCount(0)
    await expect(page.getByTestId('categories-new-button')).toBeFocused()
    expect(await focusIsOnBody(page), 'focus perdu sur body').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Témoin : tiroir ouvert depuis le BOUTON PERMANENT (liste non vide, réseau réel)
// ═══════════════════════════════════════════════════════════════════════════════
// Même gestionnaire `onCloseAutoFocus` : la branche « pas depuis l'état vide » était
// laissée à Radix, qui ne rend le focus qu'à un `Dialog.Trigger` — absent ici.
test.describe('#700 — témoin : tiroir ouvert depuis le bouton permanent', () => {
  test('/products : annulation → focus rendu à « Nouveau produit »', async ({ page }) => {
    const category = await seedCategory(page, unique('S112 Focus Cat'))
    const userId = await getUserId(page)
    await seedProduct(page, { userId, name: unique('S112 Focus Prod'), categoryId: category.id })
    await gotoProducts(page)
    // Barrière d'hydratation : le tableau n'est rendu qu'après la requête CLIENT.
    await expect(page.getByTestId('products-table')).toBeVisible()
    const button = page.getByTestId('products-new-button')

    const dialog = await openFromCta(page, button)
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
  })

  test('catégories : annulation → focus rendu à « Nouvelle catégorie »', async ({ page }) => {
    await seedCategory(page, unique('S112 Focus Cat'))
    await openCategoriesTab(page)
    await expect(page.getByTestId('categories-view').locator('li').first()).toBeVisible()
    const button = page.getByTestId('categories-new-button')

    const dialog = await openFromCta(page, button)
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
  })
})
