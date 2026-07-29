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
 */
test.describe('#330 Toolbar desktop — zoom-out / today / weekend / aide / plein écran', () => {
  test('zoom-out : dézoome (Mois → Trimestre), oracle timeline-zoom-level', async ({ page }) => {
    await gotoTimeline(page)
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
    await gotoTimeline(page)
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

  test('weekend : motif calendaire réel (paire samedi/dimanche, écarts 34/238px) au zoom Semaine', async ({
    page,
  }) => {
    await gotoTimeline(page)
    await expect(page.getByTestId('timeline-weekend')).toHaveCount(0) // zoom Mois par défaut : []

    await page.getByTestId('timeline-zoom-in').click()
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Semaine')

    const segments = page.getByTestId('timeline-weekend')
    const count = await segments.count()
    // Le compte ABSOLU dépend de l'étendue totale du compte PARTAGÉ PROD (croît
    // avec chaque spec du run, cf. #328 dans timeline-mobile.spec.ts) : au lieu d'un
    // nombre figé, on vérifie le MOTIF calendaire — `DAY_WIDTH_PX.week` = 34px
    // (zoom.ts) : un week-end = samedi puis dimanche (écart 34px), le week-end
    // suivant 7 jours plus tard (écart 238px). Aucun autre écart n'est un
    // calendrier valide : c'est la preuve du « bon nombre » exigée par le briefing,
    // indépendante du volume accumulé — pas juste « >= 1 ».
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
      expect([34, 238], `écart ${delta}px entre segments ${i - 1} et ${i}`).toContain(delta)
    }
  })

  test('aide : le survol ouvre le panneau de raccourcis (opacité), le contenu est réel', async ({
    page,
  }) => {
    await gotoTimeline(page)
    // `.mt-tlv__help-pop` est TOUJOURS dans le DOM avec un bounding-box non vide
    // (`opacity:0;pointer-events:none` par défaut, timeline.css:190) : une
    // assertion `toBeVisible()` passerait à tort SANS survol — piège de la même
    // famille que les 28 régressions ratées au S53 (vérification verte qui ne
    // regarde pas la bonne propriété CSS). L'oracle est l'opacité calculée.
    const pop = page.locator('#timeline-help-pop')
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
    await page.addInitScript(() => {
      // Pas de `this` aliasé (identité de l'élément non pertinente ici, seule la
      // TRUTHINESS de `document.fullscreenElement` est consommée par le handler).
      let active = false
      const root = document.documentElement
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => (active ? root : null),
      })
      Element.prototype.requestFullscreen = function requestFullscreenStub() {
        active = true
        window.__fullscreenCalls = (window.__fullscreenCalls ?? 0) + 1
        return Promise.resolve()
      }
      document.exitFullscreen = function exitFullscreenStub() {
        active = false
        window.__fullscreenExits = (window.__fullscreenExits ?? 0) + 1
        return Promise.resolve()
      }
    })

    await gotoTimeline(page)
    await page.getByTestId('timeline-fullscreen').click()
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
    expect(await page.evaluate(() => window.__fullscreenCalls)).toBe(1)

    await page.getByTestId('timeline-fullscreen').click()
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
    expect(await page.evaluate(() => window.__fullscreenExits)).toBe(1)
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

    // --- Clavier (role=slider, ArrowRight) ----------------------------------
    const before = await viewport.getAttribute('aria-valuenow')
    await viewport.focus()
    await viewport.press('ArrowRight')
    await expect(async () => {
      expect(await viewport.getAttribute('aria-valuenow')).not.toBe(before)
    }).toPass()

    // --- Scroll de la frise (onScroll -> syncViewportFromScroll -> Minimap) -
    // Zoom sur 'Jour' pour garantir un rail plus large que le viewport (même
    // garde-fou que timeline-mobile.spec.ts #328 : au zoom par défaut, sur un
    // compte peu chargé, le rail peut être plus étroit que le viewport -> aucun
    // scroll possible, le test serait insatisfiable).
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
      'le rail doit dépasser le viewport pour que le scroll ait un effet',
    ).toBeGreaterThan(geometry.clientWidth)

    const leftBeforeScroll = await viewport.evaluate((el) => (el as HTMLElement).style.left)
    await scrollEl.evaluate((el) => {
      el.scrollLeft = el.scrollWidth - el.clientWidth
    })
    await expect(async () => {
      const leftAfterScroll = await viewport.evaluate((el) => (el as HTMLElement).style.left)
      expect(leftAfterScroll).not.toBe(leftBeforeScroll)
    }).toPass()
  })

  test('loading : timeline-loading pendant la restauration de session, puis bascule vers l’écran réel', async ({
    page,
  }) => {
    // `timeline-loading` (app/[locale]/(app)/timeline/page.tsx:47) est lié au
    // `loading` de `useAuthGuard`/`AuthContext` (re-fetch GET /api/auth/me au
    // montage), PAS au chargement des données produits (`timeline-data-loading`,
    // déjà couvert plus haut). Sans latence contrôlée l'état est trop bref pour
    // être asserté de façon fiable (même piège que `stubProductsListGated`) -> on
    // retarde /api/auth/me via `page.route()`. `ensureAuthenticated` n'est PAS
    // utilisé ici : il ferait sa PROPRE navigation vers /dashboard (donc son propre
    // appel /me) AVANT la pose de la route, hors du champ de la mesure.
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/api/auth/me', async (route) => {
      await gate
      await route.continue()
    })

    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })

    const loading = page.getByTestId('timeline-loading')
    await expect(loading).toBeVisible()
    await expect(loading.getByRole('status')).toBeVisible()

    release()

    await expect(loading).toHaveCount(0)
    // Bascule vers l'écran réel : preuve que le garde n'a PAS redirigé vers /login
    // pendant l'attente (storageState valide + loading résolu -> user présent).
    await expect(page.getByTestId('timeline-screen')).toBeVisible()
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

    await page.locator(`[data-testid="timeline-event"][data-event-title="${product.name}"]`).click()
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
    // Effet de bord noté en préparant ce test (hors périmètre #330, cf. retour de
    // tâche) : `DEFAULT_COLOR` (`types/event.ts`, `#6366f1`) a un ratio mesuré de
    // 4.467 — LUI-MÊME sous le seuil AA. Un event sans couleur explicite (le cas
    // `seedProduct` par défaut) déclenche donc déjà ce libellé en production ; ce
    // test isole volontairement le contraste en fixant les DEUX couleurs
    // explicitement plutôt que de s'appuyer sur ce défaut ambigu comme témoin.
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
