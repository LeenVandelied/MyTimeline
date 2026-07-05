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
 * IDENTITÉS DÉTERMINISTES par run : suffixe `Date.now()` unique au démarrage du
 * process de test -> pas de collision username/email entre runs, et pas de re-register
 * au retry (le setup ne se rejoue pas). Bornées 3..20 (BR-AUT-003 + schéma register).
 */

/** Suffixe unique figé au chargement du module (partagé setup + specs du même run). */
const RUN = `${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 100)}`

export interface E2eAccount {
  /** Clé logique (sert au nom de fichier storageState). */
  key: 'shared' | 'pwd' | 'del'
  username: string
  name: string
  email: string
  password: string
  /** Chemin absolu du storageState (cookies JWT) produit par le setup. */
  storageState: string
}

/** Répertoire des storageState (gitignore recommandé). */
const STATE_DIR = path.join(__dirname, '..', '.auth')

function makeAccount(key: E2eAccount['key'], prefix: string): E2eAccount {
  // username/name bornés à 20 (schéma register name.max=20).
  const base = `${prefix}${RUN}`.slice(0, 20)
  return {
    key,
    username: base,
    name: base,
    email: `${prefix}_${RUN}@example.com`,
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

/** Tous les comptes à provisionner par le setup (ordre = ordre de register). */
export const ALL_ACCOUNTS: readonly E2eAccount[] = [SHARED, PWD, DEL]
