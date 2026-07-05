'use client'

import { useMemo } from 'react'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { mapToFullCalendarEvent, type FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import type { Resource } from '@/components/timeline'

/**
 * #80 — Source de données UNIQUE du dashboard desktop (TanStack Query).
 *
 * AUCUN composant du dashboard n'appelle l'API directement : ils consomment ce
 * hook (critère d'acceptation). On réutilise `useProductsWithEvents` (#48, cache/
 * dédup TanStack v5, endpoint réel `GET /api/users/{userId}/products` avec events
 * embarqués) puis on dérive côté client :
 *   - `events`    : événements aplatis en `FullCalendarEvent` (réutilisables par
 *                   DensityRibbon / WeekAgenda via les briques timeline).
 *   - `resources` : produits en `Resource` (pour la frise existante si besoin).
 *   - KPIs        : produits actifs, événements ce mois (non archivés — BR-EVE-011),
 *                   série courante (jours consécutifs avec ≥1 event finissant à
 *                   aujourd'hui).
 *
 * Les dérivations sont mémoïsées sur la référence `products` renvoyée par le cache.
 */
export interface DashboardKpis {
  activeProducts: number
  eventsThisMonth: number
  currentStreak: number
}

export interface DashboardData {
  products: Product[]
  events: FullCalendarEvent[]
  resources: Resource[]
  kpis: DashboardKpis
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/**
 * Série courante : nombre de jours calendaires consécutifs, en remontant depuis
 * aujourd'hui, où au moins un event (non archivé) débute. S'arrête au premier
 * jour vide. `now` injectable pour les tests.
 */
function computeStreak(events: FullCalendarEvent[], now: Date): number {
  const daysWithEvent = new Set(
    events.map((e) => {
      const d = new Date(e.start)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    }),
  )
  let streak = 0
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  while (daysWithEvent.has(cursor.getTime())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function useDashboardData(
  userId: string | undefined,
  now: Date = new Date(),
): DashboardData {
  const query = useProductsWithEvents(userId)
  const products = useMemo(() => query.data ?? [], [query.data])

  const events = useMemo<FullCalendarEvent[]>(
    () =>
      products.flatMap((product) =>
        (product.events ?? [])
          // BR-EVE-011 : « actif » = non archivé (KPI + agrégations lecture seule).
          .filter((event) => !event.archived)
          .map((event) =>
            mapToFullCalendarEvent(event, product.name, product.category.name, product.id),
          ),
      ),
    [products],
  )

  const resources = useMemo<Resource[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        title: product.name,
        category: product.category.name,
      })),
    [products],
  )

  const kpis = useMemo<DashboardKpis>(() => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const eventsThisMonth = events.filter((e) => {
      const s = new Date(e.start)
      return s >= monthStart && s <= monthEnd
    }).length

    return {
      activeProducts: products.length,
      eventsThisMonth,
      currentStreak: computeStreak(events, now),
    }
  }, [products, events, now])

  return {
    products,
    events,
    resources,
    kpis,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
