/**
 * Données partagées des pages légales (`/privacy`, `/terms`) — #60, Sprint 75.
 *
 * POURQUOI UN MODULE DÉDIÉ ET PAS UN `lib/config.ts`. L'énoncé de l'issue
 * suggérait une « config » centrale. `src/lib/` ne contient que des modules
 * étroits et nommés par leur sujet (`auth-jwks`, `canonical-host`,
 * `query-keys`…) : aucun fourre-tout n'existe, et en créer un attirerait
 * mécaniquement toute constante sans domicile. Ce module ne porte donc QUE ce
 * dont les deux pages légales ont besoin.
 */

/**
 * Date de dernière mise à jour des textes légaux, en ISO 8601.
 *
 * SOURCE UNIQUE : elle était recopiée en dur (`01/06/2023`) dans le JSX des
 * DEUX pages, donc destinée à diverger à la première révision d'un seul des
 * deux textes.
 *
 * ⚠ Toute modification des textes de `public/locales/<locale>/legal.json` doit
 * s'accompagner d'une mise à jour de cette constante.
 */
export const LEGAL_LAST_UPDATED_ISO = '2023-06-01'

/**
 * Formate la date légale pour la locale demandée.
 *
 * FORMAT RETENU : jour + mois EN TOUTES LETTRES + année (« 1 juin 2023 »,
 * « June 1, 2023 », « 1. Juni 2023 »). Le format numérique d'origine
 * (`01/06/2023`) est AMBIGU dès qu'on quitte le français : `en` le lit
 * « 6 janvier ». Sur une page qui fixe une date d'opposabilité, une inversion
 * jour/mois n'est pas un détail cosmétique. Le mois littéral supprime
 * l'ambiguïté dans les 4 locales sans imposer un format unique étranger à
 * trois d'entre elles.
 *
 * ⚠ `timeZone: 'UTC'` est OBLIGATOIRE : `new Date('2023-06-01')` est parsée à
 * minuit UTC, et un formatage dans un fuseau à l'ouest de Greenwich rendrait
 * « 31 mai ». Le décalage ne se voit pas sur une machine européenne — c'est
 * précisément pourquoi il est verrouillé ici plutôt que laissé au défaut.
 */
export function formatLegalDate(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${LEGAL_LAST_UPDATED_ISO}T00:00:00Z`))
}

/**
 * Locale de rédaction d'origine des textes légaux — celle qui fait foi.
 *
 * Volontairement NON exportée : son seul lecteur est `shouldShowLegalDisclaimer`
 * juste dessous. L'exporter inviterait un appelant à re-implémenter la
 * comparaison au lieu d'appeler le prédicat, et la règle « le disclaimer ne
 * s'affiche pas dans la langue source » se retrouverait écrite à deux endroits.
 */
const LEGAL_SOURCE_LOCALE = 'fr'

/**
 * Le disclaimer « la version française fait foi » n'a de sens que pour un
 * lecteur qui consulte une TRADUCTION. En `fr`, la page EST la version qui fait
 * foi : l'afficher y serait un truisme.
 */
export function shouldShowLegalDisclaimer(locale: string): boolean {
  return locale !== LEGAL_SOURCE_LOCALE
}

/**
 * Une entrée de sommaire = l'ancre d'une `<section>` + la clé i18n de son
 * `<h2>`.
 *
 * Le sommaire réutilise la clé du titre au lieu d'en recopier le texte : toute
 * retraduction se propage aux deux endroits, et une clé supprimée se voit
 * immédiatement. `legal-pages.test.ts` vérifie en plus que chaque `id` déclaré
 * ici est bien posé dans le JSX de la page correspondante.
 */
export type LegalSection = {
  readonly id: string
  readonly titleKey: string
}

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  { id: 'introduction', titleKey: 'privacy.introduction.title' },
  { id: 'data-collection', titleKey: 'privacy.dataCollection.title' },
  { id: 'data-use', titleKey: 'privacy.dataUse.title' },
  { id: 'data-sharing', titleKey: 'privacy.dataSharing.title' },
  { id: 'data-protection', titleKey: 'privacy.dataProtection.title' },
  { id: 'user-rights', titleKey: 'privacy.userRights.title' },
  { id: 'cookies', titleKey: 'privacy.cookies.title' },
  { id: 'policy-changes', titleKey: 'privacy.policyChanges.title' },
  { id: 'contact', titleKey: 'privacy.contact.title' },
] as const

export const TERMS_SECTIONS: readonly LegalSection[] = [
  { id: 'preamble', titleKey: 'terms.preamble.title' },
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `article-${index + 1}`,
    titleKey: `terms.article${index + 1}.title`,
  })),
] as const

const ROMAN_UNITS: readonly (readonly [number, string])[] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

/**
 * Numérotation romaine du sommaire (I, II, III…), imposée par l'issue.
 *
 * ⚠ Purement DÉCORATIVE : le rendu la marque `aria-hidden`, sinon un lecteur
 * d'écran annoncerait « I » (lu « i » ou « un ») avant chaque titre. Cf.
 * `LegalTableOfContents`.
 */
export function toRomanNumeral(value: number): string {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`toRomanNumeral attend un entier >= 1, reçu : ${value}`)
  }

  let remaining = value
  let roman = ''
  for (const [weight, symbol] of ROMAN_UNITS) {
    while (remaining >= weight) {
      roman += symbol
      remaining -= weight
    }
  }
  return roman
}
