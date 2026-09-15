'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCategory } from '@/services/categoryService'
import { queryKeys } from '@/lib/query-keys'
import type { Category, CategoryUpdate } from '@/types/category'

/**
 * #62 — Mise à jour partielle d'une catégorie via TanStack Query v5 (mutation).
 *
 * `PATCH /api/categories/{id}` (BR-CAT-001/004). Sur succès, invalide le préfixe
 * `queryKeys.categories.all` + le détail. Les produits embarquant une couleur
 * héritée de catégorie sont aussi invalidés (préfixe `products.all`) pour refléter
 * un changement de couleur/nom de catégorie.
 *
 * L'erreur axios est propagée telle quelle (rejet) : le drawer lit
 * `error.response.status` pour distinguer 404 / 409 (nom dupliqué) / 403 (ownership,
 * ex. catégorie système) et l'afficher inline. NE PAS avaler l'erreur ici.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation<Category, unknown, { id: string; data: CategoryUpdate }>({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}
