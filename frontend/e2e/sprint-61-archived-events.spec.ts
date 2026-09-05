import { test, expect, type APIRequestContext } from '@playwright/test'
import { PROD } from './support/accounts'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #307 (Sprint 61) — E2E : un événement ARCHIVÉ reste atteignable, ré-ouvrable en
 * édition et DÉSARCHIVABLE depuis la vue détail produit (BR-EVE-013, option A).
 *
 * Ce que ce spec prouve, et que rien ne prouvait avant : `sprint-42-events.spec.ts`
 * (#232) devait se contenter d'asserter la DISPARITION de l'event archivé — « le
 * pré-remplissage n'est pas vérifiable : event archivé non réouvrable via la frise ».
 * L'état de vue « actifs / archivés / tous » livré par #307 rend ce critère testable :
 * on rouvre bien le formulaire PRÉ-REMPLI (titre + toggle archivé coché).
 *
 * Auth : compte fixe PROD (storageState) → ZÉRO register par test. État seedé par API
 * (y compris l'archivage : le toggle par l'UI est DÉJÀ couvert par #232, le rejouer ici
 * ne testerait rien de neuf et rallongerait le parcours). Sélecteurs `data-testid`
 * EXCLUSIVEMENT — jamais de texte i18n (4 locales, `localePrefix:'always'`).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres migré, front :3000.
 */

test.use({ storageState: PROD.storageState })

const API = '/api'

interface ApiEvent {
  id: string
  title: string
  archived?: boolean
  version?: number
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
 * Seede un produit + son event, puis ARCHIVE l'event par API (BR-EVE-013, PATCH-only).
 * Renvoie l'état serveur de départ, source de vérité du test.
 */
async function seedArchivedEvent(
  page: import('@playwright/test').Page,
  label: string,
): Promise<{ userId: string; productId: string; event: ApiEvent }> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique(`${label} Cat`))
  const product = await seedProduct(page, {
    userId,
    name: unique(`${label} Prod`),
    categoryId: cat.id,
  })
  const [seeded] = await fetchProductEvents(page.request, userId, product.id)
  expect(seeded?.id, 'event seedé requis').toBeTruthy()
  expect(seeded.archived ?? false, 'event seedé non archivé au départ').toBe(false)

  const patch = await page.request.patch(`${API}/events/${seeded.id}`, {
    data: { archived: true, version: seeded.version },
  })
  expect(patch.status(), 'archivage par API doit réussir').toBe(200)

  const [archived] = await fetchProductEvents(page.request, userId, product.id)
  expect(archived.archived, 'event archivé côté serveur').toBe(true)
  return { userId, productId: product.id, event: archived }
}

test.describe('#307 Events archivés — retrouver, ré-éditer, désarchiver', () => {
  test('un event archivé est retrouvable puis ré-ouvert PRÉ-REMPLI en édition', async ({
    page,
  }) => {
    const { productId, event } = await seedArchivedEvent(page, 'Reopen')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('product-detail-view')).toBeVisible()

    // Vue par défaut « actifs » : l'archivé reste masqué (comportement historique).
    await expect(page.getByTestId('product-detail-timeline-empty')).toBeVisible()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toHaveCount(0)

    // Bascule sur « archivés » : l'event redevient atteignable, historique ET frise.
    await page.getByTestId('product-detail-filter-archived').click()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()
    await expect(page.getByTestId('timeline-event')).toHaveCount(1)

    // Réouverture en édition depuis la frise (TimelineEditHost) : formulaire PRÉ-REMPLI.
    // C'est le critère de #232 resté non testable jusqu'ici.
    await page.getByTestId('timeline-event').first().click()
    await page.getByTestId('event-drawer-edit').click()
    await expect(page.getByTestId('event-form')).toBeVisible()
    await expect(page.getByTestId('event-form-title-input')).toHaveValue(event.title)
    await expect(page.getByTestId('event-form-archived-toggle')).toBeChecked()
  })

  test('désarchiver depuis la vue « archivés » remet l’event dans les actifs', async ({ page }) => {
    const { userId, productId, event } = await seedArchivedEvent(page, 'Unarchive')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('product-detail-filter-archived').click()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()

    // Anti-flaky : on ASSERTE le statut du PATCH avant de juger le DOM.
    const patch = page.waitForResponse(
      (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
    )
    await page.getByTestId(`product-detail-unarchive-${event.id}`).click()
    expect((await patch).status(), 'PATCH de désarchivage doit réussir').toBe(200)

    // Source de vérité serveur (indépendante du DOM).
    const after = await fetchProductEvents(page.request, userId, productId)
    expect(after.find((e) => e.id === event.id)?.archived, 'archived repassé à false').toBe(false)

    // UI : l'event quitte la vue « archivés » (invalidation TanStack) et revient en actifs.
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toHaveCount(0)
    await page.getByTestId('product-detail-filter-active').click()
    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()
    await expect(page.getByTestId('timeline-event')).toHaveCount(1)
  })

  test('la vue « tous » montre actifs et archivés ensemble', async ({ page }) => {
    const { productId, event } = await seedArchivedEvent(page, 'AllView')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('product-detail-filter-all').click()

    await expect(page.getByTestId(`product-detail-history-row-${event.id}`)).toBeVisible()
    await expect(page.getByTestId('product-detail-filter')).toBeVisible()
    await expect(page.getByTestId('timeline-event')).toHaveCount(1)
  })
})

/**
 * #230 (Sprint 61) — UX de l'archivage : confirmation mentionnant l'effet sur le quota
 * d'events actifs (BR-EVE-011), grisage dans la frise, et verrouillage des champs
 * d'édition tant que `archived=true` (BR-EVE-013).
 *
 * Contrairement à #307, l'archivage est ici fait PAR L'UI (c'est le parcours testé) ;
 * le désarchivage par bouton reste couvert par #307.
 */
test.describe('#230 UX de l’archivage — confirmation, grisage, verrou', () => {
  test('un event archivé apparaît GRISÉ dans la frise (pas seulement absent)', async ({ page }) => {
    const { productId } = await seedArchivedEvent(page, 'Greyed')

    await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('product-detail-filter-all').click()

    // Le critère est « grisé plutôt qu'absent » : la pastille EXISTE et se déclare
    // archivée. Assertion sur l'attribut (état), pas sur une couleur calculée — un
    // ratio de contraste ne se mesure pas depuis un locator (cf. PIT-S58-001).
    const pill = page.getByTestId('timeline-event').first()
    await expect(pill).toBeVisible()
    await expect(pill).toHaveAttribute('data-archived', 'true')
    await expect(pill).toHaveClass(/--archived/)
  })

  test('archiver depuis l’UI demande une confirmation, annulable, qui parle du quota', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Confirm Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Confirm Prod'),
      categoryId: cat.id,
    })
    const [seeded] = await fetchProductEvents(page.request, userId, product.id)
    expect(seeded.archived ?? false, 'event seedé actif au départ').toBe(false)

    await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('timeline-event').first().click()
    await page.getByTestId('event-drawer-edit').click()
    await expect(page.getByTestId('event-form')).toBeVisible()

    // L'<input> qui porte le testid est visuellement masqué (`.mt-switch input` :
    // position:absolute; opacity:0; width:0; height:0 — core.css) : non actionnable par
    // Playwright. On clique la surface VISIBLE (le <label> parent) comme un utilisateur,
    // et on garde les assertions d'état sur l'input. Même convention que
    // `sprint-42-events.spec.ts` (scénario 2).
    const archivedToggle = page.getByTestId('event-form-archived-toggle')
    const clickArchivedToggle = () => archivedToggle.locator('xpath=ancestor::label[1]').click()

    // 1) Cocher « archivé » ouvre la confirmation, qui énonce l'effet quota
    //    (BR-EVE-011), la réversibilité (BR-EVE-013) et la lecture seule.
    await clickArchivedToggle()
    await expect(page.getByTestId('event-archive-confirm')).toBeVisible()
    await expect(page.getByTestId('event-archive-confirm-reversible')).toBeVisible()
    await expect(page.getByTestId('event-archive-confirm-readonly')).toBeVisible()

    // 2) Annuler ne change RIEN : ni le toggle, ni le verrou.
    await page.getByTestId('event-archive-cancel').click()
    await expect(page.getByTestId('event-archive-confirm')).toHaveCount(0)
    await expect(page.getByTestId('event-form-archived-toggle')).not.toBeChecked()
    await expect(page.getByTestId('event-form-title-input')).toBeEnabled()

    // 3) Confirmer verrouille les champs et affiche l'explication textuelle.
    await clickArchivedToggle()
    await page.getByTestId('event-archive-confirm-button').click()
    await expect(page.getByTestId('event-form-archived-toggle')).toBeChecked()
    await expect(page.getByTestId('event-form-archived-lock-note')).toBeVisible()
    await expect(page.getByTestId('event-form-title-input')).toBeDisabled()
    // Le désarchivage reste possible : le toggle et le submit restent actionnables.
    await expect(page.getByTestId('event-form-archived-toggle')).toBeEnabled()
    await expect(page.getByTestId('event-form-submit')).toBeEnabled()

    // 4) Le PATCH part et l'event quitte les actifs (source de vérité = serveur).
    const patch = page.waitForResponse(
      (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
    )
    await page.getByTestId('event-form-submit').click()
    expect((await patch).status(), 'PATCH d’archivage doit réussir').toBe(200)

    const after = await fetchProductEvents(page.request, userId, product.id)
    expect(after.find((e) => e.id === seeded.id)?.archived, 'archived passé à true').toBe(true)
    // BR-EVE-011 (non-régression) : le compteur d'actifs ne compte plus cet event.
    await expect(page.getByTestId('product-detail-filter-active')).toContainText('0')
  })
})

/**
 * #442 (Sprint 63) — E2E : CONFLIT 409 au DÉSARCHIVAGE (BR-EVE-015).
 *
 * Trou couvert : `useSetEventArchived` porte une branche dédiée au 409 (invalidation de
 * `queryKeys.products.all` MÊME en erreur, pour que le re-clic reparte d'une version
 * fraîche au lieu de boucler sur des 409), et `ProductDetailView.handleUnarchive` mappe
 * ce statut sur un message inline dédié. Aucune des 5 specs ci-dessus ne produisait de
 * 409 : la branche n'était couverte que par des tests unitaires à erreur mockée.
 *
 * Mécanique du conflit (patron `sprint-42-events.spec.ts` : 2 contextes navigateur sur le
 * MÊME compte). Le contexte A modifie l'event AILLEURS pendant que B a la page ouverte :
 *   - le PATCH concurrent porte sur le `title`, PAS sur `archived` — désarchiver depuis A
 *     ferait disparaître le bouton de B au re-fetch et rendrait le 4e critère (« le 2e clic
 *     réussit ») structurellement intestable ;
 *   - il passe par l'API et non par l'UI de A : un event archivé n'est ré-éditable que via
 *     la frise en vue « archivés », et faire ce détour ne testerait rien de plus ici.
 * B détient alors une `version` périmée : son clic « désarchiver » produit un 409 RÉEL,
 * jamais simulé par une route interceptée.
 *
 * Anti-flaky : le statut de chaque PATCH est asserté sur la RÉPONSE réseau avant tout
 * jugement du DOM (convention #232). Le re-clic n'est déclenché qu'après avoir observé la
 * conséquence OBSERVABLE du re-fetch (le titre concurrent affiché), et non après un délai.
 */
test.describe('#442 Désarchivage — conflit 409 sur version périmée', () => {
  test('version périmée -> 409 inline, données re-fetchées, 2e clic OK', async ({ browser }) => {
    const ctxA = await browser.newContext({ storageState: PROD.storageState })
    const ctxB = await browser.newContext({ storageState: PROD.storageState })
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    try {
      const { userId, productId, event } = await seedArchivedEvent(pageA, 'Conflict')

      // --- B ouvre la vue « archivés » : il détient la version courante (N) ------
      await pageB.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
      await expect(pageB.getByTestId('product-detail-view')).toBeVisible()
      await pageB.getByTestId('product-detail-filter-archived').click()
      const row = pageB.getByTestId(`product-detail-history-row-${event.id}`)
      await expect(row).toBeVisible()

      // --- A modifie le MÊME event ailleurs : version N+1, TOUJOURS archivé -------
      const serverTitle = unique('Titre concurrent')
      const bump = await pageA.request.patch(`${API}/events/${event.id}`, {
        data: { title: serverTitle, version: event.version },
      })
      expect(bump.status(), 'le PATCH concurrent de A doit réussir (200)').toBe(200)
      const [bumped] = await fetchProductEvents(pageA.request, userId, productId)
      expect(bumped.archived, 'l’event reste archivé après le PATCH concurrent').toBe(true)
      expect(bumped.version, 'la version serveur doit avoir changé').not.toBe(event.version)

      // --- 1er clic de B : version périmée -> 409 --------------------------------
      const conflictPatch = pageB.waitForResponse(
        (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
      )
      // Le re-fetch déclenché par l'invalidation frappe `GET /api/users/{id}/products`
      // (`useProductsWithEvents` — `products.withEvents` est un préfixe de `products.all`).
      const refetch = pageB.waitForResponse(
        (r) => r.url().includes(`/users/${userId}/products`) && r.request().method() === 'GET',
      )
      await pageB.getByTestId(`product-detail-unarchive-${event.id}`).click()
      expect(
        (await conflictPatch).status(),
        'désarchivage sur version périmée doit renvoyer 409',
      ).toBe(409)

      // --- Message de conflit INLINE (pas de crash, pas de blocage silencieux) ----
      const inlineError = pageB.getByTestId(`product-detail-unarchive-error-${event.id}`)
      await expect(inlineError).toBeVisible()
      // Variante `conflict` (et non le message générique) : assertion sur l'attribut,
      // jamais sur le texte traduit (4 locales, `localePrefix:'always'`).
      await expect(inlineError).toHaveAttribute('data-kind', 'conflict')

      // --- Les données SONT re-fetchées après le conflit --------------------------
      // Preuve 1 (réseau) : la requête de liste repart bien APRÈS le 409.
      expect((await refetch).status(), 'le re-fetch produits doit réussir').toBe(200)
      // Preuve 2 (rendu) : la ligne affiche le titre écrit par A — donnée qui n'existait
      // nulle part côté B avant le conflit. C'est ce que l'E2E peut honnêtement prouver :
      // l'invalidation de la clé de cache elle-même n'est pas observable de l'extérieur.
      await expect(row).toContainText(serverTitle)

      // --- 2e clic : repart d'une version fraîche -> succès, PAS de boucle de 409 --
      const retryPatch = pageB.waitForResponse(
        (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
      )
      await pageB.getByTestId(`product-detail-unarchive-${event.id}`).click()
      expect(
        (await retryPatch).status(),
        'le 2e clic doit réussir (200) — pas de nouveau 409',
      ).toBe(200)

      // --- Effets : serveur désarchivé, message disparu, ligne hors vue archivés ---
      const after = await fetchProductEvents(pageB.request, userId, productId)
      expect(after.find((e) => e.id === event.id)?.archived, 'archived repassé à false').toBe(false)
      await expect(row).toHaveCount(0)
      await expect(inlineError).toHaveCount(0)
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })
})
