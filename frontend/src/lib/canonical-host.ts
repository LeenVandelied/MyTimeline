/**
 * #322 — Origine CANONIQUE des redirections émises par `middleware.ts`.
 *
 * Ce module est PUR : aucun import `next/server`, `fs` ou `path` → importable
 * depuis le runtime **Edge** du middleware et testable sans `NextRequest` (même
 * contrainte que `auth-guard-paths.ts` et `src/i18n/locales.ts`).
 *
 * ⚠ VOLONTAIREMENT SÉPARÉ de la logique de cookie (`auth-guard-paths.ts`) : le
 * middleware compose deux préoccupations indépendantes (qui a le droit d'entrer /
 * vers quelle origine on redirige). #323 greffera la vérification de signature
 * RS256 sur la première sans toucher à celle-ci.
 *
 * ## Problème traité
 *
 * La garde #302 émet un `Location` ABSOLU (contrainte de runtime : un `Location`
 * relatif fait 500 sur toutes les routes protégées, cf. BUG-S45-001 / ADR-004).
 * L'origine de ce `Location` est dérivée de `request.nextUrl`, donc — selon la
 * façon dont Next est démarré — potentiellement de l'en-tête `Host` /
 * `x-forwarded-host` fourni par l'appelant : open-redirect, et empoisonnement de
 * cache si un cache mutualisé mémorise la 307.
 *
 * ## Solution retenue (option (c), sprint 50)
 *
 * L'origine des redirections est RÉÉCRITE vers une origine de confiance déclarée
 * en configuration (`APP_CANONICAL_HOST`), au lieu d'être héritée de la requête.
 * Ni allow-list applicative en dur (invérifiable en preview/staging), ni exigence
 * de reverse proxy (il n'en existe aucun dans ce dépôt).
 *
 * ## Dégradé assumé
 *
 * Variable ABSENTE ou vide → AUCUNE réécriture, comportement d'avant #322
 * inchangé. C'est délibéré : une garde qui casse (500, boucle) sur tous les
 * environnements non configurés serait pire que le risque qu'elle corrige
 * (BUG-S45-001). Le corollaire est un risque résiduel — une prod qui oublie la
 * variable ne bénéficie de rien, silencieusement. Documenté en ADR-004 §Limites.
 */

/** Nom de la variable d'environnement (runtime serveur, JAMAIS `NEXT_PUBLIC_*`). */
export const CANONICAL_HOST_ENV_VAR = 'APP_CANONICAL_HOST'

/**
 * Mémorise qu'on a déjà crié « configuration inexploitable ». `parseCanonicalOrigins` est sur le
 * chemin de CHAQUE requête matchée par le middleware : un warn par requête noierait les logs.
 */
let unusableConfigWarned = false

/** Idem pour « variable absente en production » (signalisation ajoutée à la revue S50, 2e cycle). */
let missingConfigWarned = false

/**
 * Signale UNE FOIS une `APP_CANONICAL_HOST` ABSENTE **en production uniquement**.
 *
 * ⚠ Correction d'une signalisation INVERSÉE (revue S50, 2e cycle) : seul le cas RARE (variable
 * présente mais inexploitable) criait, alors que le mode de panne le plus PROBABLE — variable
 * simplement oubliée au premier déploiement — restait muet. Aucun garde-fou frontend n'impose
 * cette variable, aucune étape de déploiement ne la vérifie : le seul symptôme d'un #322
 * intégralement inerte était l'ABSENCE d'un avertissement.
 *
 * Hors production, le silence reste le comportement voulu (dev/test n'ont pas d'origine
 * canonique, et un warn par suite de tests noierait les sorties).
 *
 * ⚠ Enveloppé et non levant : cf. `warnUnusableConfigOnce` (BUG-S45-001).
 */
function warnMissingConfigInProductionOnce(): void {
  if (missingConfigWarned) return
  if (process.env.NODE_ENV !== 'production') return
  missingConfigWarned = true

  try {
    console.warn(
      `[canonical-host] ${CANONICAL_HOST_ENV_VAR} n’est PAS définie en production. La ` +
        'réécriture d’origine des redirections (#322) est INACTIVE : le `Location` reste dérivé ' +
        'de `Host` / `x-forwarded-host`, donc contrôlable par l’appelant (open-redirect, ' +
        'empoisonnement de cache si un cache mutualisé mémorise la 307). Poser l’origine ' +
        'canonique sous la forme `https://app.example.com` (le schéma explicite protège aussi ' +
        'contre un `x-forwarded-proto` menteur).',
    )
  } catch {
    // Journaliser est un confort d'exploitation, jamais une condition de service.
  }
}

/**
 * Signale UNE FOIS une `APP_CANONICAL_HOST` non vide dont AUCUNE entrée n'est exploitable
 * (revue S50 — même raisonnement que `auth-token-verify.ts`).
 *
 * Distinguer les deux dégradés est tout l'intérêt :
 * - variable ABSENTE / vide → dégradé VOLONTAIRE, silencieux (décision assumée, cf. en-tête) ;
 * - variable PRÉSENTE mais entièrement invalide → ANOMALIE : l'opérateur a cru durcir les
 *   redirections, elles restent héritées de `Host` / `x-forwarded-host` (open-redirect), et
 *   RIEN ne le lui dit.
 *
 * ⚠ Enveloppé et non levant : une exception ici deviendrait un 500 sur toutes les routes
 * protégées (BUG-S45-001). Verrou posé AVANT l'appel pour ne pas rejouer si `console` lève.
 */
function warnUnusableConfigOnce(attemptedCount: number): void {
  if (unusableConfigWarned) return
  unusableConfigWarned = true

  try {
    console.warn(
      `[canonical-host] ${CANONICAL_HOST_ENV_VAR} est définie mais AUCUNE de ses ` +
        `${attemptedCount} entrée(s) n'est exploitable. La réécriture d'origine des ` +
        'redirections est DÉSACTIVÉE : le `Location` reste dérivé de `Host` / ' +
        '`x-forwarded-host`, donc contrôlable par l’appelant (open-redirect, empoisonnement de ' +
        'cache). Formes acceptées : `app.example.com`, `app.example.com:8443`, ' +
        '`https://app.example.com` — séparées par des virgules, protocole http/https ' +
        'uniquement, ni chemin ni credential. La valeur n’est PAS journalisée.',
    )
  } catch {
    // Journaliser est un confort d'exploitation, jamais une condition de service.
  }
}

/** Une origine de confiance déclarée en configuration. */
export interface CanonicalOrigin {
  /**
   * Hôte normalisé, port inclus s'il est déclaré (`app.example.com:3000`).
   * Sert UNIQUEMENT à comparer l'hôte entrant — jamais à écrire (cf. `hostname`
   * et `port`, et l'avertissement de `applyCanonicalOrigin`).
   */
  readonly host: string
  /** Hôte sans port (`app.example.com`, `[::1]`). */
  readonly hostname: string
  /** Port déclaré, ou `''` quand l'entrée n'en porte pas. */
  readonly port: string
  /**
   * Protocole imposé (`'https:'`), ou `null` si l'entrée était un hôte nu.
   * `null` = on conserve le protocole de la requête (pas de downgrade forcé,
   * mais pas de protection contre un `x-forwarded-proto` menteur non plus).
   */
  readonly protocol: string | null
}

/**
 * Cible minimale acceptée par `applyCanonicalOrigin` : `URL` et `NextURL`
 * exposent tous ces accesseurs en lecture/écriture. On ne dépend donc PAS du
 * type `NextURL` (qui vivrait dans `next/server` — interdit ici).
 */
interface MutableOrigin {
  readonly host: string
  hostname: string
  port: string
  protocol: string
}

/**
 * Hôte nu autorisé : labels alphanumériques séparés par des points, tirets
 * internes, port optionnel. Volontairement restrictif — tout ce qui pourrait
 * porter un chemin, un credential (`user@host`) ou un espace est rejeté.
 *
 * ⚠ Les littéraux IPv6 (`[::1]`) ne sont PAS acceptés sous forme nue ; les
 * déclarer sous forme d'origine complète (`http://[::1]:3000`) fonctionne.
 */
const BARE_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::\d{1,5})?$/i

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Parse UNE entrée de configuration — `null` si elle est inexploitable.
 *
 * Deux formes acceptées :
 * - hôte nu : `app.example.com`, `localhost:3000` → protocole non imposé ;
 * - origine complète : `https://app.example.com` → protocole imposé.
 */
function parseEntry(entry: string): CanonicalOrigin | null {
  // Dans les deux cas on laisse `URL` faire la normalisation (casse de l'hôte,
  // élagage du port par défaut, forme canonique d'un littéral IPv6) plutôt que
  // de la réimplémenter — une normalisation maison qui diverge de celle du
  // moteur est précisément ce qui avait laissé passer le contournement du
  // matcher au S45.
  const source = entry.includes('://') ? entry : `http://${entry}`

  if (!entry.includes('://') && !BARE_HOST_PATTERN.test(entry)) return null

  try {
    const url = new URL(source)
    if (!ALLOWED_PROTOCOLS.has(url.protocol) || url.hostname === '') return null

    // La forme URL complète doit être une ORIGINE NUE, comme l'annonce le message d'aide
    // (« ni chemin ni credential ») — revue S50, 2e cycle. `new URL` acceptait sans broncher
    // `https://u:p@app.example.com/x` : seuls le protocole et l'hôte étaient retenus, le reste
    // silencieusement jeté. Une config fautive passait donc muette, alors que la présence d'un
    // credential ou d'un chemin signale que l'opérateur a écrit autre chose que ce qu'il croit.
    if (url.username !== '' || url.password !== '' || url.pathname !== '/') return null

    return {
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      protocol: entry.includes('://') ? url.protocol : null,
    }
  } catch {
    return null
  }
}

/**
 * Parse la valeur brute de `APP_CANONICAL_HOST` : liste d'origines séparées par
 * des virgules.
 *
 * **La PREMIÈRE entrée valide est l'origine canonique** — celle vers laquelle on
 * bascule quand la requête arrive sur un hôte non déclaré (fail-closed). Les
 * suivantes sont des hôtes également légitimes (preview, staging, domaine
 * alternatif) : une requête qui arrive sur l'un d'eux garde son origine.
 *
 * Une entrée invalide est IGNORÉE (pas d'exception : le middleware ne doit
 * jamais lever, cf. BUG-S45-001). Si AUCUNE entrée n'est valide, le résultat est
 * vide et la réécriture est désactivée — c'est le dégradé, pas une erreur.
 *
 * ⚠ Ce dégradé-là n'est plus SILENCIEUX quand la variable est non vide : cf.
 * `warnUnusableConfigOnce`. Une valeur absente reste, elle, totalement muette.
 */
export function parseCanonicalOrigins(rawValue: string | null | undefined): readonly CanonicalOrigin[] {
  if (rawValue === null || rawValue === undefined) {
    warnMissingConfigInProductionOnce()
    return []
  }

  const parsed: CanonicalOrigin[] = []
  // ⚠ On compte les entrées RÉELLEMENT TENTÉES, pas `rawValue.trim() !== ''` (revue S50) :
  // `',,,'` ou `'  ,  '` sont non vides après `trim()` mais ne portent AUCUNE entrée — c'est une
  // valeur vide écrite maladroitement, donc le dégradé volontaire, pas une anomalie à signaler.
  let attempted = 0

  for (const chunk of rawValue.split(',')) {
    const entry = chunk.trim()
    if (entry === '') continue

    attempted += 1
    const origin = parseEntry(entry)
    if (origin !== null) parsed.push(origin)
  }

  // Aucune entrée tentée = valeur vide (ou vide écrite maladroitement, `',,,'`) : même dégradé
  // volontaire qu'une variable absente, donc même signalisation (production uniquement).
  if (attempted === 0) warnMissingConfigInProductionOnce()

  // Au moins une entrée tentée, aucune retenue = l'opérateur a voulu quelque chose qui n'a pas pris.
  if (attempted > 0 && parsed.length === 0) warnUnusableConfigOnce(attempted)

  return parsed
}

/** Remet à zéro le verrou d'avertissement. Réservé aux tests (isolation entre cas). */
export function resetCanonicalHostWarning(): void {
  unusableConfigWarned = false
  missingConfigWarned = false
}

/**
 * Mémoïsation du parse : le middleware appelle `canonicalOrigins` à CHAQUE
 * requête matchée (lecture de `process.env` au runtime, pas au chargement du
 * module — la valeur doit pouvoir changer sans rebuild, et les tests doivent
 * pouvoir la faire varier). Le parse lui-même n'est fait qu'au changement de la
 * chaîne brute.
 */
let memo: { raw: string | null | undefined; origins: readonly CanonicalOrigin[] } | null = null

/** `parseCanonicalOrigins` mémoïsée sur la valeur brute. */
export function canonicalOrigins(rawValue: string | null | undefined): readonly CanonicalOrigin[] {
  if (memo !== null && memo.raw === rawValue) return memo.origins

  const origins = parseCanonicalOrigins(rawValue)
  memo = { raw: rawValue, origins }

  return origins
}

/**
 * Choisit l'origine de confiance à appliquer à un hôte entrant.
 *
 * - hôte déclaré → cette entrée (on ne déplace pas une requête légitime) ;
 * - hôte inconnu → **première** entrée (fail-closed vers le canonique) ;
 * - aucune configuration → `null` (dégradé, aucune réécriture).
 */
export function resolveCanonicalOrigin(
  host: string,
  origins: readonly CanonicalOrigin[],
): CanonicalOrigin | null {
  const first = origins[0]
  if (first === undefined) return null

  const normalized = host.toLowerCase()

  return origins.find((origin) => origin.host === normalized) ?? first
}

/**
 * Réécrit EN PLACE l'origine d'une URL de redirection vers l'origine canonique.
 * Le chemin, la query et le fragment sont laissés intacts.
 *
 * Renvoie `true` si quelque chose a été modifié (utile pour ne réécrire l'en-tête
 * `Location` que lorsque c'est nécessaire).
 *
 * ⚠ **On écrit `hostname` PUIS `port`, jamais `host`** — piège WHATWG vérifié sur
 * le runtime réel : affecter `url.host = 'app.example.com'` (sans port) LAISSE le
 * port précédent en place. Avec un canonique sans port et un serveur écoutant sur
 * 3000, `Location` sortait en `http://app.example.com:3000/fr/login` — donc une
 * redirection vers un port interne, invisible en test unitaire tant qu'aucune URL
 * de départ ne porte de port.
 */
export function applyCanonicalOrigin(
  target: MutableOrigin,
  origins: readonly CanonicalOrigin[],
): boolean {
  const canonical = resolveCanonicalOrigin(target.host, origins)
  if (canonical === null) return false

  let changed = false

  if (canonical.protocol !== null && canonical.protocol !== target.protocol) {
    target.protocol = canonical.protocol
    changed = true
  }

  if (canonical.hostname !== target.hostname) {
    target.hostname = canonical.hostname
    changed = true
  }

  if (canonical.port !== target.port) {
    target.port = canonical.port
    changed = true
  }

  return changed
}

/**
 * Applique l'origine canonique à une valeur d'en-tête `Location` ABSOLUE.
 *
 * Renvoie la valeur d'origine telle quelle quand il n'y a rien à faire :
 * configuration absente, `Location` relatif (aucune origine à empoisonner —
 * et ce cas ne se produit pas ici, cf. ADR-004 §Limites) ou URL non parsable.
 * **Ne lève jamais** : une exception ici deviendrait un 500 sur toutes les
 * routes protégées (BUG-S45-001).
 */
export function canonicalizeLocation(
  location: string,
  origins: readonly CanonicalOrigin[],
): string {
  if (origins.length === 0) return location

  let url: URL
  try {
    url = new URL(location)
  } catch {
    return location
  }

  return applyCanonicalOrigin(url, origins) ? url.toString() : location
}
