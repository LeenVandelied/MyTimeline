import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getArchivedProductDetail } from './productService'

/** #718 — la réponse des archivés est validée par `archivedProductDetailSchema`. */
const apiGet = vi.hoisted(() => vi.fn())
vi.mock('./apiClient', () => ({ default: { get: apiGet } }))

const BASE = {
  id: 'p-1',
  name: 'Vélo',
  color: null,
  category: { id: 'c-1', name: 'Sport', color: null },
}

describe('getArchivedProductDetail', () => {
  beforeEach(() => {
    apiGet.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('appelle la route des archivés et accepte un événement à isRecurring null', async () => {
    apiGet.mockResolvedValue({
      data: {
        ...BASE,
        events: [
          {
            id: 'e-1',
            title: 'Révision',
            type: 'single',
            isRecurring: null,
            startDate: '2026-06-01',
            endDate: '2026-06-01',
            productId: 'p-1',
            archived: false,
          },
        ],
      },
    })

    const detail = await getArchivedProductDetail('user-1', 'p-1')

    expect(apiGet).toHaveBeenCalledWith('/users/user-1/products/archived/p-1')
    expect(detail.events[0].isRecurring).toBeNull()
  })

  it('rejette une réponse hors contrat', async () => {
    apiGet.mockResolvedValue({ data: { ...BASE, events: 'x' } })
    await expect(getArchivedProductDetail('user-1', 'p-1')).rejects.toThrow()
  })

  it('propage un 404 tel quel', async () => {
    const error = { response: { status: 404 } }
    apiGet.mockRejectedValue(error)
    await expect(getArchivedProductDetail('user-1', 'p-1')).rejects.toBe(error)
  })
})
