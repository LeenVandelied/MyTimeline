/**
 * #627 — Données du feuillet d'éphéméride de l'écran 404 (« Cette page n'a pas de
 * date dans l'almanach »).
 *
 * Fonctions PURES : la date est TOUJOURS injectée par l'appelant. Le composant
 * (`EphemerisLeaf`) ne l'obtient qu'APRÈS montage — `/_not-found` est prérendu au
 * build, une date calculée pendant le rendu y figerait le jour du build.
 *
 * HEURE LOCALE, pas UTC : c'est le jour de la personne qui regarde l'écran qui
 * compte. `Intl.DateTimeFormat` sans `timeZone` projette dans le fuseau du
 * navigateur, et `isoWeekNumber` lit les composantes LOCALES (`getFullYear`,
 * `getMonth`, `getDate`) — les deux ne peuvent donc pas diverger d'un jour.
 *
 * Aucune mise en capitales ici : le feuillet passe en capitales par CSS
 * (`uppercase`), ce qui garde le texte source lisible (et exact) pour les tests.
 */

export interface EphemerisParts {
  /** Jour de la semaine en toutes lettres (`jeudi`, `Thursday`…). */
  weekday: string
  /** Jour du mois sur 2 chiffres (`01`…`31`). */
  day: string
  /** Mois en toutes lettres (`janvier`, `January`…). */
  month: string
  /** Année (`2026`). */
  year: string
  /** Numéro de semaine ISO 8601 (1…53). */
  isoWeek: number
}

const MS_PER_DAY = 86_400_000

/**
 * Semaine ISO 8601 du jour CIVIL local de `date` : la semaine commence le lundi,
 * et la semaine 1 est celle qui contient le premier jeudi de l'année. Ainsi le
 * 1er janvier 2021 (un vendredi) est en semaine 53 de 2020, et le 29 décembre
 * 2025 (un lundi) en semaine 1 de 2026.
 *
 * Le calcul se fait sur une date UTC construite à partir des composantes LOCALES :
 * l'arithmétique en jours y est exacte (pas de journée de 23 h ou 25 h au passage
 * à l'heure d'été), sans pour autant changer de jour civil.
 */
export function isoWeekNumber(date: Date): number {
  const civil = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Lundi = 1 … dimanche = 7.
  const isoDay = civil.getUTCDay() || 7
  // Le jeudi de la même semaine ISO porte l'année ISO de cette semaine.
  civil.setUTCDate(civil.getUTCDate() + 4 - isoDay)
  const isoYearStart = Date.UTC(civil.getUTCFullYear(), 0, 1)
  return Math.ceil(((civil.getTime() - isoYearStart) / MS_PER_DAY + 1) / 7)
}

/**
 * Découpe `date` en libellés localisés pour le feuillet. Jour, mois et année
 * viennent d'UN SEUL formateur (`formatToParts`) : le mois y est donc à la forme
 * que la locale emploie dans une date complète.
 */
export function ephemerisParts(date: Date, locale: string): EphemerisParts {
  const parts = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  return {
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),
    day: pick('day'),
    month: pick('month'),
    year: pick('year'),
    isoWeek: isoWeekNumber(date),
  }
}
