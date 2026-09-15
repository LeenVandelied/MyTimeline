/**
 * Décision de RE-SOUMISSION du register du projet `setup` (`auth.setup.ts`).
 *
 * Arbitrage dev du 2026-09-14 (revue S88) : « retry seulement sur échec ». La boucle de
 * soumission ré-inscrivait un compte dès que le formulaire de login tardait (8 s) : un
 * register déjà accepté (201) pouvait être ré-émis dans la même minute, et le pire cas
 * register recompté montait à 36 pour un plafond e2e de 30.
 *
 * La règle, par statut MESURÉ de la réponse `POST /api/auth/register` :
 *   - 2xx                   -> `created`   : compte créé, on va au login, AUCUNE ré-émission ;
 *   - 409                   -> `exists`    : compte déjà là (essai précédent arrivé au backend
 *                                            malgré un timeout) = succès idempotent, login ;
 *   - 429                   -> `throttled` : JAMAIS retenté dans la même fenêtre — un 429 dit
 *                                            que le budget a cédé, le masquer serait mentir ;
 *   - autre 4xx (403, 400)  -> `refused`   : CORS, validation — une ré-émission rendrait pareil ;
 *   - 5xx ou aucune réponse -> `retry`     : échec de la REQUÊTE, seul cas ré-émis.
 *
 * Module PUR (aucun import Playwright) : `src/__tests__/e2e-rate-limit-budget.test.ts` l'importe
 * pour vérifier cette table, et son compteur n'accepte une boucle de ré-émission non multipliée
 * par sa borne que si elle est pilotée par cette fonction.
 */
export type RegisterOutcome = 'created' | 'exists' | 'retry' | 'throttled' | 'refused'

/** `status` = statut HTTP reçu, `null` = aucune réponse (erreur réseau, délai dépassé). */
export function classifyRegisterResponse(status: number | null): RegisterOutcome {
  if (status === null) return 'retry'
  if (status >= 200 && status < 300) return 'created'
  if (status === 409) return 'exists'
  if (status === 429) return 'throttled'
  if (status >= 500) return 'retry'
  return 'refused'
}

/**
 * Register DÉJÀ ACCEPTÉ pour ce compte, à relire AVANT toute ré-émission (revue S88, cycle 2).
 *
 * « Aucune réponse » dans le délai ne veut pas dire « requête ratée » : un 201 TARDIF arrive
 * après le délai, l'écouteur de la page l'enregistre, et l'app a déjà navigué vers le login.
 * Ré-émettre prendrait un 409 et un jeton de plus ; relancer `ensureRegisterForm` sur la page
 * de login échouerait trois fois et rougirait le setup au mauvais motif.
 *
 * Renvoie le dernier statut 2xx ou 409 observé, sinon `201` si la page est déjà sur `/login`
 * alors qu'un POST est parti (`postSent`), sinon `null` (rien d'acquis : ré-émission permise).
 */
export function acceptedRegisterStatus(
  observed: readonly number[],
  url: string,
  postSent: boolean,
): number | null {
  const accepted = [...observed].reverse().find((status) => {
    const outcome = classifyRegisterResponse(status)
    return outcome === 'created' || outcome === 'exists'
  })
  if (accepted !== undefined) return accepted
  return postSent && isLoginUrl(url) ? 201 : null
}

function isLoginUrl(url: string): boolean {
  try {
    return /\/login\/?$/.test(new URL(url).pathname)
  } catch {
    return false
  }
}
