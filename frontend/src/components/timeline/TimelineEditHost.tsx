'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { Calendar } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EventEditForm, type EventEditFormValues } from '@/components/EventEditForm'
import { useEventEditConflict } from '@/hooks/useEventEditConflict'
import { deleteEvent } from '@/services/eventService'
import { TimelineResponsive, type TimelineResponsiveProps } from './TimelineResponsive'
import type { PositionedEvent } from './zoom'

/**
 * #absorb (gap A) — MONTE la surface d'édition d'event sur la frise ROUTÉE.
 *
 * Contexte : `EventEditForm` (+ `ConflictDialog` #231) ne vivait que dans `EventContent`,
 * monté uniquement via `TimelineCalendar` → `Lane` → `EventBar`, que PLUS AUCUNE page ne
 * rend (régression S17). Les pages routées (`dashboard`, détail produit) rendent
 * `TimelineResponsive` (desktop `EventDrawer` LECTURE SEULE, mobile `TimelineActionSheet`
 * dont l'`onEdit` n'était pas câblé). Ce host wrappe `TimelineResponsive`, câble
 * `onEditEvent` (desktop bouton « Éditer » d'`EventDrawer` + mobile action sheet) et ouvre
 * `EventEditForm` pré-rempli dans un Dialog DS.
 *
 * Réutilise SANS dupliquer : `EventEditForm`, `ConflictDialog` (via le form) et la machine
 * à états conflit 409 (`useEventEditConflict`, extraite du flux #231). La `version` threadée
 * (gap B) rend le 409 déterministe.
 *
 * Props = celles de `TimelineResponsive` (events/resources/locale/today) ; le host injecte
 * `onEditEvent` ET `onDeleteEvent`.
 *
 * #309 — suppression mobile : `TimelineActionSheet` (mobile) appelle `onDelete(event)` avec
 * l'event ciblé SANS passer par l'ouverture du dialog d'édition (contrairement au chemin
 * desktop, qui supprime via `EventEditForm` → `editing` déjà en state). `onDelete` ci-dessous
 * est donc RÉUTILISÉ tel quel pour les deux chemins (pas de second callback, cf. risque de
 * divergence d'invalidation de cache noté au plan) : il accepte un `target` optionnel, retombe
 * sur `editing` quand absent (chemin desktop).
 */
export type TimelineEditHostProps = Omit<
  TimelineResponsiveProps,
  'onEditEvent' | 'onDeleteEvent'
>

export const TimelineEditHost: React.FC<TimelineEditHostProps> = (props) => {
  const [editing, setEditing] = useState<PositionedEvent | null>(null)

  const closeEditor = useCallback(() => setEditing(null), [])

  // INVARIANT (#review S42) : ce host DOIT être monté sous un <AuthProvider>.
  // `useEventEditConflict` appelle `useAuth()` (invalidation ciblée `products.withEvents`
  // par userId), qui LÈVE hors provider. OK aujourd'hui (dashboard + ProductDetailView
  // rendent sous AuthProvider) ; verrouillé par TimelineEditHost.test.tsx (montage sous
  // AuthProvider). Toute nouvelle page routant cette frise doit préserver l'ancêtre.
  const conflict = useEventEditConflict(editing?.id, closeEditor)

  const defaultValues = useMemo<EventEditFormValues | null>(() => {
    if (!editing) return null
    return {
      title: editing.title,
      type: editing.extendedProps?.type || 'duration',
      // durationValue/durationUnit/recurrenceEndDate absents du view-model frise
      // (FullCalendarEvent) : non pré-remplis (parité avec EventContent).
      durationValue: undefined,
      durationUnit: undefined,
      isRecurring: editing.extendedProps?.isRecurring ?? false,
      recurrenceUnit: editing.extendedProps?.recurrenceUnit ?? undefined,
      recurrenceEndDate: null,
      // `type=date` attend `YYYY-MM-DD` ; start/end sont ISO.
      startDate: editing.start ? editing.start.slice(0, 10) : undefined,
      endDate: editing.end ? editing.end.slice(0, 10) : undefined,
      color: editing.color,
      archived: editing.extendedProps?.archived ?? false,
      // gap B : version détenue au chargement → threadée dans le PATCH (409 déterministe).
      version: editing.extendedProps?.version ?? null,
    }
  }, [editing])

  // `target` optionnel : fourni par le chemin mobile (`TimelineActionSheet` → `onDeleteEvent`,
  // suppression directe sans passer par le dialog d'édition) ; absent sur le chemin desktop
  // (bouton « Supprimer » d'`EventEditForm`, qui cible l'event déjà ouvert dans `editing`).
  const onDelete = useCallback(
    async (target?: PositionedEvent) => {
      const id = target?.id ?? editing?.id
      if (!id) return
      await deleteEvent(id)
      conflict.reset()
      closeEditor()
    },
    [editing, conflict, closeEditor],
  )

  const handleClose = useCallback(() => {
    conflict.reset()
    closeEditor()
  }, [conflict, closeEditor])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose()
    },
    [handleClose],
  )

  return (
    <>
      <TimelineResponsive {...props} onEditEvent={setEditing} onDeleteEvent={onDelete} />

      <Dialog open={Boolean(editing)} onOpenChange={handleOpenChange}>
        <DialogContent
          data-testid="timeline-edit-dialog"
          className={cn(
            'bg-bg border-rule overflow-y-auto p-0 shadow-xl',
            'top-auto right-0 bottom-0 left-0 max-h-[92vh] max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
            'sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:h-full sm:max-h-screen sm:w-[480px] sm:max-w-[480px] sm:translate-x-0 sm:translate-y-0 sm:rounded-none',
          )}
        >
          <div className="bg-surface sticky top-0 z-10 rounded-t-xl p-5 shadow-md">
            <DialogHeader>
              <DialogTitle className="text-ink flex items-center text-xl font-bold">
                <Calendar className="mr-2 h-5 w-5" aria-hidden="true" />
                {editing?.title}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-5">
            {defaultValues && (
              <EventEditForm
                defaultValues={defaultValues}
                onSubmit={conflict.onSubmit}
                onCancel={handleClose}
                submitState={conflict.submitState}
                onReload={conflict.onReload}
                onConflictDismiss={conflict.onConflictDismiss}
                conflictServerEvent={conflict.conflict?.server}
                conflictLocalValues={conflict.conflict?.local}
                onKeepMine={conflict.onKeepMine}
                onTakeServer={conflict.onTakeServer}
                onDelete={onDelete}
                isRecurring={editing?.extendedProps?.isRecurring ?? false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TimelineEditHost
