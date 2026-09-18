import type { APIRequestContext } from '@playwright/test'

/**
 * Canal de capture du token de réinitialisation en E2E (issue #283, ADR-005).
 *
 * API PUBLIQUE DE CE MODULE (stable — consommée par `forgot-password.spec.ts` et par les
 * specs de cas d'échec du reset, issue #284) :
 *
 *   waitForResetToken(request: APIRequestContext, email: string, timeoutMs = 10_000): Promise<string>
 *
 * Usage typique depuis une spec : `await waitForResetToken(page.request, email)`
 * (`page.request` porte le `baseURL` de playwright.config.ts, donc l'URL relative
 * ci-dessous suffit ; un contexte `request` de fixture convient tout autant).
 *
 * REMPLACE l'ancien `support/db.ts` (#145) qui lisait la table `password_reset_tokens`
 * en direct via `pg` : la suite E2E était couplée au schéma de la migration V6, et toute
 * évolution du schéma des tokens pouvait casser un test sans rapport visible avec la
 * fonctionnalité. On passe par un CONTRAT HTTP stable exposé par le backend.
 *
 * POURQUOI UN CANAL DÉDIÉ RESTE NÉCESSAIRE — le flux « mot de passe oublié » n'expose le
 * token nulle part hors de l'email : `POST /api/auth/forgot-password` répond 200 neutre
 * (BR-AUT-005/BR-AUT-012, anti-énumération), `BrevoEmailService` est NO-OP en test (aucune
 * `BREVO_API_KEY`), le token n'est jamais loggé et il n'y a pas de MailHog. Le canal est
 * donc du SETUP de test, hors du parcours UI testé.
 *
 * CÔTÉ BACKEND — `GET /api/test-support/password-reset-token?email=…`, exposé UNIQUEMENT
 * en profil Spring `e2e` (`E2eResetTokenController`, `@Profile("e2e")`). Le job CI e2e pose
 * `SPRING_PROFILES_ACTIVE=dev,e2e` (liste additive). En dev local (profil `dev` seul) et en
 * production, l'endpoint N'EXISTE PAS : ces specs ne tournent pas contre un backend `dev` nu.
 */

/** Chemin same-origin : le proxy Next (`/api/*` -> :8080) route vers le backend. */
const RESET_TOKEN_ENDPOINT = '/api/test-support/password-reset-token'

/** Intervalle entre deux sondages (identique à l'ancien poll DB). */
const POLL_INTERVAL_MS = 250

/**
 * Attend puis retourne le token de réinitialisation le plus récent ENCORE exploitable
 * (non consommé, non expiré) du compte `email`.
 *
 * `POST /forgot-password` étant `@Async` (PasswordResetServiceImpl), l'INSERT du token ne
 * survient PAS dans le thread de la requête HTTP : la réponse 200 est rendue AVANT que le
 * token existe (anti side-channel de timing, BR-AUT-005). On POLL donc l'endpoint jusqu'à
 * obtenir 200 (404 = pas encore écrit), plutôt qu'une lecture one-shot qui serait flaky.
 *
 * @param request  contexte de requête Playwright (`page.request` ou fixture `request`).
 * @param email    email du compte (unique, `uq_users_email`).
 * @param timeoutMs budget d'attente de l'INSERT async (défaut 10s).
 * @returns le token UUID (string) à injecter dans `/reset-password?token=…`.
 * @throws si aucun token exploitable n'est obtenu dans le budget imparti.
 */
export async function waitForResetToken(
  request: APIRequestContext,
  email: string,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let lastIssue: string | null = null
  // On ne veut pas avaler les erreurs en silence pendant 10s (masquait la vraie cause en
  // CI) : chaque symptôme ANORMAL (statut inattendu, erreur réseau) est signalé UNE fois.
  const warned = new Set<string>()

  while (Date.now() < deadline) {
    try {
      const response = await request.get(RESET_TOKEN_ENDPOINT, { params: { email } })

      if (response.ok()) {
        const body = (await response.json()) as { token?: unknown }
        if (typeof body.token === 'string' && body.token.length > 0) {
          return body.token
        }
        // 200 sans token exploitable = contrat backend rompu : inutile de re-sonder.
        throw new Error(
          `[e2e/reset-token] réponse 200 sans champ "token" exploitable : ${JSON.stringify(body)}`,
        )
      }

      if (response.status() === 404) {
        // Cas NOMINAL du poll : l'INSERT @Async n'a pas encore eu lieu.
        lastIssue = 'HTTP 404 (token pas encore écrit)'
      } else {
        // 401 = profil `e2e` absent côté backend (le chemin retombe sur la chaîne de
        // sécurité principale) ; 400 = paramètre manquant. Ni l'un ni l'autre ne se
        // résoudra tout seul : on le signale dès la 1re occurrence.
        lastIssue = `HTTP ${response.status()}`
        warnOnce(
          warned,
          lastIssue,
          `[e2e/reset-token] statut inattendu ${response.status()} sur ${RESET_TOKEN_ENDPOINT} ` +
            `— le backend tourne-t-il avec SPRING_PROFILES_ACTIVE incluant "e2e" ?`,
        )
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('[e2e/reset-token]')) {
        throw err // Contrat rompu : ne pas re-sonder.
      }
      // Erreur réseau (backend/front pas encore à l'écoute) : transitoire, on retente.
      lastIssue = String(err)
      warnOnce(warned, 'network', `[e2e/reset-token] canal pas encore joignable : ${lastIssue}`)
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(
    `[e2e/reset-token] aucun token de réinitialisation exploitable pour ${email} en ${timeoutMs}ms ` +
      `(INSERT @Async non abouti, ou endpoint test-only indisponible)` +
      (lastIssue ? ` — dernier symptôme : ${lastIssue}` : ''),
  )
}

function warnOnce(seen: Set<string>, key: string, message: string): void {
  if (seen.has(key)) return
  seen.add(key)
  console.warn(message)
}
