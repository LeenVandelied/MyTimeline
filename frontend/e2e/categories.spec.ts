import { test, expect } from './support/fixtures'
import { PROD } from './support/accounts'
import {
  getUserId,
  seedCategory,
  seedProduct,
  gotoProducts,
  openCategoriesTab,
  unique,
} from './support/products'

/**
 * #218 — Parcours E2E Catégories (CategoryDrawer + DeleteConfirmDialog).
 *
 * Couvre 4 des 7 critères d'acceptation de l'issue :
 *   1. Création d'une catégorie via le drawer -> apparition dans la liste.
 *   2. Édition d'une catégorie existante via le drawer.
 *   3. Suppression d'une catégorie SANS produits liés.
 *   4. Suppression d'une catégorie AVEC produits liés (flux de réassignation).
 *
 * Auth : compte fixe PROD (storageState, provisionné par `auth.setup.ts`) -> ZÉRO
 * register par test (anti rate-limit register 5/min/IP, cf. accounts.ts). État seedé
 * par API, parcours piloté à la souris via `data-testid` existants (#217).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 *
 * ⚠ Comportement RÉEL de l'API de réassignation (lu dans le code, NON supposé) :
 *   - `categoryService.deleteCategory(id, reassignToCategoryId?)` ->
 *     `DELETE /api/categories/{id}?reassignToCategoryId=<uuid>`.
 *   - AVEC produits liés + cible fournie -> 204, produits réassignés ATOMIQUEMENT
 *     vers la cible (backend `CategoryInUseException` seulement si cible absente -> 409).
 *   - `DeleteConfirmDialog` (#65) force le select de réassignation quand
 *     `linkedProductsCount > 0` (bouton confirmer désactivé tant qu'aucune cible),
 *     cible = toutes catégories SAUF celle supprimée (systèmes incluses).
 *
 * #695 (Sprint 93) — les compteurs de la carte ne sont PLUS dérivés du listing produits
 * (qui exclut les archivés) mais servis par `GET /api/categories`
 * (`productCount` / `archivedProductCount`). Conséquences sur ce fichier :
 *   - `linkedProductsCount` = actifs + archivés → le select s'arme d'emblée pour une
 *     catégorie ne portant QUE des archivés (l'ancien scénario #546 n'y passait plus par
 *     le 409) ;
 *   - la couverture du repli serveur (409 → `reassignRequiredByServer`, PAT-S89-001) est
 *     CONSERVÉE, provoquée autrement : une carte rendue avant l'arrivée du produit ;
 *   - un test vérifie la mise à jour EN PLACE de la carte après archivage (PIT-S92-004).
 *
 * #245 — La suppression passe par `useDeleteCategory` (useMutation) qui invalide
 *   `categories.all` + `products.all` sur succès : la liste se rafraîchit SEULE, sans
 *   reload. Les assertions de disparition observent donc la vue courante directement.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * #472 (Sprint 80) — « SUPPRESSION D'UNE CATÉGORIE » : NON REPRODUIT. LE CHIFFRE
 * DE L'ISSUE N'EST PAS UNE BASE DE COMPARAISON.
 * ─────────────────────────────────────────────────────────────────────────────
 * #472 suivait ici un flake relevé au S64 (« 1 run sur 5 ») pendant la validation
 * d'AUTRE chose, sans diagnostic ni message d'erreur conservé — le done.md de
 * #467 ne garde que le décompte.
 *
 * CE QUI A ÉTÉ FAIT AU S80 : 5 runs COMPLETS de la suite (≈320 tests), régime
 * `workers: 2`, serveur Next externe, backend conteneur `:8086`. Les QUATRE tests
 * de ce fichier sont verts sur les CINQ runs, entre 2,3 s et 6,2 s, les deux
 * parcours de suppression compris. AUCUNE occurrence. Aucun correctif n'est donc
 * appliqué ici : il n'y a rien à corriger qu'on sache nommer.
 *
 * ⚠ CE N'EST PAS « LE FLAKE EST MORT ». Deux précautions, dans cet ordre :
 *
 * 1. LE RÉGIME A CHANGÉ DEUX FOIS depuis la mesure du S64, et l'issue elle-même
 *    est PÉRIMÉE sur ce point (elle annonce `workers: 1`). #469 (S65) a rouvert
 *    le parallélisme local à 2, et #463 (S79) a introduit la purge post-test de
 *    `support/seed-cleanup.ts`. Or c'est exactement l'ACCUMULATION que #463
 *    supprime — un compte `PROD` partagé qui finissait un run avec ~88 catégories
 *    et ~81 produits — qui portait les deux familles de flakes documentées avant
 *    lui (#467 pour la virtualisation, [[PIT-S73-006]] pour un `<Select>` élargi
 *    par une donnée laissée derrière). Que le symptôme du S64 ait appartenu à
 *    cette famille est PLAUSIBLE et NON DÉMONTRÉ : aucune trace du S64 ne
 *    subsiste pour le vérifier.
 * 2. « 0 sur 5 » ne mesure pas un taux annoncé à « 1 sur 5 ». Cinq runs ne
 *    suffisent pas à réfuter une fréquence de cet ordre — ils suffisent à dire
 *    qu'on ne l'a pas revue, pas qu'elle n'existe plus.
 *
 * Si ces tests rougissent à nouveau : NE PAS les isoler pour conclure
 * ([[PIT-S64-009]]), et regarder D'ABORD le log du `next dev` local. Au S80,
 * TOUS les rouges des 5 runs hors références visuelles (`products.spec.ts`,
 * `golden-path`, `timeline`) portaient la même signature — un `toBeVisible` ou un
 * `toHaveURL` expiré à 5 s pendant qu'une route se (re)compilait 6 à 18 s sur le
 * serveur de dev. Ce mode de panne n'existe pas en CI, qui sert un build de
 * production (#462) ; le dossier est dans `sprint-62-select-focus-indicator.spec.ts`.
 */

test.use({ storageState: PROD.storageState })

// DeleteConfirmDialog expose des data-testid stables (RF1 #218) : on cible ces
// hooks plutôt que des libellés i18n devinés (anti-fragilité, cf. fix CI e2e).
//   - `delete-confirm-button`  : bouton de confirmation de suppression.
//   - `delete-reassign-label`  : libellé du bloc de réassignation (rendu ssi produits liés).
//   - `delete-reassign-select` : trigger du <Select> de réassignation.

test.describe('#218 Catégories — CRUD via CategoryDrawer', () => {
  // Critère 1 — création via le drawer.
  test("création d'une catégorie via le drawer apparaît dans la liste", async ({ page }) => {
    const name = unique('Cat Create')

    await openCategoriesTab(page)
    await page.getByTestId('categories-new-button').click()
    await expect(page.getByTestId('category-drawer-form')).toBeVisible()

    await page.getByTestId('category-name-input').fill(name)
    // #577 — palette du handoff : cobalt (l'ancien bleu `#3E63DD` n'est plus proposé).
    await page.getByTestId('category-swatch-#3B62D4').click()
    await page.getByTestId('category-submit').click()

    // Drawer fermé au succès + useCreateCategory invalide categories.all -> refetch.
    await expect(page.getByTestId('category-drawer-form')).toBeHidden()
    await expect(page.getByTestId('categories-view')).toContainText(name)
  })

  // Critère 2 — édition via le drawer.
  test("édition d'une catégorie existante via le drawer", async ({ page }) => {
    const original = unique('Cat Edit')
    const updated = `${original} MAJ`
    const cat = await seedCategory(page, original)

    await openCategoriesTab(page)
    const card = page.getByTestId(`categories-card-${cat.id}`)
    await expect(card).toBeVisible()

    await card.click()
    await expect(page.getByTestId('category-drawer-form')).toBeVisible()
    await expect(page.getByTestId('category-name-input')).toHaveValue(original)

    await page.getByTestId('category-name-input').fill(updated)
    await page.getByTestId('category-submit').click()

    // useUpdateCategory invalide categories.all -> la carte reflète le nouveau nom.
    await expect(page.getByTestId('category-drawer-form')).toBeHidden()
    await expect(page.getByTestId(`categories-card-${cat.id}`)).toContainText(updated)
  })

  // Critère 3 — suppression SANS produits liés.
  test("suppression d'une catégorie sans produits liés", async ({ page }) => {
    const cat = await seedCategory(page, unique('Cat Del'))

    await openCategoriesTab(page)
    await expect(page.getByTestId(`categories-card-${cat.id}`)).toBeVisible()

    await page.getByTestId(`categories-delete-${cat.id}`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // 0 produit lié -> ni libellé ni select de réassignation.
    await expect(page.getByTestId('delete-reassign-label')).toHaveCount(0)
    await expect(page.getByTestId('delete-reassign-select')).toHaveCount(0)

    await page.getByTestId('delete-confirm-button').click()

    // #245 : useDeleteCategory invalide categories.all -> la carte disparaît
    // automatiquement, SANS reload de la vue.
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId(`categories-card-${cat.id}`)).toHaveCount(0)
  })

  // Critère 4 — suppression AVEC produits liés + réassignation.
  test("suppression d'une catégorie avec produits liés réassigne puis supprime", async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const source = await seedCategory(page, unique('Source'), '#E5484D')
    const target = await seedCategory(page, unique('Target'), '#46A758')
    const product = await seedProduct(page, {
      userId,
      name: unique('Prod Reassign'),
      categoryId: source.id,
    })

    await openCategoriesTab(page)
    // #695 — compteur SERVI PAR L'API (`CategoryResponse.productCount`) : 1 produit actif.
    await expect(page.getByTestId(`categories-count-${source.id}`)).toContainText('1')
    // Aucun archivé ici -> pas de mention d'archivés à côté du badge.
    await expect(page.getByTestId(`categories-archived-count-${source.id}`)).toHaveCount(0)

    await page.getByTestId(`categories-delete-${source.id}`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Produits liés -> le bloc de réassignation est requis.
    await expect(page.getByTestId('delete-reassign-label')).toBeVisible()

    // Select de réassignation ciblé par data-testid stable (DeleteConfirmDialog).
    // Cible = uniquement `target` (la source est exclue des cibles).
    await page.getByTestId('delete-reassign-select').click()
    await page.getByRole('option', { name: target.name }).click()

    await page.getByTestId('delete-confirm-button').click()

    // #245 : useDeleteCategory invalide categories.all -> la source disparaît de la
    // vue courante SANS reload ; la cible demeure.
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId(`categories-card-${source.id}`)).toHaveCount(0)
    await expect(page.getByTestId(`categories-card-${target.id}`)).toBeVisible()

    // API réelle : produits de `source` réassignés atomiquement vers `target`.
    // Navigation vers la vue Produits (route distincte) pour vérifier la persistance.
    await gotoProducts(page)
    await expect(page.getByTestId(`products-row-category-${product.id}`)).toContainText(target.name)
  })

  // #695 — catégorie ne portant QU'UN produit ARCHIVÉ. DEC-S89-001 : un produit archivé
  // occupe toujours sa catégorie (FK `category_id` NOT NULL, comptage backend natif
  // archivés inclus) → DELETE sans cible = 409. AVANT #695 la carte affichait « aucun
  // produit » et le dialog partait SANS select, prenait le 409 et basculait après coup.
  // DEPUIS #695 les compteurs viennent de l'API (`productCount` / `archivedProductCount`) :
  // la carte annonce l'archivé et le select est armé D'EMBLÉE. Le repli sur 409 n'a pas
  // disparu, il n'est plus le chemin nominal — il est couvert par le test SUIVANT.
  test("catégorie ne portant qu'un produit archivé : la carte l'annonce et arme la réassignation", async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const source = await seedCategory(page, unique('Archived Only'), '#E5484D')
    const target = await seedCategory(page, unique('Bin'), '#46A758')
    const product = await seedProduct(page, {
      userId,
      name: unique('Prod Archived'),
      categoryId: source.id,
    })
    // Archivage (soft delete BR-PRO-007) via l'API, AVANT le premier rendu de la carte.
    const archived = await page.request.delete(`/api/users/${userId}/products/${product.id}`)
    expect(
      archived.status(),
      `archivage produit doit renvoyer 204 (obtenu ${archived.status()})`,
    ).toBe(204)

    await openCategoriesTab(page)
    // LE critère d'acceptation de #695 : plus de « aucun produit ». Le badge des actifs
    // (qui dirait exactement cela) est masqué, la mention des archivés le remplace.
    await expect(page.getByTestId(`categories-count-${source.id}`)).toHaveCount(0)
    await expect(page.getByTestId(`categories-archived-count-${source.id}`)).toContainText('1')

    await page.getByTestId(`categories-delete-${source.id}`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Réassignation armée D'EMBLÉE (linkedProductsCount = actifs + archivés = 1), donc
    // SANS avoir eu besoin du 409 : pas de note « réassignation requise ».
    await expect(page.getByTestId('delete-reassign-label')).toBeVisible()
    await expect(page.getByTestId('delete-reassign-required-note')).toHaveCount(0)
    await expect(page.getByTestId('delete-confirm-button')).toBeDisabled()

    await page.getByTestId('delete-reassign-select').click()
    await page.getByRole('option', { name: target.name }).click()
    await page.getByTestId('delete-confirm-button').click()

    await expect(dialog).toBeHidden()
    await expect(page.getByTestId(`categories-card-${source.id}`)).toHaveCount(0)
    await expect(page.getByTestId(`categories-card-${target.id}`)).toBeVisible()
  })

  // #695 — REPLI SERVEUR (PAT-S89-001) : le compteur de la carte vient maintenant du
  // backend, mais il peut être PÉRIMÉ — la carte a été rendue avant qu'un produit
  // n'arrive dans la catégorie. Le 409 doit alors TOUJOURS basculer le dialog en
  // réassignation (`reassignRequiredByServer`), sinon l'utilisateur reste devant une
  // erreur sans issue. Ce test remplace la couverture du 409 que l'ancien scénario
  // « catégorie ne portant qu'un archivé » exerçait par accident.
  test('carte périmée : le 409 serveur arme encore la réassignation', async ({ page }) => {
    const userId = await getUserId(page)
    const source = await seedCategory(page, unique('Stale Source'), '#E5484D')
    const target = await seedCategory(page, unique('Stale Bin'), '#46A758')

    await openCategoriesTab(page)
    // Carte rendue AVANT le produit : 0 actif / 0 archivé -> « aucun produit », pas de select.
    await expect(page.getByTestId(`categories-count-${source.id}`)).toHaveText('aucun produit')

    // Le produit arrive APRÈS le rendu, par l'API : la carte affichée est désormais fausse
    // (c'est précisément l'état contre lequel le repli existe).
    await seedProduct(page, {
      userId,
      name: unique('Prod Stale'),
      categoryId: source.id,
    })

    await page.getByTestId(`categories-delete-${source.id}`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId('delete-reassign-label')).toHaveCount(0)

    // 1er clic : DELETE sans cible → 409 → bascule en réassignation.
    await page.getByTestId('delete-confirm-button').click()
    await expect(page.getByTestId('delete-reassign-required-note')).toBeVisible()
    await expect(page.getByTestId('delete-reassign-label')).toBeVisible()
    await expect(page.getByTestId('delete-confirm-button')).toBeDisabled()
    // Catégorie toujours présente (409, rien supprimé).
    await expect(page.getByTestId(`categories-card-${source.id}`)).toBeVisible()

    await page.getByTestId('delete-reassign-select').click()
    await page.getByRole('option', { name: target.name }).click()
    await page.getByTestId('delete-confirm-button').click()

    await expect(dialog).toBeHidden()
    await expect(page.getByTestId(`categories-card-${source.id}`)).toHaveCount(0)
    await expect(page.getByTestId(`categories-card-${target.id}`)).toBeVisible()
  })

  // #695 — mise à jour EN PLACE (PIT-S92-004 : ne pas se contenter d'un rechargement).
  // Archivage depuis l'onglet Produits, puis bascule d'onglet SANS `page.goto` : la carte
  // doit avoir perdu son produit actif et gagné la mention « 1 archivé ». C'est ce que
  // l'invalidation `categories.all` de `useArchiveProduct` garantit (#695) ; sans elle la
  // carte resterait à « 1 produit » jusqu'au refetch suivant.
  test('archiver un produit met à jour la carte catégorie sans rechargement', async ({ page }) => {
    const userId = await getUserId(page)
    const category = await seedCategory(page, unique('In Place'), '#8E4EC6')
    const product = await seedProduct(page, {
      userId,
      name: unique('Prod In Place'),
      categoryId: category.id,
    })

    await openCategoriesTab(page)
    await expect(page.getByTestId(`categories-count-${category.id}`)).toContainText('1')
    await expect(page.getByTestId(`categories-archived-count-${category.id}`)).toHaveCount(0)

    // Retour à l'onglet Produits (même page, pas de navigation) puis archivage à la souris.
    await page.getByTestId('products-tabs').getByRole('tab', { name: 'Produits' }).click()
    await expect(page.getByTestId(`products-row-${product.id}`)).toBeVisible()
    await page.getByTestId(`products-archive-${product.id}`).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByTestId('delete-confirm-button').click()
    await expect(page.getByTestId(`products-row-${product.id}`)).toHaveCount(0)

    // Bascule d'onglet SANS rechargement : la carte reflète déjà l'archivage.
    await page.getByTestId('products-tabs').getByRole('tab', { name: 'Catégories' }).click()
    await expect(page.getByTestId(`categories-archived-count-${category.id}`)).toContainText('1')
    await expect(page.getByTestId(`categories-count-${category.id}`)).toHaveCount(0)
  })
})
