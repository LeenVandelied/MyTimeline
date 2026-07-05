import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsShell } from './SettingsShell'

/**
 * #86 — Navigation par chapitres (tablist vertical). On mocke les 4 sections
 * (testées ailleurs / via services) pour isoler la logique de navigation +
 * accessibilité clavier (↑/↓/Home/End, aria-selected, tabpanel visible).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

vi.mock('./ProfileSection', () => ({
  ProfileSection: () => <div data-testid="mock-profile">profile</div>,
}))
vi.mock('./SecuritySection', () => ({
  SecuritySection: () => <div data-testid="mock-security">security</div>,
}))
vi.mock('./PreferencesSection', () => ({
  PreferencesSection: () => <div data-testid="mock-preferences">preferences</div>,
}))
vi.mock('./AccountSection', () => ({
  AccountSection: () => <div data-testid="mock-account">account</div>,
}))

describe('SettingsShell', () => {
  it('rend les 4 onglets et affiche Profil par défaut', () => {
    render(<SettingsShell />)
    expect(screen.getByTestId('settings-tab-profile')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('mock-profile')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-security')).not.toBeInTheDocument()
  })

  it('change de chapitre au clic', () => {
    render(<SettingsShell />)
    fireEvent.click(screen.getByTestId('settings-tab-security'))
    expect(screen.getByTestId('settings-tab-security')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('mock-security')).toBeInTheDocument()
  })

  it('navigue au clavier avec ArrowDown', () => {
    render(<SettingsShell />)
    const first = screen.getByTestId('settings-tab-profile')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(screen.getByTestId('settings-tab-security')).toHaveAttribute('aria-selected', 'true')
  })

  it('End sélectionne le dernier chapitre (Compte)', () => {
    render(<SettingsShell />)
    const first = screen.getByTestId('settings-tab-profile')
    first.focus()
    fireEvent.keyDown(first, { key: 'End' })
    expect(screen.getByTestId('settings-tab-account')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('mock-account')).toBeInTheDocument()
  })

  it('le tablist est vertical (aria-orientation)', () => {
    render(<SettingsShell />)
    expect(screen.getByTestId('settings-tablist')).toHaveAttribute('aria-orientation', 'vertical')
  })
})
