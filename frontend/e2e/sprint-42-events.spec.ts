import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { PROD } from './support/accounts'
import { getUserId, seedCategory, seedProduct, todayIsoDate, unique } from './support/products'

/**
 * #232 (Sprint 42, Vague 2) — E2E Playwright : variante conflit 409 (modale
 * comparative #231) + toggle `archived` (BR-EVE-013 / BR-EVE-015).
 *
 * Auth : compte fixe PROD (storageState) -> ZÉRO register par test. État seedé par
 * API, parcours piloté via `data-testid` EXCLUSIVEMENT (jamais texte i18n : 4 locales,
 * `localePrefix:'always'`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ SPECS ACTIVES (#absorb, Sprint 42 Vague 3) — les deux blocages sont levés
 * ─────────────────────────────────────────────────────────────────────────────
 * Historique : ces scénarios étaient `test.fixme` (skippés) car le flux n'était pas
 * atteignable. Deux causes, désormais corrigées :
 *
 *   (1) SURFACE D'ÉDITION MONTÉE (gap A). `TimelineEditHost` wrappe `TimelineResponsive`
 *       sur les pages routées (`dashboard`, détail produit) et câble `onEditEvent` :
 *       desktop `EventDrawer` -> bouton `event-drawer-edit` -> `EventEditForm`
 *       (`event-form`), mobile via `TimelineActionSheet`. `ConflictDialog`
 *       (`event-form-conflict`, `conflict-dialog-*`) réutilisé tel quel.
 *
 *   (2) 409 OPTIMISTIC-LOCK DÉTERMINISTE (gap B). `version` est threadée de bout en bout
 *       (EventResponse -> form -> PATCH). `EventServiceImpl.updateEvent` compare la version
 *       cliente à la version serveur courante APRÈS ownership et lève
 *       `EventConflictException` (contrat 409 enrichi #231) en cas de décalage. Deux
 *       contextes sur le même compte suffisent donc à produire un vrai 409 via l'API,
 *       avec attente EXPLICITE des réponses réseau (`waitForResponse`, anti-flaky).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres migré, front :3000.
 */

test.use({ storageState: PROD.storageState })

const API = '/api'

/** Un event tel que renvoyé par le listing `GET .../events` (champs utiles au test). */
interface ApiEvent {
  id: string
  title: string
  archived?: boolean
  version?: number
}

/**
 * Liste les events d'un produit via l'API authentifiée (cookie storageState partagé
 * en same-origin via le proxy Next `/api`). Sert à récupérer l'id/version de l'event
 * seedé et à ASSERTER la persistance côté serveur (source de vérité, indépendante du DOM).
 */
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
 * Ouvre le détail produit puis le FORMULAIRE d'édition d'un event depuis la frise.
 *
 * #absorb (gap A) — flux désormais ATTEIGNABLE. Desktop : clic sur la pastille
 * `timeline-event` -> `EventDrawer` -> bouton « Éditer » (`event-drawer-edit`, câblé par
 * `TimelineEditHost` via `TimelineResponsive`/`TimelineView`) -> `EventEditForm`
 * (`event-form`). Sélecteurs `data-testid` uniquement (4 locales, `localePrefix:'always'`).
 */
async function openEventEditForm(page: Page, productId: string): Promise<void> {
  await page.goto(`/fr/products/${productId}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('product-detail-view')).toBeVisible()
  await expect(page.getByTestId('product-detail-timeline')).toBeVisible()

  await page.getByTestId('timeline-event').first().click()
  // Le drawer de détail expose l'affordance d'édition (gap A).
  await page.getByTestId('event-drawer-edit').click()
  // L'édition monte `EventEditForm` dans le Dialog `timeline-edit-dialog`.
  await expect(page.getByTestId('event-form')).toBeVisible()
}

test.describe('#232 Events — conflit 409 comparatif + toggle archived', () => {
  /**
   * SCÉNARIO 1 — Conflit 409 (modale comparative #231).
   * Deux contextes authentifiés sur le MÊME compte éditent le MÊME event. A sauvegarde
   * d'abord (PATCH 200, version incrémentée), B (version stale) sauvegarde ensuite ->
   * PATCH 409 corps enrichi -> modale comparative : diff champ par champ, puis
   *   - `conflict-dialog-keep-mine` : re-soumet, PAS de boucle 409, succès ;
   *   - `conflict-dialog-take-server` : abandonne le local + rafraîchit.
   */
  test(
    'conflit 409 concurrent -> modale comparative (diff + garder/prendre)',
    async ({ browser }) => {
      // --- SETUP état partagé via API (contexte A) --------------------------
      const ctxA = await browser.newContext({ storageState: PROD.storageState })
      const ctxB = await browser.newContext({ storageState: PROD.storageState })
      const pageA = await ctxA.newPage()
      const pageB = await ctxB.newPage()

      try {
        const userId = await getUserId(pageA)
        const cat = await seedCategory(pageA, unique('Conflict Cat'))
        const product = await seedProduct(pageA, {
          userId,
          name: unique('Conflict Prod'),
          categoryId: cat.id,
          eventDate: todayIsoDate(),
        })
        const [seededEvent] = await fetchProductEvents(pageA.request, userId, product.id)
        expect(seededEvent?.id, 'event seedé requis').toBeTruthy()

        // --- Les deux contextes ouvrent le MÊME event (même version au chargement) ---
        await openEventEditForm(pageA, product.id)
        await openEventEditForm(pageB, product.id)

        // --- A sauvegarde d'abord : PATCH 200, version serveur incrémentée -----
        const patchA = pageA.waitForResponse(
          (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
        )
        await pageA.getByTestId('event-form-title-input').fill(unique('Titre A'))
        await pageA.getByTestId('event-form-submit').click()
        expect((await patchA).status(), 'PATCH A doit réussir (200)').toBe(200)

        // --- B sauvegarde ensuite avec une version STALE : PATCH 409 ------------
        const patchB = pageB.waitForResponse(
          (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
        )
        const localTitleB = unique('Titre B')
        await pageB.getByTestId('event-form-title-input').fill(localTitleB)
        await pageB.getByTestId('event-form-submit').click()
        // Anti-flaky : on ASSERTE le 409 sur la réponse AVANT d'attendre la modale.
        expect((await patchB).status(), 'PATCH B concurrent doit renvoyer 409').toBe(409)

        // --- Modale comparative ouverte + diff visible -------------------------
        const dialog = pageB.getByTestId('event-form-conflict')
        await expect(dialog).toBeVisible()
        await expect(pageB.getByTestId('conflict-dialog-diff')).toBeVisible()
        // Au moins la ligne `title` diffère (A a écrasé le titre côté serveur).
        const titleRow = pageB
          .getByTestId('conflict-dialog-diff-row')
          .filter({ has: pageB.locator('[data-field="title"]') })
        await expect(titleRow.getByTestId('conflict-dialog-diff-local')).toContainText(localTitleB)

        // --- « Garder mes modifications » : re-soumet SANS boucle 409 ----------
        const keepMinePatch = pageB.waitForResponse(
          (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
        )
        await pageB.getByTestId('conflict-dialog-keep-mine').click()
        expect(
          (await keepMinePatch).status(),
          '« garder mes modifs » re-soumet et réussit (pas de nouvelle boucle 409)',
        ).toBe(200)
        await expect(dialog).toBeHidden()

        // Persistance serveur : le titre local B a bien gagné.
        const afterKeep = await fetchProductEvents(pageB.request, userId, product.id)
        expect(afterKeep.find((e) => e.id === seededEvent.id)?.title).toBe(localTitleB)
      } finally {
        await ctxA.close()
        await ctxB.close()
      }
    },
  )

  /**
   * SCÉNARIO 1bis — action « prendre la version serveur ».
   * Isolé du keep-mine pour une assertion nette (un seul chemin par test).
   */
  test(
    'conflit 409 -> « prendre la version serveur » rafraîchit les données',
    async ({ browser }) => {
      const ctxA = await browser.newContext({ storageState: PROD.storageState })
      const ctxB = await browser.newContext({ storageState: PROD.storageState })
      const pageA = await ctxA.newPage()
      const pageB = await ctxB.newPage()

      try {
        const userId = await getUserId(pageA)
        const cat = await seedCategory(pageA, unique('TakeSrv Cat'))
        const product = await seedProduct(pageA, {
          userId,
          name: unique('TakeSrv Prod'),
          categoryId: cat.id,
        })
        const [seededEvent] = await fetchProductEvents(pageA.request, userId, product.id)

        await openEventEditForm(pageA, product.id)
        await openEventEditForm(pageB, product.id)

        const serverTitle = unique('Titre serveur')
        const patchA = pageA.waitForResponse(
          (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
        )
        await pageA.getByTestId('event-form-title-input').fill(serverTitle)
        await pageA.getByTestId('event-form-submit').click()
        expect((await patchA).status()).toBe(200)

        const patchB = pageB.waitForResponse(
          (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
        )
        await pageB.getByTestId('event-form-title-input').fill(unique('Titre local abandonné'))
        await pageB.getByTestId('event-form-submit').click()
        expect((await patchB).status()).toBe(409)

        await expect(pageB.getByTestId('event-form-conflict')).toBeVisible()
        await pageB.getByTestId('conflict-dialog-take-server').click()
        await expect(pageB.getByTestId('event-form-conflict')).toBeHidden()

        // La version serveur (titre de A) est la source de vérité après refresh.
        const after = await fetchProductEvents(pageB.request, userId, product.id)
        expect(after.find((e) => e.id === seededEvent.id)?.title).toBe(serverTitle)
      } finally {
        await ctxA.close()
        await ctxB.close()
      }
    },
  )

  /**
   * SCÉNARIO 2 — Toggle `archived` (BR-EVE-013, PATCH-only).
   * Bascule `event-form-archived-toggle`, sauvegarde (PATCH 200), vérifie la
   * persistance côté serveur, puis rouvre le form et vérifie le PRÉ-REMPLISSAGE.
   */
  test('toggle archived : bascule persistée + pré-remplie à la réouverture', async ({ page }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('Archived Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Archived Prod'),
      categoryId: cat.id,
    })
    const [seededEvent] = await fetchProductEvents(page.request, userId, product.id)
    expect(seededEvent?.archived ?? false, 'event seedé non archivé au départ').toBe(false)

    // --- Ouvre le form, bascule archived, sauvegarde (attente PATCH 200) -------
    await openEventEditForm(page, product.id)
    const toggle = page.getByTestId('event-form-archived-toggle')
    await expect(toggle).not.toBeChecked()

    const patch = page.waitForResponse(
      (r) => r.url().includes('/events/') && r.request().method() === 'PATCH',
    )
    await toggle.click()
    await expect(toggle).toBeChecked()
    await page.getByTestId('event-form-submit').click()
    expect((await patch).status(), 'PATCH archived doit réussir').toBe(200)

    // --- Persistance serveur (source de vérité) --------------------------------
    const afterSave = await fetchProductEvents(page.request, userId, product.id)
    expect(
      afterSave.find((e) => e.id === seededEvent.id)?.archived,
      'archived doit être persisté à true',
    ).toBe(true)

    // --- Réouverture : le toggle est PRÉ-REMPLI (checked) ----------------------
    await openEventEditForm(page, product.id)
    await expect(page.getByTestId('event-form-archived-toggle')).toBeChecked()
  })
})
