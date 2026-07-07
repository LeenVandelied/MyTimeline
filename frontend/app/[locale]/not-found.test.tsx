import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import LocaleNotFound from './not-found'

/**
 * #57 — Écran 404 locale-aware. next-intl mocké (assertions locale-agnostiques
 * `namespace.key`) ; useLocale renvoie `fr` → lien de retour préfixé `/fr/`.
 */
vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

describe('LocaleNotFound', () => {
  it('rend l\'écran 404 (code, titre, description)', () => {
    render(<LocaleNotFound />)
    expect(screen.getByTestId('not-found-screen')).toBeInTheDocument()
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('404')
    expect(screen.getByText('errors.notFound.title')).toBeInTheDocument()
    expect(screen.getByText('errors.notFound.description')).toBeInTheDocument()
  })

  it('lien de retour préfixé locale (/fr/home)', () => {
    render(<LocaleNotFound />)
    const link = screen.getByTestId('not-found-home-link')
    expect(link).toHaveAttribute('href', '/fr/home')
    expect(link).toHaveTextContent('errors.notFound.backHome')
  })
})
