import { expect, type Page } from '@playwright/test'
import { ensureAuthenticated } from './auth'

/**
 * Helpers E2E domaine Produits & Catégories (#218).
 *
 * Seeding via `page.request.*` : le cookie JWT HttpOnly du storageState (compte
 * fixe PROD, cf. accounts.ts) voyage en same-origin à travers le proxy Next
 * (`/api/*` -> backend Spring), exactement comme le seed catégorie de
 * `golden-path.spec.ts`. On seede l'ÉTAT (user/catégories/produits) par l'API et
 * on pilote à la souris UNIQUEMENT le parcours testé.
 *
 * Sélecteurs : `data-testid` existants (posés par #217/PR #217). Là où un testid
 * MANQUE (DeleteConfirmDialog #65 : bouton confirmer, select de réassignation), les
 * specs retombent sur role/label/id stables — cf. RECOMMAND_FOLLOWUP dans le done.
 */

const API = '/api'

export interface SeededCategory {
  id: string
  name: string
}

export interface SeededProduct {
  id: string
  name: string
}

/** yyyy-mm-dd du jour local (input type=date). */
export function todayIsoDate(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Suffixe unique par test (évite toute collision de nom sur le compte partagé PROD). */
export function unique(prefix: string): string {
  return `${prefix} ${Date.now()}${Math.floor(Math.random() * 1000)}`
}

/** Id de l'utilisateur courant (cookie storageState) via `GET /api/auth/me`. */
export async function getUserId(page: Page): Promise<string> {
  const res = await page.request.get(`${API}/auth/me`)
  expect(res.ok(), `GET /auth/me doit réussir (obtenu ${res.status()})`).toBeTruthy()
  const me = (await res.json()) as { id: string }
  expect(me.id).toBeTruthy()
  return me.id
}

/** Seede une catégorie (POST /api/categories) et renvoie son id. */
export async function seedCategory(
  page: Page,
  name: string,
  color = '#3E63DD',
): Promise<SeededCategory> {
  const res = await page.request.post(`${API}/categories`, { data: { name, color } })
  expect(res.status(), `seed catégorie doit renvoyer 201 (obtenu ${res.status()})`).toBe(201)
  const body = (await res.json()) as { id: string }
  expect(body.id).toBeTruthy()
  return { id: body.id, name }
}

/**
 * Seede un produit couplé à un premier événement (POST /api/users/{userId}/products).
 * Le payload MIME celui du `ProductDrawer` (name/category/userId/events[{name,type,date}]) :
 * `userId` obligatoire dans le body (@NotNull validé avant réécriture path/JWT, cf.
 * productService.createProduct). Un événement garantit la visibilité du produit dans
 * le listing (et alimente frise/historique du détail).
 */
export async function seedProduct(
  page: Page,
  opts: { userId: string; name: string; categoryId: string; eventDate?: string },
): Promise<SeededProduct> {
  const { userId, name, categoryId, eventDate = todayIsoDate() } = opts
  const res = await page.request.post(`${API}/users/${userId}/products`, {
    data: {
      name,
      category: categoryId,
      userId,
      events: [{ name, type: 'single', date: new Date(eventDate).toISOString() }],
    },
  })
  expect(
    res.status(),
    `seed produit doit renvoyer 2xx (obtenu ${res.status()})`,
  ).toBeGreaterThanOrEqual(200)
  expect(res.status()).toBeLessThan(300)
  const body = (await res.json()) as { id: string }
  expect(body.id).toBeTruthy()
  return { id: body.id, name }
}

/** Ouvre la page Produits (onglet liste) après stabilisation de l'auth (anti ERR_ABORTED). */
export async function gotoProducts(page: Page): Promise<void> {
  await ensureAuthenticated(page)
  await page.goto('/fr/products', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('products-list-view')).toBeVisible()
}

/** Ouvre la page Produits puis bascule sur l'onglet Catégories. */
export async function openCategoriesTab(page: Page): Promise<void> {
  await ensureAuthenticated(page)
  await page.goto('/fr/products', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('products-tabs')).toBeVisible()
  // Tabs DS Graphite : boutons `role="tab"`. Onglet catégories = libellé i18n figé (fr).
  await page.getByTestId('products-tabs').getByRole('tab', { name: 'Catégories' }).click()
  await expect(page.getByTestId('categories-view')).toBeVisible()
}

/**
 * Supprime un produit seedé (DELETE /api/users/{userId}/products/{productId}).
 *
 * POURQUOI CE HELPER EXISTE — le défaut qu'il corrige, pas une commodité.
 * `seedProduct` ne nettoyait RIEN, et les comptes E2E (`PROD` &co.) sont
 * PARTAGÉS par toutes les specs d'un même run via `storageState`. Une spec qui
 * seede une donnée PATHOLOGIQUE la laisse donc dans le champ de vision de
 * toutes les autres. C'est exactement ce qui a cassé la CI du S73 : la sonde de
 * débordement de `sprint-73-model-vs-rendered.spec.ts` seede un produit dont le
 * nom est un MOT UNIQUE de 64 caractères ; le `<Select>` produit du
 * `NewEventDrawer` s'élargit pour l'afficher, et le point échantillonné par
 * `sprint-62-select-focus-indicator.spec.ts` (viewport mobile 390 px) sortait
 * du viewport — « il n'existe aucun pixel à lire là ». Le test lésé était
 * CORRECT : c'est la donnée laissée derrière qui ne l'était pas.
 *
 * RÈGLE QUI EN DÉCOULE : toute spec qui seede une donnée hors-norme (nom très
 * long, couleur extrême, volume) la supprime à la fin du test qui l'a créée, y
 * compris quand ce test ÉCHOUE (`afterEach` / `finally`, jamais en fin de
 * `test()`).
 *
 * BR-PRO-007 : la suppression est un SOFT DELETE (`archived = true`, 204). Cela
 * suffit à la dépollution — `ProductEntity` porte
 * `@SQLRestriction("archived = false")`, donc la ligne archivée disparaît de
 * TOUTES les lectures, listing du `<Select>` compris.
 *
 * 404 accepté : le produit a déjà été supprimé (nettoyage rejoué, test qui a
 * échoué avant le seed). Un nettoyage doit être idempotent, pas pointilleux.
 */
export async function deleteProduct(
  page: Page,
  opts: { userId: string; productId: string },
): Promise<void> {
  const res = await page.request.delete(`${API}/users/${opts.userId}/products/${opts.productId}`)
  expect(
    [204, 404],
    `suppression produit doit renvoyer 204 (ou 404 si déjà supprimé) — obtenu ${res.status()}`,
  ).toContain(res.status())
}
