/**
 * Extrait un message de log assaini d'une erreur arbitraire (souvent une erreur axios).
 *
 * NE JAMAIS logger l'objet `error` brut : `error.config.data` porte le body de la
 * requête (mots de passe en clair sur login/register), `error.config.headers` porte
 * l'en-tête `Authorization` (jeton porteur) + cookies. Logger l'objet fuite ces
 * credentials/PII dans la console et les agrégateurs de logs (review PR #132, même
 * classe que la fuite corrigée dans apiClient au commit 7e58162).
 *
 * On ne conserve donc que le status HTTP (si présent) + le message court de l'erreur.
 */
export function safeErrorMessage(error: unknown): string {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: unknown } }).response === 'object'
      ? (error as { response?: { status?: number } }).response?.status
      : undefined

  const message = error instanceof Error ? error.message : 'unknown error'
  return status !== undefined ? `[${status}] ${message}` : message
}
