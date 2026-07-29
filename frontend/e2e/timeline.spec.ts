import { test, expect, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #314 (Sprint 47) — PASSE E2E UNIQUE de l'écran `/timeline` et du drawer de
 * CRÉATION d'événement du shell (testids livrés au Sprint 44, #300/#301, PR #313 :
 * aucun n'était référencé par une spec).
 *
 * ⚠ FICHIER PARTAGÉ — l'issue #304 (accordéon collapse par produit,
 * `timeline-resource-head`) étendra CE fichier en ajoutant son PROPRE
 * `test.describe` en fin de fichier. Le corps de #314 prescrit « UNE seule passe
 * E2E timeline » : ne pas créer de second `timeline-*.spec.ts` desktop.
 * (`timeline-mobile.spec.ts` est un fichier DISTINCT, propriété de #205 : viewports
 * mobiles, périmètre disjoint.)
 *
 * Testids couverts ici (11) :
 *   écran   : `timeline-screen`, `timeline-host`, `timeline-data-loading`
 *             (+ `timeline-empty`, déjà couvert ailleurs, ré-asserté par symétrie)
 *   drawer  : `shell-new-event-drawer`, `-overlay`, `-close`, `-loading`, `-empty`,
 *             `-product-trigger`, `-product-error`, `event-form-preview-recurrence`
 *
 * Auth : compte fixe PROD (storageState) → ZÉRO register (rate-limit 5/min/IP,
 * cf. `support/accounts.ts`). État seedé par API, parcours piloté à la souris.
 *
 * Sélecteurs : `data-testid` UNIQUEMENT. #331 a levé l'ancienne exception : les
 * options de `<Select>` Radix portent désormais un testid dérivé de leur `value`
 * (`recurrence-unit-option-<VALUE>`, `product-option-<id>`), le libellé i18n restant
 * interdit comme sélecteur. Les produits restent ciblés par NOM DE DONNÉE là où la
 * spec connaît le nom seedé — les deux voies sont stables, aucune ne dépend de l'ordre.
 */

test.use({ storageState: PROD.storageState })

const API = '/api'

/**
 * `GET /api/users/{userId}/products` — source de données de l'écran timeline ET du
 * drawer (`useDashboardData` → `useProductsWithEvents`). Regex plutôt que glob :
 * elle exclut sans ambiguïté `/products/{id}/events` (le glob `*` de Playwright ne
 * garantit pas de ne pas franchir les `/`).
 */
const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

/** Un événement tel que renvoyé par le listing `GET .../events`. */
interface ApiEvent {
  id: string
  title: string
}

/**
 * Stub du listing produits (GET seul, les écritures passent au réseau réel).
 *
 * POURQUOI un stub ici et pas un vrai état backend — deux états sont autrement
 * INATTEIGNABLES de façon déterministe sur un compte partagé :
 *   - « aucun produit » : le compte PROD est aussi alimenté par les autres specs
 *     du run (products/categories/sprint-42-events), l'ordre d'exécution n'est pas
 *     un contrat ; le vider serait destructif et racé ;
 *   - « en cours de chargement » : `isLoading` dure quelques millisecondes contre
 *     un backend local — l'asserter sans latence contrôlée serait un flake garanti.
 * Le reste de la spec (création, garde produit, écran rempli) tourne contre le
 * VRAI backend, sans aucun stub.
 */
async function stubProductsList(page: Page, products: unknown[] = []): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(products),
    })
  })
}

/**
 * Variante SUSPENDUE du stub ci-dessus : la réponse est retenue jusqu'à l'appel de
 * la fonction retournée. Aucune course de temporisation — un `setTimeout` de N ms
 * serait un flake en puissance (si la page met plus de N ms à s'hydrater en CI,
 * l'état de chargement a déjà disparu au moment de l'assertion). Ici l'état de
 * chargement est stable TANT QUE le test ne libère pas la réponse.
 */
async function stubProductsListGated(page: Page, products: unknown[] = []): Promise<() => void> {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await gate
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(products),
    })
  })
  return () => release()
}

/**
 * Ouvre `/fr/timeline` après stabilisation de l'auth. `ensureAuthenticated` passe
 * par le dashboard : avec `storageState`, la page démarre anonyme et une route
 * protégée atteinte trop tôt redirige vers /fr/login (`ERR_ABORTED` sur le `goto`).
 */
async function gotoTimeline(page: Page): Promise<void> {
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()
}

/** Ouvre le drawer de création depuis le bouton « Nouvel événement » du shell. */
async function openNewEventDrawer(page: Page): Promise<void> {
  await page.getByTestId('shell-sidebar-new-event-button').click()
  await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible()
}

test.describe('#314 /timeline — écran (états)', () => {
  /**
   * Écran RENSEIGNÉ : `timeline-screen` (conteneur) + `timeline-host` (montage
   * réel de `TimelineEditHost`). Le host n'apparaît que si `resources.length > 0`
   * → on seede un produit (via API) avant de naviguer.
   */
  test('écran rempli : timeline-screen + timeline-host montés', async ({ page }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('TL Cat'))
    await seedProduct(page, { userId, name: unique('TL Prod'), categoryId: cat.id })

    await gotoTimeline(page)

    await expect(page.getByTestId('timeline-host')).toBeVisible()
    // Exclusif : host et empty sont les deux branches d'un même ternaire.
    await expect(page.getByTestId('timeline-empty')).toHaveCount(0)
    await expect(page.getByTestId('timeline-data-loading')).toHaveCount(0)
  })

  /**
   * Écran VIDE (aucun produit) : `timeline-empty`, aucun host monté.
   * Listing stubbé (cf. `stubProductsList`) — état inatteignable sur PROD.
   */
  test('écran vide (aucun produit) : timeline-empty, pas de host', async ({ page }) => {
    await stubProductsList(page, [])

    await gotoTimeline(page)

    await expect(page.getByTestId('timeline-empty')).toBeVisible()
    await expect(page.getByTestId('timeline-host')).toHaveCount(0)
  })

  /**
   * État de CHARGEMENT des données : `timeline-data-loading`, puis bascule vers la
   * branche terminale. L'auth est stabilisée AVANT d'installer le stub pour que le
   * délai ne porte que sur le listing produits de `/timeline`.
   */
  test('chargement des données : timeline-data-loading puis état terminal', async ({ page }) => {
    await ensureAuthenticated(page)
    const releaseProducts = await stubProductsListGated(page, [])

    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    await expect(page.getByTestId('timeline-data-loading')).toBeVisible()

    // Libération de la réponse : l'état de chargement cède la place à la branche
    // terminale (ici `timeline-empty`, le stub renvoyant zéro produit).
    releaseProducts()
    await expect(page.getByTestId('timeline-data-loading')).toHaveCount(0)
    await expect(page.getByTestId('timeline-empty')).toBeVisible()
  })
})

test.describe("#314 Drawer de création d'événement (shell)", () => {
  /**
   * PARCOURS 1 (corps de l'issue) — ouverture du drawer depuis le shell, création
   * d'un événement COMPLET (produit + titre + durée + récurrence), puis apparition
   * de l'événement dans la frise (invalidation TanStack de `products.all`).
   *
   * ⚠ PIT-S44-001 : la durée est requise même en `type='single'`. On reste ici sur
   * `type='duration'` (défaut du drawer), le chemin neutre `single` étant couvert
   * par les tests unitaires de `toEventCreationPayload`.
   */
  test('création complète : produit + titre + durée + récurrence → event dans la frise', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Drawer Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Drawer Prod'),
      categoryId: cat.id,
    })

    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-host')).toBeVisible()

    await openNewEventDrawer(page)
    await expect(page.getByTestId('shell-new-event-drawer-overlay')).toBeVisible()

    // --- Produit (BR-EVE-002) : Select Radix, options en portail ---------------
    await page.getByTestId('shell-new-event-drawer-product-trigger').click()
    await page.getByRole('option', { name: product.name }).click()

    // --- Titre + durée (type=duration par défaut) -----------------------------
    const eventTitle = unique('Event drawer')
    await page.getByTestId('event-form-title-input').fill(eventTitle)
    await page.getByTestId('event-form-duration-value').fill('3')

    // --- Récurrence : l'option est ciblée par `data-testid` dérivé de la `value`
    //     (#331). Les libellés i18n restent interdits comme sélecteurs, et l'ancien
    //     `nth(1)` dépendait de l'ordre déclaré des <SelectItem> — un réordonnancement
    //     faisait cliquer sur la mauvaise unité sans faire rougir le test.
    await page.getByTestId('event-form-recurring-toggle').click()
    await page.getByTestId('event-form-recurrence-trigger').click()
    await page.getByTestId('recurrence-unit-option-MONTH').click()

    // L'aperçu live (debounce 150 ms) affiche le badge de récurrence : c'est la
    // preuve que `isRecurring` + `recurrenceUnit` sont bien pris en compte.
    await expect(page.getByTestId('event-form-preview-recurrence')).toBeVisible()

    // --- Soumission : POST /api/events → 201 (contrat #165) -------------------
    const created = page.waitForResponse(
      (r) => r.url().endsWith('/api/events') && r.request().method() === 'POST',
    )
    await page.getByTestId('event-form-submit').click()
    expect((await created).status(), 'POST /api/events doit renvoyer 201').toBe(201)

    // Succès → le parent démonte le drawer (AppShell, montage conditionnel).
    await expect(page.getByTestId('shell-new-event-drawer')).toHaveCount(0)

    // --- L'événement apparaît DANS LA FRISE (critère d'acceptation) -----------
    // `data-event-title` est l'attribut stable porté par la pastille (EventPill).
    await expect(
      page.locator(`[data-testid="timeline-event"][data-event-title="${eventTitle}"]`),
    ).toBeVisible()

    // --- Persistance serveur (source de vérité, indépendante du DOM) ----------
    const res = await page.request.get(`${API}/users/${userId}/products/${product.id}/events`)
    expect(res.ok(), `GET events doit réussir (obtenu ${res.status()})`).toBeTruthy()
    const events = (await res.json()) as ApiEvent[]
    expect(
      events.map((e) => e.title),
      'événement persisté sur le produit ciblé',
    ).toContain(eventTitle)
  })

  /**
   * PARCOURS 2 (corps de l'issue) — garde « produit requis » : le drawer arrête la
   * soumission AVANT le réseau (BR-EVE-002 gardée côté client, pas un 400 backend).
   * Le titre est rempli, sinon RHF bloquerait en amont et `handleSubmit` du drawer
   * ne serait jamais atteint (l'erreur produit n'apparaîtrait pas).
   */
  test('garde produit requis : erreur inline, aucun POST /api/events', async ({ page }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Guard Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Guard Prod'),
      categoryId: cat.id,
    })

    await gotoTimeline(page)
    await openNewEventDrawer(page)
    await expect(page.getByTestId('shell-new-event-drawer-product-trigger')).toBeVisible()

    const eventPosts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/events')) {
        eventPosts.push(request.url())
      }
    })

    await page.getByTestId('event-form-title-input').fill(unique('Sans produit'))
    await page.getByTestId('event-form-submit').click()

    await expect(page.getByTestId('shell-new-event-drawer-product-error')).toBeVisible()
    expect(eventPosts, 'aucun appel réseau de création ne doit partir').toHaveLength(0)
    // Le drawer reste ouvert : rien n'a été créé.
    await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible()

    // Choisir un produit efface l'erreur (onValueChange → setProductError(false)).
    await page.getByTestId('shell-new-event-drawer-product-trigger').click()
    await page.getByRole('option', { name: product.name }).click()
    await expect(page.getByTestId('shell-new-event-drawer-product-error')).toHaveCount(0)
  })

  /**
   * Fermeture par le bouton dédié : le parent DÉMONTE le drawer (et son overlay),
   * ce qui purge son état interne — `open=false` seul ne suffirait pas.
   */
  test('fermeture : le bouton close démonte drawer + overlay', async ({ page }) => {
    await gotoTimeline(page)
    await openNewEventDrawer(page)
    await expect(page.getByTestId('shell-new-event-drawer-overlay')).toBeVisible()

    await page.getByTestId('shell-new-event-drawer-close').click()

    await expect(page.getByTestId('shell-new-event-drawer')).toHaveCount(0)
    await expect(page.getByTestId('shell-new-event-drawer-overlay')).toHaveCount(0)
  })

  /**
   * Drawer SANS produit (BR-EVE-002) : le formulaire n'est pas offert du tout —
   * il serait condamné à un 400 (`productId` @NotNull). Listing stubbé vide.
   */
  test('sans produit : message empty, ni sélecteur ni formulaire', async ({ page }) => {
    await stubProductsList(page, [])

    await gotoTimeline(page)
    await openNewEventDrawer(page)

    await expect(page.getByTestId('shell-new-event-drawer-empty')).toBeVisible()
    await expect(page.getByTestId('shell-new-event-drawer-product-trigger')).toHaveCount(0)
    await expect(page.getByTestId('event-form')).toHaveCount(0)
  })

  /**
   * Drawer pendant le CHARGEMENT des produits : live-region `role="status"`.
   * Latence contrôlée par le stub (cf. `stubProductsList`) — sinon non observable.
   */
  test('chargement des produits : shell-new-event-drawer-loading', async ({ page }) => {
    await ensureAuthenticated(page)
    const releaseProducts = await stubProductsListGated(page, [])

    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
    await openNewEventDrawer(page)

    await expect(page.getByTestId('shell-new-event-drawer-loading')).toBeVisible()

    releaseProducts()
    await expect(page.getByTestId('shell-new-event-drawer-loading')).toHaveCount(0)
    await expect(page.getByTestId('shell-new-event-drawer-empty')).toBeVisible()
  })
})

/**
 * #304 (Sprint 47) — Accordéon collapse PAR PRODUIT (`timeline-resource-head`,
 * livré #195/PR #303, 2e niveau imbriqué dans l'accordéon catégorie).
 *
 * Le testid n'était référencé par AUCUNE spec Playwright : seul
 * `timeline-resource-title` (son enfant) était exercé par `golden-path.spec.ts`.
 *
 * ⚠ ASSERTION PRIMAIRE = l'ATTRIBUT `aria-expanded` du bouton, pas la seule
 * visibilité : si le collapse devenait un jour une hauteur CSS animée, une
 * assertion de visibilité seule produirait une race intermittente. `aria-expanded`
 * est le contrat stable (et l'annonce lecteur d'écran). Le masquage des pastilles
 * est asserté EN PLUS, par `toHaveCount(0)` (le rendu conditionnel les démonte,
 * cf. `TimelineView.tsx` : `!isResCollapsed && laneEvents.map(...)`) — jamais par
 * `not.toBeVisible()`, qui passerait aussi sur un élément simplement hors-écran.
 *
 * État seedé par API sur le compte PROD (jamais vierge, cf. en-tête de fichier) :
 * UNE catégorie dédiée + DEUX produits dedans → un groupe isolé et déterministe
 * au milieu des lanes des autres specs. Aucun stub : parcours contre le vrai
 * backend, l'état replié/déplié étant purement local (`useState`, non persisté).
 */

/** Le bouton toggle de la lane d'un produit (le nom de produit est unique par test). */
function resourceHead(page: Page, productName: string) {
  return page.getByTestId('timeline-resource-head').filter({ hasText: productName })
}

/** La lane (`timeline-resource-row`) d'un produit, portée par son bouton toggle. */
function resourceRow(page: Page, productName: string) {
  return page
    .getByTestId('timeline-resource-row')
    .filter({ has: page.getByTestId('timeline-resource-head').filter({ hasText: productName }) })
}

/**
 * Seede une catégorie et deux produits dedans (un événement du jour chacun, posé
 * par `seedProduct`), puis ouvre la frise. Renvoie de quoi cibler le groupe.
 */
async function seedTwoProductsInOneCategory(
  page: Page,
): Promise<{ category: string; first: string; second: string }> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('Collapse Cat'))
  const first = await seedProduct(page, { userId, name: unique('Collapse P1'), categoryId: cat.id })
  const second = await seedProduct(page, { userId, name: unique('Collapse P2'), categoryId: cat.id })
  return { category: cat.name, first: first.name, second: second.name }
}

test.describe('#304 /timeline — accordéon collapse par produit', () => {
  /**
   * PARCOURS 1 (corps de l'issue) — le clic bascule `aria-expanded` et démonte /
   * remonte les pastilles de la lane. Le bouton lui-même RESTE rendu une fois
   * replié (il identifie la lane pendant le scroll horizontal, cf. #195).
   */
  test('clic sur timeline-resource-head : aria-expanded bascule, pastilles masquées puis réaffichées', async ({
    page,
  }) => {
    const { first } = await seedTwoProductsInOneCategory(page)

    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-host')).toBeVisible()

    const head = resourceHead(page, first)
    const pill = resourceRow(page, first).locator(
      `[data-testid="timeline-event"][data-event-title="${first}"]`,
    )

    // État initial : déplié, pastille de l'événement seedé présente.
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    await expect(pill).toHaveCount(1)

    // --- Repli --------------------------------------------------------------
    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(pill, 'les pastilles de la lane repliée sont démontées').toHaveCount(0)
    // Le toggle et son libellé survivent au repli (la lane reste identifiable).
    await expect(head).toBeVisible()
    await expect(head.getByTestId('timeline-resource-title')).toHaveText(first)

    // --- Dépli (retour à l'état initial) ------------------------------------
    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    await expect(pill, 'les pastilles sont réaffichées au dépli').toHaveCount(1)
  })

  /**
   * PARCOURS 2 (corps de l'issue) — INDÉPENDANCE. Replier un produit ne touche
   * ni la lane du produit voisin (même catégorie) ni l'accordéon de la catégorie
   * parente : trois états `aria-expanded` distincts, un seul mute.
   */
  test('indépendance : replier un produit n’affecte ni le produit voisin ni la catégorie parente', async ({
    page,
  }) => {
    const { category, first, second } = await seedTwoProductsInOneCategory(page)

    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-host')).toBeVisible()

    const firstHead = resourceHead(page, first)
    const secondHead = resourceHead(page, second)
    const groupHead = page.getByTestId('timeline-group-head').filter({ hasText: category })
    const secondPill = resourceRow(page, second).locator(
      `[data-testid="timeline-event"][data-event-title="${second}"]`,
    )

    // Les deux produits partagent la MÊME catégorie (un seul groupe seedé).
    await expect(groupHead).toHaveCount(1)
    await expect(groupHead).toHaveAttribute('aria-expanded', 'true')
    await expect(firstHead).toHaveAttribute('aria-expanded', 'true')
    await expect(secondHead).toHaveAttribute('aria-expanded', 'true')

    await firstHead.click()

    // Seul le produit cliqué bascule.
    await expect(firstHead).toHaveAttribute('aria-expanded', 'false')
    await expect(secondHead, 'le produit voisin reste déplié').toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await expect(secondPill, 'les pastilles du voisin restent montées').toHaveCount(1)
    // La catégorie parente n'est pas repliée par le collapse d'un de ses produits.
    await expect(groupHead, 'la catégorie parente reste dépliée').toHaveAttribute(
      'aria-expanded',
      'true',
    )
    // Les deux lanes restent rendues (le repli masque les pastilles, pas la lane).
    await expect(resourceRow(page, first)).toHaveCount(1)
    await expect(resourceRow(page, second)).toHaveCount(1)

    // Symétrie : replier le voisin à son tour laisse le premier tel quel.
    await secondHead.click()
    await expect(secondHead).toHaveAttribute('aria-expanded', 'false')
    await expect(firstHead, 'le premier produit ne se déplie pas tout seul').toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await expect(groupHead).toHaveAttribute('aria-expanded', 'true')
  })
})
