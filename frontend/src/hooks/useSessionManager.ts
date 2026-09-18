'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getActiveSessions, revokeOtherSessions, revokeSession } from '@/services/sessionService'
import { queryKeys } from '@/lib/query-keys'
import type { Session } from '@/types/settings'

/**
 * #86 — Logique des sessions actives (chapitre Sécurité), découplée de la
 * présentation (`SessionList`) pour réutilisation par la variante mobile (#87).
 *
 * TanStack Query v5 STRICT (forme objet). La liste est la source ; chaque
 * révocation invalide `queryKeys.sessions.all` pour refléter l'état serveur.
 */
export function useSessionManager() {
  const queryClient = useQueryClient()

  const query = useQuery<Session[]>({
    queryKey: queryKeys.sessions.all,
    queryFn: getActiveSessions,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })

  const revokeOne = useMutation<void, unknown, string>({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: invalidate,
  })

  const revokeOthers = useMutation<void, unknown, void>({
    mutationFn: () => revokeOtherSessions(),
    onSuccess: invalidate,
  })

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    revokeOne,
    revokeOthers,
  }
}
