/**
 * #738 (Sprint 99, DEC-S99-001) — cibles tactiles 44 px des boutons des Réglages
 * en mobile (< 768 px, même bascule que `useMediaQuery('(max-width: 767px)')` de
 * `settings/page.tsx`). `h-11` = `--space-11` = 44 px (WCAG 2.5.5).
 *
 * POURQUOI ICI ET PAS DANS `ui/button.tsx` : la primitive `Button` porte la
 * densité voulue du tableau de bord, de la frise et des produits (`size="sm"`),
 * et les icônes au pas serré s'y agrandissent par pseudo-élément (PAT-S24-002).
 * Agrandir la cva aurait changé tous ces écrans. La décision limite donc
 * l'agrandissement aux écrans de réglages, posé en `className` par consommateur.
 *
 * `max-md:` seulement : au-dessus de 768 px le rendu reste celui de la cva
 * (36 / 32 px), prouvé par `e2e/sprint-99-touch-targets.spec.ts`. Les variantes
 * ne sont pas fusionnées par tailwind-merge avec le `h-9`/`h-8` de la cva
 * (groupes distincts) : les deux coexistent, `max-md:` l'emporte sous 768 px.
 *
 * `Input`, `SelectTrigger` et `SelectItem` n'en ont pas besoin : leur primitive
 * porte déjà l'agrandissement mobile (partout dans l'app).
 */
export const SETTINGS_TOUCH_BUTTON = 'max-md:h-11'

/** Variante `size="icon"` : la largeur suit, pour une cible carrée 44×44. */
export const SETTINGS_TOUCH_ICON_BUTTON = 'max-md:h-11 max-md:w-11'
