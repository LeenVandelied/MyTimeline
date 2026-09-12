'use client'

import React, { useCallback, useEffect, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PositionedEvent } from './zoom'
import { useFocusTrap } from './useFocusTrap'

/**
 * #63 — Action sheet mobile (modifier / supprimer) déclenché par le bouton `⋯`
 * (alternative a11y visible au long-press) ET par le long-press sur un bloc.
 *
 * A11y : `role="dialog" aria-modal="true"` + `aria-label`, focus trap, Escape,
 * fermeture par tap hors zone. Chaque action ≥ 44px de haut.
 *
 * Les callbacks `onEdit`/`onDelete` sont optionnels : l'action sheet reste
 * rendue (exigence a11y : alternative visible au long-press) même si le parent
 * ne câble pas encore l'édition/suppression. Le câblage service (updateEvent/
 * deleteEvent + garde d'ownership BR-EVE-001) relève du parent / d'un suivi.
 */
export interface TimelineActionSheetProps {
  event: PositionedEvent | null
  onClose: () => void
  onEdit?: (event: PositionedEvent) => void
  /**
   * ⚠ CONTRAT (#review S46, MAJEUR) : ce callback DEMANDE la suppression, il ne
   * l'exécute PAS. La suppression est un hard-delete serveur (`br-events` §5) —
   * un tap ne doit jamais détruire une donnée sans confirmation. Le parent
   * (`TimelineEditHost`) ouvre `DeleteConfirmDialog`, comme le chemin desktop.
   *
   * Retour `void` volontaire : rien à `await` ici, donc aucune promesse orpheline
   * (la feuille se ferme sur une simple demande, pas sur un succès supposé).
   */
  onDelete?: (event: PositionedEvent) => void
}

export const TimelineActionSheet: React.FC<TimelineActionSheetProps> = ({
  event,
  onClose,
  onEdit,
  onDelete,
}) => {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, Boolean(event))

  useEffect(() => {
    if (!event) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [event, onClose])

  const handleEdit = useCallback(() => {
    if (event) onEdit?.(event)
    onClose()
  }, [event, onEdit, onClose])

  // Ferme la feuille et laisse le parent ouvrir la confirmation (cf. contrat `onDelete`).
  const handleDelete = useCallback(() => {
    if (event) onDelete?.(event)
    onClose()
  }, [event, onDelete, onClose])

  if (!event) return null

  return (
    <>
      <div
        className="mt-sheet__overlay"
        onClick={onClose}
        data-testid="timeline-actionsheet-overlay"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="mt-actionsheet"
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        data-testid="timeline-actionsheet"
      >
        <span className="mt-actionsheet__grabber" aria-hidden="true" />
        <button
          type="button"
          className="mt-actionsheet__item"
          onClick={handleEdit}
          data-testid="timeline-actionsheet-edit"
        >
          <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
          {t('common.buttons.edit')}
        </button>
        <button
          type="button"
          className="mt-actionsheet__item mt-actionsheet__item--danger"
          onClick={handleDelete}
          data-testid="timeline-actionsheet-delete"
        >
          <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          {t('common.buttons.delete')}
        </button>
        <button
          type="button"
          className="mt-actionsheet__item mt-actionsheet__item--cancel"
          onClick={onClose}
          data-testid="timeline-actionsheet-cancel"
        >
          {t('common.buttons.cancel')}
        </button>
      </div>
    </>
  )
}

export default TimelineActionSheet
