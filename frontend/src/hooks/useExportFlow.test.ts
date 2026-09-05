import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExportFlow } from './useExportFlow'
import type { ExportJobResponse } from '@/lib/schemas/export'

/**
 * #59 — Machine à états de l'export RGPD. On mocke `exportService` (couche réseau)
 * pour piloter les scénarios sync / async (polling PENDING→COMPLETED) / FAILED /
 * erreur réseau, conformément au contrat backend figé #58.
 */
const exportInline = vi.fn()
const submitAsyncExport = vi.fn()
const getExportJob = vi.fn()
const downloadAsyncExport = vi.fn()
const triggerBrowserDownload = vi.fn()

vi.mock('@/services/exportService', () => ({
  exportInline: (...args: unknown[]) => exportInline(...args),
  submitAsyncExport: (...args: unknown[]) => submitAsyncExport(...args),
  getExportJob: (...args: unknown[]) => getExportJob(...args),
  downloadAsyncExport: (...args: unknown[]) => downloadAsyncExport(...args),
  triggerBrowserDownload: (...args: unknown[]) => triggerBrowserDownload(...args),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return createElement(QueryClientProvider, { client }, children)
}

const completedJob: ExportJobResponse = {
  jobId: '11111111-1111-1111-1111-111111111111',
  status: 'COMPLETED',
  format: 'ZIP',
  downloadUrl: '/api/export/download/11111111-1111-1111-1111-111111111111?token=t',
  expiresAt: '2999-01-01T10:00:00',
}

const pendingJob: ExportJobResponse = {
  jobId: completedJob.jobId,
  status: 'PENDING',
  format: 'ZIP',
  downloadUrl: null,
  expiresAt: null,
}

afterEach(() => vi.clearAllMocks())

describe('useExportFlow — format synchrone', () => {
  it('télécharge immédiatement (JSON) et passe à ready', async () => {
    exportInline.mockResolvedValue({ blob: new Blob(['{}']), filename: 'export.json' })
    const { result } = renderHook(() => useExportFlow(), { wrapper })

    act(() => result.current.start())

    await waitFor(() => expect(result.current.phase).toBe('ready'))
    expect(exportInline).toHaveBeenCalledWith('JSON')
    expect(triggerBrowserDownload).toHaveBeenCalledOnce()
    expect(result.current.completedJob).toBeNull()
  })
})

describe('useExportFlow — format asynchrone', () => {
  it('soumet un job puis passe à ready quand le job est COMPLETED', async () => {
    submitAsyncExport.mockResolvedValue(pendingJob)
    // 1er poll : déjà terminé (fetch initial immédiat, sans dépendre du timer).
    getExportJob.mockResolvedValue(completedJob)

    const { result } = renderHook(() => useExportFlow(), { wrapper })
    act(() => result.current.setFormat('ZIP'))
    act(() => result.current.start())

    await waitFor(() => expect(submitAsyncExport).toHaveBeenCalledWith('ZIP'))

    await waitFor(() => expect(result.current.phase).toBe('ready'))
    expect(result.current.completedJob?.downloadUrl).toBe(completedJob.downloadUrl)

    act(() => result.current.downloadCompleted())
    await waitFor(() =>
      expect(downloadAsyncExport).toHaveBeenCalledWith(completedJob.downloadUrl),
    )
  })

  it('bascule en erreur jobFailed si le job échoue', async () => {
    submitAsyncExport.mockResolvedValue(pendingJob)
    getExportJob.mockResolvedValue({ ...pendingJob, status: 'FAILED' })

    const { result } = renderHook(() => useExportFlow(), { wrapper })
    act(() => result.current.setFormat('CSV'))
    act(() => result.current.start())

    await waitFor(() => expect(result.current.phase).toBe('error'))
    expect(result.current.errorKey).toBe('jobFailed')
  })

  it('bascule en erreur network si la soumission échoue', async () => {
    submitAsyncExport.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useExportFlow(), { wrapper })
    act(() => result.current.setFormat('ZIP'))
    act(() => result.current.start())

    await waitFor(() => expect(result.current.phase).toBe('error'))
    expect(result.current.errorKey).toBe('network')
  })
})

describe('useExportFlow — polling multi-tours', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('poll PENDING puis COMPLETED (refetchInterval)', async () => {
    submitAsyncExport.mockResolvedValue(pendingJob)
    getExportJob.mockResolvedValueOnce(pendingJob).mockResolvedValue(completedJob)

    const { result } = renderHook(() => useExportFlow(), { wrapper })
    act(() => result.current.setFormat('ZIP'))
    act(() => result.current.start())

    // Laisse la soumission + 1er poll (PENDING) se résoudre.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.phase).toBe('preparing')

    // Tour de polling suivant -> COMPLETED.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(result.current.phase).toBe('ready')
    expect(getExportJob.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
