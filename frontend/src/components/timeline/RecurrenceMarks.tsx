import React from 'react'
import { GHOST_PIN_HALF_PX, type LaneRecurrenceMarks, type MarkStyleVars } from './recurrence-marks'

/**
 * #595 — Rendu des marques de récurrence d'UNE lane, partagé par les trois frises.
 *
 * Classes DS EXISTANTES pour le rendu (critère de l'issue) :
 *  - fantôme de durée : `.mt-evt` + `.mt-evt--draft` (contour pointillé, fond à 8 %) ;
 *  - connecteur : `.mt-evt-connector` (trait pointillé, couleur planchée #497).
 * Seul le fantôme de PONCTUEL a une classe neuve, `.mt-evt-pin--ghost` : le DS n'avait
 * aucun équivalent (vocabulaire `.mt-evt-pin*` de #594).
 * La classe de VUE (`mt-tlv__*` desktop / `mt-tlm__*` mobile) ne porte que le placement
 * vertical, la gouttière desktop et `pointer-events:none`.
 *
 * À monter AVANT les occurrences réelles de la lane : même contexte d'empilement, donc
 * l'ordre DOM est l'ordre de peinture → une occurrence réelle n'est jamais recouverte.
 * `aria-hidden` : l'`aria-label` de l'occurrence réelle annonce déjà la récurrence
 * (`buildEventAriaLabel`, BR-EVE-006). Aucun `data-testid` (PIT-S46-001) : crochets
 * d'assertion en attributs `data-recurrence-mark` / `data-event-id` / `data-occurrence-date`.
 */
export interface RecurrenceMarksProps {
  marks: LaneRecurrenceMarks
  variant: 'desktop' | 'mobile'
}

/**
 * Les custom properties `--mt-evt*` sont l'API documentée du DS ; `React.CSSProperties`
 * (csstype) n'expose pas d'index signature pour elles — seule justification du cast.
 */
function withVars(style: MarkStyleVars, geometry: React.CSSProperties): React.CSSProperties {
  return { ...geometry, ...style } as React.CSSProperties
}

export const RecurrenceMarks: React.FC<RecurrenceMarksProps> = ({ marks, variant }) => {
  if (marks.connectors.length === 0 && marks.ghosts.length === 0) return null
  const view = variant === 'desktop' ? 'mt-tlv' : 'mt-tlm'
  return (
    <>
      {marks.connectors.map((c) => (
        <span
          key={c.key}
          className={`mt-evt-connector ${view}__connector`}
          style={withVars(c.style, { left: `${c.leftPx}px`, width: `${c.widthPx}px` })}
          aria-hidden="true"
          data-recurrence-mark="connector"
          data-event-id={c.eventId}
        />
      ))}
      {marks.ghosts.map((g) =>
        g.kind === 'single' ? (
          <span
            key={g.key}
            className={`mt-evt-pin--ghost ${view}__ghost-pin`}
            style={withVars(g.style, { left: `${g.leftPx - GHOST_PIN_HALF_PX}px` })}
            aria-hidden="true"
            data-recurrence-mark="ghost"
            data-event-id={g.eventId}
            data-event-kind="single"
            data-occurrence-date={g.date}
          />
        ) : (
          <span
            key={g.key}
            className={`mt-evt mt-evt--draft ${view}__ghost`}
            style={withVars(g.style, { left: `${g.leftPx}px`, width: `${g.widthPx}px` })}
            aria-hidden="true"
            data-recurrence-mark="ghost"
            data-event-id={g.eventId}
            data-event-kind="duration"
            data-occurrence-date={g.date}
          />
        ),
      )}
    </>
  )
}

export default RecurrenceMarks
