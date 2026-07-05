import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileSettings } from './MobileSettings'

/**
 * #87 — Drill-down mobile : index -> détail (push) et retour (back) vers l'index.
 * On mocke les 4 sections #86 (testées ailleurs) pour isoler la navigation.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

vi.mock('../ProfileSection', () => ({
  ProfileSection: () => <div data-testid="mock-profile">profile</div>,
}))
vi.mock('../SecuritySection', () => ({
  SecuritySection: () => <div data-testid="mock-security">security</div>,
}))
vi.mock('../PreferencesSection', () => ({
  PreferencesSection: () => <div data-testid="mock-preferences">preferences</div>,
}))
vi.mock('../AccountSection', () => ({
  AccountSection: () => <div data-testid="mock-account">account</div>,
}))

describe('MobileSettings — drill-down', () => {
  it("affiche l'index par défaut (aucun détail)", () => {
    render(<MobileSettings />)
    expect(screen.getByTestId('mobile-settings-index-view')).toBeInTheDocument()
    expect(screen.getByTestId('settings-index')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-profile')).not.toBeInTheDocument()
  })

  it('navigue vers le détail au toucher, puis revient à l’index via retour', () => {
    render(<MobileSettings />)

    fireEvent.click(screen.getByTestId('settings-index-security'))
    expect(screen.getByTestId('mobile-settings-detail-security')).toBeInTheDocument()
    expect(screen.getByTestId('mock-security')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-index')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mobile-settings-back'))
    expect(screen.getByTestId('mobile-settings-index-view')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-security')).not.toBeInTheDocument()
  })

  it('ouvre le chapitre Compte depuis l’index', () => {
    render(<MobileSettings />)
    fireEvent.click(screen.getByTestId('settings-index-account'))
    expect(screen.getByTestId('mobile-settings-detail-account')).toBeInTheDocument()
    expect(screen.getByTestId('mock-account')).toBeInTheDocument()
  })
})
