import {
  request as playwrightRequest,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test'

/**
 * #463 — ISOLATION D'ÉTAT des specs qui partagent le compte fixe `PROD`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT
 * ─────────────────────────────────────────────────────────────────────────────
 * 16 specs (~88 tests) tournent sur le MÊME compte `PROD` via `storageState`, et
 * jusqu'ici AUCUNE ne nettoyait ce qu'elle semait. L'état s'accumule donc pour
 * toute la durée du run, et chaque test voit les catégories/produits/événements
 * de tous ceux qui l'ont précédé. Deux conséquences MESURÉES, pas théoriques :
 *
 * - `support/timeline-lanes.ts` documente 76, 77 puis 99 lanes sur le compte
 *   `PROD` en fin de run, franchissant `LANE_VIRTUALIZATION_MIN_ROWS = 60` : les
 *   lanes sortent du DOM et les specs expirent à 30 s (#467) ;
 * - `support/products.ts` (`deleteProduct`) raconte le S73 : un produit au nom de
 *   64 caractères laissé derrière élargissait un `<Select>` et faisait sortir du
 *   viewport le point échantillonné par une spec d'une AUTRE fichier.
 *
 * Un test qui LIT une vue globale (frise complète, listing produits, `<Select>`
 * de catégories) dépend donc silencieusement de ce que les tests d'AVANT ont
 * laissé — d'où « passe en isolation, échoue en suite », et l'inverse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LE NETTOYAGE POST-TEST, ET PAS LES DEUX AUTRES PISTES DE L'ISSUE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1) « Un compte dédié par FICHIER de test » — ÉCARTÉE : elle ne corrige pas le
 *    défaut décrit. La dépendance est INTRA-fichier (29 tests dans
 *    `timeline.spec.ts`, 15 dans `timeline-mobile.spec.ts`) ; des comptes par
 *    fichier laisseraient ces tests-là se marcher dessus exactement comme avant.
 *    Elle déplace la frontière du problème sans le supprimer. (Le rate-limit
 *    register n'est PAS l'argument : #475 a porté le plafond du profil `e2e` à
 *    20/min/IP, et le job CI `e2e` pose de toute façon `RATE_LIMIT_ENABLED=false`.)
 *
 * 2) « Espace de noms unique par test » — ÉCARTÉE, et c'est le point contre-
 *    intuitif : ELLE EST DÉJÀ EN PLACE. `unique()` (`support/products.ts`) suffixe
 *    chaque nom semé d'un horodatage + aléa, et 89 appels l'utilisent déjà. Elle
 *    n'a pourtant empêché NI le débordement de lanes du S64/#467 NI l'incident du
 *    S73. La raison : le namespacing empêche les COLLISIONS DE NOM, pas la
 *    VISIBILITÉ. Une lane nommée de façon unique reste une lane de plus dans la
 *    frise, un produit unique reste une option de plus dans le `<Select>`. Le
 *    défaut de #463 est un défaut de visibilité, pas de nommage.
 *
 * 3) « Nettoyage systématique post-test » — RETENUE : c'est la seule des trois qui
 *    borne l'état VU par le test suivant. Le compte `PROD` d'un run est neuf (les
 *    identités dérivent de `E2E_RUN_ID`, cf. `accounts.ts`), donc un nettoyage
 *    intégral après chaque test ramène le compte à son état initial : chaque test
 *    ne voit plus que ce qu'il a semé lui-même.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMENT — et pourquoi ça ne coûte pas 88 réécritures
 * ─────────────────────────────────────────────────────────────────────────────
 * Le semis passe déjà par DEUX portes uniquement : `seedCategory` et `seedProduct`
 * (`support/products.ts`). On instrumente ces deux fonctions et on branche la purge
 * sur une fixture AUTO (`support/fixtures.ts`). Chaque spec ne change que son
 * import de `test`. Aucun corps de test n'est touché.
 *
 * ORDRE DE PURGE : produits d'abord (archivage), catégories ensuite.
 *
 * ⚠ ET LE POINT QUI A FAIT ÉCHOUER LA PREMIÈRE VERSION DE CE MODULE — mesuré, pas
 * supposé. On avait écrit ici « les produits archivés ne comptent plus, la
 * catégorie part ». C'est FAUX. `CategoryServiceImpl.deleteCategory` compte les
 * produits référençant la catégorie via `ProductRepositoryJpaImpl.countByCategoryId`,
 * qui est une requête **SQL NATIVE** (`SELECT count(*) FROM products WHERE
 * category_id = :cat`) : le `@SQLRestriction("archived = false")` de l'entité ne s'y
 * applique pas, donc les produits ARCHIVÉS y comptent encore. Une catégorie qui a
 * un jour porté un produit ne peut donc PLUS être supprimée par l'API — 409
 * `CategoryInUseException` pour toujours. Constaté sur 4 tests au premier run
 * (`products.spec.ts` x3, `categories.spec.ts` x1).
 *
 * LA PARADE : `DELETE /api/categories/{id}?reassignToCategoryId=<poubelle>`. La
 * réassignation passe par `updateCategoryForProducts`, native elle aussi, donc elle
 * déplace AUSSI les produits archivés ; le compteur retombe à 0 et la catégorie part
 * dans la même transaction. Les archives s'accumulent alors sous UNE catégorie
 * « poubelle » par (worker, compte) au lieu d'une par test. Elle reste visible dans
 * les `<Select>` de catégories : c'est le résidu ASSUMÉ de ce nettoyage — une option
 * constante au lieu d'une par test (~88 par run aujourd'hui).
 *
 * LES PRODUITS CRÉÉS PAR L'IHM NE SONT PAS TRACÉS — et c'est traité. Plusieurs
 * specs créent un produit *au clic* (`products.spec.ts`, `sprint-66-mobile-create-event`) :
 * il ne passe pas par `seedProduct`, donc rien ne l'enregistre, et il ferait rendre
 * 409 la suppression de SA catégorie. La purge liste donc les produits du compte et
 * archive tout ce qui pend à une catégorie tracée, semé par l'API ou par l'IHM.
 *
 * CE QUE LA PURGE NE COUVRE PAS (assumé) : un produit créé par l'IHM sous une
 * catégorie elle aussi créée par l'IHM — aucune des deux n'étant tracée, rien ne
 * les relie à ce test. Aucune spec ne fait ça aujourd'hui (toutes partent d'une
 * `seedCategory`), mais ce n'est pas garanti par construction.
 *
 * ÉCHEC DE PURGE : il est FATAL quand le test a par ailleurs réussi. Une purge
 * silencieusement inopérante restaurerait le défaut sans que rien ne rougisse —
 * c'est le motif « garde-fou qui ne garde rien ». Si le test échoue déjà, on
 * n'écrase pas sa cause : on annote et on laisse passer.
 */

const API = '/api'

type SeededEntry =
  | { kind: 'product'; userId: string; id: string }
  | { kind: 'category'; id: string }

/** Forme exacte rendue par `BrowserContext.storageState()` et acceptée par `request.newContext`. */
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>

interface Bucket {
  /** Cookies capturés AU MOMENT DU SEMIS : le contexte d'origine peut être fermé à la purge. */
  storageState: StorageState
  entries: SeededEntry[]
}

interface TrackingState {
  baseURL: string | undefined
  buckets: Map<BrowserContext, Bucket>
}

/**
 * Registre du test EN COURS.
 *
 * POURQUOI UNE VARIABLE DE MODULE EST SÛRE ICI : Playwright exécute UN test à la
 * fois par worker, et chaque worker est un process Node distinct. Il n'y a donc
 * jamais deux tests en vol dans ce module. (C'est la même propriété qui rend
 * `workers: 2` inoffensif ici : les deux tests concurrents vivent dans deux
 * process, chacun avec son propre registre, et chacun ne purge QUE ses entrées —
 * jamais celles de l'autre, alors qu'ils partagent le compte `PROD`.)
 *
 * `undefined` = tracking NON armé (spec pas encore migrée sur `support/fixtures`,
 * ou helper appelé hors run) : `trackSeed` est alors un no-op silencieux.
 */
let tracking: TrackingState | undefined

export function beginSeedTracking(baseURL: string | undefined): void {
  tracking = { baseURL, buckets: new Map() }
}

/** Enregistre une entité semée pour purge en fin de test. No-op si le tracking n'est pas armé. */
export async function trackSeed(page: Page, entry: SeededEntry): Promise<void> {
  if (!tracking) return
  const context = page.context()
  let bucket = tracking.buckets.get(context)
  if (!bucket) {
    // Capture des cookies MAINTENANT : plusieurs specs ouvrent un contexte ad hoc
    // (`browser.newContext()`) et le ferment dans le corps du test — à la purge il
    // n'existe plus, et `page.request` lèverait « Target page/context closed ».
    bucket = { storageState: await context.storageState(), entries: [] }
    tracking.buckets.set(context, bucket)
  }
  bucket.entries.push(entry)
}

interface ProductListing {
  id: string
  category: { id: string } | null
}

/** Archive un produit. 404 accepté : déjà supprimé par le test lui-même. */
async function archiveProduct(
  api: APIRequestContext,
  userId: string,
  productId: string,
): Promise<void> {
  const res = await api.delete(`${API}/users/${userId}/products/${productId}`)
  if (![204, 404].includes(res.status())) {
    throw new Error(`purge produit ${productId} : ${res.status()} (attendu 204 ou 404)`)
  }
}

/**
 * Supprime une catégorie en réassignant d'abord ses produits (archivés compris, cf.
 * l'en-tête) vers la catégorie poubelle. 404 accepté : déjà supprimée par le test.
 */
async function deleteCategory(
  api: APIRequestContext,
  categoryId: string,
  trashCategoryId: string,
): Promise<void> {
  const res = await api.delete(
    `${API}/categories/${categoryId}?reassignToCategoryId=${trashCategoryId}`,
  )
  if (![204, 404].includes(res.status())) {
    throw new Error(`purge catégorie ${categoryId} : ${res.status()} (attendu 204 ou 404)`)
  }
}

/**
 * Catégorie « poubelle » du compte, créée à la DEMANDE et mémoïsée pour la durée du
 * process worker. Elle ne reçoit que des produits déjà archivés, donc invisibles de
 * toutes les lectures (`@SQLRestriction`) : elle n'ajoute qu'UNE option de `<Select>`.
 */
const trashCategoryByUser = new Map<string, string>()

/** Nom FIXE, pas suffixé par worker : `TEST_WORKER_INDEX` grimpe quand Playwright
 *  recycle un worker (mesuré : 6 poubelles pour 2 workers sur un run complet). On
 *  cherche donc d'abord une poubelle existante sur le compte. Deux workers qui la
 *  créent au même instant en produisent deux — sans conséquence, c'est borné. */
const TRASH_CATEGORY_NAME = 'zz-purge'

async function resolveTrashCategory(api: APIRequestContext, userId: string): Promise<string> {
  const memo = trashCategoryByUser.get(userId)
  if (memo) return memo

  const existing = await api.get(`${API}/categories`)
  if (existing.ok()) {
    const found = ((await existing.json()) as { id: string; name: string }[]).find(
      (c) => c.name === TRASH_CATEGORY_NAME,
    )
    if (found) {
      trashCategoryByUser.set(userId, found.id)
      return found.id
    }
  }

  const res = await api.post(`${API}/categories`, {
    data: { name: TRASH_CATEGORY_NAME, color: '#6E6E6E' },
  })
  if (res.status() !== 201) {
    throw new Error(`purge : création de la catégorie poubelle a rendu ${res.status()}`)
  }
  const id = ((await res.json()) as { id: string }).id
  trashCategoryByUser.set(userId, id)
  return id
}

async function purgeBucket(
  baseURL: string | undefined,
  storageState: StorageState,
  entries: SeededEntry[],
): Promise<void> {
  const api = await playwrightRequest.newContext({ baseURL, storageState })
  try {
    const categoryIds = new Set(entries.flatMap((e) => (e.kind === 'category' ? [e.id] : [])))
    const productIds = new Set(entries.flatMap((e) => (e.kind === 'product' ? [e.id] : [])))
    const userId =
      entries.find(
        (e): e is { kind: 'product'; userId: string; id: string } => e.kind === 'product',
      )?.userId ?? (await resolveUserId(api))

    // Listing du compte : ramène AUSSI les produits créés à la souris, qui ne sont
    // enregistrés nulle part et bloqueraient la suppression de leur catégorie (409).
    if (categoryIds.size > 0) {
      const listing = await api.get(`${API}/users/${userId}/products`)
      if (listing.ok()) {
        for (const product of (await listing.json()) as ProductListing[]) {
          if (product.category && categoryIds.has(product.category.id)) productIds.add(product.id)
        }
      }
    }

    for (const productId of productIds) await archiveProduct(api, userId, productId)
    if (categoryIds.size > 0) {
      const trashId = await resolveTrashCategory(api, userId)
      for (const categoryId of categoryIds) {
        if (categoryId === trashId) continue
        await deleteCategory(api, categoryId, trashId)
      }
    }
  } finally {
    await api.dispose()
  }
}

/** Id du compte porté par les cookies du bucket (nécessaire si le test n'a semé QUE des catégories). */
async function resolveUserId(api: APIRequestContext): Promise<string> {
  const res = await api.get(`${API}/auth/me`)
  if (!res.ok()) throw new Error(`purge : GET /auth/me a rendu ${res.status()}`)
  return ((await res.json()) as { id: string }).id
}

/**
 * Purge tout ce que le test a semé et désarme le tracking.
 * Renvoie les erreurs rencontrées plutôt que de lever : c'est l'appelant (la
 * fixture) qui décide de rougir ou non selon l'issue du test.
 */
export async function flushSeedTracking(): Promise<string[]> {
  const state = tracking
  tracking = undefined
  if (!state) return []
  const failures: string[] = []
  for (const bucket of state.buckets.values()) {
    if (bucket.entries.length === 0) continue
    try {
      await purgeBucket(state.baseURL, bucket.storageState, bucket.entries)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }
  return failures
}

export type { SeededEntry }
