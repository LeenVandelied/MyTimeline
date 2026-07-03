import { test, expect, type Page } from '@playwright/test'

/**
 * #163 — Golden path E2E (P0 audit 2026-07-02, axe 3).
 *
 * Parcours complet FULL-STACK vérifié de bout en bout :
 *   1. Inscription d'un nouvel utilisateur (écran register)
 *   2. Connexion (écran login) -> dashboard
 *   3. Création d'un produit avec un événement associé (ProductDrawer, création
 *      couplée : produit + 1er événement ponctuel `single` non récurrent)
 *   4. Vérification de l'affichage de l'événement dans la timeline
 *
 * CONTRAINTES respectées :
 *   - Sélecteurs `data-testid` UNIQUEMENT (jamais texte / classe CSS). Les seuls
 *     `getByRole` employés ciblent des primitives Radix (option de <Select>) qui
 *     n'acceptent pas de forward `data-testid` fiable sur l'élément listbox rendu
 *     en portail ; on retombe sur le testid de l'OPTION (`product-category-option-*`).
 *   - i18n `localePrefix: 'always'` : toutes les routes sont préfixées `/fr/...`.
 *
 * PRÉREQUIS RUNTIME (levés par le job CI `e2e`, cf. .github/workflows/ci.yml) :
 *   - Backend Spring Boot (profil dev) sur :8080, Postgres 16 migré (Flyway V1..Vn).
 *   - Frontend Next.js sur :3000 avec `NEXT_PUBLIC_API_URL=http://localhost:8080/api`.
 *
 * ⚠ WORKAROUND CATÉGORIE (documenté) : aucune catégorie n'est seedée par Flyway
 *   (V8 : `categories` vide, owner NULL = système, mais AUCUNE ligne insérée) et il
 *   n'existe AUCUNE UI de création de catégorie (le drawer produit ne fait que LIRE
 *   `GET /api/categories` dans un <Select>, submit désactivé si liste vide). Un
 *   utilisateur fraîchement inscrit a donc 0 catégorie et ne peut PAS créer de
 *   produit via l'UI seule. On seed donc UNE catégorie via l'API authentifiée
 *   (`page.request.post('/api/categories')`) : le cookie JWT HttpOnly posé par le
 *   login UI est partagé avec le contexte `page.request`, la requête est donc
 *   authentifiée. Ceci est du SETUP de test, hors du parcours testé (register ->
 *   login -> produit+event -> timeline reste piloté à 100% par l'UI).
 */

/** Base API dérivée de l'env front. Les services axios utilisent baseURL =
 *  NEXT_PUBLIC_API_URL et appellent `/auth/...`, `/categories`, `/users/...` :
 *  la baseURL inclut donc le préfixe `/api` (contrôleurs `@RequestMapping("/api/...")`). */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api'

/** Identité unique par run (évite les collisions username/email en cas de retry CI). */
function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

/** yyyy-mm-dd du jour local (input type=date), garantit une date dans la fenêtre
 *  timeline (30 jours à partir d'aujourd'hui) -> l'événement `single` est visible. */
function todayIsoDate(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

test.describe('Golden path : inscription -> connexion -> produit+événement -> timeline', () => {
  test('parcours complet full-stack', async ({ page }) => {
    const suffix = uniqueSuffix()
    // username & name bornés 3..20 (BR-AUT-003 + createRegisterFormSchema name.max=20).
    const username = `e2e${suffix}`.slice(0, 20)
    const name = `e2e${suffix}`.slice(0, 20)
    const email = `e2e_${suffix}@example.com`
    // Password : le schéma formulaire register EXIGE >=6 + une majuscule + un chiffre
    // (createRegisterFormSchema, plus strict que le backend). Sans ces classes, RHF
    // bloque le submit -> aucun POST /auth/register (piège vérifié en local).
    const password = 'E2ePass123'
    const productName = `Produit E2E ${suffix}`

    // ---- 1. INSCRIPTION ----------------------------------------------------
    await page.goto('/fr/register')
    await expect(page.getByTestId('register-form')).toBeVisible()

    await page.getByTestId('register-email').fill(email)
    await page.getByTestId('register-name').fill(name)
    await page.getByTestId('register-username').fill(username)
    await page.getByTestId('register-password').fill(password)
    await page.getByTestId('register-confirm-password').fill(password)
    await page.getByTestId('register-submit').click()

    // Register OK -> redirection vers /fr/login (router.push après succès).
    await expect(page.getByTestId('login-form')).toBeVisible()

    // ---- 2. CONNEXION ------------------------------------------------------
    await page.getByTestId('login-username').fill(username)
    await page.getByTestId('login-password').fill(password)
    await page.getByTestId('login-submit').click()

    // Login OK -> cookie JWT HttpOnly posé, AuthContext restaure, redirection dashboard.
    await expect(page.getByTestId('dashboard')).toBeVisible()

    // ---- SETUP : seed d'une catégorie via API authentifiée (cf. entête) -----
    const categoryName = `Cat E2E ${suffix}`
    const seedResponse = await page.request.post(`${API_URL}/categories`, {
      data: { name: categoryName, color: '#3366ff' },
    })
    expect(
      seedResponse.status(),
      `seed catégorie doit renvoyer 201 (obtenu ${seedResponse.status()})`,
    ).toBe(201)
    const seededCategory = (await seedResponse.json()) as { id: string }
    expect(seededCategory.id).toBeTruthy()

    // ---- 3. CRÉATION PRODUIT + ÉVÉNEMENT COUPLÉ (single, non récurrent) -----
    await page.getByTestId('add-product-button').click()
    await expect(page.getByTestId('product-drawer-form')).toBeVisible()

    await page.getByTestId('product-name-input').fill(productName)

    // Catégorie : ouvrir le <Select> Radix puis choisir l'option seedée par testid.
    await page.getByTestId('product-category-trigger').click()
    await page.getByTestId(`product-category-option-${seededCategory.id}`).click()

    // Premier événement ponctuel (date du jour) : crée un event `single` couplé au
    // produit (ProductDrawer -> events:[{type:'single', date}]). Backend : endDate = startDate.
    await page.getByTestId('product-first-event-date').fill(todayIsoDate())

    await page.getByTestId('product-submit').click()

    // Le drawer se ferme après succès -> le formulaire disparaît.
    await expect(page.getByTestId('product-drawer-form')).toBeHidden()

    // ---- 4. VÉRIFICATION TIMELINE ------------------------------------------
    // Le dashboard refetch (onSuccess) : le produit apparaît comme ligne de la
    // timeline et l'événement créé y est rendu.
    await assertTimelineShowsProductAndEvent(page, productName)
  })
})

/**
 * Vérifie que la timeline affiche le produit (ligne ressource) et au moins un
 * événement. data-testid uniquement.
 */
async function assertTimelineShowsProductAndEvent(page: Page, productName: string): Promise<void> {
  const timeline = page.getByTestId('timeline-calendar')
  await expect(timeline).toBeVisible()

  // Le produit devient une ressource (ligne) de la timeline. Sélection par testid
  // uniquement ; on assert que le nom du produit CRÉÉ figure parmi les titres de
  // ressource (assertion sur le contenu de l'élément localisé par testid, pas un
  // sélecteur texte).
  const resourceTitles = timeline.getByTestId('timeline-resource-title')
  await expect(resourceTitles.first()).toBeVisible()
  await expect(resourceTitles).toContainText([productName])

  // L'événement couplé est rendu dans la timeline (au moins un bloc événement).
  await expect(timeline.getByTestId('timeline-event').first()).toBeVisible()
}
