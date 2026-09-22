import { eventLabelReadableInside } from './lib'
import { isRecurringSeries } from './recurrence-marks'
import { eventKind, PIN_FOOTPRINT_PX, PIN_HALF_WIDTH_PX, type PositionedEvent } from './zoom'

/**
 * #746 — RÉSERVE DES LIBELLÉS dans l'empilage en rangées (cœur PUR : ni React, ni DOM).
 *
 * Depuis #709, `layoutLane` (`lane-layout.ts`) empile les occurrences d'une lane selon
 * l'emprise horizontale de chacune. Deux libellés dépassaient cette emprise et se
 * peignaient sur l'occurrence suivante de leur rangée :
 *  1. le libellé d'un PONCTUEL (pin) plus long que l'emprise constante 100 / 90 px
 *     (`PIN_FOOTPRINT_PX`), alors que le CSS le laissait courir jusqu'à 240 px ;
 *  2. le libellé EXTÉRIEUR de secours d'une barre à faible contraste
 *     (`!eventLabelReadableInside`, `.mt-tlv__evt-outside`), posé après la barre et
 *     réservé à 0 px.
 *
 * DÉCISION DE CHARTE (DEC-S98, tranchée par le dev contre la recommandation ui-design de
 * tronquer à 84 / 74 px — ~12 caractères, et pas de survol au doigt pour lire la suite) :
 * RÉSERVE ESTIMÉE, SANS DOM.
 *  - largeur du texte = nombre de caractères × chasse moyenne de la police du libellé
 *    (Archivo semibold ; mesurée en navigateur le 2026-09-21 sur 12 titres fr/de/en/es :
 *    5,7 à 6,7 px/car. à 12 px, 5,9 à 7,0 à 12,5 px) — retenu ≈ 0,525 em, soit 6,3 px
 *    desktop (12 px) et 6,6 px mobile (12,5 px) ; le préfixe de série `↻ ` compte pour
 *    3 caractères (glyphe plus large qu'un caractère moyen) ;
 *  - pin : emprise = décalage de départ du libellé (`x + 11`) + texte, PLANCHER = l'emprise
 *    historique (100 / 90 px), PLAFOND = décalage + 240 px (l'ancien `max-width`) ;
 *  - libellé extérieur (desktop seulement : les frises mobiles n'en rendent pas) :
 *    emprise APRÈS la barre = écart 6 px + boîte (padding 2 × 4 px + texte), boîte
 *    plafonnée à 240 px ;
 *  - le CSS reçoit la place réservée en `--mt-label-max` (ellipse + `title` = titre
 *    complet) : si l'estimation est optimiste (majuscules, allemand long), le texte est
 *    COUPÉ à sa réserve, il ne déborde jamais sur l'occurrence suivante.
 *
 * Pourquoi une estimation plutôt qu'une mesure (`canvas.measureText`, DOM) : `layoutLane`
 * reste pur et déterministe (DEC-S97-002, recalcul par niveau de zoom), sans dépendance
 * au chargement de police ni seconde passe de mise en page, et testable sans navigateur.
 * Conséquence assumée : davantage de rangées quand les titres sont longs.
 */

/** Vue dont on estime les libellés (police et emprise plancher différentes). */
export type LabelView = 'desktop' | 'mobile'

/** Chasse moyenne (px/caractère) du libellé : 12 px desktop, 12,5 px mobile (`timeline.css`). */
export const LABEL_CHAR_WIDTH_PX = { desktop: 6.3, mobile: 6.6 } as const

/** Largeur comptée pour le préfixe de série `↻ ` (en caractères moyens). */
export const RECURRENCE_PREFIX_CHARS = 3

/** Départ du libellé d'un pin depuis la date : pin à `x − 5`, largeur 10, gap 6 ⇒ `x + 11`. */
export const PIN_LABEL_OFFSET_PX = PIN_HALF_WIDTH_PX + 6

/** Plafond de largeur d'un libellé (ancien `max-width` du pin). */
export const LABEL_MAX_WIDTH_PX = 240

/** Libellé extérieur : écart barre → libellé (`EventPill`, `leftPx + widthPx + 6`). */
export const OUTSIDE_LABEL_GAP_PX = 6

/** Libellé extérieur : padding horizontal total de la boîte (`padding: 0 4px`). */
export const OUTSIDE_LABEL_PADDING_PX = 8

/** Largeur estimée (px, entière) d'un libellé, glyphe de série compris. */
export function estimateLabelWidthPx(title: string, recurring: boolean, view: LabelView): number {
  // Points de code, pas unités UTF-16 : un emoji compte pour un caractère.
  const chars = Array.from(title).length + (recurring ? RECURRENCE_PREFIX_CHARS : 0)
  return Math.ceil(chars * LABEL_CHAR_WIDTH_PX[view])
}

/** Emprise réservée d'un ponctuel après sa date (plancher historique, plafond 240 px). */
export function pinFootprintPx(title: string, recurring: boolean, view: LabelView): number {
  const raw = PIN_LABEL_OFFSET_PX + estimateLabelWidthPx(title, recurring, view)
  return Math.min(Math.max(raw, PIN_FOOTPRINT_PX[view]), PIN_LABEL_OFFSET_PX + LABEL_MAX_WIDTH_PX)
}

/** Largeur maximale du libellé d'un pin d'emprise `footprintPx` (valeur de `--mt-label-max`). */
export function pinLabelMaxPx(footprintPx: number): number {
  return Math.max(0, footprintPx - PIN_LABEL_OFFSET_PX)
}

/** Emprise réservée APRÈS une barre pour son libellé extérieur de secours. */
export function outsideLabelTrailPx(title: string, recurring: boolean): number {
  const box = Math.min(
    OUTSIDE_LABEL_PADDING_PX + estimateLabelWidthPx(title, recurring, 'desktop'),
    LABEL_MAX_WIDTH_PX,
  )
  return OUTSIDE_LABEL_GAP_PX + box
}

/** Largeur maximale de la boîte du libellé extérieur (valeur de `--mt-label-max`). */
export function outsideLabelMaxPx(trailPx: number): number {
  return Math.max(0, trailPx - OUTSIDE_LABEL_GAP_PX)
}

/**
 * Applique les réserves de libellé aux événements positionnés d'une vue :
 *  - ponctuel : `widthPx` = emprise estimée (c'est bien une emprise, jamais peinte) ;
 *  - barre à libellé extérieur (desktop) : `labelTrailPx` = emprise après la barre.
 *    Le `widthPx` d'une barre n'est PAS touché : c'est sa largeur peinte.
 * Les événements inchangés gardent leur identité (pas de copie inutile).
 */
export function applyLabelReserves(
  eventsByResource: ReadonlyMap<string, readonly PositionedEvent[]>,
  view: LabelView,
): Map<string, PositionedEvent[]> {
  const map = new Map<string, PositionedEvent[]>()
  for (const [resourceId, events] of eventsByResource) {
    map.set(
      resourceId,
      events.map((event) => {
        const recurring = isRecurringSeries(event)
        if (eventKind(event) === 'single') {
          const widthPx = pinFootprintPx(event.title, recurring, view)
          return widthPx === event.widthPx ? event : { ...event, widthPx }
        }
        if (view !== 'desktop') return event
        const archived = event.extendedProps?.archived === true
        if (eventLabelReadableInside(event.color, archived)) return event
        return { ...event, labelTrailPx: outsideLabelTrailPx(event.title, recurring) }
      }),
    )
  }
  return map
}
