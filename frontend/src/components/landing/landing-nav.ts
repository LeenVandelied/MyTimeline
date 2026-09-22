/**
 * #793 — SOURCE UNIQUE des ancres de navigation de la landing.
 *
 * Lue par `HeaderSection` (nav desktop + liste passée au panneau burger), par
 * `LandingMobileMenu` (identifiant de test de chaque lien) ET par le harnais E2E
 * (`e2e/support/contrast.ts`, `e2e/landing-mobile-menu.spec.ts`), qui en dérivent
 * leurs cibles et leur compte attendu.
 *
 * POURQUOI. Les ancres du panneau étaient ciblées PAR POSITION (`nav a`.nth(i)) et
 * la spec figeait leur nombre (PIT-S103-003) : retirer un lien obligeait à retoucher
 * deux fichiers de test, faute de quoi une ancre « disparaissait » des mesures de
 * contraste sans qu'aucun test ne rougisse. Ajouter ou retirer une ancre se fait
 * désormais ICI, et nulle part ailleurs.
 *
 * Module SANS dépendance React/next-intl : il est importé tel quel par Playwright
 * (même motif que `src/lib/event-palette`).
 */

/** Identifiants des sections ciblées, dans l'ordre de `HomePage` (sans `#`). */
export const LANDING_NAV_ANCHORS = ['how-it-works'] as const

export type LandingNavAnchor = (typeof LANDING_NAV_ANCHORS)[number]

/** Clé i18n (namespace racine) du libellé de chaque ancre. */
export const LANDING_NAV_LABEL_KEYS: Readonly<Record<LandingNavAnchor, string>> = {
  'how-it-works': 'common.landing.navigation.howItWorks',
}

/**
 * `data-testid` d'un lien d'ancre du panneau burger — convention `landing-header-menu-*`
 * du panneau (`landing-header-menu`, `-toggle`, `-close`, `-overlay`).
 */
export function landingMenuLinkTestId(anchor: LandingNavAnchor): string {
  return `landing-header-menu-link-${anchor}`
}
