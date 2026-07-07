import fs from 'node:fs'
import path from 'node:path'

/**
 * Comptes E2E FIXES enregistrés UNE SEULE FOIS par le projet `setup`
 * (`auth.setup.ts`) puis réutilisés par les specs via `test.use({ storageState })`.
 *
 * POURQUOI — anti rate-limit register (RateLimitingFilter : `/api/auth/register`
 * = 5 requêtes / minute / IP). Le job CI `e2e` tourne sur UNE IP, `workers:1` +
 * `retries:2`. L'ancien pattern « 1 register par test » (helper `registerAndLogin`
 * appelé dans chaque test) faisait ~14 registers, re-joués à chaque retry -> 429
 * -> l'app reste sur /fr/login -> timeout `dashboard`/`settings-page`.
 *
 * Le projet `setup` s'exécute UNE fois (dépendance du projet `chromium`) : il n'est
 * PAS re-joué quand un test échoue et retry. On borne ainsi le nombre de registers
 * de TOUTE la suite settings à 3 (les 3 comptes ci-dessous), auxquels s'ajoute le
 * register du golden-path (self-register, hors settings) = 4 registers TOTAL < 5/min.
 *
 * IDENTITÉS PARTAGÉES setup <-> specs — CORRECTION (bug run 28752565466) :
 * `Date.now()` au chargement du module n'est PAS déterministe ENTRE PROCESSUS.
 * Le projet `setup` et CHAQUE worker/retry du projet `chromium` sont des process
 * Node DISTINCTS : chacun réimportait ce module et recalculait un `RUN` différent
 * -> `SHARED.username` (côté spec) != username réellement enregistré (côté setup) ->
 * `toHaveValue(SHARED.username)` échouait avec un Expected qui CHANGEAIT à chaque
 * retry (nouveau process) tandis que le Received (DOM) restait constant (compte réel).
 *
 * SOLUTION : le setup PERSISTE les identités générées dans `.auth/accounts.json`
 * (même dossier que les storageState, gitignoré). `accounts.ts` charge ce fichier
 * s'il existe (cas des process de specs, `setup` ayant déjà tourné en dépendance) ;
 * sinon il génère des identités fraîches (cas du 1er process `setup`) que ce dernier
 * persistera via `persistAccounts()`. Tous les process partagent ainsi les MÊMES
 * username/name/email. Identités bornées 3..20 (BR-AUT-003 + schéma register).
 */

/**
 * Suffixe unique figé au chargement du module (fallback : 1er process = `setup`).
 *
 * ISOLATION INTER-PROCESS : deux jobs CI sur le MÊME runner peuvent partager l'horloge
 * -> `Date.now()` + `random(100)` risquent la collision d'identités. On mélange donc
 * `process.pid` (+ `CI_JOB_ID` s'il existe) dans la graine. Le résultat reste BORNÉ :
 * `RUN` est tronqué à 16 chars et `makeAccount` re-tronque `prefix+RUN` à 20 (contrainte
 * username/name 3..20, BR-AUT-003 + schéma register). prefix (2) + RUN (16) = 18 <= 20.
 */
const RUN = `${process.env.CI_JOB_ID ?? ''}${process.pid}${Date.now().toString().slice(-6)}${Math.floor(
  Math.random() * 100,
)}`.slice(0, 16)

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

/** Répertoire des storageState + identités persistées (gitignoré : `/e2e/.auth/`). */
const STATE_DIR = path.join(__dirname, '..', '.auth')

/** Fichier des identités partagées setup <-> specs (écrit par le projet `setup`). */
const ACCOUNTS_FILE = path.join(STATE_DIR, 'accounts.json')

/** Champs d'identité persistés (le password est constant, le storageState dérivé de `key`). */
type PersistedIdentity = Pick<E2eAccount, 'username' | 'name' | 'email'>

/**
 * Identités persistées par un run précédent du projet `setup` (dépendance de
 * `chromium`). Absent lors du 1er process `setup` -> on génère puis on persiste.
 */
const PERSISTED: Partial<Record<E2eAccount['key'], PersistedIdentity>> = (() => {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8')) as Partial<
      Record<E2eAccount['key'], PersistedIdentity>
    >
  } catch {
    // Fichier absent (globalSetup l'a purgé avant le projet `setup`) ou illisible :
    // identités générées ci-dessous, puis persistées par le projet `setup`.
    return {}
  }
})()

/**
 * Purge le fichier d'identités partagées. Appelé par le `globalSetup` Playwright
 * AVANT tout projet : garantit que le process `setup` régénère des identités
 * fraîches (`RUN`) plutôt que de relire un `accounts.json` d'un run PRÉCÉDENT
 * (qui ferait ré-enregistrer un compte déjà en base -> 409). En CI `.auth/` est
 * recréé à chaque job (gitignoré), mais on sécurise aussi les runs locaux répétés.
 */
export function clearPersistedAccounts(): void {
  try {
    fs.rmSync(ACCOUNTS_FILE, { force: true })
  } catch {
    // Rien à purger.
  }
}

function makeAccount(key: E2eAccount['key'], prefix: string): E2eAccount {
  // Identité PARTAGÉE si le setup l'a déjà persistée (process de specs) ; sinon
  // générée à partir de `RUN` (process setup, qui la persistera). username/name
  // bornés à 20 (schéma register name.max=20).
  const base = `${prefix}${RUN}`.slice(0, 20)
  const persisted = PERSISTED[key]
  return {
    key,
    username: persisted?.username ?? base,
    name: persisted?.name ?? base,
    email: persisted?.email ?? `${prefix}_${RUN}@example.com`,
    // Password : >=6 + une MAJ + un chiffre (createRegisterFormSchema, plus strict
    // que le backend). Sans ces classes, RHF bloque le submit (aucun POST register).
    password: 'E2ePass123',
    storageState: path.join(STATE_DIR, `${key}.json`),
  }
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
 * Persiste sur disque les identités des comptes (username/name/email) pour que les
 * process de specs (workers/retries `chromium`) réutilisent EXACTEMENT celles que
 * le projet `setup` vient d'enregistrer. À appeler UNE fois par le setup après avoir
 * provisionné les comptes. Idempotent : écrase le fichier à chaque run du setup.
 */
export function persistAccounts(accounts: readonly E2eAccount[] = ALL_ACCOUNTS): void {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  const payload: Record<string, PersistedIdentity> = {}
  for (const account of accounts) {
    payload[account.key] = {
      username: account.username,
      name: account.name,
      email: account.email,
    }
  }
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(payload, null, 2), 'utf-8')
}
