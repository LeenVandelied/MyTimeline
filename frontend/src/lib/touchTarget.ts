/**
 * Cibles tactiles 44 px en mobile (< 768 px, bascule `max-md:` alignée sur
 * `useMediaQuery('(max-width: 767px)')`). `h-11` = `--space-11` = 44 px (WCAG 2.5.5).
 *
 * HISTORIQUE : #738 (Sprint 99, DEC-S99-001) les a posées sur les seuls écrans de
 * réglages (`components/settings/touchTarget.ts`, qui ré-exporte désormais d'ici) ;
 * #754 (Sprint 101) les étend aux drawers mobiles, dialogues de confirmation et
 * rangées denses. Source UNIQUE : deux copies divergeraient.
 *
 * POURQUOI PAS DANS `ui/button.tsx` : la primitive `Button` porte la densité voulue
 * du tableau de bord, de la frise et des produits (`size="sm"`). Agrandir la cva
 * changerait tous ces écrans. L'agrandissement est donc posé en `className` par le
 * consommateur, et seulement sous 768 px : au-dessus, le rendu reste celui de la cva
 * (36 / 32 px), prouvé par `e2e/sprint-99-touch-targets.spec.ts` et
 * `e2e/sprint-101-touch-targets.spec.ts`. Les variantes `max-md:` ne sont pas
 * fusionnées par tailwind-merge avec le `h-9`/`h-8` de la cva (groupes distincts) :
 * les deux coexistent, `max-md:` l'emporte sous 768 px.
 *
 * `Input`, `SelectTrigger` et `SelectItem` n'en ont pas besoin : leur primitive porte
 * déjà l'agrandissement mobile (partout dans l'app).
 */

/** Surfaces spacieuses (pieds de drawers, dialogues, CTA d'état vide) : croissance réelle. */
export const TOUCH_TARGET_BUTTON = 'max-md:h-11'

/** Variante `size="icon"` : la largeur suit, pour une cible carrée 44×44. */
export const TOUCH_TARGET_ICON_BUTTON = 'max-md:h-11 max-md:w-11'

/**
 * Rangées DENSES (lignes de table, historique, en-tête du ruban) : la boîte visible
 * garde sa taille (32 px), la zone tactile est étendue à 44×44 par un `::before`
 * transparent centré, hors flux (PAT-S24-002, déjà utilisé par `theme-toggle` et
 * `language-selector`). `relative` est posé sans préfixe : il ne change rien au rendu
 * desktop (aucun enfant positionné) et sert d'ancre au pseudo en mobile.
 *
 * ⚠ Un ancêtre `overflow:hidden|auto` qui passerait à moins de 6 px de la boîte
 * rognerait le pseudo (PIT-S41-001) : la zone cliquable est mesurée par
 * `elementFromPoint` dans `e2e/sprint-101-touch-targets.spec.ts`, pas supposée.
 */
export const TOUCH_TARGET_HITBOX =
  "relative max-md:before:absolute max-md:before:top-1/2 max-md:before:left-1/2 max-md:before:h-11 max-md:before:w-11 max-md:before:-translate-x-1/2 max-md:before:-translate-y-1/2 max-md:before:content-['']"
