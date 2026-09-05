import { clearPersistedAccounts, createRunId, RUN_ID_ENV, STATE_DIR } from './support/accounts'
import { acquireRunLock } from './support/run-lock'

/**
 * `globalSetup` Playwright — s'exécute UNE fois, dans le process PRINCIPAL, avant
 * TOUT projet (`setup` compris) et surtout **avant le fork des workers**.
 *
 * 1. Pose `E2E_RUN_ID`, la graine UNIQUE dont TOUTES les identités E2E dérivent.
 *    Playwright forke ses workers avec `{ ...process.env }` : la variable est donc
 *    héritée à l'identique par le projet `setup`, par chaque worker de specs et par
 *    chaque retry. C'est ce qui supprime [[PIT-S47-004]] — la course entre process
 *    qui figeaient chacun un `RUN` dérivé de leur `pid` — et rend `workers > 1`
 *    envisageable (#469).
 *
 *    ⚠ On ÉCRASE toujours la valeur héritée de l'environnement. Réutiliser la graine
 *    d'un run précédent ferait ré-enregistrer les mêmes identités -> 409 au register.
 *
 * 2. Prend le VERROU DE RUN. Deux suites simultanées dans le même worktree partagent
 *    `e2e/.auth/` (identités ET cookies) et se corrompent mutuellement en produisant
 *    la signature exacte de [[PIT-S47-004]] pour une tout autre cause. On refuse donc
 *    le second run explicitement. Cf. `support/run-lock.ts`.
 *
 * 3. Purge `.auth/accounts.json` d'un run précédent : sans ça le projet `setup`
 *    ré-enregistrerait un compte déjà en base (register -> 409).
 */
export default function globalSetup(): void {
  process.env[RUN_ID_ENV] = createRunId()
  acquireRunLock(STATE_DIR, process.env[RUN_ID_ENV])
  clearPersistedAccounts()
  // Tracé VOLONTAIRE : c'est la seule façon de rattacher a posteriori un username vu
  // dans un échec (`sh<graine>`) au run qui l'a produit, et de distinguer une graine
  // non propagée d'un run concurrent.
  console.log(`[e2e] ${RUN_ID_ENV}=${process.env[RUN_ID_ENV]} (pid ${process.pid})`)
}
