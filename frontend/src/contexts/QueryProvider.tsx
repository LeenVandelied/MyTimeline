'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

/**
 * #48 — wrapper client de TanStack Query v5.
 *
 * Le layout root (`frontend/app/layout.tsx`) est un Server Component : on isole
 * ici `QueryClientProvider` (qui exige un contexte React client) plutôt que de
 * basculer tout le layout en `"use client"`.
 *
 * Le `QueryClient` est créé via `useState` (factory lazy) afin qu'une seule
 * instance vive pour la durée de vie du composant : en App Router, un client
 * créé au niveau module pourrait être partagé entre requêtes SSR concurrentes.
 *
 * v5 STRICT : `gcTime` (ex-`cacheTime` de v4). Defaults conservateurs adaptés à
 * une app authentifiée — refetch silencieux au focus désactivé pour éviter les
 * rafales inutiles, `staleTime` court par défaut, surchargeable par hook.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30 s : les données restent fraîches sans refetch
            gcTime: 5 * 60_000, // 5 min en cache après inactivité (v5: gcTime, pas cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
