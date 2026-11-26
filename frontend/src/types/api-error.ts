/**
 * #692 — Corps d'erreur structuré de l'API (champ `error` = code stable).
 * Source de vérité : `ErrorCode.java` (backend). Toute évolution des codes se fait
 * là-bas d'abord, puis ici. Pas de schéma Zod : un type TS et un garde suffisent.
 */
export const CATEGORY_IN_USE = 'category_in_use'
export const CATEGORY_REASSIGN_TARGET_INVALID = 'category_reassign_target_invalid'
export const CATEGORY_NAME_CONFLICT = 'category_name_conflict'

/** Codes de refus 409 propres aux catégories (un code par cause). */
export type CategoryErrorCode =
  | typeof CATEGORY_IN_USE
  | typeof CATEGORY_REASSIGN_TARGET_INVALID
  | typeof CATEGORY_NAME_CONFLICT

/** Codes génériques niveau statut HTTP et code métier du quota d'événements. */
export type GenericErrorCode =
  | 'not_found'
  | 'validation_failed'
  | 'unprocessable_entity'
  | 'unauthorized'
  | 'conflict'
  | 'bad_request'
  | 'event_quota_exceeded'
  | 'internal_error'

export type ApiErrorCode = CategoryErrorCode | GenericErrorCode

export interface ApiErrorBody {
  error: ApiErrorCode
  message?: string
}

/**
 * Lit le code stable `error` du corps d'une erreur HTTP (axios ou générique).
 * Renvoie `undefined` si le corps est absent ou si le code n'est pas une chaîne.
 * Un code inconnu (backend plus récent) est remonté tel quel : les appelants
 * comparent à une constante et ignorent le reste.
 */
export function apiErrorCodeOf(error: unknown): ApiErrorCode | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown } } }).response
    const code = response?.data?.error
    if (typeof code === 'string') return code as ApiErrorCode
  }
  return undefined
}
