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
 * Le mot de passe n'est PAS un secret : base de test jetable (valeur CI publique).
 */
const pool = new Pool({
  host: process.env.E2E_DB_HOST ?? 'localhost',
  port: Number(process.env.E2E_DB_PORT ?? 5432),
  user: process.env.E2E_DB_USER ?? 'eventuser',
  password: process.env.E2E_DB_PASSWORD ?? 'eventpass_ci',
  database: process.env.E2E_DB_NAME ?? 'eventmanager',
  // Petit pool : un seul lecteur (le helper) sur toute la durée du run.
  max: 2,
})

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
  while (Date.now() < deadline) {
    try {
      const result = await pool.query<{ token: string }>(query, [email])
      const token = result.rows[0]?.token
      if (token) return token
    } catch (err) {
      // Ex. table pas encore migrée / DB pas prête : on retente jusqu'au timeout.
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `Aucun token de réinitialisation utilisable trouvé pour ${email} en ${timeoutMs}ms ` +
      `(INSERT @Async non abouti ou canal DB indisponible)` +
      (lastError ? ` — dernière erreur: ${String(lastError)}` : ''),
  )
}

/** Ferme le pool (appelé en `test.afterAll` pour ne pas laisser la connexion ouverte). */
export async function closeDbPool(): Promise<void> {
  await pool.end()
}
