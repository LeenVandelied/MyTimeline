'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'

import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/query-keys'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { EventEditForm, type EventEditFormValues } from '@/components/EventEditForm'
import { useEventEditConflict } from '@/hooks/useEventEditConflict'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { deleteEvent } from '@/services/eventService'
import { TimelineResponsive, type TimelineResponsiveProps } from './TimelineResponsive'
import type { PositionedEvent } from './zoom'

/**
 * #absorb (gap A) — MONTE la surface d'édition d'event sur la frise ROUTÉE.
 *
 * Contexte : `EventEditForm` (+ `ConflictDialog` #231) ne vivait que dans `EventContent`,
 * monté uniquement via un ancien composant calendrier → `Lane` → `EventBar`, que PLUS
 * AUCUNE page ne rend (régression S17, composant supprimé #350). Les pages routées
 * (`dashboard`, détail produit) rendent
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
 * #309 — suppression mobile : `TimelineActionSheet` (mobile) désigne l'event ciblé SANS
 * passer par l'ouverture du dialog d'édition (contrairement au chemin desktop, qui supprime
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
  const [editing, setEditing] = useState<PositionedEvent | null>(null)
  // Cible de suppression MOBILE (action sheet) : non nulle ⇒ dialog de confirmation ouvert.
  const [deleteTarget, setDeleteTarget] = useState<PositionedEvent | null>(null)
  const queryClient = useQueryClient()

  /**
   * #495 — APERÇU ÉPINGLÉ sur la surface d'ÉDITION (handoff §6 « création / édition »),
   * extension de `PAT-S70-001` posé au S70 côté création (#326).
   *
   * ⚠ UN NŒUD, PAS UN `RefObject` (contrat de `previewPortalNode`) : `ref.current` vaut
   * `null` au premier rendu et sa mutation ne re-rendrait RIEN — l'aperçu resterait à
   * jamais en flux. Le setter de `useState` passé en ref callback est appelé en phase de
   * commit, avant peinture : le portail se monte sans saut visuel.
   */
  const [previewNode, setPreviewNode] = useState<HTMLDivElement | null>(null)

  /**
   * #495 — Épinglage réservé à la variante PANNEAU LATÉRAL (`sm:` = 640px, le SEUL
   * breakpoint de cette surface, cf. `DialogContent` ci-dessous). Sous 640px le dialog
   * est une bottom sheet bornée à `max-h-[92vh]` : y épingler l'aperçu amputerait la
   * zone de saisie, exactement le motif pour lequel #326 a laissé l'aperçu EN FLUX dans
   * la sheet du drawer de création. Choix aligné, pas nouveau.
   *
   * ⚠ `useMediaQuery` rend `false` au premier passage (SSR-safe) → aperçu en flux puis
   * portalisé après hydratation. Même comportement que `NewEventDrawer`.
   */
  const pinPreview = useMediaQuery('(min-width: 640px)')

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

      <Dialog open={Boolean(editing)} onOpenChange={handleOpenChange}>
        <DialogContent
          data-testid="timeline-edit-dialog"
          className={cn(
            'bg-bg border-rule overflow-y-auto p-0 shadow-xl',
            'top-auto right-0 bottom-0 left-0 max-h-[92vh] max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
            'sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:h-full sm:max-h-screen sm:w-[480px] sm:max-w-[480px] sm:translate-x-0 sm:translate-y-0 sm:rounded-none',
          )}
        >
          {/* #495 / review S71 — GRAMMAIRE DE SÉPARATION alignée sur la surface de
              CRÉATION (`.mt-drawer__header` + `.mt-drawer__preview`, timeline.css) :
              titre / aperçu / corps sont séparés par DEUX filets hairline
              `border-b border-rule` pleine largeur, pas par une ombre.
              Le `shadow-md` initial était un usage hors charte (`ds/readme.md:106`
              réserve `md`/`lg` à l'élévation du modal LUI-MÊME — déjà portée par le
              `shadow-xl` de `DialogContent` ci-dessus) ET une technique DIFFÉRENTE de
              la création pour le même rôle fonctionnel.
              Le padding migre du bloc sticky vers ses deux enfants : c'est la seule
              façon d'obtenir des filets PLEINE LARGEUR (un `border-b` sur un bloc
              `p-5` serait resté à l'intérieur du padding, encadré de 20px de vide).
              Cotes reprises de la création : header `--space-5 --space-5 --space-4`
              (px-5 pt-5 pb-4), aperçu `--space-4 --space-5` (px-5 py-4).
              Aucune couleur en dur : `--color-rule` est défini dans les DEUX palettes
              (clair + sombre), comme pour la création. */}
          <div className="bg-surface sticky top-0 z-10 rounded-t-xl">
            <DialogHeader className="border-rule border-b px-5 pt-5 pb-4">
              <DialogTitle className="text-ink flex items-center text-xl font-bold">
                <Calendar className="mr-2 h-5 w-5" aria-hidden="true" />
                {editing?.title}
              </DialogTitle>
            </DialogHeader>

            {/* #495 — Nœud hôte de l'aperçu épinglé. Placé DANS le bloc d'en-tête
                DÉJÀ `sticky top-0 z-10` : on réutilise le mécanisme d'épinglage en
                place au lieu d'en poser un second. Conséquence directe — AUCUN
                nouveau `position:sticky`, AUCUN nouveau palier de z-index à arbitrer
                (le palier `--z-modal` partagé `.mt-drawer`/`.mt-sheet` de #446 reste
                intouché, comme au S70).

                POURQUOI PAS un frère de la zone défilante (lettre de PAT-S70-001) :
                ici le conteneur défilant EST `DialogContent` lui-même
                (`overflow-y-auto`), il n'existe donc aucun frère où se placer. Rendre
                la structure `header / body(overflow:auto) / footer` supposerait de
                refaire la boîte du dialog (bottom sheet `max-h-[92vh]` + panneau
                `sm:h-full`) — restructuration lourde sur une surface qui porte aussi
                les deux chemins de suppression (#309) et la machine à conflit 409.

                Ne contient rien en propre : `EventEditForm` y portalise SA mini-frise.
                `empty:hidden` remplace le `:empty{display:none}` de
                `.mt-drawer__preview` (classe DS non applicable ici : cette surface
                n'est pas un `.mt-drawer`) — sans lui, le padding et le filet du nœud
                vide laisseraient un liseré orphelin sous l'en-tête sous 640px et
                pendant le rendu initial (avant hydratation, `useMediaQuery` rend
                `false`). C'est le pendant exact de `.mt-drawer__preview:empty`
                côté création : hôte vide ⇒ un SEUL filet visible (celui du header). */}
            <div
              ref={setPreviewNode}
              className="border-rule border-b px-5 py-4 empty:hidden"
              data-testid="timeline-edit-dialog-preview"
            />
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
                onDelete={deleteEditing}
                isRecurring={editing?.extendedProps?.isRecurring ?? false}
                /* #495 — `null` sous 640px : l'aperçu y reste EN FLUX (PAT-S44-001,
                   le mode historique reste le défaut là où rien ne le remplace). */
                previewPortalNode={pinPreview ? previewNode : null}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TimelineEditHost
