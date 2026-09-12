/**
 * #57 — Détection d'une erreur « 403 / interdit » côté error boundary.
 *
 * Next.js App Router route toute erreur non catchée vers `error.tsx`. On ne
 * dispose pas d'un composant `forbidden.tsx` natif (nécessiterait le flag
 * expérimental `experimental.authInterrupts` en Next 15.2). On distingue donc le
 * 403 du 500 générique en inspectant l'erreur : un appelant qui veut afficher
 * l'écran « accès refusé » lève une erreur dont le message ou le `digest`
 * contient `403` ou `forbidden` (ex. `throw new Error('403 Forbidden')`).
 *
 * En production Next masque le message des erreurs SERVEUR (seul `digest`
 * survit) ; on teste donc les deux. Les erreurs levées CÔTÉ CLIENT conservent
 * leur message.
 */
export interface StateErrorLike {
  message?: string
  digest?: string
}

const FORBIDDEN_PATTERN = /\b403\b|forbidden/i

export function isForbiddenError(error: StateErrorLike | null | undefined): boolean {
  if (!error) return false
  const haystack = `${error.message ?? ''} ${error.digest ?? ''}`
  return FORBIDDEN_PATTERN.test(haystack)
}
