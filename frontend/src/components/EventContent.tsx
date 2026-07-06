'use client'

import { calculateRemainingTime } from '@/utils/time-utils'
import { cn } from '@/lib/utils'
import { contrastInk } from '@/lib/color'
import { safeErrorMessage } from '@/lib/safe-error'
import { queryKeys } from '@/lib/query-keys'
import { FullCalendarEvent } from '@/types/event'
import { useTranslations } from 'next-intl'
import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Card, CardContent } from './ui/card'
import { PopoverPicker } from './ui/popoverPicker'
import { Calendar, Edit, Save, Clock } from 'lucide-react'
import { updateEventColor, updateEvent, deleteEvent } from '@/services/eventService'
import { useAuth } from '@/hooks/useAuth'
import { Button } from './ui/button'
import { EventEditForm, EventEditFormValues, EventSubmitState } from './EventEditForm'

// #150 — modèle couleur unique `color` (BR-EVE-009).
const DEFAULT_COLOR = '#6366f1'

/** Lit `error.response.status` (axios ou générique) sans `any` (cf. #65). */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

interface EventContentProps {
  event: FullCalendarEvent
}

export const EventContent: React.FC<EventContentProps> = ({ event }) => {
  const t = useTranslations()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isOpen, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isColorOpen, setIsColorOpen] = useState(false)
  const [color, setColor] = useState(event.color || DEFAULT_COLOR)
  // #66/#77 — état de soumission 4 états (idle/submitting/error/conflict) piloté
  // ici et passé au formulaire. Le 409 optimistic locking est désormais émis
  // backend (#200, corps plat) → l'état `conflict` ouvre le ConflictDialog partagé.
  const [submitState, setSubmitState] = useState<EventSubmitState>('idle')

  const countdown = event?.end ? calculateRemainingTime(new Date(event.end), t) : null

  // BR-EVE-009 — encre calculée par contraste WCAG (helper mutualisé), jamais
  // `text-white` hardcodé : lisible sur les couleurs claires de la palette.
  const inkColor = contrastInk(color)

  // MAJEUR 4 (#66 review) — après update/delete/couleur, le calendrier lit ses
  // events depuis `useProductsWithEvents` (produits + events imbriqués). On invalide
  // cette query key pour éviter l'affichage de données périmées (prop parent figée).
  const invalidateEvents = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.withEvents(user.id) })
    }
  }

  const handleClick = () => {
    setOpen(true)
  }

  const handleColorChange = async (newColor: string) => {
    setColor(newColor)
    setIsSaving(true)
    try {
      if (user && user.id) {
        await updateEventColor(event.id, newColor)
        invalidateEvents()
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des couleurs :', safeErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const onSubmit = async (data: EventEditFormValues) => {
    setSubmitState('submitting')

    try {
      if (data.color) {
        setColor(data.color)
        if (user && user.id) {
          await updateEventColor(event.id, data.color)
        }
      }

      if (user && user.id) {
        await updateEvent(event.id, data)
      }

      invalidateEvents()
      setSubmitState('idle')
      setIsEditing(false)
    } catch (error) {
      // #77 — 409 (optimistic locking, conflit d'édition concurrente, contrat #200)
      // → état `conflict` qui ouvre le ConflictDialog partagé. Tout autre statut
      // (400/404/403/500…) → `error` inline générique : aucun autre 409 ne transite
      // par ce flux (les 409 name-conflict Category/Product sont gérés ailleurs).
      const status = httpStatusOf(error)
      setSubmitState(status === 409 ? 'conflict' : 'error')
      console.error("Erreur lors de la mise à jour de l'événement :", safeErrorMessage(error))
    }
  }

  // #77 — Rechargement sur conflit 409 optimistic : invalidation CIBLÉE de la
  // query TanStack qui alimente le calendrier (`products.withEvents`) plutôt qu'un
  // `window.location.reload()`. L'événement provient d'une prop parent hydratée par
  // `useProductsWithEvents` : invalider cette clé re-fetch les données à jour sans
  // rechargement complet de page. On sort du mode édition et on repasse à idle.
  const onReload = () => {
    invalidateEvents()
    setSubmitState('idle')
    setIsEditing(false)
  }

  // #77 — Fermeture du ConflictDialog sans recharger (annuler / Échap / overlay) :
  // on repasse simplement `submitState` à idle (le formulaire reste ouvert avec les
  // saisies de l'utilisateur, qui peut réessayer ou recharger manuellement).
  const onConflictDismiss = () => {
    setSubmitState('idle')
  }

  // Suppression déléguée à DeleteConfirmDialog (via EventEditForm). L'erreur DOIT
  // rejeter pour affichage inline (pitfall #65).
  const onDelete = async () => {
    await deleteEvent(event.id)
    invalidateEvents()
    setOpen(false)
  }

  const toggleEditMode = () => {
    if (isEditing) setSubmitState('idle')
    setIsEditing(!isEditing)
  }

  return (
    <>
      <div
        className="event-solid-style"
        onClick={handleClick}
        style={{
          // BR-EVE-009 : 1 couleur unique (fond seul, plus de border/text hardcodé).
          backgroundColor: color,
          color: inkColor,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          borderRadius: '6px',
          padding: '4px 8px',
          height: '100%',
        }}
      >
        <div className="z-10 w-full">
          <div className="items-left flex flex-col space-x-2">
            <span className="truncate font-medium" style={{ color: inkColor }}>
              {event.title}
            </span>
            {countdown && (
              <span className="truncate text-sm" style={{ color: inkColor }}>
                {countdown}
              </span>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {/* #66 responsive (pattern ProductDrawer #61) : bottom-sheet < 640px (portrait
            ET paysage), drawer latéral droit >= 640px. `sm:` unique, aucun breakpoint custom. */}
        <DialogContent
          className={cn(
            'bg-bg border-rule overflow-y-auto p-0 shadow-xl',
            'top-auto right-0 bottom-0 left-0 max-h-[92vh] max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
            'sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:h-full sm:max-h-screen sm:w-[480px] sm:max-w-[480px] sm:translate-x-0 sm:translate-y-0 sm:rounded-none',
          )}
        >
          <div className="bg-surface sticky top-0 z-10 rounded-t-xl p-5 shadow-md">
            <DialogHeader>
              <DialogTitle className="text-ink flex items-center justify-between text-xl font-bold">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  {event.title}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleEditMode}
                  className="text-ink hover:bg-accent-soft"
                  title={isEditing ? t('common.buttons.save') : t('products.edit.title')}
                >
                  {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                </Button>
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-5">
            {!isEditing ? (
              <Card className="bg-surface border-rule shadow-md">
                <CardContent className="p-4">
                  <div className="space-y-6">
                    <div className="text-ink mb-4 flex items-center">
                      <Clock className="text-accent mr-2 h-4 w-4" />
                      <span className="font-medium">
                        {t('products.details.end')} {countdown}
                      </span>
                    </div>

                    <div className="border-rule mt-4 border-t pt-4">
                      <div className="space-y-6">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="text-ink font-medium">{t('products.details.colors')}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-surface hover:bg-surface rounded-xl p-4 transition-colors">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="text-ink font-medium">
                                {t('products.details.color')}
                              </div>
                            </div>
                            <PopoverPicker
                              isOpen={isColorOpen}
                              color={color}
                              onChange={(c) => handleColorChange(c)}
                              onToggle={() => setIsColorOpen((prev) => !prev)}
                            />
                          </div>
                        </div>
                        <div className="bg-surface mt-6 rounded-xl p-6">
                          <div
                            className="w-full rounded-lg p-4 transition-all"
                            style={{
                              // BR-EVE-009 : fond unique + encre de contraste (plus de border/text-white).
                              backgroundColor: color,
                              color: inkColor,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium" style={{ color: inkColor }}>
                                {event.title}
                              </span>
                            </div>
                            {countdown && (
                              <div className="mt-2 text-sm opacity-80" style={{ color: inkColor }}>
                                {countdown}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSaving && (
                          <span className="text-accent mt-2 block text-xs">
                            {t('common.loading.saving')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EventEditForm
                defaultValues={{
                  title: event.title,
                  type: event.extendedProps?.type || 'duration',
                  durationValue: undefined,
                  durationUnit: undefined,
                  isRecurring: false,
                  recurrenceUnit: undefined,
                  recurrenceEndDate: null,
                  // `type=date` attend `YYYY-MM-DD` ; event.start/end sont ISO.
                  startDate: event.start ? event.start.slice(0, 10) : undefined,
                  endDate: event.end ? event.end.slice(0, 10) : undefined,
                  color: color,
                }}
                onSubmit={onSubmit}
                onCancel={() => {
                  setSubmitState('idle')
                  setIsEditing(false)
                }}
                submitState={submitState}
                onReload={onReload}
                onConflictDismiss={onConflictDismiss}
                onDelete={onDelete}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EventContent
