import { describe, expect, it } from 'vitest'

import { categorySeedFromResponse } from '../../e2e/support/seed-cleanup'

/**
 * #550 — Une catégorie créée depuis l'interface doit être notée pour la purge de fin
 * de test. Cette fonction pure décide, à partir d'une réponse de création, s'il y a
 * une entrée de purge à enregistrer. Aucune requête n'est émise ici.
 */
describe("#550 — suivi des catégories créées à l'interface", () => {
  const ID = '0b6f5f0e-6f7e-4c1c-9d6a-2f3a1d4c5e11'

  it('turns a 201 category creation response into a category seed entry', () => {
    const entry = categorySeedFromResponse({
      method: 'POST',
      url: 'http://localhost:3000/api/categories',
      status: 201,
      body: { id: ID, name: 'Cat Create', color: '#3B62D4' },
    })

    expect(entry).toEqual({ kind: 'category', id: ID })
  })

  it('ignores failed creations and unrelated requests', () => {
    const body = { id: ID }
    const ignored = [
      { method: 'POST', url: 'http://localhost:3000/api/categories', status: 409 },
      { method: 'POST', url: 'http://localhost:3000/api/categories', status: 400 },
      { method: 'POST', url: 'http://localhost:3000/api/categories', status: 500 },
      { method: 'GET', url: 'http://localhost:3000/api/categories', status: 200 },
      { method: 'PATCH', url: `http://localhost:3000/api/categories/${ID}`, status: 200 },
      { method: 'POST', url: 'http://localhost:3000/api/users/u1/products', status: 201 },
    ]

    for (const request of ignored) {
      expect(
        categorySeedFromResponse({ ...request, body }),
        `${request.method} ${request.url} ${request.status}`,
      ).toBeNull()
    }
  })
})
