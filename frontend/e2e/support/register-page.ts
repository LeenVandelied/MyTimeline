import { expect } from '@playwright/test'

type Page = import('@playwright/test').Page

/**
 * Affichage RÉSILIENT du formulaire `/fr/register` (#329).
 *
 * POURQUOI — le projet `setup` (`auth.setup.ts`) provisionne les comptes E2E avant
 * TOUTE spec : si le rendu de `/fr/register` échoue une seule fois, ZÉRO spec ne
 * s'exécute. Or le serveur de dev Next 15 renvoie parfois un **500 transitoire**
 * après recompilation à chaud (`InvariantError: Expected clientReferenceManifest to
 * be defined`) — bug du serveur de dev, sans aucun rapport avec le code testé.
 * Mesuré au Sprint 47 : 2 runs entièrement rouges (cf.
 * `docs/memory/sprints/sprint-47/e2e-local-runbook.md` §Instabilités du serveur de dev).
 *
 * Le retry déjà présent dans `auth.setup.ts` ne couvre QUE la SOUMISSION (429
 * rate-limit) ; le rendu initial n'était pas protégé. On rattrape donc le rendu par
 * `page.reload()`.
 *
 * ⚠ NE PAS RENDRE L'ÉCHEC SILENCIEUX : un 500 PERSISTANT est un vrai bug, pas une
 * instabilité. Chaque tentative est loguée, et le message final porte le nombre de
 * tentatives, le dernier statut HTTP et la dernière erreur — et dit explicitement
 * qu'il s'agit d'un échec de RENDU, pas d'un rate-limit register.
 */

/** 1 rendu initial + 2 `page.reload()` (périmètre de l'issue #329). */
export const RENDER_ATTEMPTS = 3

/** Respiration entre deux tentatives : laisse le serveur de dev finir sa recompilation. */
export const RENDER_RETRY_DELAY_MS = 2_000

/** Aligné sur la fenêtre d'attente de la boucle de soumission d'`auth.setup.ts`. */
export const RENDER_VISIBLE_TIMEOUT_MS = 8_000

export interface EnsureRegisterFormOptions {
  /** Contexte appelant (clé de compte, nom de test) — repris tel quel dans les logs. */
  label: string
  /**
   * `navigate` (défaut) : la 1re tentative fait `page.goto('/fr/register')`.
   * `recover` : la page est DÉJÀ censée être sur `/fr/register` (retour de backoff
   * 429) — la 1re tentative se contente de vérifier, les suivantes rechargent.
   */
  mode?: 'navigate' | 'recover'
  /** Surchargeable pour les tests du retry lui-même (garde les runs courts). */
  attempts?: number
  retryDelayMs?: number
  visibleTimeoutMs?: number
}

/**
 * Garantit que le formulaire register est affiché, en retentant par `page.reload()`.
 * Lève une erreur explicitement typée « échec de rendu » si les tentatives sont épuisées.
 */
export async function ensureRegisterForm(page: Page, options: EnsureRegisterFormOptions): Promise<void> {
  const {
    label,
    mode = 'navigate',
    attempts = RENDER_ATTEMPTS,
    retryDelayMs = RENDER_RETRY_DELAY_MS,
    visibleTimeoutMs = RENDER_VISIBLE_TIMEOUT_MS,
  } = options

  let lastStatus: number | null = null
  let lastError = '(aucune)'

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (attempt === 1) {
        // `recover` : pas de navigation, la page est déjà sur /fr/register.
        if (mode === 'navigate') lastStatus = (await page.goto('/fr/register'))?.status() ?? null
      } else {
        lastStatus = (await page.reload())?.status() ?? null
      }
      await expect(page.getByTestId('register-form')).toBeVisible({ timeout: visibleTimeoutMs })
      return
    } catch (err) {
      lastError = String(err)
      // Log AVANT retry : un rendu qui échoue puis se rétablit reste VISIBLE dans la
      // sortie du run (sinon le retry masquerait une dégradation réelle du serveur).
      console.warn(
        `[setup] rendu /fr/register ${label} — tentative ${attempt}/${attempts} échouée ` +
          `(statut HTTP ${lastStatus ?? 'inconnu'}): ${lastError}`,
      )
      if (attempt < attempts) await page.waitForTimeout(retryDelayMs)
    }
  }

  throw new Error(
    `ÉCHEC DE RENDU de /fr/register (${label}) après ${attempts} tentative(s) ` +
      `dont ${attempts - 1} page.reload() — dernier statut HTTP: ${lastStatus ?? 'inconnu'}. ` +
      `Ce n'est PAS un rate-limit register 429 : le formulaire ne s'est JAMAIS affiché, ` +
      `aucun POST /api/auth/register n'a donc été tenté. ` +
      `Piste n°1 — 500 du serveur de dev Next (InvariantError: Expected clientReferenceManifest ` +
      `to be defined) : vérifier \`curl -o /dev/null -w "%{http_code}" <baseURL>/fr/register\` ` +
      `puis REDÉMARRER le next dev (cf. docs/memory/sprints/sprint-47/e2e-local-runbook.md). ` +
      `Dernière erreur: ${lastError}`,
  )
}
