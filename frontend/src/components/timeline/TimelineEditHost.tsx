'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { queryKeys } from '@/lib/query-keys'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { EventEditForm, type EventEditFormValues } from '@/components/EventEditForm'
import { EventFormDrawer } from '@/components/events/EventFormDrawer'
import { useEventEditConflict } from '@/hooks/useEventEditConflict'
import { deleteEvent } from '@/services/eventService'
import { TimelineResponsive, type TimelineResponsiveProps } from './TimelineResponsive'
import type { PositionedEvent } from './zoom'

/**
 * #absorb (gap A) — MONTE la surface d'édition d'event sur la frise ROUTÉE.
 *
 * Contexte : `EventEditForm` (+ `ConflictDialog` #231) ne vivait que dans `EventContent`,
 * monté uniquement via un ancien composant calendrier → `Lane` → `EventBar`, que PLUS
 * AUCUNE page ne rend (régression S17, composant supprimé #350). `EventContent` lui-même
 * a été supprimé #634 (Sprint 84), une fois `Lane`/`EventBar` retirés : `TimelineEditHost`
 * est désormais le SEUL point de montage de `EventEditForm`/`ConflictDialog` en édition.
 * Les pages routées (`dashboard`, détail produit) rendent `TimelineResponsive` (desktop
 * `EventDrawer` LECTURE SEULE, mobile `TimelineActionSheet`). Ce host wrappe
 * `TimelineResponsive`, câble `onEditEvent` (desktop bouton « Éditer » d'`EventDrawer` +
 * mobile action sheet) et ouvre `EventEditForm` pré-rempli.
 *
 * #618 — SURFACE : `EventFormDrawer`, la MÊME coque que la création (`NewEventDrawer`) —
 * drawer `.mt-drawer--form` au token `--drawer-width-form` `>= lg`, bottom sheet `< lg`,
 * aperçu épinglé, pied sticky, focus-trap, fermeture croix / scrim / Échap. Remplace le
 * `Dialog` shadcn stylé en panneau (`sm:w-[480px]` en dur, bascule à 640px) : l'édition
 * bascule désormais au même seuil que la création (1024px).
 *
 * Réutilise SANS dupliquer : `EventEditForm`, `ConflictDialog` (via le form) et la machine
 * à états conflit 409 (`useEventEditConflict`, extraite du flux #231). La `version` threadée
 * (gap B) rend le 409 déterministe.
 *
 * Props = celles de `TimelineResponsive` (events/resources/locale/today) ; le host injecte
 * `onEditEvent` ET `onDeleteEvent`.
 *
 * #309 — suppression mobile : `TimelineActionSheet` (mobile) désigne l'event ciblé SANS
 * passer par l'ouverture de l'éditeur (contrairement au chemin desktop, qui supprime
 * via `EventEditForm` → `editing` déjà en state).
 *
 * ⚠ #review S46 (MAJEUR) — la suppression est un HARD-DELETE serveur (`br-events` §5
 * « Suppression physique » : `deleteById` supprime réellement la ligne, pas de corbeille,
 * pas d'annulation). Les DEUX chemins passent donc par le MÊME `DeleteConfirmDialog` (#65,
 * variante `event`) : le mobile arme seulement `deleteTarget`, il ne supprime jamais au tap.
 * Les deux chemins convergent ensuite sur l'unique `runDelete` (pas de second callback →
 * pas de divergence d'invalidation de cache entre desktop et mobile, cf. plan #309).
 */
export type TimelineEditHostProps = Omit<TimelineResponsiveProps, 'onEditEvent' | 'onDeleteEvent'>

export const TimelineEditHost: React.FC<TimelineEditHostProps> = (props) => {
  const t = useTranslations('products.edit')
  const [editing, setEditing] = useState<PositionedEvent | null>(null)
  // Cible de suppression MOBILE (action sheet) : non nulle ⇒ dialog de confirmation ouvert.
  const [deleteTarget, setDeleteTarget] = useState<PositionedEvent | null>(null)
  const queryClient = useQueryClient()

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
      // #230 — durée DÉSORMAIS pré-remplie depuis le view-model (`mapToFullCalendarEvent`
      // ne la jette plus). Avant, `durationUnit: undefined` avec `type: 'duration'`
      // faisait naître le formulaire INVALIDE (refine BR-EVE-004/006) : le submit était
      // refusé tant que l'unité n'était pas re-saisie. Avec le verrou d'édition #230
      // (champs en lecture seule quand `archived`), cette re-saisie devient impossible
      // → le désarchivage depuis la frise aurait été bloqué. `?? undefined` : le champ
      // est `.optional()` côté schéma, il n'accepte pas `null`.
      durationValue: editing.extendedProps?.durationValue ?? undefined,
      durationUnit: editing.extendedProps?.durationUnit ?? undefined,
      // `recurrenceEndDate` reste absent du view-model frise (non pré-rempli).
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

  // Chemin MOBILE : le tap sur « Supprimer » de l'action sheet ARME la cible (ouvre la
  // confirmation) — il ne supprime rien. Stabilisé en `useCallback` : `TimelineActionSheet`
  // monte `useFocusTrap`, dont les callbacks non stabilisés provoquent un vol de focus
  // (BUG-S44-001).
  const requestDelete = useCallback((target: PositionedEvent) => setDeleteTarget(target), [])

  /**
   * Suppression effective — SEUL point d'appel de `deleteEvent`, partagé desktop/mobile.
   *
   * #review S46 (MAJEUR) : l'erreur n'est PAS avalée ici, elle remonte à
   * `DeleteConfirmDialog.handleConfirm`, qui l'`await` dans un `try/catch` et l'affiche
   * inline (404 / 409 / générique) en gardant le dialog ouvert. Conséquence : plus aucun
   * appelant ne laisse la promesse orpheline (fini l'unhandled rejection sur 403/409/réseau),
   * et l'état local (conflit, éditeur, cible) n'est nettoyé QUE si le serveur a confirmé.
   *
   * INVALIDATION (absorption S46) : sans elle, l'event supprimé restait affiché sur la frise
   * jusqu'à une navigation (gap PRÉEXISTANT côté desktop, exposé au mobile par #309). On
   * invalide le PRÉFIXE `queryKeys.products.all` (`['products']`), qui COUVRE par matching
   * TanStack v5 `products.withEvents(userId)` — la source réelle de la frise
   * (`useProductsWithEvents`, dashboard ET détail produit) — ainsi que `products.detail`.
   * Choix aligné sur les autres mutations destructives/créatrices du domaine
   * (`useDeleteCategory` #245, `useCreateEvent` #300) : pas de `userId` threadé juste pour
   * invalider (PAT-S40-001), donc AUCUNE garde `if (user?.id)` qui raterait silencieusement
   * le rafraîchissement. Placée APRÈS l'`await` réussi uniquement : sur rejet, la promesse
   * remonte à `DeleteConfirmDialog` (PAT-S46-002) et rien n'est invalidé.
   */
  const runDelete = useCallback(
    async (id: string) => {
      await deleteEvent(id)
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      conflict.reset()
      closeEditor()
      setDeleteTarget(null)
    },
    [conflict, closeEditor, queryClient],
  )

  /** Confirmation MOBILE : supprime la cible armée par l'action sheet. */
  const confirmDeleteTarget = useCallback(async () => {
    if (!deleteTarget) return
    await runDelete(deleteTarget.id)
  }, [deleteTarget, runDelete])

  /**
   * Confirmation DESKTOP : `EventEditForm.onDelete` est un `() => Promise<void>` (il est
   * relayé à `DeleteConfirmDialog.onConfirm`, qui l'appelle avec un `reassignToCategoryId`
   * — pertinent pour la seule variante `category`). La cible est l'event déjà ouvert dans
   * `editing` : aucun argument ne doit fuiter jusqu'ici.
   */
  const deleteEditing = useCallback(async () => {
    if (!editing) return
    await runDelete(editing.id)
  }, [editing, runDelete])

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

  // Instable (dépend de l'objet `conflict`) : `EventFormDrawer` le stabilise avant de le
  // passer à `useFocusTrap` — pas de vol de focus à chaque rendu.
  const handleClose = useCallback(() => {
    conflict.reset()
    closeEditor()
  }, [conflict, closeEditor])

  return (
    <>
      <TimelineResponsive {...props} onEditEvent={setEditing} onDeleteEvent={requestDelete} />

      {/* Confirmation MOBILE — même composant que le chemin desktop (`EventEditForm` →
          `DeleteConfirmDialog` #65). Monté seulement quand une cible est armée. */}
      {deleteTarget && (
        <DeleteConfirmDialog
          open
          onOpenChange={handleDeleteOpenChange}
          variant="event"
          isRecurring={deleteTarget.extendedProps?.isRecurring ?? false}
          onConfirm={confirmDeleteTarget}
        />
      )}

      {/* #618 — En-tête : « Modifier l'événement » + l'événement ciblé en sous-titre.
          La maquette y dessine « CRÉÉ LE <date> · <id> » : aucune date de création
          n'existe dans le view-model de la frise (`PositionedEvent`), elle n'est donc
          PAS inventée ici (follow-up signalé dans le done.md de #618). */}
      <EventFormDrawer
        open={Boolean(editing)}
        onClose={handleClose}
        title={t('title')}
        subtitle={editing?.title}
        testId="timeline-edit-dialog"
        hasForm={Boolean(defaultValues)}
      >
        {({ compact, previewPortalNode, footerPortalNode }) =>
          defaultValues && (
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
              keepMineExhausted={conflict.keepMineExhausted}
              onDelete={deleteEditing}
              isRecurring={editing?.extendedProps?.isRecurring ?? false}
              compact={compact}
              footerPortalNode={footerPortalNode}
              previewPortalNode={previewPortalNode}
            />
          )
        }
      </EventFormDrawer>
    </>
  )
}

export default TimelineEditHost
