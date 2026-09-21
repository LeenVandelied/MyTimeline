import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SettingsLoading from './loading'

/** #629 — Fallback de segment de `/settings` (structure seulement, cf. jsdom). */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

describe('SettingsLoading (#629)', () => {
  it('monte le squelette en lignes avec le libellé de chargement des réglages', () => {
    render(<SettingsLoading />)
    const root = screen.getByTestId('settings-loading-skeleton')
    expect(root).toHaveAttribute('role', 'status')
    expect(root).not.toHaveAttribute('aria-busy')
    // DEC-S82-003 : clé du namespace, pas le générique `common.spinner.loading`.
    expect(screen.getByText('settings.loading')).toBeInTheDocument()
    expect(screen.queryByText('common.spinner.loading')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('loading-skeleton-item')).toHaveLength(5)
  })

  it('reprend le titre réel de la page, sans exposer d’onglets ni de lien retour', () => {
    render(<SettingsLoading />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('settings.pageTitle')
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-back')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-tablist')).not.toBeInTheDocument()
  })

  it('réserve la place du retour à sa taille réelle, 44 px (clôture Sprint 96)', () => {
    // Structure seulement (jsdom ne met pas en page) : garde la synchro des classes
    // avec `settings-back` de `page.tsx` ; la géométrie est mesurée en E2E.
    render(<SettingsLoading />)
    const slot = screen.getByTestId('settings-back-placeholder')
    expect(slot).toHaveClass('h-11', 'w-11', 'lg:hidden')
    expect(slot).not.toHaveClass('h-9')
    expect(slot).toHaveAttribute('aria-hidden', 'true')
  })
})
