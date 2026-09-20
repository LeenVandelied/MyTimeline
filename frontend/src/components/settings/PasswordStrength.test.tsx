import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  PasswordStrength,
  scorePassword,
  levelFromScore,
  levelFromPassword,
  meetsPolicy,
} from './PasswordStrength'
import { PASSWORD_POLICY } from '@/lib/schemas/auth'

/**
 * #86 — Indicateur de force du mot de passe. On vérifie la logique de scoring
 * (pure) + le rendu des niveaux (clés i18n `security.strength.*`).
 *
 * #508 — On vérifie surtout que l'indicateur NE CONTREDIT PAS la politique
 * serveur (`PASSWORD_POLICY`, BR-AUT-003) : `weak` ⇔ refusé par le serveur.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

describe('scorePassword', () => {
  it('renvoie 0 pour une chaîne vide', () => {
    expect(scorePassword('')).toBe(0)
  })

  it('n’accorde pas le point de longueur en dessous de PASSWORD_POLICY.minLength', () => {
    // 7 caractères : sous le seuil (8). Avant #508 le seuil était à 6.
    expect(scorePassword('abcdefg')).toBe(0)
    expect(scorePassword('abcdefgh')).toBe(1)
  })

  it('note fort un mot de passe long et varié', () => {
    expect(levelFromScore(scorePassword('Abcdef123!'))).toBe('strong')
  })
})

describe('meetsPolicy', () => {
  it('réplique la politique serveur (longueur + majuscule + chiffre)', () => {
    expect(meetsPolicy('Abcdefg1')).toBe(true)
    expect(meetsPolicy('Abcdef1')).toBe(false) // 7 caractères
    expect(meetsPolicy('abcdefgh1')).toBe(false) // pas de majuscule
    expect(meetsPolicy('Abcdefgh')).toBe(false) // pas de chiffre
    expect(meetsPolicy('A1'.padEnd(PASSWORD_POLICY.maxLength + 1, 'x'))).toBe(false) // borne haute
  })
})

describe('levelFromPassword — cohérence avec la politique serveur', () => {
  // Cas limites #508 : le niveau affiché ne doit jamais contredire le serveur.
  it.each([
    ['abcdefg', 'weak'], // 7 → refusé serveur
    ['Abcdefg1', 'medium'], // 8 + majuscule + chiffre → accepté
    ['abcdefgh', 'weak'], // 8 mais ni majuscule ni chiffre → refusé
    ['Abcdefghij1', 'strong'], // 11 + majuscule + chiffre → accepté
  ])('%s → %s', (password, expected) => {
    expect(levelFromPassword(password)).toBe(expected)
  })

  it('n’affiche JAMAIS strong ni medium pour un mot de passe refusé par le serveur', () => {
    // `Abc123!` scorait 4 (donc `strong`) avant #508, alors qu'il fait 7 caractères.
    for (const refused of ['Abc123!', 'abcdefg', 'abcdefgh', 'ABCDEFGH', 'abcdefgh1', '']) {
      expect(meetsPolicy(refused)).toBe(false)
      expect(levelFromPassword(refused)).toBe('weak')
    }
  })

  it('n’affiche JAMAIS weak pour un mot de passe accepté par le serveur', () => {
    for (const accepted of ['Abcdefg1', 'ABCDEFG1', 'Abcdefghij1', 'NewStrong123!']) {
      expect(meetsPolicy(accepted)).toBe(true)
      expect(levelFromPassword(accepted)).not.toBe('weak')
    }
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

  it('affiche le niveau faible pour un mot de passe court mais varié (refusé serveur)', () => {
    render(<PasswordStrength password="Abc123!" />)
    expect(screen.getByText('settings.security.strength.weak')).toBeInTheDocument()
  })

  it('affiche le niveau fort pour un mot de passe robuste', () => {
    render(<PasswordStrength password="Abcdef123!" />)
    expect(screen.getByText('settings.security.strength.strong')).toBeInTheDocument()
  })
})
