import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PasswordStrength, scorePassword, levelFromScore } from './PasswordStrength'

/**
 * #86 — Indicateur de force du mot de passe. On vérifie la logique de scoring
 * (pure) + le rendu des niveaux (clés i18n `security.strength.*`).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

describe('scorePassword', () => {
  it('renvoie 0 pour une chaîne vide', () => {
    expect(scorePassword('')).toBe(0)
  })

  it('note faiblement un mot de passe court simple', () => {
    expect(levelFromScore(scorePassword('abc'))).toBe('weak')
  })

  it('note fort un mot de passe long et varié', () => {
    expect(levelFromScore(scorePassword('Abcdef123!'))).toBe('strong')
  })
})

describe('PasswordStrength', () => {
  it('ne rend rien tant que le mot de passe est vide', () => {
    const { container } = render(<PasswordStrength password="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le niveau faible pour un mot de passe simple', () => {
    render(<PasswordStrength password="abc" />)
    expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    expect(screen.getByText('settings.security.strength.weak')).toBeInTheDocument()
  })

  it('affiche le niveau fort pour un mot de passe robuste', () => {
    render(<PasswordStrength password="Abcdef123!" />)
    expect(screen.getByText('settings.security.strength.strong')).toBeInTheDocument()
  })
})
