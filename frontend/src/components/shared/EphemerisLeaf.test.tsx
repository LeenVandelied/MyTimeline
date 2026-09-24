import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EphemerisLeaf } from './EphemerisLeaf'

/**
 * #627 — Feuillet d'éphéméride du 404. Horloge factice (`Date` seul : les
 * minuteurs réels restent, RTL en dépend) posée sur une date LOCALE.
 */
const formatWeek = (week: number) => `Semaine ${week}`

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 24, 10, 30)) // jeudi 24 septembre 2026, semaine 39
})

afterEach(() => {
  vi.useRealTimers()
})

describe('EphemerisLeaf', () => {
  it('après montage, affiche le jour de l’horloge (jour, mois, année, semaine ISO)', () => {
    render(<EphemerisLeaf locale="fr" formatWeek={formatWeek} />)

    const leaf = screen.getByTestId('ephemeris-leaf')
    expect(leaf).toHaveAttribute('data-ephemeris-ready', 'true')
    expect(leaf).toHaveAttribute('datetime', '2026-09-24')
    expect(screen.getByTestId('ephemeris-weekday').textContent).toBe('jeudi')
    expect(screen.getByTestId('ephemeris-day').textContent).toBe('24')
    expect(screen.getByTestId('ephemeris-month').textContent).toBe('septembre 2026')
    expect(screen.getByTestId('ephemeris-week').textContent).toBe('Semaine 39')
  })

  it.each([
    ['en', 'Thursday', 'September 2026'],
    ['es', 'jueves', 'septiembre 2026'],
    ['de', 'Donnerstag', 'September 2026'],
  ])('%s : libellés dans la locale fournie', (locale, weekday, monthYear) => {
    render(<EphemerisLeaf locale={locale} formatWeek={(w) => `W${w}`} />)
    expect(screen.getByTestId('ephemeris-weekday').textContent).toBe(weekday)
    expect(screen.getByTestId('ephemeris-month').textContent).toBe(monthYear)
    expect(screen.getByTestId('ephemeris-week').textContent).toBe('W39')
  })

  it('jour sur 2 chiffres', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 8, 0))
    render(<EphemerisLeaf locale="fr" formatWeek={formatWeek} />)
    expect(screen.getByTestId('ephemeris-day').textContent).toBe('01')
    expect(screen.getByTestId('ephemeris-week').textContent).toBe('Semaine 1')
  })

  // Critère « le rendu statique ne fige pas une date obsolète » : le rendu
  // SERVEUR (celui du prérendu de `/_not-found`) ne contient AUCUNE date.
  it('rendu serveur : aucune date calculée, dimensions réservées, barrière à false', () => {
    const html = renderToString(<EphemerisLeaf locale="fr" formatWeek={formatWeek} />)

    expect(html).toContain('data-ephemeris-ready="false"')
    expect(html).not.toContain('datetime=')
    // Texte seul (les classes Tailwind contiennent des chiffres : `w-[150px]`…).
    const text = html.replace(/<[^>]*>/g, '')
    expect(text).not.toMatch(/\d/)
    expect(text.replace(/\u00a0|&nbsp;|&#xA0;|&#160;/gi, '').trim()).toBe('')
    // 4 lignes présentes (espaces insécables) : pas de saut de mise en page au montage.
    expect(html.match(/data-testid="ephemeris-/g)).toHaveLength(5)
  })

  it('décoratif : aria-hidden posé sur la racine du feuillet, qui porte bien la date', () => {
    render(<EphemerisLeaf locale="fr" formatWeek={formatWeek} />)
    // `<time>` n'a pas de rôle ARIA implicite : un `queryByRole('time')` vide ne
    // prouverait rien. La preuve est l'attribut sur la racine qui CONTIENT le jour.
    const leaf = screen.getByTestId('ephemeris-leaf')
    expect(leaf).toHaveAttribute('aria-hidden', 'true')
    expect(leaf).toContainElement(screen.getByText('24'))
  })

  it('tokens Graphite uniquement (clair + sombre par les tokens) : ni hex ni ink-faint', () => {
    const { container } = render(<EphemerisLeaf locale="fr" formatWeek={formatWeek} />)
    const classes = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')

    expect(classes).toContain('border-rule-strong')
    expect(classes).toContain('bg-surface')
    expect(classes).toContain('text-accent')
    expect(classes).toContain('uppercase')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    // DEC-S97-001 : `ink-faint` ne porte plus aucun texte (≤ 3,20:1).
    expect(classes).not.toContain('ink-faint')
  })
})
