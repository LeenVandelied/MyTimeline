'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCategory } from '@/services/categoryService'
import { queryKeys } from '@/lib/query-keys'
import type { Category, CategoryCreate } from '@/types/category'

/**
 * #62 — Création d'une catégorie via TanStack Query v5 (mutation).
 *
 * `POST /api/categories` (BR-CAT-001/004). Sur succès, invalide le préfixe
 * `queryKeys.categories.all` — pour que les combobox/listes catégories (drawer
 * produit #61, DeleteConfirmDialog #65) se rafraîchissent sans refetch manuel.
 *
 * v5 STRICT : forme objet `useMutation({ mutationFn })`. L'erreur axios n'est PAS
 * avalée : le composant lit `error.response.status` (409 = nom dupliqué BR-CAT-004)
 * pour l'affichage inline sous le champ `name`.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation<Category, unknown, CategoryCreate>({
    mutationFn: (data: CategoryCreate) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}
