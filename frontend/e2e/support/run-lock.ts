import fs from 'node:fs'
import path from 'node:path'

/**
 * VERROU DE RUN — un seul run Playwright à la fois par worktree.
 *
 * POURQUOI (défaut MESURÉ au S65, #469). Tout le harnais E2E partage un unique
 * répertoire `e2e/.auth/` : `accounts.json` (identités) ET les `storageState`
 * (`shared.json`, `pwd.json`, `del.json`, `prod.json`, les cookies JWT). Deux runs
 * simultanés dans le même worktree — deux agents, ou un run relancé sans avoir tué
 * le précédent — se réécrivent mutuellement ces fichiers.
 *
 * Le symptôme est TRAÎTRE : la spec du run A charge un `storageState` réécrit par le
 * run B, se retrouve donc authentifiée sur le compte de B, et `toHaveValue` affiche
 *
 *     Expected: "sh<graine A>"   (identité attendue par le run A)
 *     Received: "sh<graine B>"   (compte réellement connecté, celui de B)
 *
 * ce qui est MOT POUR MOT la signature de [[PIT-S47-004]] — alors que la cause n'a
 * plus rien à voir : les deux graines sont ici deux `globalSetup` légitimes, pas un
 * `RUN` recalculé au scope module. Deux campagnes de mesure de #469 ont été perdues
 * ainsi, et le défaut a été rouvert à tort. On échoue donc DÈS le `globalSetup`,
 * avec la cause nommée, plutôt que de laisser deux runs se corrompre en silence.
 *
 * Ce que le verrou NE fait PAS : sérialiser (il n'attend pas son tour, il refuse) ni
 * protéger deux worktrees distincts (ils ont chacun leur `.auth/`, donc aucun
 * conflit).
 */

interface RunLock {
  pid: number
  runId: string
  startedAt: string
}

function isAlive(pid: number): boolean {
  try {
    // Signal 0 : ne tue rien, teste seulement l'existence du process.
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readLock(lockFile: string): RunLock | undefined {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockFile, 'utf-8')) as RunLock
    if (typeof parsed?.pid !== 'number' || typeof parsed?.runId !== 'string') return undefined
    return parsed
  } catch {
    return undefined
  }
}

/**
 * Pose le verrou du run courant, ou LÈVE si un autre run est déjà en cours dans ce
 * worktree. Un verrou dont le process est mort (run tué, `Ctrl-C`) ou trop ancien est
 * un résidu : on l'écrase sans bruit, sinon un run avorté bloquerait tous les suivants.
 */
export function acquireRunLock(stateDir: string, runId: string): void {
  const lockFile = path.join(stateDir, 'run.lock')
  fs.mkdirSync(stateDir, { recursive: true })

  const held = readLock(lockFile)
  // LE PROCESS VIVANT PRIME, QUEL QUE SOIT L'ÂGE DU VERROU (review S65).
  // Une version antérieure cédait le verrou au-delà d'un seuil d'ancienneté (1 h) MÊME
  // quand le process le détenant était encore VIVANT : un run long — débogage interactif,
  // machine chargée, `--repeat-each` — se faisait voler son `.auth/` et rouvrait très
  // exactement la corruption que ce verrou existe pour empêcher. L'ancienneté ne dit RIEN
  // de la vivacité ; `isAlive` seul en décide. Un verrou dont le process est mort (run tué,
  // `Ctrl-C`, teardown sauté) tombe dans la branche du dessous et est écrasé sans bruit,
  // donc un run avorté ne bloque toujours personne.
  if (held && held.pid !== process.pid && isAlive(held.pid)) {
    const ageMs = Date.now() - Date.parse(held.startedAt)
    const age = Number.isFinite(ageMs) ? ` (depuis ${Math.round(ageMs / 60000)} min)` : ''
    throw new Error(
      [
        `E2E — un run Playwright est DÉJÀ en cours dans ce worktree (pid ${held.pid}, graine ${held.runId}, démarré ${held.startedAt}${age}).`,
        '',
        `Les deux runs partageraient ${stateDir} : identités ET cookies (\`storageState\`).`,
        "Le second run réécrirait les comptes du premier, et les specs `settings-*` échoueraient",
        'des DEUX côtés avec un `toHaveValue` du type `Expected sh<graineA> / Received sh<graineB>`',
        "— la signature de [[PIT-S47-004]], pour une cause qui n'a rien à voir avec elle.",
        '',
        'Attendre la fin de l\'autre run, ou le tuer, puis relancer. Si le process est mort et',
        `que le verrou traîne, supprimer ${lockFile}.`,
      ].join('\n'),
    )
  }

  const lock: RunLock = { pid: process.pid, runId, startedAt: new Date().toISOString() }
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2), 'utf-8')
}

/** Libère le verrou s'il nous appartient. Appelé par le `globalTeardown`. */
export function releaseRunLock(stateDir: string): void {
  const lockFile = path.join(stateDir, 'run.lock')
  const held = readLock(lockFile)
  if (held && held.pid !== process.pid) return
  try {
    fs.rmSync(lockFile, { force: true })
  } catch {
    // Rien à libérer.
  }
}
