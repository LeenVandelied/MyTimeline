import { render, screen, fireEvent, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExportDataFlow } from './ExportDataFlow'
import type { UseExportFlowResult } from '@/hooks/useExportFlow'

/**
 * #59 — Flux d'export RGPD (présentation). On pilote la machine à états via un
 * mock de `useExportFlow` pour couvrir de façon déterministe les 3 étapes
 * (confirm / preparing / ready) + l'erreur + le lien expiré, sans dépendre des
 * timers de polling (testés dans `useExportFlow.test.ts`).
 */
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  useLocale: () => 'fr',
}))

let flowState: UseExportFlowResult
vi.mock('@/hooks/useExportFlow', () => ({
  useExportFlow: () => flowState,
}))

function makeFlow(overrides: Partial<UseExportFlowResult> = {}): UseExportFlowResult {
  return {
    format: 'JSON',
    setFormat: vi.fn(),
    phase: 'confirm',
    jobStatus: null,
    completedJob: null,
    errorKey: null,
    isBusy: false,
    start: vi.fn(),
    downloadCompleted: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  }
}

describe('ExportDataFlow', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('étape 1 : affiche le sélecteur de format + explication et déclenche start', () => {
    const start = vi.fn()
    flowState = makeFlow({ start })
    render(<ExportDataFlow />)

    expect(screen.getByTestId('export-step-confirm')).toBeInTheDocument()
    expect(screen.getByTestId('export-format-hint')).toHaveTextContent('formats.JSON.hint')
    fireEvent.click(screen.getByTestId('export-start'))
    expect(start).toHaveBeenCalledOnce()
  })

  it('étape 2 : affiche la progression (polling) avec statut annoncé aux SR', () => {
    flowState = makeFlow({ phase: 'preparing', format: 'ZIP', jobStatus: 'RUNNING' })
    render(<ExportDataFlow />)

    const preparing = screen.getByTestId('export-step-preparing')
    expect(preparing).toHaveAttribute('role', 'status')
    expect(preparing).toHaveAttribute('aria-live', 'polite')
    expect(preparing).toHaveTextContent('status.RUNNING')
  })

  it('étape 3 sync : fichier déjà téléchargé', () => {
    flowState = makeFlow({ phase: 'ready', format: 'JSON', completedJob: null })
    render(<ExportDataFlow />)
    expect(screen.getByTestId('export-ready-sync')).toBeInTheDocument()
  })

  it('étape 3 async : lien de téléchargement + date d’expiration', () => {
    const downloadCompleted = vi.fn()
    flowState = makeFlow({
      phase: 'ready',
      format: 'ZIP',
      downloadCompleted,
      completedJob: {
        jobId: '11111111-1111-1111-1111-111111111111',
        status: 'COMPLETED',
        format: 'ZIP',
        downloadUrl: '/api/export/download/abc?token=t',
        expiresAt: '2999-01-01T10:00:00',
      },
    })
    render(<ExportDataFlow />)

    expect(screen.getByTestId('export-ready-async')).toBeInTheDocument()
    expect(screen.getByTestId('export-expiry')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('export-download'))
    expect(downloadCompleted).toHaveBeenCalledOnce()
  })

  it('étape 3 async : lien expiré -> propose une relance', () => {
    const reset = vi.fn()
    flowState = makeFlow({
      phase: 'ready',
      format: 'ZIP',
      reset,
      completedJob: {
        jobId: '11111111-1111-1111-1111-111111111111',
        status: 'COMPLETED',
        format: 'ZIP',
        downloadUrl: '/api/export/download/abc?token=t',
        expiresAt: '2000-01-01T10:00:00',
      },
    })
    render(<ExportDataFlow />)

    expect(screen.getByTestId('export-expired')).toBeInTheDocument()
    expect(screen.queryByTestId('export-download')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('export-relaunch'))
    expect(reset).toHaveBeenCalledOnce()
  })

  it('étape 3 async : bascule en état expiré après le TTL sans interaction', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'))
    // Lien valide 30 min au moment du render (interprété UTC via suffixe `Z`).
    flowState = makeFlow({
      phase: 'ready',
      format: 'ZIP',
      completedJob: {
        jobId: '11111111-1111-1111-1111-111111111111',
        status: 'COMPLETED',
        format: 'ZIP',
        downloadUrl: '/api/export/download/abc?token=t',
        expiresAt: '2026-01-01T09:30:00',
      },
    })
    render(<ExportDataFlow />)

    // Au render : lien disponible, pas encore expiré.
    expect(screen.getByTestId('export-ready-async')).toBeInTheDocument()
    expect(screen.queryByTestId('export-expired')).not.toBeInTheDocument()

    // On dépasse le TTL sans aucune interaction : le tick périodique (60 s)
    // recalcule l'expiration et bascule l'UI.
    act(() => {
      vi.advanceTimersByTime(31 * 60_000)
    })

    expect(screen.getByTestId('export-expired')).toBeInTheDocument()
    expect(screen.queryByTestId('export-download')).not.toBeInTheDocument()
  })

  it('erreur : message alerte + réessayer', () => {
    const reset = vi.fn()
    flowState = makeFlow({ phase: 'error', errorKey: 'jobFailed', reset })
    render(<ExportDataFlow />)

    const err = screen.getByTestId('export-step-error')
    expect(err).toHaveAttribute('role', 'alert')
    expect(err).toHaveTextContent('errors.jobFailed')
    fireEvent.click(screen.getByTestId('export-retry'))
    expect(reset).toHaveBeenCalledOnce()
  })
})
