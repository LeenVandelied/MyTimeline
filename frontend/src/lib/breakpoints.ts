/**
 * #643 — Seuils de taille d'écran, côté JavaScript.
 *
 * ⚠ Ce module est aussi chargé HORS de Next, par Tailwind (jiti), via
 * `styles/viewport-variants.ts` : aucun import `@/` (l'alias n'y est pas résolu) et aucun
 * effet de bord, seulement des constantes.
 *
 * LARGEUR : les paliers sont des tokens du thème (`--breakpoint-*` dans le `@theme` de
 * `styles/globals.css`), d'où Tailwind tire les variantes `sm:`, `md:`, `lg:`. Un
 * `matchMedia` ne peut pas lire ces tokens (et rien n'est lisible au rendu serveur) : les
 * valeurs sont donc reprises ici, en px. Leur égalité avec le thème est vérifiée par
 * `styles/__tests__/breakpoints.test.ts` : modifier un palier, c'est modifier les deux.
 *
 * HAUTEUR : aucun palier Tailwind. Les seuils sont des constantes nommées, documentées,
 * dont chaque requête de hauteur de l'application tire sa valeur.
 *
 * Une requête porte une seule de ces constantes par condition, suivie de `px` : un
 * palier de largeur seul ou décalé de 1 (`${BREAKPOINT_MD_PX - 1}px`), un seuil de
 * hauteur sans décalage.
 *
 * VALEURS : les seuils actuels sont gardés tels quels. L'écart avec la maquette paysage
 * (`Paysage Breakpoints.dc.html`) n'est pas vérifié : décision du plan de sprint du
 * 2026-11-25.
 */

/** Palier `sm` du thème (`--breakpoint-sm`). */
export const BREAKPOINT_SM_PX = 640

/** Palier `md` du thème (`--breakpoint-md`). */
export const BREAKPOINT_MD_PX = 768

/** Palier `lg` du thème (`--breakpoint-lg`). */
export const BREAKPOINT_LG_PX = 1024

/**
 * #64 — Hauteur maximale, incluse, du mode paysage mobile de la frise. Le seuil de
 * hauteur, et pas seulement l'orientation, distingue un téléphone ou une petite tablette
 * retournés d'un iPad Pro en paysage (environ 1024 px de haut, qui reste en bureau).
 */
export const MOBILE_LANDSCAPE_MAX_HEIGHT_PX = 600

/**
 * #64 — Hauteur maximale, incluse, sous laquelle la frise masque d'office sa minimap :
 * trop peu de place verticale pour la garder.
 */
export const MINIMAP_HIDE_MAX_HEIGHT_PX = 400

/**
 * #85 — Hauteur maximale, incluse, du mode paysage mobile du tableau de bord (rail et
 * deux colonnes) : en paysage, il s'applique jusqu'à 500 px de haut inclus. Au-dessus, le
 * tableau de bord garde sa mise en page bureau ou portrait. Plus bas que celui de la frise.
 */
export const DASHBOARD_LANDSCAPE_MAX_HEIGHT_PX = 500

/** Requête du paysage mobile du tableau de bord : la page et son squelette (`loading.tsx`). */
export const DASHBOARD_LANDSCAPE_QUERY = `(orientation: landscape) and (max-height: ${DASHBOARD_LANDSCAPE_MAX_HEIGHT_PX}px)`

/**
 * Variante Tailwind de `DASHBOARD_LANDSCAPE_QUERY` (`dashboard-landscape:hidden`),
 * déclarée par `styles/viewport-variants.ts`. Le squelette est rendu avant que la taille
 * d'écran soit connue : il bascule en CSS seul, sur la même requête que la page.
 */
export const DASHBOARD_LANDSCAPE_VARIANT = 'dashboard-landscape'
