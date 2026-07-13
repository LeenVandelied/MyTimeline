import { Pool } from 'pg'

/**
 * Canal de capture du token de réinitialisation en E2E (issue #145).
 *
 * POURQUOI un accès DB direct — le flux "mot de passe oublié" n'expose le token
 * NULLE PART hors de l'email : `POST /api/auth/forgot-password` répond 200 neutre
 * (BR-AUT-005, anti-énumération) et `BrevoEmailService` est un NO-OP en env de test
 * (aucune `BREVO_API_KEY` → aucun envoi, aucun log du token, cf. adapter). Aucun
 * endpoint test-only, aucun MailHog n'existe. Le token brut n'est persisté que dans
 * la table `password_reset_tokens` (migration V6, colonne `token` UUID). On le relit
 * donc directement en base — c'est du SETUP de test (hors parcours UI testé), et le
 * canal le plus DÉTERMINISTE possible sans toucher au backend (issues #141/#143/#139
 * en parallèle). Alternative rejetée : parser un log backend (fragile, token non loggé).
 *
 * ⚠ COUPLAGE — ce helper connaît le schéma DB (V6). Si `password_reset_tokens` change,
 * mettre à jour la requête ci-dessous. Cf. RECOMMAND_FOLLOWUP (endpoint test-only) dans
 * issue-145-done.md pour un canal découplé à terme.
 */

/**
 * Connexion DB de test. Défauts alignés sur le service Postgres du job CI `e2e`
 * (`.github/workflows/ci.yml` : DB `eventmanager`, user `eventuser`) ET sur le dev
 * local (Postgres @ localhost:5432). Surchargeable par env (`E2E_DB_*`) sans recompiler.
 *
 * Le mot de passe n'a PAS de valeur par défaut littérale (best-practice, même en test) :
 * il DOIT être fourni via `E2E_DB_PASSWORD` (CI et dev local). En son absence on échoue
 * tôt et clairement plutôt que de coder un credential en dur dans le dépôt.
 */
const dbPassword = process.env.E2E_DB_PASSWORD
if (!dbPassword) {
  throw new Error(
    'E2E_DB_PASSWORD manquant : définissez la variable pour la connexion DB de test ' +
      '(cf. .github/workflows/ci.yml et votre Postgres local).',
  )
}

const pool = new Pool({
  host: process.env.E2E_DB_HOST ?? 'localhost',
  port: Number(process.env.E2E_DB_PORT ?? 5432),
  user: process.env.E2E_DB_USER ?? 'eventuser',
  password: dbPassword,
  database: process.env.E2E_DB_NAME ?? 'eventmanager',
  // Petit pool : un seul lecteur (le helper) sur toute la durée du run.
  max: 2,
})

/**
 * Filet de sécurité : ferme le pool à la sortie du process même si un spec crashe AVANT
 * son `test.afterAll` (une exception non gérée peut court-circuiter le hook et laisser la
 * connexion ouverte → warning "handle open" / process qui traîne en CI). `closeDbPool`
 * est idempotent (cf. plus bas), donc ce filet et l'appel explicite en `afterAll` peuvent
 * coexister sans double-`end`. `beforeExit` autorise le travail async (event loop encore
 * vivante), contrairement à `exit`.
 */
process.once('beforeExit', () => {
  void closeDbPool()
})

/**
 * Codes d'erreur Postgres/réseau ATTENDUS pendant la fenêtre de warmup : la DB démarre
 * encore, ou la migration V6 n'a pas fini de créer `password_reset_tokens`. On retente
 * silencieusement (au plus un warn de bas niveau). Toute AUTRE erreur (permission `42501`,
 * auth `28P01`, requête invalide `42601`…) est une vraie faute de config qui ne se
 * résoudra pas d'elle-même : on la logge tôt et distinctement pour la visibilité CI.
 */
const TRANSIENT_DB_ERROR_CODES = new Set<string>([
  'ECONNREFUSED', // Postgres pas encore à l'écoute
  'ETIMEDOUT', // handshake réseau lent au démarrage
  '57P03', // cannot_connect_now (DB en cours de démarrage)
  '42P01', // undefined_table (migration V6 pas encore appliquée)
])

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string') return code
  }
  return undefined
}

/**
 * Récupère le token de réinitialisation le plus récent, ENCORE utilisable (non
 * consommé), du compte identifié par `email`.
 *
 * `POST /forgot-password` étant `@Async` (PasswordResetServiceImpl), l'INSERT du token
 * ne survient PAS dans le thread de la requête HTTP : la réponse 200 est rendue AVANT
 * que le token soit en base (anti side-channel de timing, BR-AUT-005). On POLL donc la
 * table jusqu'à apparition du token (ou timeout), plutôt qu'une lecture one-shot qui
 * lirait avant l'INSERT (flaky).
 *
 * @param email  email du compte (unique, `uq_users_email`).
 * @param timeoutMs  budget d'attente de l'INSERT async (défaut 10s).
 * @returns le token UUID (string) à injecter dans `/reset-password?token=...`.
 */
export async function waitForResetToken(email: string, timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  const query = `
    select prt.token::text as token
    from password_reset_tokens prt
    join users u on u.id = prt.user_id
    where u.email = $1
      and prt.used_at is null
    order by prt.expires_at desc
    limit 1
  `
  let lastError: unknown = null
  let warnedTransient = false
  const warnedCodes = new Set<string>()
  while (Date.now() < deadline) {
    try {
      const result = await pool.query<{ token: string }>(query, [email])
      const token = result.rows[0]?.token
      if (token) return token
    } catch (err) {
      // On retente jusqu'au timeout, MAIS on ne veut plus avaler l'erreur en silence
      // pendant 10s (masquait la vraie cause en CI). On distingue :
      //  - erreur transiente (DB/migration pas prête) → un seul warn de bas niveau ;
      //  - vraie erreur SQL/perm/auth → warn immédiat et distinct par code (ne se
      //    résoudra pas, autant la voir dès la 1re occurrence).
      lastError = err
      const code = pgErrorCode(err)
      if (code && TRANSIENT_DB_ERROR_CODES.has(code)) {
        if (!warnedTransient) {
          warnedTransient = true
          console.warn(
            `[e2e/db] canal DB pas encore prêt pour ${email} (code=${code}) — poll en cours…`,
          )
        }
      } else {
        const key = code ?? String(err)
        if (!warnedCodes.has(key)) {
          warnedCodes.add(key)
          console.warn(
            `[e2e/db] erreur SQL anormale en attendant le token pour ${email} ` +
              `(code=${code ?? 'n/a'}) : ${String(err)}`,
          )
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `Aucun token de réinitialisation utilisable trouvé pour ${email} en ${timeoutMs}ms ` +
      `(INSERT @Async non abouti ou canal DB indisponible)` +
      (lastError ? ` — dernière erreur: ${String(lastError)}` : ''),
  )
}

/**
 * Ferme le pool (appelé en `test.afterAll` pour ne pas laisser la connexion ouverte).
 *
 * IDEMPOTENT : `pg` lève « Called end on pool more than once » si `end()` est invoqué deux
 * fois. Comme un filet `beforeExit` peut aussi tenter la fermeture, on garde une trace du
 * premier appel et on renvoie la même promesse aux suivants — double fermeture sûre.
 */
let closePromise: Promise<void> | null = null
export async function closeDbPool(): Promise<void> {
  if (!closePromise) {
    closePromise = pool.end()
  }
  await closePromise
}
