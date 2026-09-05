import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsShell } from './SettingsShell'

/**
 * #86 — Navigation par chapitres. On mocke les 4 sections (testées ailleurs /
 * via services) pour isoler la logique de navigation + accessibilité clavier
 * (←/→, ↑/↓, Home/End, aria-selected, tabpanel visible).
 *
 * #299 — Le tablist est passé de VERTICAL à HORIZONTAL (settings sous `(app)/`,
 * la sidebar d'`AppShell` étant désormais la seule nav verticale). ←/→ sont les
 * touches primaires ; ↑/↓ restent des alias (rétro-compat E2E).
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

  it('navigue au clavier avec ArrowRight (primaire, tablist horizontal)', () => {
    render(<SettingsShell />)
    const first = screen.getByTestId('settings-tab-profile')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(screen.getByTestId('settings-tab-security')).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowLeft recule (et boucle depuis le premier chapitre)', () => {
    render(<SettingsShell />)
    const first = screen.getByTestId('settings-tab-profile')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowLeft' })
    expect(screen.getByTestId('settings-tab-account')).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowDown/ArrowUp restent des alias (rétro-compat E2E #299)', () => {
    render(<SettingsShell />)
    const first = screen.getByTestId('settings-tab-profile')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(screen.getByTestId('settings-tab-security')).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(screen.getByTestId('settings-tab-security'), { key: 'ArrowUp' })
    expect(screen.getByTestId('settings-tab-profile')).toHaveAttribute('aria-selected', 'true')
  })

  it('End sélectionne le dernier chapitre (Compte)', () => {
    render(<SettingsShell />)
    const first = screen.getByTestId('settings-tab-profile')
    first.focus()
    fireEvent.keyDown(first, { key: 'End' })
    expect(screen.getByTestId('settings-tab-account')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('mock-account')).toBeInTheDocument()
  })

  it('le tablist est horizontal (aria-orientation) — #299', () => {
    render(<SettingsShell />)
    expect(screen.getByTestId('settings-tablist')).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it("ne rend AUCUNE nav verticale : la sidebar d'AppShell est la seule — #299", () => {
    render(<SettingsShell />)
    const tablist = screen.getByTestId('settings-tablist')
    // `flex-wrap` casserait l'ordre visuel du roving tabIndex : interdit.
    expect(tablist.className).toContain('flex-row')
    expect(tablist.className).not.toContain('flex-col')
    expect(tablist.className).not.toContain('flex-wrap')
  })
})
