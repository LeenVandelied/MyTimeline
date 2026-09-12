'use client'

import React, { useId } from 'react'
import { useTranslations } from 'next-intl'

/**
 * #617 — Champ « Catégorie » du formulaire d'événement, en LECTURE SEULE.
 *
 * DEC-S86-001 : la catégorie d'un événement est DÉRIVÉE de son produit
 * (`ProductEntity.category` NOT NULL), jamais surchargeable. Ce composant n'entre
 * donc PAS dans `EventEditForm` : il ne soumet rien, n'a aucune valeur de
 * formulaire, et ses deux appelants (création `NewEventDrawer`, édition
 * `TimelineEditHost`) lui passent la catégorie du produit concerné.
 *
 * a11y : volontairement NON focalisable et SANS `Select` Radix désactivé
 * (PIT-S62-008 : un contrôle focalisable qui ne fait rien est un piège clavier, et
 * « désactivé » y est un attribut de `div`). Le bloc est un `group` étiqueté par le
 * libellé : un lecteur d'écran lit « Catégorie » puis la valeur.
 *
 * Pastille : couleur du DTO catégorie posée telle quelle (DEC-S84-001) ; `null` →
 * AUCUN style inline, le CSS peint le contour neutre (DEC-S85-006, même règle que la
 * sidebar de la frise). Aucune couleur inventée.
 */
export interface EventCategoryFieldProps {
  /** Nom de la catégorie du produit ; `null`/vide = rien à afficher. */
  name: string | null
  /** `category.color` du DTO (hex nullable). */
  color: string | null
  /**
   * Message de l'état vide : `noProduct` (création, aucun produit choisi) ou
   * `unknown` (édition, view-model sans catégorie — non atteignable avec un produit
   * valide, mais on n'affiche pas « choisissez un produit » là où on ne peut pas).
   */
  emptyReason?: 'noProduct' | 'unknown'
  /** Préfixe de `data-testid` : racine `<testId>`, pastille `<testId>-swatch`. */
  testId: string
}

export const EventCategoryField: React.FC<EventCategoryFieldProps> = ({
  name,
  color,
  emptyReason = 'noProduct',
  testId,
}) => {
  const t = useTranslations('products.eventCategory')
  const labelId = useId()
  const hasName = Boolean(name)

  return (
    <div
      className="mt-drawer__field"
      role="group"
      aria-labelledby={labelId}
      data-testid={testId}
      data-empty={hasName ? 'false' : 'true'}
    >
      <span className="mt-drawer__label" id={labelId}>
        {t('label')}
      </span>
      <div className="mt-drawer__readonly">
        {hasName ? (
          <>
            <span
              className="mt-drawer__swatch"
              data-color={color === null ? 'none' : 'set'}
              style={color === null ? undefined : { backgroundColor: color, borderColor: color }}
              aria-hidden="true"
              data-testid={`${testId}-swatch`}
            />
            <span className="mt-drawer__readonly-text">{name}</span>
          </>
        ) : (
          <span className="mt-drawer__readonly-text mt-drawer__readonly-text--empty">
            {t(emptyReason)}
          </span>
        )}
      </div>
    </div>
  )
}

export default EventCategoryField
