/**
 * #518 — Valeurs de l'attribut `datetime` des balises `<time>`.
 *
 * CONVENTION DS (`styles/ds/components/i18n.css` §7) : une date affichée se rend
 * en `<time datetime="…">`, pas en `<span>`. Le LIBELLÉ visible vient toujours
 * d'`Intl.DateTimeFormat` (localisé) ; l'attribut `datetime`, lui, doit être
 * machine-lisible ET désigner la MÊME date que celle qui est peinte à l'écran.
 *
 * POURQUOI PAS `toISOString()` POUR UNE DATE SANS HEURE : `toISOString()` bascule
 * en UTC. Un événement du 24 juin rendu `{day, month}` par `Intl` affiche « 24 »
 * dans le fuseau du navigateur, mais `toISOString()` peut écrire `2026-06-23T22:00Z`
 * (Paris, UTC+2) — l'attribut nommerait alors un AUTRE jour que le libellé, ce qui
 * est exactement ce qu'un lecteur d'écran lit. `toLocalIsoDate` lit les composantes
 * LOCALES du même objet `Date` : par construction, il ne peut pas diverger du
 * libellé, quel que soit le fuseau.
 *
 * QUAND UTILISER L'UN OU L'AUTRE :
 *  - libellé SANS heure (`dateStyle:'medium'`, `{day, month, year}`, …) →
 *    `toLocalIsoDate` (forme `YYYY-MM-DD`, valide au sens HTML « date string ») ;
 *  - libellé AVEC heure (`timeStyle:'short'`, horodatage de session/expiration) →
 *    `toIsoInstant` (forme complète UTC, valide au sens « global date and time
 *    string ») : l'instant est ici la donnée, et l'heure affichée en est la
 *    projection locale.
 *
 * Les deux rendent `null` sur une `Date` invalide plutôt que `"NaN-NaN-NaN"` ou une
 * `RangeError` : l'appelant passe alors `dateTime={iso ?? undefined}`, React omet
 * l'attribut, et le `<time>` reste du HTML valide (son contenu textuel fait foi).
 */

/** `YYYY-MM-DD` dans le fuseau LOCAL, ou `null` si la `Date` est invalide. */
export function toLocalIsoDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Instant complet ISO 8601 (UTC), ou `null` si la `Date` est invalide. */
export function toIsoInstant(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/* --------------------------------------------------------------------------
 * #518 (correctif S83) — Horodatages NAÏFS venus du backend.
 *
 * LE CONTRAT : les DTO qui portent une heure l'exposent en `LocalDateTime` Java
 * (`SessionResponse.lastActivity/createdAt`, `ExportJobResponse.expiresAt` — les
 * deux SEULS du dépôt, vérifié). Jackson les sérialise SANS offset :
 * `"2026-07-05T10:00:00"`. Le référentiel est celui du serveur, qui produit ses
 * `LocalDateTime` via `Clock.systemDefaultZone()` dans un conteneur sans `TZ`,
 * donc en UTC (`ClockConfig`, `SessionServiceImpl`). C'est la convention déjà
 * documentée par #58 côté export.
 *
 * POURQUOI CE HELPER EXISTE : `new Date("2026-07-05T10:00:00")` — chaîne
 * date-heure SANS offset — est interprétée par JS dans le fuseau du NAVIGATEUR.
 * Deux composants lisaient donc le MÊME champ de deux façons opposées
 * (`ExportDataFlow` ajoutait `Z`, `SessionList` non) : à Tokyo, 9 heures d'écart
 * sur la même donnée. Le point d'appel ne suffit pas à tenir la convention —
 * elle vit ici, et les appelants n'ont plus le droit d'appeler `new Date` sur un
 * horodatage backend.
 *
 * TOLÉRANCE : si la chaîne porte DÉJÀ un offset (`Z`, `+02:00`), elle est passée
 * telle quelle. Le jour où un DTO passera à `Instant`/`OffsetDateTime`, la date
 * restera juste au lieu de devenir invalide par l'ajout d'un `Z` de trop.
 * ------------------------------------------------------------------------ */

/** La chaîne porte-t-elle déjà un fuseau explicite (`Z` ou `±HH:MM`) ? */
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i

/**
 * Horodatage backend naïf → `Date`. La `Date` rendue peut être invalide
 * (`NaN`) : c'est à l'appelant de replier, comme sur `new Date`.
 */
export function parseServerDateTime(iso: string): Date {
  return new Date(HAS_OFFSET.test(iso) ? iso : `${iso}Z`)
}

/**
 * Rendu complet d'un horodatage backend : le LIBELLÉ visible et la valeur de
 * l'attribut `datetime`, dérivés d'un SEUL parsing — ils ne peuvent donc pas
 * désigner deux instants différents.
 *
 * - `label` : `Intl` dans la locale de l'UI (`dateStyle:'medium'` +
 *   `timeStyle:'short'`, la forme « avec heure » de `.mt-date--long`), replié sur
 *   la chaîne brute si l'horodatage est illisible — on ne perd pas la donnée ;
 * - `machine` : instant complet ISO (UTC) via `toIsoInstant`, ou `null` si
 *   illisible ; l'appelant passe alors `dateTime={machine ?? undefined}`.
 */
export function serverDateTime(
  iso: string,
  locale: string,
): { label: string; machine: string | null } {
  const date = parseServerDateTime(iso)
  if (Number.isNaN(date.getTime())) return { label: iso, machine: null }
  return {
    label: new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date),
    machine: toIsoInstant(date),
  }
}
