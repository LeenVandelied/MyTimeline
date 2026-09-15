import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsIndex } from './SettingsIndex'

/**
 * #87 — Index du drill-down mobile : liste des 4 chapitres + sélection. On mocke
 * `next-intl` (préfixe namespace.clé) pour isoler la présentation/navigation.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

describe('SettingsIndex', () => {
  it('rend les 4 chapitres avec chevron', () => {
    render(<SettingsIndex onSelect={vi.fn()} />)
    expect(screen.getByTestId('settings-index')).toBeInTheDocument()
    expect(screen.getByTestId('settings-index-profile')).toBeInTheDocument()
    expect(screen.getByTestId('settings-index-security')).toBeInTheDocument()
    expect(screen.getByTestId('settings-index-preferences')).toBeInTheDocument()
    expect(screen.getByTestId('settings-index-account')).toBeInTheDocument()
  })

  it('appelle onSelect avec le chapitre touché', () => {
    const onSelect = vi.fn()
    render(<SettingsIndex onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('settings-index-security'))
    expect(onSelect).toHaveBeenCalledWith('security')
  })
})
