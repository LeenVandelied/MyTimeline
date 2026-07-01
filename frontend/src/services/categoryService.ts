import apiClient from './apiClient'
import { categorySchema, type Category } from '@/types/category'

/**
 * #65 / S10 #52 — Transport axios pour le domaine catégories.
 *
 * `GET /api/categories` renvoie l'union `owner == caller ∪ système` (br-categories).
 * On valide la réponse via Zod (parse) : une dérive de contrat backend (champ
 * `system` manquant p.ex.) échoue ici, tôt, plutôt que de propager un objet
 * malformé dans le select de réassignation.
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await apiClient.get('/categories')
    return categorySchema.array().parse(response.data)
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories :', error)
    throw error
  }
}
