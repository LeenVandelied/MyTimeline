import fs from 'node:fs'
import path from 'node:path'

/**
 * Comptes E2E FIXES enregistrés UNE SEULE FOIS par le projet `setup`
 * (`auth.setup.ts`) puis réutilisés par les specs via `test.use({ storageState })`.
 *
 * POURQUOI DES COMPTES FIXES — anti rate-limit register (`RateLimitingFilter` :
 * `/api/auth/register` = 5 requêtes / minute / IP). Le job CI `e2e` tourne sur UNE
 * IP. L'ancien pattern « 1 register par test » (helper `registerAndLogin` appelé
 * dans chaque test) faisait ~14 registers, re-joués à chaque retry -> 429 ->
 * l'app reste sur /fr/login -> timeout `dashboard`/`settings-page`.
 *
 * Le projet `setup` s'exécute UNE fois (dépendance de `chromium` et `firefox`) et
 * n'est PAS re-joué quand un test échoue et retry. Le nombre de registers de TOUTE
 * la suite est donc borné à `ALL_ACCOUNTS.length` (4) + le self-register du
 * golden-path = **5 registers par run**. Toute nouvelle identité ajoutée ici
 * consomme directement le budget du bucket4j : ne pas en ajouter sans recompter.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDENTITÉS PARTAGÉES ENTRE PROCESS — #469, ce qui a VRAIMENT été corrigé
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT ([[PIT-S47-004]]). Ce module figeait un suffixe `RUN` **au chargement
 * du module**, dérivé du `process.pid`. Or Playwright exécute chaque worker dans
 * un process Node DISTINCT : chacun réimportait ce fichier et recalculait un `RUN`
 * différent. Symptôme : `toHaveValue(SHARED.username)` échouait avec un Expected
 * (`sh4148187640411`) et un Received (`sh4148087641348`) issus de deux `pid`
 * voisins — 4 specs `settings-*` rouges dès `workers >= 2`.
 *
 * CE QUI NE SUFFISAIT PAS. La première parade persistait les identités dans
 * `.auth/accounts.json` et laissait chaque process le relire à l'IMPORT.
 * `dependencies: ['setup']` ordonne l'**exécution**, jamais le **moment de
 * l'import** — et surtout le projet `setup` lui-même est `fullyParallel` : ses 5
 * tests (`persist account identities` + 4 `provision <clé>`) se répartissent sur
 * plusieurs workers. Le worker qui PERSISTE et celui qui ENREGISTRE n'étaient donc
 * pas le même process, donc pas le même `RUN` : le fichier décrivait un compte que
 * personne n'avait enregistré. Aucune lecture de fichier, si tardive soit-elle, ne
 * répare ça — la divergence est créée AVANT l'écriture.
 *
 * LE CORRECTIF RETENU : `E2E_RUN_ID`, posé UNE fois par le `globalSetup`
 * Playwright (`e2e/global-setup.ts`), qui s'exécute dans le process PRINCIPAL
 * AVANT que le moindre worker ne soit forké. Playwright forke ses workers avec
 * `{ ...process.env }` : la variable est donc HÉRITÉE à l'identique par tous les
 * process — setup, chromium, firefox, retries. Les identités sont dérivées de
 * cette graine unique, donc IDENTIQUES partout, quel que soit l'ordre des imports
 * et le nombre de workers. Le problème n'est pas rendu « moins probable » : il
 * n'existe plus, parce qu'il n'y a plus qu'une seule graine par run.
 *
 * La résolution reste PARESSEUSE (getters) : rien n'est calculé à l'import, seule
 * la première LECTURE de `username`/`name`/`email` résout l'identité. Un import
 * précoce est donc inoffensif par construction.
 *
 * `.auth/accounts.json` est CONSERVÉ, mais son rôle a changé : ce n'est plus la
 * source de vérité, c'est un CONTRÔLE. Il porte désormais la graine qui l'a écrit
 * (`{ runId, accounts }`). Deux conséquences :
 * - un fichier écrit par un AUTRE run (worktree partagé par plusieurs agents, run
 *   concurrent, résidu) est IGNORÉ au lieu d'être pris pour la vérité — mesuré :
 *   un run concurrent a réécrit ce fichier au milieu d'un run de mesure (#469) ;
 * - un fichier de MÊME graine qui contredirait l'identité dérivée signale une vraie
 *   divergence intra-run, et on lève une erreur explicite plutôt que de laisser un
 *   `toHaveValue` mentir sur sa cause.
 * Il sert enfin de repli si `E2E_RUN_ID` manque (module importé hors `globalSetup`).
 *
 * ⚠ CE QUI RESTE NON COUVERT : deux runs Playwright SIMULTANÉS sur le même
 * répertoire `e2e/.auth/` se marchent dessus sur les `storageState` (`shared.json`
 * &co.), qui ne sont pas versionnés par run. Les identités sont désormais immunes,
 * les cookies ne le sont pas. Ne pas lancer deux suites en parallèle dans le même
 * worktree.
 *
 * CONTRAINTES PRÉSERVÉES :
 * - identités bornées **3..20** caractères (BR-AUT-003 + schéma Zod register) ;
 * - isolation inter-process : la graine mélange `CI_JOB_ID`, le `pid` du process
 *   principal, l'horloge et un aléa — deux jobs partageant l'horloge sur un même
 *   runner ne peuvent pas collisionner ;
 * - budget register inchangé (5 par run, cf. plus haut).
 */

/** Variable d'environnement portant la graine d'identités partagée par tous les process. */
export const RUN_ID_ENV = 'E2E_RUN_ID'

/** Répertoire des storageState + identités persistées (gitignoré : `/e2e/.auth/`). */
export const STATE_DIR = path.join(__dirname, '..', '.auth')

/** Fichier des identités écrit par le projet `setup` (contrôle de cohérence). */
const ACCOUNTS_FILE = path.join(STATE_DIR, 'accounts.json')

/**
 * Borne la graine à 16 caractères alphanumériques minuscules.
 *
 * POURQUOI SANITISER une valeur qu'on génère nous-mêmes : `E2E_RUN_ID` est lue
 * depuis l'environnement, donc potentiellement posée à la main. Un caractère hors
 * `[a-z0-9]` produirait un username refusé par le schéma register, et l'échec
 * remonterait comme un « register cassé » — un diagnostic faux de plus. 16 chars
 * garantit aussi `prefix(2) + RUN(16) = 18 <= 20` (BR-AUT-003).
 */
function sanitizeRunId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 16)
}

/**
 * Fabrique une graine de run neuve. Appelée UNE fois par run, dans le process
 * principal (`globalSetup`). Mélange `CI_JOB_ID` + `pid` + horloge + aléa : deux
 * jobs CI sur le MÊME runner peuvent partager l'horloge, `Date.now()` seul
 * risquerait la collision d'identités (donc un 409 au register).
 */
export function createRunId(): string {
  const seed = `${process.env.CI_JOB_ID ?? ''}${process.pid}${Date.now()
    .toString()
    .slice(-6)}${Math.floor(Math.random() * 100)}`
  return sanitizeRunId(seed)
}

/**
 * Repli utilisé UNIQUEMENT si `E2E_RUN_ID` est absente (module importé hors d'un
 * run Playwright). Mémoïsé pour rester stable dans le process courant.
 */
let fallbackRunId: string | undefined

function runId(): string {
  const fromEnv = sanitizeRunId(process.env[RUN_ID_ENV] ?? '')
  if (fromEnv.length > 0) return fromEnv
  fallbackRunId ??= createRunId()
  return fallbackRunId
}

export interface E2eAccount {
  /** Clé logique (sert au nom de fichier storageState). */
  key: 'shared' | 'pwd' | 'del' | 'prod'
  username: string
  name: string
  email: string
  password: string
  /** Chemin absolu du storageState (cookies JWT) produit par le setup. */
  storageState: string
}

/** Champs d'identité persistés (le password est constant, le storageState dérivé de `key`). */
type PersistedIdentity = Pick<E2eAccount, 'username' | 'name' | 'email'>

/** Identité dérivée de la graine du run — fonction PURE, donc identique dans tout process. */
function deriveIdentity(prefix: string, run: string): PersistedIdentity {
  // username/name bornés à 20 (schéma register name.max=20, BR-AUT-003).
  const base = `${prefix}${run}`.slice(0, 20)
  return { username: base, name: base, email: `${prefix}_${run}@example.com` }
}

/** Contenu de `.auth/accounts.json` : identités + graine qui les a produites. */
interface PersistedFile {
  runId: string
  accounts: Partial<Record<E2eAccount['key'], PersistedIdentity>>
}

/**
 * Identités écrites par le projet `setup`. Relues à CHAQUE tentative tant qu'aucun
 * fichier de NOTRE run n'a été lu : on ne mémorise QUE le contenu retenu, jamais
 * l'absence — sinon un import précoce figerait « pas de fichier » pour toujours, ce
 * qui est exactement le défaut d'ordre d'import qu'on supprime.
 */
let persistedCache: PersistedFile | undefined

function readPersisted(): Partial<Record<E2eAccount['key'], PersistedIdentity>> {
  const currentRun = sanitizeRunId(process.env[RUN_ID_ENV] ?? '')
  if (persistedCache) return persistedCache.accounts
  let parsed: PersistedFile
  try {
    parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8')) as PersistedFile
  } catch {
    // Fichier absent (purgé par le globalSetup) ou illisible : la graine suffit.
    return {}
  }
  if (typeof parsed?.runId !== 'string' || typeof parsed?.accounts !== 'object') return {}
  // Fichier d'un AUTRE run (run concurrent dans le même worktree, résidu) : il ne
  // décrit pas nos comptes, on l'ignore au lieu de le croire.
  if (currentRun.length > 0 && parsed.runId !== currentRun) return {}
  persistedCache = parsed
  return persistedCache.accounts
}

/**
 * Résout l'identité d'un compte. `E2E_RUN_ID` est la SOURCE DE VÉRITÉ ; le fichier
 * ne sert qu'à (a) servir de repli hors run Playwright, (b) vérifier l'invariant.
 */
let identityOriginLogged = false

/**
 * Trace UNE fois par process quelle graine ce process utilise réellement.
 *
 * POURQUOI CE N'EST PAS DU DEBUG JETABLE : la seule preuve qui tranche entre « la
 * graine n'a pas été propagée » et « deux runs concurrents se marchent dessus » est
 * de savoir quelle graine chaque process a VU. Sans cette ligne, les deux hypothèses
 * produisent le même `toHaveValue` et on rouvre [[PIT-S47-004]] à tort (fait deux
 * fois au S65). Le coût est d'une ligne par worker.
 */
function logIdentityOriginOnce(fromEnv: string): void {
  if (identityOriginLogged) return
  identityOriginLogged = true
  const worker = process.env.TEST_WORKER_INDEX ?? 'main'
  const origin = fromEnv.length > 0 ? `${RUN_ID_ENV}=${fromEnv}` : 'AUCUNE graine héritée'
  console.log(`[e2e] identités — worker ${worker} (pid ${process.pid}) : ${origin}`)
}

function resolveIdentity(key: E2eAccount['key'], prefix: string): PersistedIdentity {
  const fromEnv = sanitizeRunId(process.env[RUN_ID_ENV] ?? '')
  const persisted = readPersisted()[key]
  logIdentityOriginOnce(fromEnv)

  if (fromEnv.length === 0) {
    // LE GARDE-FOU QUI COMPTE. `TEST_WORKER_INDEX` est posée par Playwright dans
    // CHAQUE worker : si on est dans un worker et que la graine manque, c'est que le
    // `globalSetup` ne l'a pas propagée — et c'est précisément l'unique façon de
    // ressusciter [[PIT-S47-004]] (chaque process retomberait sur une graine locale).
    // On échoue ici, avec la cause nommée, plutôt que 20 lignes plus loin sur un
    // `toHaveValue` qui accuserait le code applicatif.
    if (process.env.TEST_WORKER_INDEX !== undefined) {
      throw new Error(
        [
          `E2E — ${RUN_ID_ENV} ABSENTE dans le worker ${process.env.TEST_WORKER_INDEX} (pid ${process.pid}).`,
          '',
          'Les identités E2E doivent toutes dériver de la MÊME graine, posée par',
          '`globalSetup` (e2e/global-setup.ts) dans le process principal AVANT le fork des',
          'workers. Sans elle, chaque process regénère la sienne et les specs `settings-*`',
          "comparent un username local au compte réellement enregistré par un autre process",
          '([[PIT-S47-004]]). Vérifier que `globalSetup` est bien déclaré dans',
          "playwright.config.ts et qu'il n'a pas échoué avant de poser la variable.",
        ].join('\n'),
      )
    }
    // Hors run Playwright (import direct du module) : repli fichier puis graine locale.
    return persisted ?? deriveIdentity(prefix, runId())
  }

  const derived = deriveIdentity(prefix, fromEnv)
  if (persisted && persisted.username !== derived.username) {
    throw new Error(
      [
        `E2E — identités DIVERGENTES pour le compte « ${key} ».`,
        `  dérivée de ${RUN_ID_ENV}=${fromEnv} : ${derived.username}`,
        `  persistée par le projet \`setup\` dans ${ACCOUNTS_FILE} : ${persisted.username}`,
        '',
        "Les deux valeurs portent pourtant la MÊME graine de run (un fichier écrit par un",
        "AUTRE run est ignoré en amont) : la dérivation n'est donc plus une fonction pure de",
        'la graine. Invariant cassé dans `deriveIdentity`/`persistAccounts`, pas régression',
        'du code applicatif testé ([[PIT-S47-004]]).',
      ].join('\n'),
    )
  }
  return derived
}

function makeAccount(key: E2eAccount['key'], prefix: string): E2eAccount {
  return {
    key,
    // Getters : rien n'est résolu à l'IMPORT du module, seulement à la LECTURE.
    // C'est ce qui rend l'ordre d'import inoffensif (#469).
    get username() {
      return resolveIdentity(key, prefix).username
    },
    get name() {
      return resolveIdentity(key, prefix).name
    },
    get email() {
      return resolveIdentity(key, prefix).email
    },
    // Password : >=6 + une MAJ + un chiffre (createRegisterFormSchema, plus strict
    // que le backend). Sans ces classes, RHF bloque le submit (aucun POST register).
    password: 'E2ePass123',
    // Dérivé de `key` seule : constant, donc lisible au SCOPE MODULE par les specs
    // (`test.use({ storageState })`) sans jamais toucher aux identités.
    storageState: path.join(STATE_DIR, `${key}.json`),
  }
}

/**
 * Purge le fichier d'identités. Appelé par le `globalSetup` Playwright AVANT tout
 * projet : un `accounts.json` d'un run PRÉCÉDENT ferait échouer le contrôle de
 * divergence ci-dessus (graine différente) alors que rien n'est cassé.
 */
export function clearPersistedAccounts(): void {
  try {
    fs.rmSync(ACCOUNTS_FILE, { force: true })
  } catch {
    // Rien à purger.
  }
  persistedCache = undefined
}

/**
 * Compte PARTAGÉ « lecture / édition légère » : navigation, mobile, préférences
 * (mutations client-only), profil (nom + avatar, avatar auto-nettoyé), sessions,
 * export (lecture), ancien-mdp-faux (n'altère PAS le mdp). Les specs qui mutent
 * un état backend persistant sur ce compte tournent en `serial`.
 */
export const SHARED = makeAccount('shared', 'sh')

/** Compte DÉDIÉ au test « changement de mot de passe réussi » (le mdp change définitivement). */
export const PWD = makeAccount('pwd', 'pw')

/** Compte THROWAWAY pour la suppression de compte (se détruit en fin de test). */
export const DEL = makeAccount('del', 'dl')

/**
 * Compte DÉDIÉ aux parcours Produits & Catégories (#218). Les tests y seedent des
 * catégories/produits via l'API authentifiée puis assertent sur des ids/noms UNIQUES
 * (namespacés par timestamp) : pas de clobber inter-tests, pas besoin de `serial`.
 * Compte séparé de SHARED pour ne pas entrelacer avec les mutations de profil settings.
 */
export const PROD = makeAccount('prod', 'pr')

/** Tous les comptes à provisionner par le setup (ordre = ordre de register). */
export const ALL_ACCOUNTS: readonly E2eAccount[] = [SHARED, PWD, DEL, PROD]

/**
 * Écrit sur disque les identités effectivement provisionnées. N'est plus le canal
 * de partage (c'est `E2E_RUN_ID` qui l'est) mais un TÉMOIN : toute lecture
 * ultérieure compare le fichier à la graine et lève si les deux divergent.
 * Idempotent : écrase le fichier à chaque run du setup.
 */
export function persistAccounts(accounts: readonly E2eAccount[] = ALL_ACCOUNTS): void {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  const payload: PersistedFile = { runId: runId(), accounts: {} }
  for (const account of accounts) {
    payload.accounts[account.key] = {
      username: account.username,
      name: account.name,
      email: account.email,
    }
  }
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(payload, null, 2), 'utf-8')
  persistedCache = undefined
}
