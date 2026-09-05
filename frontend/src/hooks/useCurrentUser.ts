'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { queryKeys } from '@/lib/query-keys'
import type { User } from '@/types/auth'

/**
 * #48 — Hook pilote TanStack Query v5 : utilisateur courant.
 *
 * ⚠️ ANTI DOUBLE-FETCH /me — décision d'architecture (cf. issue-48-done.md).
 * `AuthContext` (#40) reste la SOURCE UNIQUE de l'utilisateur authentifié : il
 * gère le fetch `/api/auth/me` (restauration de session au montage, #135 — plus
 * de miroir localStorage) et la propagation à tous les écrans. Ce hook NE refait
 * PAS d'appel réseau `/me` — sa `queryFn` se contente de relire le `user` déjà
 * détenu par `AuthContext`. Il sert de PONT vers le
 * pattern Query (clé `['auth', 'me']` disponible au cache pour usages futurs)
 * sans dupliquer le flux d'auth de #40.
 *
 * Conséquence : aucun double-fetch sur les écrans qui consomment déjà
 * `useAuth()`. Les écrans en place doivent continuer à utiliser `useAuth()` ;
 * ce hook est le pilote de démonstration de l'intégration TanStack, à ne PAS
 * coupler aux call-sites AuthContext existants.
 *
 * v5 STRICT : forme objet `useQuery({ queryKey, queryFn })`.
 */
export function useCurrentUser() {
  const { user, loading } = useAuth()

  return useQuery<User | null>({
    queryKey: queryKeys.auth.me,
    // Pas de requête HTTP : on relit l'état d'AuthContext (source unique).
    // `Promise.resolve(user)` capture la valeur courante à chaque exécution.
    queryFn: () => Promise.resolve(user),
    // Tant qu'AuthContext réhydrate la session (re-fetch /me au mount), on n'expose rien.
    enabled: !loading,
    // L'état vient d'AuthContext : on relit à chaque montage/changement, jamais
    // de fetch réseau. `placeholderData` garde l'ancienne valeur le temps que la
    // queryFn (synchrone) se résolve, évitant un flash `undefined`.
    placeholderData: user,
  })
}
