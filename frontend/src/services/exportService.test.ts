import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  downloadAsyncExport,
  exportInline,
  getExportJob,
  submitAsyncExport,
} from './exportService'

/**
 * #59 — Client export RGPD. On mocke `apiClient` (axios) pour vérifier :
 *  - le mapping des endpoints (contrat figé #58),
 *  - la validation Zod de `ExportJobResponse`,
 *  - le retrait du préfixe `/api` du `downloadUrl` (baseURL porte déjà `/api`).
 */
const get = vi.fn()
const post = vi.fn()
vi.mock('./apiClient', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}))

const job = {
  jobId: '11111111-1111-1111-1111-111111111111',
  status: 'PENDING',
  format: 'ZIP',
  downloadUrl: null,
  expiresAt: null,
}

afterEach(() => vi.clearAllMocks())

describe('exportService', () => {
  it('exportInline : GET /export?format=… en blob + filename du header', async () => {
    get.mockResolvedValue({
      data: new Blob(['x']),
      headers: { 'content-disposition': 'attachment; filename="mon-export.json"' },
    })
    const file = await exportInline('JSON')
    expect(get).toHaveBeenCalledWith('/export', {
      params: { format: 'JSON' },
      responseType: 'blob',
    })
    expect(file.filename).toBe('mon-export.json')
  })

  it('exportInline : filename de repli si header absent (MARKDOWN -> .md)', async () => {
    get.mockResolvedValue({ data: new Blob(['x']), headers: {} })
    const file = await exportInline('MARKDOWN')
    expect(file.filename).toBe('mytimeline-export.md')
  })

  it('submitAsyncExport : POST /export?format=… validé par Zod', async () => {
    post.mockResolvedValue({ data: job })
    const result = await submitAsyncExport('ZIP')
    expect(post).toHaveBeenCalledWith('/export', null, { params: { format: 'ZIP' } })
    expect(result.jobId).toBe(job.jobId)
  })

  it('submitAsyncExport : rejette une réponse non conforme (Zod)', async () => {
    post.mockResolvedValue({ data: { jobId: 'not-a-uuid' } })
    await expect(submitAsyncExport('ZIP')).rejects.toThrow()
  })

  it('getExportJob : GET /export/job/{jobId}', async () => {
    get.mockResolvedValue({ data: job })
    await getExportJob(job.jobId)
    expect(get).toHaveBeenCalledWith(`/export/job/${job.jobId}`)
  })

  it('downloadAsyncExport : retire le préfixe /api du downloadUrl', async () => {
    get.mockResolvedValue({ data: new Blob(['z']), headers: {} })
    await downloadAsyncExport('/api/export/download/abc?token=t')
    expect(get).toHaveBeenCalledWith('/export/download/abc?token=t', {
      responseType: 'blob',
    })
  })
})
