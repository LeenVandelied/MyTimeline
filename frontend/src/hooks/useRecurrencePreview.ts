'use client'

import { useQuery } from '@tanstack/react-query'

import { previewRecurrence } from '@/services/eventService'
import { queryKeys } from '@/lib/query-keys'
import type { RecurrencePreviewResponse, RecurrenceUnit } from '@/types/event'

/**
 * #67 — Pilote le hint « plafond 4000 occurrences » sous `recurrenceEndDate`.
 *
 * Interroge `POST /api/events/recurrence-preview` (#439) pour connaître `count` et
 * `capped` d'une récurrence en cours d'édition. Les params sont ceux DÉJÀ débouncés
 * par `EventEditForm` (`useDebounced`) : on ne spamme pas l'endpoint à chaque frappe.
 *
 * `enabled` STRICT : pas d'appel tant que la récurrence n'est pas active ET que
 * `startDate` + `recurrenceUnit` (enum MAJUSCULE) ne sont pas définis — sinon le
 * backend #439 rejette (400) une requête incomplète. `recurrenceEndDate` reste
 * optionnelle (récurrence non bornée → cap horizon 5 ans, `capped=true` possible).
 *
 * v5 STRICT : forme objet `useQuery({ queryKey, queryFn, enabled })`. L'erreur n'est
 * PAS avalée (le hint disparaît simplement si la query n'a pas de donnée `capped`).
 */
export interface UseRecurrencePreviewParams {
  isRecurring: boolean
  startDate?: string
  recurrenceUnit?: RecurrenceUnit
  recurrenceEndDate?: string | null
}

export function useRecurrencePreview({
  isRecurring,
  startDate,
  recurrenceUnit,
  recurrenceEndDate,
}: UseRecurrencePreviewParams) {
  const enabled = Boolean(isRecurring && startDate && recurrenceUnit)

  return useQuery<RecurrencePreviewResponse>({
    queryKey: queryKeys.events.recurrencePreview({
      startDate,
      recurrenceUnit,
      recurrenceEndDate,
    }),
    queryFn: () =>
      previewRecurrence({
        startDate: startDate as string,
        recurrenceUnit: recurrenceUnit as RecurrenceUnit,
        recurrenceEndDate: recurrenceEndDate ?? null,
      }),
    enabled,
  })
}

export default useRecurrencePreview
