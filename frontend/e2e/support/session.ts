import fs from 'node:fs'

import type { E2eAccount } from './accounts'

/**
 * #832 (Sprint 112) — SESSION PAR `storageState` : LE chemin par défaut de toute spec
 * authentifiée qui ne TESTE PAS la connexion.
 *
 * ```ts
 * test.use({ storageState: sessionState(SHARED) })
 * test.use({ storageState: sessionState(PROD), viewport: DESKTOP })
 * ```
 *
 * POURQUOI — LE BUDGET `login`. Le filtre de rate-limit est ARMÉ pendant les runs E2E
 * et, derrière le proxy Next, toute la suite compte sur UNE IP : un seul seau `login`
 * (30/min sous le profil e2e). Une connexion par le formulaire écrite dans une spec
 * coûte `1 + retries` = 3 jetons au pire cas CI ; celle-ci n'en coûte AUCUN, les quatre
 * connexions de `auth.setup.ts` étant déjà payées une fois par passe (le projet `setup`
 * n'a pas de retry). Recompte au S112 : 14 nominal / 26 pire cas pour un plafond de 30
 * — une seule connexion de plus par formulaire fait rougir
 * `src/__tests__/e2e-rate-limit-budget.test.ts`. Arbitrage dev du 2026-09-24 : le
 * plafond ne bouge pas, les specs passent par ici.
 *
 * QUAND NE PAS L'UTILISER — et payer le formulaire, recompte à l'appui :
 *  - la spec TESTE la connexion ou le mot de passe (`golden-path`, `forgot-password`,
 *    `reset-password-failures`, `sprint-111-theme-account-preference` : l'arbitrage du
 *    thème n'a lieu qu'à la connexion EXPLICITE) ;
 *  - la spec exige un compte NEUF (préférence encore `null`, état initial vierge) :
 *    `support/auth.ts#registerOnly` puis connexion explicite. Il n'existe AUCUN moyen
 *    d'ouvrir une session sans `POST /api/auth/login` (le register n'en ouvre pas) : un
 *    compte neuf coûte toujours 1 register + 1 login, × 3 au pire cas.
 *    L'ancien `registerAndLogin` (register + login par formulaire) a été SUPPRIMÉ par
 *    #832 : il n'avait plus un seul appelant et invitait toute nouvelle spec à payer
 *    une connexion dont elle n'avait pas besoin.
 *
 * QUEL COMPTE — les sessions sont PARTAGÉES par tous les tests et par les DEUX workers
 * de la CI (`support/accounts.ts`, §IDENTITÉS PARTAGÉES) :
 *  - `SHARED` : lecture, édition légère et réversible (profil, sessions, réglages).
 *    Jamais de préférence de thème posée sans `keepThemeOffSharedAccount` (on ne la
 *    remet pas à `null`) ;
 *  - `PROD` : semis de catégories / produits, avec le `test` de `support/fixtures.ts`
 *    qui les purge (données d'un compte partagé = pollution entre specs, PIT-S73-006) ;
 *  - `PWD` / `DEL` : UN test chacun (mot de passe changé, compte supprimé) — ne pas les
 *    réutiliser, ils ne survivent pas à leur test.
 *  ⚠ Ne JAMAIS se déconnecter (`POST /api/auth/logout`) sous une session partagée : le
 *  logout RÉVOQUE le jeton en base (BR-AUT-010), et chaque spec suivante qui le porte
 *  redevient anonyme — l'échec apparaîtrait loin de sa cause, en redirection vers
 *  `/fr/login`. Une spec qui teste la déconnexion ouvre sa propre session.
 *
 * CE QUE LE HELPER AJOUTE À `account.storageState` : un contrôle AU DÉMARRAGE DU TEST
 * (pas à l'import : le runner charge les specs avant que `setup` n'écrive les fichiers,
 * `--list` compris). Sans lui, un `storageState` absent (`--no-deps`), sans cookie
 * `jwt` ou périmé (fichier d'un run d'il y a plus de 2 jours, `COOKIE_MAX_AGE` du
 * backend) fait démarrer le test ANONYME, et l'échec se lit comme « `dashboard`
 * introuvable » après une redirection vers `/fr/login` — un faux diagnostic de plus
 * sur ce harnais. Il ne voit PAS une session révoquée côté serveur (logout, cf. plus
 * haut) : seul le backend le sait.
 */
export function sessionState(account: E2eAccount) {
  // `{}` : Playwright lit le PREMIER paramètre d'une fixture et exige un motif de
  // déstructuration (il en déduit les dépendances) — celle-ci n'en a aucune.
  return async ({}: object, use: (storageState: string) => Promise<void>): Promise<void> => {
    assertUsableSession(account)
    await use(account.storageState)
  }
}

interface StoredCookie {
  name: string
  value: string
  /** Secondes epoch ; `-1` pour un cookie de session. */
  expires?: number
}

/**
 * Lève, avec la cause nommée, si le `storageState` du compte ne peut pas ouvrir une
 * session. Exporté pour les specs qui lisent le fichier elles-mêmes.
 */
export function assertUsableSession(account: E2eAccount, now: number = Date.now()): void {
  const origin = `storageState du compte « ${account.key} » (${account.storageState})`
  let raw: string
  try {
    raw = fs.readFileSync(account.storageState, 'utf8')
  } catch {
    throw new Error(
      `${origin} ABSENT — le projet Playwright \`setup\` (auth.setup.ts) ne l'a pas écrit. ` +
        'Lancer sans `--no-deps`, et lire le résultat de `provision ' +
        `${account.key}\` avant celui de la spec.`,
    )
  }
  const state = JSON.parse(raw) as { cookies?: StoredCookie[] }
  const jwt = state.cookies?.find((cookie) => cookie.name === 'jwt')
  if (jwt === undefined || jwt.value.length === 0) {
    throw new Error(
      `${origin} SANS cookie \`jwt\` — le login du setup n'a pas abouti ; ` +
        'le test démarrerait anonyme et échouerait sur une redirection vers /fr/login.',
    )
  }
  if (jwt.expires !== undefined && jwt.expires > 0 && jwt.expires * 1000 <= now) {
    throw new Error(
      `${origin} PÉRIMÉ (cookie \`jwt\` expiré le ${new Date(jwt.expires * 1000).toISOString()}) ` +
        "— fichier d'un run précédent : relancer avec le projet `setup`.",
    )
  }
}
