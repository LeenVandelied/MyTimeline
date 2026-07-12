/**
 * #48 — Conventions de query keys TanStack Query v5, centralisées par domaine.
 *
 * Pourquoi un fichier dédié : les query keys sont l'identité d'une donnée dans
 * le cache. Les éparpiller en littéraux (`['products']` ici, `['product', id]`
 * là) provoque des invalidations qui ratent leur cible. On expose une factory
 * par domaine, hiérarchique : la clé "liste" est un préfixe de la clé "détail",
 * ce qui permet d'invalider tout un domaine via `invalidateQueries({ queryKey:
 * queryKeys.products.all })`.
 *
 * Forme imposée :
 *   - liste   : `['products']`, `['events']`, `['categories']`
 *   - détail  : `['products', productId]`, etc.
 *   - auth    : `['auth', 'me']`
 *
 * `as const` partout → les clés sont des tuples typés (pas `string[]`), ce qui
 * sécurise le matching côté `invalidateQueries`.
 */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    detail: (productId: string) => ['products', productId] as const,
    /**
     * Liste des produits (events embarqués) d'un utilisateur — pilote #48.
     * Scoping par `userId` car l'endpoint réel est
     * `GET /api/users/{userId}/products` (cf. useProductsWithEvents).
     */
    withEvents: (userId: string) => ['products', { userId, withEvents: true }] as const,
  },
  events: {
    all: ['events'] as const,
    detail: (eventId: string) => ['events', eventId] as const,
  },
  categories: {
    all: ['categories'] as const,
    detail: (categoryId: string) => ['categories', categoryId] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  /**
   * #73 / #86 — Sessions actives de l'utilisateur courant (`GET /api/sessions`).
   * Clé plate : l'identité est dérivée du cookie côté backend, pas d'un param.
   */
  sessions: {
    all: ['sessions'] as const,
  },
  /**
   * #59 — Export RGPD. Clé `job` scopée par `jobId` (polling du statut d'un job
   * async, `GET /api/export/job/{jobId}`). L'identité vient du cookie JWT.
   */
  export: {
    all: ['export'] as const,
    job: (jobId: string) => ['export', 'job', jobId] as const,
  },
} as const
