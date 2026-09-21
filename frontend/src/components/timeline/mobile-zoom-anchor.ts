/**
 * #747 — ANCRE TEMPORELLE DES FRISES MOBILES AU CHANGEMENT DE ZOOM.
 *
 * `scrollLeft` est une longueur en PIXELS du rail ; l'échelle px/jour change à
 * chaque niveau de zoom. Laissé tel quel, il désigne après zoom une AUTRE date
 * (zoom avant : la frise glisse vers le passé ; zoom arrière : le navigateur rabat
 * la valeur périmée sur `scrollWidth - clientWidth` et la frise saute au bord
 * droit). Pendant mobile de #449 (desktop, `TimelineView.tsx`).
 *
 * REPÈRE RETENU (DEC-S98) : le jour situé au CENTRE de la zone de PISTE visible,
 * et non au bord gauche comme sur desktop. Sur 360-850 px l'objet regardé est au
 * centre, et le pinch agit au centre ; ancrer au bord gauche ferait sortir
 * l'objet regardé au zoom avant.
 *
 * Zone de piste visible (repère RAIL, celui de `scrollLeft`) :
 *   [scrollLeft + gutter, scrollLeft + clientWidth]
 * — les `gutter` premiers pixels du viewport sont TOUJOURS couverts par l'en-tête
 * de lane sticky (`.mt-tlm__lane-label`, opaque). Son centre, ramené en repère
 * PISTE (origine = `rangeStart`, gouttière retirée), vaut
 *   scrollLeft + (clientWidth - gutter) / 2.
 * La gouttière est une constante en px : elle ne se met PAS à l'échelle.
 *
 * Fonctions PURES : la preuve comportementale (clamp du navigateur) est l'E2E
 * `e2e/sprint-98-mobile-zoom-anchor.spec.ts` — jsdom ne clampe pas `scrollLeft`.
 */

/** Demi-largeur (px) de la zone de piste visible. Jamais négative. */
function halfTrackViewport(clientWidth: number, gutterPx: number): number {
  return Math.max(0, clientWidth - gutterPx) / 2
}

/**
 * Jour (fractionnaire, depuis `rangeStart`) affiché au centre de la zone de piste
 * visible. Invariant au zoom : c'est la grandeur à mémoriser AVANT le changement
 * d'échelle. `null` si l'échelle est inexploitable.
 */
export function centerDayFromScroll(
  scrollLeft: number,
  clientWidth: number,
  dayWidth: number,
  gutterPx: number,
): number | null {
  if (!(dayWidth > 0)) return null
  return (scrollLeft + halfTrackViewport(clientWidth, gutterPx)) / dayWidth
}

/**
 * `scrollLeft` (repère RAIL) qui ramène `centerDay` au centre de la zone de piste
 * visible à l'échelle `dayWidth`. Borné à 0 ; la borne haute est laissée au
 * navigateur (clamp sur `scrollWidth - clientWidth`), seul à connaître la largeur
 * réelle du rail après le rendu.
 */
export function scrollLeftForCenterDay(
  centerDay: number,
  clientWidth: number,
  dayWidth: number,
  gutterPx: number,
): number {
  return Math.max(0, centerDay * dayWidth - halfTrackViewport(clientWidth, gutterPx))
}
