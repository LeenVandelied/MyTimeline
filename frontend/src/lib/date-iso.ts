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

/* --------------------------------------------------------------------------
 * #652 (S89) — Dates CIVILES venues du backend (`LocalDate`).
 *
 * ARBITRAGE (tranché le 2026-09-13, option A) : une `LocalDate` Java est une date
 * CIVILE — « le 24 juin », sans heure ni fuseau. Elle se lit en heure LOCALE,
 * partout, via CE module. `EventResponse.startDate/endDate/recurrenceEndDate`
 * sont sérialisés `"2026-06-24"`.
 *
 * LE DÉFAUT CORRIGÉ : `new Date("2026-06-24")` — chaîne date-SEULE — est lue par
 * JS en UTC (minuit UTC), puis `Intl` et `getDate()` la projettent dans le fuseau
 * du navigateur. À l'OUEST de Greenwich, minuit UTC tombe la VEILLE au soir :
 * l'événement du 24 s'affiche le 23, et la frise le place un jour trop tôt.
 * Invisible depuis Paris (à l'est) comme sur la CI (UTC) — même famille que
 * DEC-S75-001. `toLocalIsoDate` était juste : l'erreur était à la LECTURE, en amont.
 *
 * FRONTIÈRE — quel helper pour quelle donnée :
 *  - `LocalDate` (`YYYY-MM-DD`) → `parseLocalDate` / `parseLocalIsoDate` (ci-dessous) :
 *    minuit LOCAL du jour civil ;
 *  - `LocalDateTime` backend (`YYYY-MM-DDTHH:mm:ss`, sans offset) →
 *    `parseServerDateTime` / `serverDateTime` (référentiel serveur UTC, DEC-S83-004) ;
 *  - date légale figée (`legal-pages.ts`) → `Intl` avec `timeZone: 'UTC'` épinglé
 *    (DEC-S75-001) — n'utilise PAS ce helper ;
 *  - instants (`Date.now()`, `new Date()`, horodatage complet avec offset) → hors
 *    sujet, `new Date` reste correct.
 * Un appelant n'a donc plus le droit d'écrire `new Date(event.startDate)`.
 * ------------------------------------------------------------------------ */

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * `YYYY-MM-DD` STRICT → `Date` à minuit LOCAL, ou `null` (absente, vide, ou pas
 * au format date-seule). Déplacé depuis `components/events/previewTimeline.ts`
 * (#652), qui le ré-exporte pour ses appelants. Usage : saisie de formulaire,
 * où « pas une date » doit se distinguer d'une date.
 */
export function parseLocalIsoDate(value?: string | null): Date | null {
  if (!value) return null
  const match = LOCAL_DATE.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * `LocalDate` backend → `Date` à minuit LOCAL du jour civil. Remplace
 * `new Date(event.startDate)` et en garde le CONTRAT : rend toujours une `Date`,
 * éventuellement invalide (`NaN`) — les gardes `Number.isNaN(d.getTime())` des
 * appelants restent valables.
 *
 * TOLÉRANCE : une chaîne qui n'est PAS une date-seule (horodatage complet
 * `…T00:00:00.000Z`, fixtures de test historiques) désigne un INSTANT explicite ;
 * elle est passée telle quelle à `new Date`, comme avant. Seule la forme
 * `YYYY-MM-DD` change de lecture.
 */
export function parseLocalDate(value: string): Date {
  return parseLocalIsoDate(value) ?? new Date(LOCAL_DATE.test(value) ? Number.NaN : value)
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
