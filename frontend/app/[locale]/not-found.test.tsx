import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import LocaleNotFound from './not-found'

/**
 * #57 — Écran 404 locale-aware. next-intl mocké (assertions locale-agnostiques
 * `namespace.key`, paramètres ICU sérialisés) ; useLocale renvoie `fr` → lien de
 * retour préfixé `/fr/`.
 */
vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations:
    (namespace: string) => (key: string, values?: Record<string, string | number>) =>
      values ? `${namespace}.${key}:${JSON.stringify(values)}` : `${namespace}.${key}`,
}))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 24, 9, 0)) // jeudi 24 septembre 2026, semaine ISO 39
})

afterEach(() => {
  vi.useRealTimers()
})

describe('LocaleNotFound', () => {
  // #627 — éphéméride : sur-titre, titre de l'almanach, description ; plus de gros « 404 ».
  it("rend l'écran 404 éphéméride (sur-titre, titre, description)", () => {
    render(<LocaleNotFound />)
    expect(screen.getByTestId('not-found-screen')).toBeInTheDocument()
    expect(screen.getByTestId('state-screen-eyebrow')).toHaveTextContent('errors.notFound.eyebrow')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('errors.notFound.title')
    expect(screen.getByText('errors.notFound.description')).toBeInTheDocument()
    expect(screen.queryByTestId('state-screen-code')).not.toBeInTheDocument()
  })

  it('feuillet daté du jour, dans la locale courante, semaine via la clé ICU `week`', () => {
    render(<LocaleNotFound />)
    expect(screen.getByTestId('ephemeris-leaf')).toHaveAttribute('data-ephemeris-ready', 'true')
    expect(screen.getByTestId('ephemeris-day').textContent).toBe('24')
    expect(screen.getByTestId('ephemeris-month').textContent).toBe('septembre 2026')
    expect(screen.getByTestId('ephemeris-week').textContent).toBe(
      'errors.notFound.week:{"week":39}',
    )
  })

  // ADR-006 — la landing canonique est la racine de locale `/fr`, plus `/fr/home`.
  it('lien de retour préfixé locale (/fr)', () => {
    render(<LocaleNotFound />)
    const link = screen.getByTestId('not-found-home-link')
    expect(link).toHaveAttribute('href', '/fr')
    expect(link).toHaveTextContent('errors.notFound.backHome')
  })
})
