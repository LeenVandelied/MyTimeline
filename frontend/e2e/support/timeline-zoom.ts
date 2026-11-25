import {
  DAY_WIDTH_PX,
  MAX_PX_PER_DAY,
  MIN_PX_PER_DAY,
  ZOOM_STEP,
  formatHoursPerPx,
} from '../../src/components/timeline/zoom'

/**
 * #593 — Zoom CONTINU de la frise desktop : l'échelle (px/jour) part du palier mois et
 * chaque cran (bouton, `+`/`-`) la multiplie ou la divise par `ZOOM_STEP`, bornée entre
 * `MIN_PX_PER_DAY` (trimestre) et `MAX_PX_PER_DAY` (heure). La barre d'outils affiche
 * « 1 px = X h » au lieu du nom d'un palier. Les frises MOBILES gardent leurs paliers
 * (« Mois », « Semaine »…) : ce module ne les concerne pas.
 *
 * Constantes et format lus dans `zoom.ts` (noyau pur, sans React) : spec et code
 * partagent une seule valeur.
 */

/** Échelle au chargement : l'ancien palier mois. */
export const INITIAL_PX_PER_DAY = DAY_WIDTH_PX.month

/** Échelle après `steps` crans depuis `from` (positif = zoom avant), bornée comme le reducer. */
export function scaleAfterSteps(steps: number, from: number = INITIAL_PX_PER_DAY): number {
  let px = from
  for (let i = 0; i < Math.abs(steps); i++) {
    px =
      steps > 0
        ? Math.min(MAX_PX_PER_DAY, px * ZOOM_STEP)
        : Math.max(MIN_PX_PER_DAY, px / ZOOM_STEP)
  }
  return px
}

/** Texte exact de `timeline-zoom-level` (locale fr) à l'échelle donnée. */
export function scaleReadout(pxPerDay: number): string {
  return `1 px = ${formatHoursPerPx(pxPerDay, 'fr-FR')} h`
}

/** Crans qui suffisent à atteindre la borne fine depuis n'importe quelle échelle manuelle. */
export const ZOOM_STEPS_TO_MAX = Math.ceil(
  Math.log(MAX_PX_PER_DAY / MIN_PX_PER_DAY) / Math.log(ZOOM_STEP),
)

/** Crans avant qui mènent de l'échelle au chargement à la borne fine (l'heure). */
export const ZOOM_STEPS_INITIAL_TO_MAX = Math.ceil(
  Math.log(MAX_PX_PER_DAY / INITIAL_PX_PER_DAY) / Math.log(ZOOM_STEP),
)

/**
 * Échelles traversées de la borne fine (`MAX_PX_PER_DAY`, zone horaire) à la borne
 * large (`MIN_PX_PER_DAY`, trimestre), un cran arrière à la fois.
 */
export const SCALES_FROM_MAX_TO_MIN = Array.from({ length: ZOOM_STEPS_TO_MAX + 1 }, (_, i) =>
  scaleAfterSteps(-i, MAX_PX_PER_DAY),
)

export { MAX_PX_PER_DAY, MIN_PX_PER_DAY }
