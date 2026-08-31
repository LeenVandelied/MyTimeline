import { test, expect, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { getUserId, seedCategory, seedProduct, todayIsoDate, unique } from './support/products'

/**
 * #330 (lot b) — stub PAGE de l'API Fullscreen pour `timeline-fullscreen` (cf.
 * rationale dans la spec). Déclaré au niveau module : `page.addInitScript` sérialise
 * la fonction, mais son typage (donc l'absence de `any`) est vérifié ICI.
 */
declare global {
  interface Window {
    __fullscreenCalls?: number
    __fullscreenExits?: number
  }
}

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
    // #390-fix (D) / #331 — sélection par le testid dérivé de la `value`
    // (`product-option-<id>`, NewEventDrawer.tsx:218), conforme au header du fichier
    // (« data-testid UNIQUEMENT ») : ce testid était livré SANS aucune spec.
    await page.getByTestId('shell-new-event-drawer-product-trigger').click()
    await page.getByTestId(`product-option-${product.id}`).click()

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

/**
 * #330 (Sprint 54, lot a) — Drawer de DÉTAIL événement desktop (`EventDrawer.tsx`,
 * testids `timeline-drawer` / `-close` / `-overlay`). Gap identifié par l'audit
 * S46/S47 : aucune spec ne cliquait sur une pastille desktop (`timeline-event`)
 * pour OUVRIR ce drawer — seul le drawer de CRÉATION (`shell-new-event-drawer*`,
 * #314 ci-dessus) était couvert. Les trois testids sont exercés par leur
 * COMPORTEMENT (ouverture avec contenu réel, fermeture par overlay OU par bouton
 * — deux chemins distincts, pas un doublon), pas seulement leur présence.
 */
test.describe('#330 Drawer de détail événement (desktop, EventDrawer)', () => {
  /** Seede un produit + son event du jour, ouvre la frise, clique sa pastille. */
  async function seedAndOpenDetailDrawer(page: Page): Promise<{ eventTitle: string }> {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Detail Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Detail Prod'),
      categoryId: cat.id,
    })

    await gotoTimeline(page)
    const pill = page.locator(`[data-testid="timeline-event"][data-event-title="${product.name}"]`)
    await expect(pill).toBeVisible()
    await pill.click()

    return { eventTitle: product.name }
  }

  test('clic sur une pastille : timeline-drawer + overlay visibles avec le détail réel', async ({
    page,
  }) => {
    const { eventTitle } = await seedAndOpenDetailDrawer(page)

    const drawer = page.getByTestId('timeline-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toHaveAttribute('role', 'dialog')
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
    // Contenu réel (produit/catégorie/dates/statut via son titre), pas une coquille vide.
    await expect(drawer).toContainText(eventTitle)
    await expect(page.getByTestId('timeline-drawer-overlay')).toBeVisible()
  })

  test('clic sur l’overlay : ferme le drawer (démontage, pas juste masquage)', async ({ page }) => {
    await seedAndOpenDetailDrawer(page)

    // Clic en haut à gauche de l'overlay : le panneau slide-in est ANCRÉ À DROITE
    // (`.mt-drawer{position:fixed;right:0}`, cf. timeline.css:151) — le centre par
    // défaut du click() Playwright tomberait dessus, pas sur l'overlay.
    await page.getByTestId('timeline-drawer-overlay').click({ position: { x: 5, y: 5 } })

    await expect(page.getByTestId('timeline-drawer')).toHaveCount(0)
    await expect(page.getByTestId('timeline-drawer-overlay')).toHaveCount(0)
  })

  test('bouton close : ferme le drawer (démontage)', async ({ page }) => {
    await seedAndOpenDetailDrawer(page)

    await page.getByTestId('timeline-drawer-close').click()

    await expect(page.getByTestId('timeline-drawer')).toHaveCount(0)
    await expect(page.getByTestId('timeline-drawer-overlay')).toHaveCount(0)
  })
})

/**
 * #330 (Sprint 54, lot b) — Toolbar desktop : zoom-out / today / weekend / aide /
 * plein écran (`TimelineView.tsx`). Cinq testids déclarés depuis le Sprint 44 sans
 * spec dédiée.
 *
 * ⚠ PRÉMISSE CORRIGÉE (vs. briefing #330) : `timeline-today` n'est PAS un bouton —
 * c'est un badge POSITIONNEL statique (`<span data-testid="timeline-today">`, AUCUN
 * `onClick`, `TimelineView.tsx:211`) posé sur la règle. Le raccourci clavier "T"
 * (`scrollToToday`) est un mécanisme SÉPARÉ qui ne porte pas ce testid. Le seul
 * comportement observable de `timeline-today` est sa POSITION, dérivée de
 * `todayLeftPx = daysBetween(rangeStart, now) * dayWidth` : elle doit changer avec
 * le zoom (dayWidth varie par niveau) — ce que ce test vérifie, pas un clic qui
 * n'existe pas.
 *
 * ⚠ `timeline-weekend` (`buildWeekendSegments`, zoom.ts:381) retourne `[]` à TOUT
 * zoom hors day/week — au niveau par défaut ('Mois') AUCUN segment n'existe : il
 * faut zoomer d'un cran avant de pouvoir l'exercer.
 *
 * #330-fix (Sprint 54) — PRÉMISSE FAUSSE trouvée à la mesure : ces 5 tests
 * naviguaient vers `/fr/timeline` SANS jamais seeder de produit, en misant
 * implicitement sur le compte PARTAGÉ PROD déjà peuplé par une spec antérieure
 * du run (`products.spec.ts` etc.). `page.tsx:84` rend `timeline-empty` (AUCUNE
 * toolbar, AUCUN `TimelineEditHost`) tant que `resources.length === 0` — si CE
 * describe s'exécute avant qu'un produit existe (ordre `fullyParallel` non
 * garanti entre fichiers), `timeline-zoom-in`/`timeline-fullscreen` ne sont
 * JAMAIS montés → timeout de locator, pas une assertion qui échoue. Reproduit :
 * en isolation (`-g`), 0 produit, ces 2 tests échouent identiquement à la mesure
 * du lead. Fix : chaque test seede EXPLICITEMENT son propre produit (comme le
 * fait déjà le describe Minimap plus bas), la précondition ne dépend plus de
 * l'ordre d'exécution des autres fichiers.
 */
async function gotoTimelineWithProduct(page: Page): Promise<void> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('Toolbar Cat'))
  await seedProduct(page, { userId, name: unique('Toolbar Prod'), categoryId: cat.id })
  await gotoTimeline(page)
}

test.describe('#330 Toolbar desktop — zoom-out / today / weekend / aide / plein écran', () => {
  test('zoom-out : dézoome (Mois → Trimestre), oracle timeline-zoom-level', async ({ page }) => {
    await gotoTimelineWithProduct(page)
    const level = page.getByTestId('timeline-zoom-level')
    await expect(level).toHaveText('Mois')

    await page.getByTestId('timeline-zoom-out').click()

    // Dézoomer élargit l'échelle (Mois -> Trimestre) : une assertion « le texte a
    // changé » laisserait passer un zoom-IN accidentel sur le mauvais bouton.
    await expect(level).toHaveText('Trimestre')
  })

  test('today : badge positionnel visible, dont la position suit le zoom (pas de clic, cf. note ci-dessus)', async ({
    page,
  }) => {
    await gotoTimelineWithProduct(page)
    const badge = page.getByTestId('timeline-today')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText("Aujourd'hui")

    const leftBefore = await badge.evaluate((el) => (el.parentElement as HTMLElement).style.left)
    await page.getByTestId('timeline-zoom-out').click()

    await expect(async () => {
      const leftAfter = await badge.evaluate((el) => (el.parentElement as HTMLElement).style.left)
      expect(leftAfter).not.toBe(leftBefore)
    }).toPass()
  })

  test('weekend : motif calendaire réel (paire samedi/dimanche, écarts 34/204px) au zoom Semaine', async ({
    page,
  }) => {
    await gotoTimelineWithProduct(page)
    await expect(page.getByTestId('timeline-weekend')).toHaveCount(0) // zoom Mois par défaut : []

    await page.getByTestId('timeline-zoom-in').click()
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Semaine')

    const segments = page.getByTestId('timeline-weekend')
    const count = await segments.count()
    // Le compte ABSOLU dépend de l'étendue totale du compte PARTAGÉ PROD (croît
    // avec chaque spec du run, cf. #328 dans timeline-mobile.spec.ts) : au lieu d'un
    // nombre figé, on vérifie le MOTIF calendaire — `DAY_WIDTH_PX.week` = 34px
    // (zoom.ts). #330-fix (Sprint 54) — PRÉMISSE CORRIGÉE : `buildWeekendSegments`
    // (zoom.ts:375) pousse UN segment par JOUR de week-end (samedi ET dimanche
    // SÉPARÉMENT), pas un segment par PAIRE. Triés par position, l'écart
    // samedi->dimanche (immédiat) est de 1 jour = 34px, mais l'écart
    // dimanche->samedi SUIVANT est de 6 jours = 204px (PAS 7 jours/238px : le
    // dimanche de la paire suivante s'intercale AVANT le samedi+7j, cassant le
    // saut de semaine entière). 238px n'apparaît jamais comme écart ADJACENT dans
    // le tableau trié — vérifié empiriquement (run isolé, produit seedé,
    // 0 accumulation externe) avant correction. Aucun autre écart n'est un
    // calendrier valide : c'est la preuve du « bon nombre » exigée par le
    // briefing, indépendante du volume accumulé — pas juste « >= 1 ».
    expect(count).toBeGreaterThan(1)
    const lefts = (
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          segments.nth(i).evaluate((el) => parseFloat((el as HTMLElement).style.left)),
        ),
      )
    ).sort((a, b) => a - b)
    for (let i = 1; i < lefts.length; i++) {
      const delta = Math.round(lefts[i] - lefts[i - 1])
      expect([34, 204], `écart ${delta}px entre segments ${i - 1} et ${i}`).toContain(delta)
    }
  })

  test('aide : le survol ouvre le panneau de raccourcis (opacité), le contenu est réel', async ({
    page,
  }) => {
    await gotoTimelineWithProduct(page)
    // `.mt-tlv__help-pop` est TOUJOURS dans le DOM avec un bounding-box non vide
    // (`opacity:0;pointer-events:none` par défaut, timeline.css:190) : une
    // assertion `toBeVisible()` passerait à tort SANS survol — piège de la même
    // famille que les 28 régressions ratées au S53 (vérification verte qui ne
    // regarde pas la bonne propriété CSS). L'oracle est l'opacité calculée.
    // #390-fix (E) — sélecteur par `data-testid` (politique du fichier, header L39) ;
    // l'`id` reste sur l'élément comme cible d'`aria-describedby` (TimelineView.tsx),
    // il n'est PAS supprimé, seulement doublé par un testid.
    const pop = page.getByTestId('timeline-help-pop')
    await expect(pop).toHaveCSS('opacity', '0')

    await page.getByTestId('timeline-help').hover()
    await expect(pop).toHaveCSS('opacity', '1')
    await expect(pop).toContainText('Aller à aujourd’hui')
    await expect(pop).toContainText('Plein écran')

    await page.mouse.move(0, 0)
    await expect(pop).toHaveCSS('opacity', '0')
  })

  test('plein écran : bascule requestFullscreen/exitFullscreen (API stubée, rationale ci-dessous)', async ({
    page,
  }) => {
    // L'API Fullscreen réelle n'offre AUCUNE garantie de support/activation en
    // Chromium headless. On stube au niveau PAGE (pas composant) : le vrai bouton,
    // le vrai handler, la VRAIE invocation de l'API sont exercés — seule
    // l'implémentation navigateur est simulée, à l'identique de la technique déjà
    // validée en RTL (`TimelineView.test.tsx`: `Element.prototype.requestFullscreen
    // = vi.fn()`), transposée ici pour couvrir le clic RÉEL bout en bout (bouton ->
    // handler -> API), toggle complet (entrée ET sortie), pas juste l'entrée.
    //
    // #330-fix (Sprint 54) — PRÉMISSE FAUSSE : poser ce stub via `page.addInitScript`
    // (exécuté avant TOUT script de page, y compris le bundle Next/React) échoue de
    // façon déterministe ici — `requestFullscreen` EST bien invoqué (compteur à 1,
    // confirmé), mais la relecture de `document.fullscreenElement` retombe ensuite
    // sur `false` malgré un getter qui, lui, s'exécute et voit la bonne valeur
    // (reproduit hors suite : le même override posé par un `page.evaluate()` APRÈS
    // le chargement de la page fonctionne à l'identique, à 100%). La cause exacte
    // (probablement un script du bundle dev qui retouche `Element.prototype`/
    // `document` après l'`addInitScript` mais avant le clic) n'affecte QUE le
    // MOMENT où le stub doit être posé, pas le comportement du composant : le
    // bouton n'appelle jamais l'API tant qu'on ne clique pas, donc poser le stub
    // juste avant le clic (au lieu d'avant le tout premier rendu) exerce exactement
    // la même chaîne RÉELLE bouton -> handler -> API, sans rien affaiblir.
    await gotoTimelineWithProduct(page)
    await page.evaluate(() => {
      // Pas de `this` aliasé (identité de l'élément non pertinente ici, seule la
      // TRUTHINESS de `document.fullscreenElement` est consommée par le handler).
      let active = false
      const root = document.documentElement
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => (active ? root : null),
      })
      // #395 — le stub DOIT émettre `fullscreenchange` à chaque transition, comme
      // le fait un vrai navigateur. Sans cela il est INFIDÈLE : un composant qui
      // dérive correctement son état de cet événement (source de vérité) resterait
      // figé sous le stub, et le test rougirait sur du code JUSTE. Émettre l'événement
      // rend le stub plus proche du réel, PAS plus permissif.
      Element.prototype.requestFullscreen = function requestFullscreenStub() {
        active = true
        window.__fullscreenCalls = (window.__fullscreenCalls ?? 0) + 1
        document.dispatchEvent(new Event('fullscreenchange'))
        return Promise.resolve()
      }
      document.exitFullscreen = function exitFullscreenStub() {
        active = false
        window.__fullscreenExits = (window.__fullscreenExits ?? 0) + 1
        document.dispatchEvent(new Event('fullscreenchange'))
        return Promise.resolve()
      }
    })

    // #395 — état observable AVANT toute interaction : le bouton s'annonce non actif.
    const fsButton = page.getByTestId('timeline-fullscreen')
    await expect(fsButton).toHaveAttribute('aria-pressed', 'false')

    await page.getByTestId('timeline-fullscreen').click()
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
    expect(await page.evaluate(() => window.__fullscreenCalls)).toBe(1)
    // Oracle #395 : un changement d'état RÉELLEMENT visible dans l'UI, pas seulement
    // l'appel d'une API stubée. Ce test rougirait si le clic ne changeait plus l'UI.
    await expect(fsButton).toHaveAttribute('aria-pressed', 'true')

    await page.getByTestId('timeline-fullscreen').click()
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
    expect(await page.evaluate(() => window.__fullscreenExits)).toBe(1)
    await expect(fsButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('plein écran : `aria-pressed` suit une SORTIE qui ne passe pas par le bouton (#395)', async ({
    page,
  }) => {
    // Cas DISCRIMINANT de l'issue #395 : c'est lui — et lui seul — qui distingue un
    // état dérivé de `fullscreenchange` d'un `useState` basculé dans le handler du
    // bouton. Le plein écran se quitte aussi par la touche Échap (gérée par le
    // composant), l'Échap NATIF du navigateur, F11 ou le menu du navigateur : aucun
    // de ces chemins ne repasse par `onClick`. Un état optimiste resterait à `true`
    // et le bouton annoncerait « activé » hors plein écran (attribut MENSONGER,
    // annoncé tel quel par un lecteur d'écran). Ici on sort SANS toucher le bouton.
    await gotoTimelineWithProduct(page)
    await page.evaluate(() => {
      let active = false
      const root = document.documentElement
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => (active ? root : null),
      })
      Element.prototype.requestFullscreen = function requestFullscreenStub() {
        active = true
        window.__fullscreenCalls = (window.__fullscreenCalls ?? 0) + 1
        document.dispatchEvent(new Event('fullscreenchange'))
        return Promise.resolve()
      }
      document.exitFullscreen = function exitFullscreenStub() {
        active = false
        window.__fullscreenExits = (window.__fullscreenExits ?? 0) + 1
        document.dispatchEvent(new Event('fullscreenchange'))
        return Promise.resolve()
      }
    })

    const fsButton = page.getByTestId('timeline-fullscreen')
    await fsButton.click()
    await expect(fsButton).toHaveAttribute('aria-pressed', 'true')

    // Sortie HORS bouton (équivalent Échap natif / F11 / menu navigateur).
    await page.evaluate(() => document.exitFullscreen())
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
    await expect(fsButton).toHaveAttribute('aria-pressed', 'false')
    // Le bouton reste fonctionnel APRÈS une sortie externe : il ré-entre en plein
    // écran (et n'essaie pas de « sortir » d'un état qu'il croirait encore actif).
    await fsButton.click()
    await expect(fsButton).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => window.__fullscreenCalls)).toBe(2)
  })
})

/**
 * Seede un événement DIRECT (`POST /api/events`) avec une couleur explicite.
 * Nécessaire pour `timeline-event-outside-label` : `seedProduct` (création
 * imbriquée `POST /api/users/{id}/products`) ne permet PAS de fixer `color` sur
 * son event imbriqué (BR-EVE-014 : `color` n'est exposé qu'au create DIRECT).
 * PIT-S44-001 : `durationValue`/`durationUnit` restent INCONDITIONNELS même en
 * `type='single'` -> valeurs neutres sans effet métier.
 */
async function seedEventWithColor(
  page: Page,
  opts: { productId: string; name: string; color: string },
): Promise<void> {
  const res = await page.request.post(`${API}/events`, {
    data: {
      name: opts.name,
      type: 'single',
      durationValue: 0,
      durationUnit: 'days',
      isRecurring: false,
      date: todayIsoDate(),
      color: opts.color,
      productId: opts.productId,
    },
  })
  expect(res.status(), `seed event coloré doit renvoyer 201 (obtenu ${res.status()})`).toBe(201)
}

/**
 * #330 (Sprint 54, lot c) — Minimap + états transitoires + contraste de couleur.
 * Les 2 faux positifs de l'issue d'origine (18) sont RETIRÉS de ce lot :
 * `desktop-edit-trigger` / `mobile-delete-trigger` sont des doublures RTL
 * déclarées dans `TimelineEditHost.test.tsx` (stubs de test, jamais rendues en
 * production — grep confirmé sur `frontend/src/**` et `frontend/app/` : aucune
 * occurrence hors ce fichier `*.test.tsx`, cf. retour de tâche).
 */
test.describe('#330 Minimap / états transitoires / contraste (desktop)', () => {
  test('minimap-viewport : le clavier ET le scroll de la frise déplacent le curseur', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Minimap Cat'))
    await seedProduct(page, { userId, name: unique('Minimap Prod'), categoryId: cat.id })
    await gotoTimeline(page)

    const viewport = page.getByTestId('timeline-minimap-viewport')
    await expect(viewport).toBeVisible()

    // #330-fix (Sprint 54) — PRÉMISSE FAUSSE : le clavier était testé AVANT tout
    // zoom, au niveau 'Mois' par défaut. Sur un produit peu chargé, à ce zoom le
    // rail (`railWidth = totalDays * dayWidth`) tient ENTIÈREMENT dans le
    // viewport -> `viewportRatio = min(1, clientWidth/railWidth) === 1`
    // (`TimelineView.tsx:711`) -> `Minimap.tsx:34-35` clampe `ratio` à 1 et
    // `clampedStart` à `Math.min(1-ratio, ...) = 0` INCONDITIONNELLEMENT : `+
    // step` ne peut jamais dépasser `1-ratio = 0`, la flèche ne PEUT PAS bouger
    // (rien à déplacer, pas un handler cassé — confirmé en lisant `Minimap.tsx`).
    // La section scroll ci-dessous zoomait sur 'Jour' pour garantir le même
    // presupposé (`geometry.scrollWidth > clientWidth`) — il fallait l'établir
    // AVANT le test clavier aussi, pas seulement avant le scroll.
    await page.getByTestId('timeline-zoom-in').click()
    await page.getByTestId('timeline-zoom-in').click()
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Jour')

    const scrollEl = page.getByTestId('timeline-scroll')
    const geometry = await scrollEl.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(
      geometry.scrollWidth,
      'le rail doit dépasser le viewport pour que le clavier ET le scroll aient un effet',
    ).toBeGreaterThan(geometry.clientWidth)

    // #390-fix (H) — la garde `scrollWidth > clientWidth` ci-dessus n'exclut PAS le
    // clamp `ratio >= 0.667` (Minimap.tsx:35) : `step = ratio/2` (Minimap.tsx:83) est
    // alors borné par `1 - ratio`, et `aria-valuenow` (arrondi ENTIER, Minimap.tsx:125)
    // ne bouge pas -> ArrowRight devient un no-op, flake selon la largeur du rail. On
    // lit le ratio RÉEL de la fenêtre (largeur du handle = `${ratio*100}%`,
    // Minimap.tsx:129) et on exige < 50% pour garantir que `step` déplace la valeur.
    const viewportRatioPct = await viewport.evaluate((el) =>
      parseFloat((el as HTMLElement).style.width),
    )
    expect(
      viewportRatioPct,
      'la fenêtre minimap doit couvrir < 50% du rail (sinon ArrowRight est un no-op via le clamp 1-ratio)',
    ).toBeLessThan(50)

    // --- Clavier (role=slider, ArrowRight) ----------------------------------
    const before = await viewport.getAttribute('aria-valuenow')
    await viewport.focus()
    await viewport.press('ArrowRight')
    await expect(async () => {
      expect(await viewport.getAttribute('aria-valuenow')).not.toBe(before)
    }).toPass()

    // --- Scroll de la frise (onScroll -> syncViewportFromScroll -> Minimap) -
    const leftBeforeScroll = await viewport.evaluate((el) => (el as HTMLElement).style.left)
    await scrollEl.evaluate((el) => {
      el.scrollLeft = el.scrollWidth - el.clientWidth
    })
    await expect(async () => {
      const leftAfterScroll = await viewport.evaluate((el) => (el as HTMLElement).style.left)
      expect(leftAfterScroll).not.toBe(leftBeforeScroll)
    }).toPass()
  })

  // #391 (Sprint 56) — CONTRAT DU CHARGEMENT DE SESSION SUR `/timeline`.
  //
  // Le chargement GLOBAL de session est porté par le SHELL, pas par la page :
  // `AppShell` (`components/layout/AppShell.tsx:114`, #210) pose sa garde
  // `useAuthGuard()` et rend `app-shell-loading` SANS monter `children` tant que
  // `loading || !user`. `app-shell-loading` est donc le SEUL testid observable de
  // cet état ; la page de la frise n'en porte aucun. `timeline-data-loading`
  // (couvert plus haut) est un état DIFFÉRENT : chargement des DONNÉES, sous un
  // shell déjà monté.
  //
  // L'assertion `timeline-loading` à 0 est un VERROU DE NON-RÉGRESSION : ce testid
  // a existé sur `page.tsx` jusqu'à #391, où il a été supprimé comme code mort
  // (structurellement inatteignable sous le shell). Sa réapparition ferait rougir
  // ce test.
  //
  // Sensibilité : la gate sur `/api/auth/me` est ce qui rend l'état OBSERVABLE.
  // Sans elle, `/me` répond en quelques ms et le spinner a déjà disparu — d'où la
  // vérification de STABILITÉ ci-dessous (le spinner tient tant que la gate n'est
  // pas libérée), sans laquelle le test constaterait un écran déjà chargé et ne
  // prouverait rien.
  test('chargement de session : app-shell-loading porté par le shell, puis écran réel', async ({
    page,
  }) => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/api/auth/me', async (route) => {
      await gate
      await route.continue()
    })

    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })

    const shellLoading = page.getByTestId('app-shell-loading')
    await expect(shellLoading).toBeVisible()
    await expect(shellLoading.getByRole('status')).toBeVisible()

    // Stabilité : `/me` reste gatée, l'état DOIT persister. C'est cette attente
    // qui donne sa sensibilité au test (sans gate, elle rougit ici).
    await page.waitForTimeout(1_000)
    await expect(shellLoading).toBeVisible()
    // Le shell ne monte pas `children` : ni l'écran, ni un quelconque spinner de page.
    await expect(page.getByTestId('timeline-screen')).toHaveCount(0)
    await expect(page.getByTestId('timeline-loading')).toHaveCount(0)

    release()

    await expect(shellLoading).toHaveCount(0)
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
    // Verrou : la branche morte ne doit pas réapparaître, même écran monté.
    await expect(page.getByTestId('timeline-loading')).toHaveCount(0)
  })

  test('live-region : contenu réel annoncé (zoom puis event sélectionné), pas juste présence', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Live Cat'))
    const product = await seedProduct(page, { userId, name: unique('Live Prod'), categoryId: cat.id })
    await gotoTimeline(page)

    const live = page.getByTestId('timeline-live-region')
    await expect(live).toBeVisible()
    await expect(live).toHaveAttribute('aria-live', 'polite')
    // Vide au chargement : pas d'annonce parasite (une live-region non vide au
    // montage serait un bug a11y qu'une simple assertion de présence ne verrait pas).
    await expect(live).toHaveText('')

    await page.getByTestId('timeline-zoom-out').click()
    await expect(live).toHaveText('Niveau de zoom : Trimestre')

    // #330-fix (Sprint 54) — BUG PRODUIT trouvé à la mesure (signalé, pas maquillé) :
    // au zoom Trimestre, un événement proche du début de l'étendue (`rangeStart`,
    // `computeRange` = 30j avant le 1er event) se positionne à `daysBetween *
    // dayWidth` = 30*5 = 150px < `--lane-header-w` (168px, `spacing.css:48`).
    // L'en-tête de lane STICKY (`.mt-tlv__lane-label`, `position:sticky;left:0`,
    // `TimelineView.tsx:331` `timeline-resource-head`) recouvre alors la pastille :
    // Playwright confirme "intercepts pointer events" — reproduit hors suite,
    // valeurs mesurées 150px < 168px. AUCUN scroll ne peut la dégager (le rail à
    // ce zoom, pour un seul produit, tient dans le viewport : pas d'overflow) —
    // inatteignable à la SOURIS pour un utilisateur réel. Défaut d'accessibilité
    // réel, cf. RECOMMAND_FOLLOWUP. Cette spec teste le contenu de la live-region
    // sur SÉLECTION, pas le mode d'interaction : on active la pastille au CLAVIER
    // (Enter, chemin natif du `<button>`, cf. `EventPill.tsx` — même `onSelect`
    // que le clic) pour exercer le comportement réel sans dépendre du défaut ci-dessus.
    const pill = page.locator(`[data-testid="timeline-event"][data-event-title="${product.name}"]`)
    await pill.focus()
    await pill.press('Enter')
    await expect(live).toHaveText(`Événement sélectionné : ${product.name}`)
  })

  test('event-outside-label : dépend du CONTRASTE de couleur, pas de la longueur du titre', async ({
    page,
  }) => {
    // PRÉMISSE CORRIGÉE (vs. briefing #330) : le briefing décrit ce testid comme
    // déclenché par un libellé trop long pour la pastille (« zoom arrière, titre
    // long »). Lecture du code (`EventPill.tsx:70`, `lib.ts:60-64`) : le vrai
    // déclencheur est `eventLabelReadableInside(event.color)`, UNIQUEMENT fonction
    // du contraste WCAG AA (4.5:1) de `event.color` contre l'encre noire/blanche —
    // AUCUN lien avec la largeur de la pastille ou la longueur du titre. `#787878`
    // (ratio mesuré = 4.432, < 4.5) déclenche le libellé extérieur ; `#1D4ED8`
    // (ratio mesuré = 6.70) ne le déclenche jamais, à titre et produit identiques
    // par ailleurs (seule variable isolée : la couleur).
    //
    // Effet de bord noté en préparant ce test (hors périmètre #330) : `DEFAULT_COLOR`
    // valait alors `#6366f1`, ratio mesuré 4.467 — LUI-MÊME sous le seuil AA, donc un
    // event sans couleur explicite déclenchait déjà ce libellé en production. ✅ CORRIGÉ
    // depuis (#393, Sprint 56) : `DEFAULT_COLOR` = `#3B62D4` (5.407:1, palette event du
    // DS). Le test fixe de toute façon les DEUX couleurs explicitement — il n'a jamais
    // dépendu de ce défaut, et n'a donc pas bougé avec lui.
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Outside Cat'))
    const product = await seedProduct(page, { userId, name: unique('Outside Prod'), categoryId: cat.id })
    const lowContrastTitle = unique('Low Contrast Evt')
    const highContrastTitle = unique('High Contrast Evt')
    await seedEventWithColor(page, {
      productId: product.id,
      name: lowContrastTitle,
      color: '#787878',
    })
    await seedEventWithColor(page, {
      productId: product.id,
      name: highContrastTitle,
      color: '#1D4ED8',
    })

    await gotoTimeline(page)

    await expect(
      page.locator('[data-testid="timeline-event-outside-label"]').filter({ hasText: lowContrastTitle }),
    ).toHaveText(lowContrastTitle)

    // #390-fix (C) — garde de PRÉSENCE : sans elle, le `toHaveCount(0)` ci-dessous
    // serait vacuously vert si la pastille high-contrast n'était pas rendue du tout
    // (event absent du fetch, packing de lane, seed ignoré) — la variable COULEUR,
    // objet même du test, ne serait alors jamais isolée. On exige d'abord la
    // pastille PORTEUSE, PUIS l'absence de son libellé extérieur.
    await expect(
      page.locator(`[data-testid="timeline-event"][data-event-title="${highContrastTitle}"]`),
    ).toHaveCount(1)
    await expect(
      page
        .locator('[data-testid="timeline-event-outside-label"]')
        .filter({ hasText: highContrastTitle }),
    ).toHaveCount(0)
  })
})

/**
 * #331 (vague 1) — le contrat de testid dérivé de la `value` a livré 4 testids
 * d'options, dont 2 restaient POSÉS SANS SPEC : `recurrence-unit-option-WEEK` et
 * `recurrence-unit-option-YEAR` (specs=0 mesuré par le lead avant ce sprint). Seul
 * MONTH était exercé (test « création complète », #314 ci-dessus). Étape 1bis
 * (#330) : couvrir les deux avec le MÊME oracle que MONTH — le trigger affiche la
 * bonne unité (`SelectValue` -> libellé de l'item choisi) — PLUS le libellé de la
 * mini-frise preview (`event-form-preview-recurrence`), qui distingue
 * explicitement WEEK de YEAR (pas seulement « une unité a été choisie », mais
 * « LA bonne »). Les DEUX unités sont exercées (pas une seule, l'une suffirait à
 * prouver que le mécanisme de sélection fonctionne mais pas que le MAPPING de
 * chaque valeur est correct) : elles portent des valeurs BACKEND distinctes
 * (BR-EVE-006, enum `RecurrenceUnit` WEEK/MONTH/YEAR) — un bug de mapping sur
 * l'une des deux ne serait pas détecté par un test qui n'exercerait que l'autre.
 */
test.describe('#330 (étape 1bis, #331) — options de récurrence WEEK et YEAR', () => {
  test('sélectionner WEEK puis YEAR : le trigger ET la preview affichent la bonne unité', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Recurrence Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Recurrence Prod'),
      categoryId: cat.id,
    })

    await gotoTimeline(page)
    await openNewEventDrawer(page)

    await page.getByTestId('shell-new-event-drawer-product-trigger').click()
    await page.getByRole('option', { name: product.name }).click()
    await page.getByTestId('event-form-title-input').fill(unique('Recurrence Evt'))
    await page.getByTestId('event-form-duration-value').fill('3')
    await page.getByTestId('event-form-recurring-toggle').click()

    // --- WEEK ----------------------------------------------------------------
    await page.getByTestId('event-form-recurrence-trigger').click()
    await page.getByTestId('recurrence-unit-option-WEEK').click()
    await expect(page.getByTestId('event-form-recurrence-trigger')).toContainText('Semaines')
    await expect(page.getByTestId('event-form-preview-recurrence')).toHaveText('Récurrent · Semaines')

    // --- YEAR (bascule DEPUIS WEEK, pas l'état initial : preuve que le mapping
    //     réagit à un CHANGEMENT, pas seulement à une première sélection) -------
    await page.getByTestId('event-form-recurrence-trigger').click()
    await page.getByTestId('recurrence-unit-option-YEAR').click()
    await expect(page.getByTestId('event-form-recurrence-trigger')).toContainText('Années')
    await expect(page.getByTestId('event-form-preview-recurrence')).toHaveText('Récurrent · Années')
    // Le passage à YEAR n'a pas laissé de trace de WEEK (bascule réelle, pas un ajout).
    await expect(page.getByTestId('event-form-recurrence-trigger')).not.toContainText('Semaines')
  })
})

/* ==========================================================================
 * #392 (Sprint 56) — En-tête de lane STICKY vs pastilles du début d'étendue.
 *
 * BUG (constaté #330/Sprint 54, PR #390) : `.mt-tlv__lane-label` est
 * `position:sticky; left:0` et OPAQUE. Elle recouvre donc TOUJOURS les
 * `--lane-header-w` (168px) premiers pixels du viewport de la frise. Une
 * pastille dont l'origine sur la piste est < 168px est alors inatteignable à
 * la SOURIS À TOUT NIVEAU DE SCROLL : défiler vers la droite déplace l'en-tête
 * avec le viewport, il recouvre toujours autant. `computeRange` (zoom.ts) pose
 * `rangeStart` à 30 jours avant le 1er event → le 1er event est à
 * `30 * dayWidth` px, ce qui passe SOUS 168px à deux niveaux de zoom :
 *   Trimestre 30*5   = 150px  < 168  ✗
 *   Année     30*2.2 =  66px  < 168  ✗
 *   Mois      30*12  = 360px         ✓
 *   Semaine   30*34  = 1020px        ✓
 *   Jour      30*96  = 2880px        ✓
 *
 * ⚠ E2E OBLIGATOIRE (pas de test jsdom) : jsdom ne fait AUCUN hit-testing —
 * un test unitaire ne verra JAMAIS « intercepts pointer events » et serait un
 * faux témoin (piège déjà payé S51 sur les tests de scroll).
 *
 * DÉTERMINISME — le listing produits est STUBBÉ ici, contrairement au reste de
 * cette spec qui tourne contre le vrai backend. Le compte PROD est partagé par
 * toutes les specs du run : `rangeStart` dépend du MINIMUM des dates de TOUS
 * les events du compte. Sur un état seedé réel, la prémisse « la pastille est
 * à 30 jours de rangeStart » n'est pas un contrat — le test deviendrait vert à
 * vide (pastille repoussée loin à droite, plus aucun recouvrement à prouver)
 * dès qu'une autre spec seede un event antérieur. Un produit / un event / une
 * date connue = la géométrie exacte du bug, à chaque run.
 * ========================================================================== */

const STICKY_PRODUCT_ID = '3a1f0000-0000-4000-8000-000000000392'
const STICKY_EVENT_ID = '3a1f0000-0000-4000-8000-000000000393'
const STICKY_CATEGORY_ID = '3a1f0000-0000-4000-8000-000000000394'

/**
 * Stub : UN produit, UN événement daté du jour → `rangeStart = aujourd'hui - 30`
 * (`computeRange`, padDays=30) et donc `dayOffset = 30` exactement.
 * Couleur `#1D4ED8` (ratio 6.70 > AA) : évite le libellé extérieur de secours,
 * qui ajouterait un nœud parasite au voisinage de la pastille (cf. #81 point 6).
 */
async function stubStickyLaneFixture(page: Page, productName: string): Promise<void> {
  const today = todayIsoDate()
  await stubProductsList(page, [
    {
      id: STICKY_PRODUCT_ID,
      name: productName,
      color: '#1D4ED8',
      category: { id: STICKY_CATEGORY_ID, name: 'Sticky Cat', color: '#1D4ED8' },
      events: [
        {
          id: STICKY_EVENT_ID,
          title: productName,
          type: 'single',
          startDate: today,
          endDate: today,
          productId: STICKY_PRODUCT_ID,
          color: '#1D4ED8',
          archived: false,
        },
      ],
    },
  ])
}

/**
 * Géométrie d'occlusion d'une lane, exprimée dans le repère du RAIL (donc
 * INDÉPENDANTE du scroll courant) :
 *   - `pillRailX`  : abscisse de la pastille depuis l'origine du rail
 *     (`pill.x - scroll.x + scrollLeft`) ;
 *   - `headWidth`  : largeur de l'en-tête sticky = épaisseur de la bande que
 *     l'en-tête recouvre EN PERMANENCE au bord gauche du viewport.
 *
 * `pillRailX >= headWidth` est l'invariant de reachability : il signifie qu'à
 * `scrollLeft = 0` (position la plus à gauche atteignable) la pastille est
 * entièrement hors de la bande recouverte. C'est le SEUL énoncé durable —
 * comparer les boîtes écran ne vaut qu'au scroll courant, et à un scroll
 * quelconque TOUTE pastille peut passer sous l'en-tête (c'est le principe même
 * d'un en-tête sticky, pas le bug).
 */
async function laneOcclusionGeometry(
  page: Page,
  productName: string,
): Promise<{ pillRailX: number; headWidth: number }> {
  const head = resourceHead(page, productName)
  const scroll = page.getByTestId('timeline-scroll')
  const pill = resourceRow(page, productName).locator('[data-testid="timeline-event"]').first()
  await expect(pill).toBeVisible()
  const headBox = await head.boundingBox()
  const pillBox = await pill.boundingBox()
  const scrollBox = await scroll.boundingBox()
  expect(headBox, "l'en-tête de lane doit être mesurable").not.toBeNull()
  expect(pillBox, 'la pastille doit être mesurable').not.toBeNull()
  expect(scrollBox, 'le conteneur de scroll doit être mesurable').not.toBeNull()
  const scrollLeft = await scroll.evaluate((el) => el.scrollLeft)
  return {
    pillRailX: pillBox!.x - scrollBox!.x + scrollLeft,
    headWidth: headBox!.width,
  }
}

test.describe('#392 /timeline — en-tête de lane sticky et pastilles atteignables', () => {
  /**
   * PARCOURS 1 (critère d'acceptation n°1) — le clic SOURIS. `click()` SANS
   * `force` : c'est le contrôle d'actionnabilité de Playwright (hit-test au
   * point cible) qui constitue l'oracle. Avant le correctif il échoue avec
   * « <button data-testid="timeline-resource-head"> intercepts pointer events ».
   */
  test('zoom Trimestre : la pastille du début d’étendue est cliquable à la SOURIS', async ({
    page,
  }) => {
    const productName = unique('Sticky Prod')
    await stubStickyLaneFixture(page, productName)
    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-host')).toBeVisible()

    await page.getByTestId('timeline-zoom-out').click()
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Trimestre')

    // Prémisse : à ce zoom la pastille tombe bien dans la zone que l'en-tête
    // recouvrait (30j * 5px = 150px < 168px). Sans cette garde le test pourrait
    // devenir vert à vide si la géométrie de l'étendue changeait.
    const scroll = page.getByTestId('timeline-scroll')
    const noOverflow = await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)
    expect(
      noOverflow,
      'à ce zoom le rail tient dans le viewport : AUCUN scroll ne peut dégager la pastille',
    ).toBeTruthy()

    const pill = resourceRow(page, productName).locator('[data-testid="timeline-event"]').first()
    await pill.click()

    await expect(page.getByTestId('timeline-drawer')).toBeVisible()
    await expect(page.getByTestId('timeline-live-region')).toHaveText(
      `Événement sélectionné : ${productName}`,
    )
  })

  /**
   * PARCOURS 2 (critère d'acceptation n°2) — NON-RÉGRESSION sur les 5 niveaux.
   * Invariant durable, indépendant du mécanisme retenu : la pastille commence
   * APRÈS la fin de l'en-tête sticky. Les niveaux larges (Trimestre, Année)
   * étaient rouges, les étroits (Jour, Semaine, Mois) doivent le rester verts —
   * un correctif qui décalerait la piste dans le mauvais sens les casserait.
   */
  test('les 5 niveaux de zoom : la pastille ne démarre jamais sous l’en-tête sticky', async ({
    page,
  }) => {
    const productName = unique('Sticky Zoom Prod')
    await stubStickyLaneFixture(page, productName)
    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-host')).toBeVisible()

    const level = page.getByTestId('timeline-zoom-level')
    // Départ 'Mois' (initialZoomState) → on descend jusqu'à 'Jour', puis on
    // remonte niveau par niveau : les 5 sont traversés dans un ordre connu.
    await page.getByTestId('timeline-zoom-in').click()
    await page.getByTestId('timeline-zoom-in').click()
    await expect(level).toHaveText('Jour')

    for (const expected of ['Jour', 'Semaine', 'Mois', 'Trimestre', 'Année']) {
      if (expected !== 'Jour') await page.getByTestId('timeline-zoom-out').click()
      await expect(level).toHaveText(expected)

      // Aux zooms étroits la pastille (30 j après `rangeStart`) sort de la bande
      // de virtualisation horizontale et n'est PAS montée : elle n'est donc pas
      // mesurable sans amener la fenêtre sur elle. Raccourci « T » (GO_TO_TODAY)
      // — chemin produit réel, aucun scroll bricolé par le test.
      await page.keyboard.press('t')

      const { pillRailX, headWidth } = await laneOcclusionGeometry(page, productName)
      expect(
        pillRailX,
        `zoom ${expected} : la pastille démarre à ${pillRailX}px de l'origine du rail, ` +
          `sous les ${headWidth}px recouverts en permanence par l'en-tête sticky`,
      ).toBeGreaterThanOrEqual(headWidth - 0.5)
    }
  })

  /**
   * PARCOURS 3 — contre-preuve exigée par le plan : l'en-tête de lane est
   * LUI-MÊME interactif (accordéon produit #195). Un correctif par
   * `pointer-events:none` non borné rendrait ce test rouge — c'est précisément
   * l'échange « un bug contre un autre » qu'on doit interdire. Exercé au zoom
   * Trimestre, celui du correctif.
   */
  test('l’en-tête de lane reste cliquable (repli/dépliage) au zoom Trimestre', async ({ page }) => {
    const productName = unique('Sticky Toggle Prod')
    await stubStickyLaneFixture(page, productName)
    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-host')).toBeVisible()

    await page.getByTestId('timeline-zoom-out').click()
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Trimestre')

    const head = resourceHead(page, productName)
    const pill = resourceRow(page, productName).locator('[data-testid="timeline-event"]')

    await expect(head).toHaveAttribute('aria-expanded', 'true')
    await expect(pill).toHaveCount(1)

    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(pill, 'les pastilles de la lane repliée sont démontées').toHaveCount(0)

    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    await expect(pill, 'les pastilles sont réaffichées au dépli').toHaveCount(1)
  })
})

/* ============================================================================
 * #449 — ANCRE TEMPORELLE DU DÉFILEMENT AU CHANGEMENT DE ZOOM
 *
 * DÉFAUT REPRODUIT (mesures ci-dessous, contrôle négatif joué) : `scrollLeft`
 * est posé en PIXELS et n'était jamais re-projeté quand l'échelle px/jour
 * changeait. Au zoom arrière la piste rétrécit, le navigateur RABAT la valeur
 * périmée sur `scrollWidth - clientWidth`, la frise saute au bord droit et les
 * pastilles de la zone regardée sortent de la bande de virtualisation
 * (`OVERSCAN_X_PX = 600`) : elles ne sont plus MONTÉES. La frise paraît vide
 * alors que les lanes restent visibles.
 *
 * Sans le correctif : `scrollLeft` = 26691 pour un `scrollWidth - clientWidth`
 * de 26691 (rabattu à l'unité près), pastille du jour montée 0 fois.
 * Avec : 24865 (= 4973,08 j × 5 px/j), pastille du jour toujours montée.
 *
 * ⚠ E2E OBLIGATOIRE, jamais jsdom : jsdom NE CLAMPE PAS `scrollLeft` (il relit
 * ce qu'on lui écrit) — le défaut y est structurellement invisible et un test
 * unitaire serait un faux témoin (cf. [[jsdom-scroll-tests-prove-nothing]]).
 *
 * DÉTERMINISME : listing produits STUBBÉ, comme le fixture #392 ci-dessus. Le
 * défaut n'apparaît que si la piste DÉBORDE et si la zone regardée n'est pas
 * déjà le bord droit — deux conditions qui dépendent de l'étendue, donc de
 * TOUS les events du compte partagé. Sur état seedé réel la spec deviendrait
 * verte à vide (sur la base au moment de l'écriture : `scrollWidth` = 982 =
 * `clientWidth`, AUCUN débordement, donc rien à prouver).
 * ========================================================================== */

const WIDE_PRODUCT_ID = '4a1f0000-0000-4000-8000-000000000449'

/** Date ISO (locale, minuit) décalée de `days` par rapport à aujourd'hui. */
function isoOffsetDate(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * UN produit, TROIS events : J-4970, J (l'oracle) et J+470. `computeRange`
 * (padDays = 30) rend donc une étendue de 5501 jours avec aujourd'hui au jour
 * 5000 — soit, au zoom Mois (12 px/j), une piste qui déborde largement ET un
 * centrage sur aujourd'hui qui n'est PAS le bord droit. C'est exactement la
 * configuration où le rabattement se voit.
 */
async function stubWideRangeFixture(page: Page, productName: string): Promise<void> {
  const mkEvent = (suffix: string, title: string, dayOffset: number) => ({
    id: `${WIDE_PRODUCT_ID}-${suffix}`,
    title,
    type: 'single',
    startDate: isoOffsetDate(dayOffset),
    endDate: isoOffsetDate(dayOffset),
    productId: WIDE_PRODUCT_ID,
    color: '#1D4ED8',
    archived: false,
  })
  await stubProductsList(page, [
    {
      id: WIDE_PRODUCT_ID,
      name: productName,
      color: '#1D4ED8',
      category: { id: `${WIDE_PRODUCT_ID}-cat`, name: 'Wide Cat', color: '#1D4ED8' },
      events: [
        mkEvent('past', 'Borne passe', -4970),
        mkEvent('today', productName, 0),
        mkEvent('future', 'Borne futur', 470),
      ],
    },
  ])
}

/**
 * Attend l'ARRÊT du défilement (deux lectures consécutives égales) avant de
 * mesurer. `.mt-tlv__scroll` porte `scroll-behavior:smooth`
 * (`ds/components/timeline.css:127`) : une mesure prise en vol lit une position
 * transitoire et rendrait la spec bruyante (famille PIT-S54-003).
 */
async function settledScroll(page: Page): Promise<{ scrollLeft: number; maxScroll: number }> {
  const scroll = page.getByTestId('timeline-scroll')
  let previous = -1
  for (let i = 0; i < 40; i++) {
    const value = await scroll.evaluate((el) => el.scrollLeft)
    if (value === previous) break
    previous = value
    await page.waitForTimeout(100)
  }
  return scroll.evaluate((el) => ({
    scrollLeft: el.scrollLeft,
    maxScroll: el.scrollWidth - el.clientWidth,
  }))
}

test.describe('#449 /timeline — le zoom arrière conserve la zone temporelle', () => {
  test('zoom arrière sur une étendue large : la frise reste sur aujourd’hui, pas rabattue au bord droit', async ({
    page,
  }) => {
    const productName = unique('Wide Range Prod')
    await stubWideRangeFixture(page, productName)
    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-host')).toBeVisible()

    const todayPill = page.locator(
      `[data-testid="timeline-event"][data-event-title="${productName}"]`,
    )

    // PRÉMISSES — sans elles la spec pourrait devenir verte à vide.
    const before = await settledScroll(page)
    expect(
      before.maxScroll,
      'la piste DOIT déborder au zoom Mois, sinon il n’y a aucun rabattement possible',
    ).toBeGreaterThan(0)
    expect(
      before.scrollLeft,
      'la zone regardée ne doit pas être DÉJÀ le bord droit, sinon le défaut est indiscernable',
    ).toBeLessThan(before.maxScroll)
    await expect(todayPill, 'la pastille du jour est montée avant le zoom').toHaveCount(1)

    await page.getByTestId('timeline-zoom-out').click()
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Trimestre')

    const after = await settledScroll(page)
    expect(
      after.scrollLeft,
      `zoom arrière : scrollLeft=${after.scrollLeft} rabattu sur le maximum ` +
        `${after.maxScroll} — la frise a sauté au bord droit`,
    ).toBeLessThan(after.maxScroll)
    await expect(
      todayPill,
      'la pastille du jour reste montée : la frise n’a pas quitté la zone regardée',
    ).toHaveCount(1)
  })
})
