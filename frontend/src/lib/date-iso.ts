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
