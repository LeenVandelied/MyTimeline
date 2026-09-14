import React from 'react'

/**
 * #594 — Corps VISUEL d'un événement ponctuel sur la frise, partagé par les TROIS
 * frises (desktop `EventPill`, mobile portrait, mobile paysage).
 *
 * Maquette (`docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md` §2) :
 *  - pin 10 px × hauteur de barre, rayon 3, ombre sm, couleur de l'événement
 *    (`--mt-evt`, posée par l'appelant sur le bouton) ;
 *  - libellé À DROITE, HORS du pin, en ENCRE DE LA PAGE (`--color-ink`) : il est posé
 *    sur le fond de lane, jamais sur la couleur de l'événement. Le garde-fou de
 *    contraste des barres (`eventLabelReadableInside`, libellé extérieur de secours)
 *    est donc sans objet pour un pin — un seul libellé, toujours dehors.
 *
 * Ce composant ne porte AUCUN handler ni positionnement : l'élément cliquable (le
 * bouton parent, propre à chaque vue) englobe pin ET libellé, de sorte que le
 * libellé fait partie de la cible (maquette : « pin ET libellé cliquables ») et que
 * la zone de frappe atteint 44 px (hauteur du bouton, cf. `timeline.css`).
 *
 * Le libellé n'est PAS `aria-hidden` : c'est le seul rendu visible du titre, inclus
 * dans l'`aria-label` du bouton (Label-in-Name, WCAG 2.5.3 — même règle que #228).
 *
 * #595 — série récurrente : libellé = `"↻ " + titre` (maquette §2), dans la police du
 * libellé. Le glyphe est `aria-hidden` (l'`aria-label` du bouton annonce déjà la
 * récurrence, BR-EVE-006) et n'est PAS une icône directionnelle : pas de classe de
 * retournement RTL (`i18n.css`). Les occurrences fantômes et le connecteur vivent HORS
 * de ce composant (`RecurrenceMarks`, non cliquables).
 */
export const EventPinContent: React.FC<{ title: string; recurring?: boolean }> = ({
  title,
  recurring = false,
}) => (
  <>
    <span className="mt-evt-pin" aria-hidden="true" />
    <span className="mt-evt-pin__label">
      {recurring && (
        <span className="mt-evt-pin__recur" aria-hidden="true">
          {'↻ '}
        </span>
      )}
      {title}
    </span>
  </>
)

export default EventPinContent
