import { type Page } from '@playwright/test'
import { PROD, type E2eAccount } from './accounts'
import { getUserId, seedCategory, seedProduct, unique } from './products'
import { beginSeedTracking, flushSeedTracking } from './seed-cleanup'

/**
 * #558 / DEC-S80-002 — PRÉCHAUFFAGE de la fiche produit pour la recette E2E LOCALE.
 *
 * CHOIX. En local, `next dev` compile chaque route à la première visite. Le test de
 * navigation liste -> détail produit tombait sur la compilation de `/fr/products/[id]`
 * dans son propre budget d'`expect` (5 s) et rougissait, alors que la CI (`next start`
 * sur un build de production) n'a pas ce mode de panne. On compile donc la route avant
 * les specs, dans le projet `setup`, avec la session du compte `PROD` qui vient d'être
 * ouverte. Alternatives écartées : relever le délai, relancer, `test.slow()` (achètent du
 * vert avec du budget de test, DEC-S80-002).
 *
 * DEUX PARADES, DEUX PANNES. Le préchauffage traite la première compilation de la route,
 * `onDemandEntries` (`next.config.mjs`) traite son éviction en cours de run.
 *
 * PORTÉE. Seulement quand Playwright démarre lui-même le serveur local, c.-à-d. sans
 * `PLAYWRIGHT_BASE_URL` (même condition que le `webServer` de `playwright.config.ts`) :
 * jamais en CI. La route de détail produit est la seule visée.
 *
 * RÉSIDU ASSUMÉ. Le produit et sa catégorie sont semés par les helpers de `products.ts`,
 * donc inscrits au registre de purge de `seed-cleanup.ts`, purgé ici même. La purge archive
 * le produit et range la catégorie dans la poubelle `zz-purge` : ce résidu est assumé, comme
 * pour les specs.
 *
 * MEILLEUR EFFORT. Un échec n'arrête pas le setup : le préchauffage est une optimisation,
 * pas une assertion. On le signale, et le test de navigation reste juge.
 */

/**
 * Délai propre au préchauffage, pour `goto` et `waitFor`. Sans lui, un serveur bloqué
 * garderait le setup jusqu'au budget du test. Sans rapport avec le budget `expect` du test
 * de navigation, qui reste le défaut. Dépassé, l'exception est attrapée (`console.warn`).
 */
const WARMUP_NAVIGATION_TIMEOUT_MS = 45_000

export function shouldWarmProductDetail(account: E2eAccount, baseUrlEnv: string | undefined) {
  return account.key === PROD.key && !baseUrlEnv
}

export async function warmProductDetail(page: Page, baseURL: string | undefined): Promise<void> {
  beginSeedTracking(baseURL)
  try {
    const userId = await getUserId(page)
    const category = await seedCategory(page, unique('Warmup Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('Warmup Prod'),
      categoryId: category.id,
    })
    await page.goto(`/fr/products/${product.id}`, { timeout: WARMUP_NAVIGATION_TIMEOUT_MS })
    await page.getByTestId('product-detail-view').waitFor({ timeout: WARMUP_NAVIGATION_TIMEOUT_MS })
  } catch (error) {
    console.warn(`[setup] préchauffage de la fiche produit sans effet : ${error}`)
  } finally {
    for (const failure of await flushSeedTracking()) {
      console.warn(`[setup] purge du préchauffage : ${failure}`)
    }
  }
}
