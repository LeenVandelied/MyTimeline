import React from 'react'
import { contrastInk } from '@/lib/color'
import { eventLabelReadableInside } from './lib'
import { statusToVar, type PositionedEvent } from './zoom'

/**
 * #192 — EventPill : rendu compact d'un event sur la frise desktop continue.
 *
 * Décision (critère d'acceptation) : composant DÉDIÉ, PAS une réutilisation
 * d'`EventContent`. `EventContent` est le rendu « riche » du calendrier (dialog
 * d'édition, popover couleur, deps next-intl/auth/services). La frise desktop
 * (`TimelineView`) n'a besoin que d'une pastille cliquable (point de statut +
 * titre tronqué) qui ouvre le `EventDrawer` — un rendu volontairement léger,
 * sans les dépendances lourdes d'`EventContent`. `EventBar.tsx` (brique #47,
 * fenêtre fixe 30 j + `EventContent`) n'est PAS consommé par `TimelineView` :
 * la vraie pastille compacte à extraire était le `<button className="mt-tlv__evt">`
 * inline de `TimelineView`. C'est ce bloc qui devient `EventPill`.
 *
 * data-testid `timeline-event` + `data-event-title` PRÉSERVÉS (dépendance
 * E2E golden-path #163 + TimelineView.test.tsx).
 *
 * BR-EVE-009 : l'encre du texte est calculée par contraste WCAG via `contrastInk`
 * (helper mutualisé `lib/color.ts`), poussée dans `--mt-evt-ink`. Fini le
 * fallback `#fff` hardcodé du CSS : illisible sur les fonds clairs de la palette.
 *
 * #81 (a11y) — La pastille est le NŒUD FOCUSABLE de la navigation clavier de la
 * frise (roving tabindex : cf. `TimelineView`). Elle expose :
 *  - `tabIndex` piloté par le parent (0 = pastille active/roving, -1 = inerte) ;
 *  - `onKeyDown` délégué au parent (flèches ↑↓ = lanes, ←→ = pastilles, Home/End) ;
 *    Enter/Espace ouvrent le drawer NATIVEMENT (élément `<button>`, aucun handler
 *    custom requis → pas de double-déclenchement) ;
 *  - `data-evt-nav` (coordonnées "resourceId:index") pour que le parent retrouve
 *    et `.focus()` la bonne pastille après un déplacement au clavier ;
 *  - un GARDE-FOU CONTRASTE (point 6) : si le libellé ne passe pas AA 4.5:1
 *    À L'INTÉRIEUR de la barre (fond clair + barre étroite), le titre est répété
 *    en libellé EXTÉRIEUR (`.mt-tlv__evt-outside`), lisible sur le fond de lane.
 *
 * `pillRef` (forwardRef via callback ref du parent) reste défensif : #81 garde la
 * fonction `.focus()` robuste même si la virtualisation (Wave 7, non livrée) recycle
 * le DOM plus tard — le parent vérifie la présence du node avant d'appeler `.focus()`.
 */
export interface EventPillProps {
  event: PositionedEvent
  /** Label a11y complet (titre + statut + dates + produit + récurrence), construit par l'appelant. */
  ariaLabel: string
  onSelect: (event: PositionedEvent) => void
  /** #81 — roving tabindex : 0 pour la pastille active, -1 pour les autres. */
  tabIndex?: number
  /** #81 — délégation clavier au parent (navigation flèches / Home / End). */
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  /** #81 — coordonnée de navigation "resourceId:index" (retrouve le node à focus). */
  navKey?: string
  /** #81 — ref callback (le parent indexe les nodes pour `.focus()` défensif). */
  pillRef?: (node: HTMLButtonElement | null) => void
}

export const EventPill: React.FC<EventPillProps> = ({
  event,
  ariaLabel,
  onSelect,
  tabIndex = -1,
  onKeyDown,
  navKey,
  pillRef,
}) => {
  const statusVar = statusToVar(event.status)
  const bg = event.color || 'var(--color-accent)'
  // #81 point 6 — si l'encre calculée ne passe pas AA À L'INTÉRIEUR de la barre,
  // on masque le titre dedans (aria-hidden, décoratif) et on le répète dehors.
  const readableInside = eventLabelReadableInside(event.color)
  return (
    <>
      <button
        type="button"
        ref={pillRef}
        className="mt-tlv__evt"
        data-testid="timeline-event"
        data-event-title={event.title}
        data-evt-nav={navKey}
        aria-label={ariaLabel}
        tabIndex={tabIndex}
        onClick={() => onSelect(event)}
        onKeyDown={onKeyDown}
        style={{
          left: `${event.leftPx}px`,
          width: `${event.widthPx}px`,
          ['--mt-evt' as string]: bg,
          ['--mt-evt-status' as string]: statusVar,
          // BR-EVE-009 : encre lisible calculée (contraste WCAG), plus de `#fff` hardcodé.
          ['--mt-evt-ink' as string]: contrastInk(event.color),
        }}
      >
        <span
          className="mt-tlv__evt-dot"
          style={{ background: statusVar }}
          aria-hidden="true"
        />
        {/* Titre interne. `aria-hidden` CONDITIONNEL (#228) :
            - `readableInside` vrai → ce span est le SEUL rendu visible du titre →
              on le DÉMASQUE aux lecteurs d'écran. Pas de double annonce : l'`aria-label`
              du bouton fournit le nom accessible (il PRIME sur le sous-arbre) et
              contient déjà le titre → Label-in-Name (WCAG 2.5.3) satisfait.
            - `readableInside` faux → le titre est répété DEHORS (garde-fou contraste
              #81) → ce span interne est purement décoratif → `aria-hidden`. */}
        <span aria-hidden={readableInside ? undefined : true}>{event.title}</span>
      </button>
      {/* #81 point 6 — libellé extérieur de secours si contraste < 4.5:1 dedans.
          Décoratif (aria-hidden) : le bouton porte déjà l'annonce vocale complète. */}
      {!readableInside && (
        <span
          className="mt-tlv__evt-outside"
          data-testid="timeline-event-outside-label"
          aria-hidden="true"
          style={{ left: `${event.leftPx + event.widthPx + 6}px` }}
        >
          {event.title}
        </span>
      )}
    </>
  )
}

export default EventPill
