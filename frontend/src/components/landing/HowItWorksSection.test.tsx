import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { EVENT_PALETTE } from '@/lib/event-palette'
import { HowItWorksSection, MILESTONES } from './HowItWorksSection'
import fr from '../../../public/locales/fr/common.json'
import en from '../../../public/locales/en/common.json'
import es from '../../../public/locales/es/common.json'
import de from '../../../public/locales/de/common.json'

/**
 * #612 — frise de cas d'usage à 4 jalons. Ce qui relève de la mise en page (ligne
 * horizontale ≥ `lg`, empilement vertical < `sm`, couleur PEINTE) ne se prouve pas sous
 * jsdom : c'est `e2e/sprint-103-use-case-frieze.spec.ts`. Ici : structure, rôles de
 * palette, et résolution RÉELLE des clés i18n dans les 4 locales.
 */
const realIntl = vi.hoisted(() => ({ enabled: false }))

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>()
  return {
    ...actual,
    // Mock par défaut : `ns.key` brut. Les tests « 4 locales » passent par le vrai
    // provider via `actual.useTranslations` (cf. `renderWithMessages`).
    useTranslations: (ns?: string) => {
      if (realIntl.enabled) return actual.useTranslations(ns)
      return (key: string) => (ns ? `${ns}.${key}` : key)
    },
  }
})

function renderWithMessages(locale: string, messages: Record<string, unknown>) {
  const errors: string[] = []
  realIntl.enabled = true
  try {
    render(
      <NextIntlClientProvider
        locale={locale}
        timeZone="Europe/Paris"
        messages={{ common: messages }}
        onError={(error) => errors.push(error.message)}
      >
        <HowItWorksSection />
      </NextIntlClientProvider>,
    )
  } finally {
    realIntl.enabled = false
  }
  return errors
}

const NS = 'common.landing.howItWorks'

describe('HowItWorksSection — frise de cas d’usage (#612)', () => {
  it('porte l’ancre #how-it-works ciblée par la navigation et le CTA secondaire du hero', () => {
    const { container } = render(<HowItWorksSection />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'how-it-works')
  })

  it('rend UNE frise ordonnée de 4 jalons, chacun avec étiquette, titre et texte', () => {
    render(<HowItWorksSection />)
    const frieze = screen.getByTestId('landing-frieze')
    expect(frieze.tagName).toBe('OL')
    const milestones = within(frieze).getAllByTestId('landing-frieze-milestone')
    expect(milestones).toHaveLength(4)
    for (const [i, { key }] of MILESTONES.entries()) {
      const li = milestones[i]
      expect(within(li).getByText(`${NS}.milestones.${key}.tag`)).toBeInTheDocument()
      expect(within(li).getByRole('heading', { level: 3 })).toHaveTextContent(
        `${NS}.milestones.${key}.title`,
      )
      expect(within(li).getByText(`${NS}.milestones.${key}.text`)).toBeInTheDocument()
    }
  })

  it('rend un seul h2 de section, précédé du surtitre et suivi du paragraphe', () => {
    render(<HowItWorksSection />)
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s).toHaveLength(1)
    expect(h2s[0]).toHaveTextContent(`${NS}.title`)
    expect(h2s[0].previousElementSibling).toHaveTextContent(`${NS}.eyebrow`)
    expect(h2s[0].nextElementSibling).toHaveTextContent(`${NS}.subtitle`)
  })

  it('peint chaque pastille via le token `--evt-*` de son rôle, dans l’ordre sky → periwinkle → grass → amber', () => {
    render(<HowItWorksSection />)
    expect(MILESTONES.map((m) => m.role)).toEqual(['sky', 'periwinkle', 'grass', 'amber'])
    const roles = new Set(EVENT_PALETTE.map((e) => e.role))
    const milestones = screen.getAllByTestId('landing-frieze-milestone')
    for (const [i, li] of milestones.entries()) {
      const role = MILESTONES[i].role
      expect(roles.has(role), `${role} appartient à EVENT_PALETTE`).toBe(true)
      expect(li).toHaveAttribute('data-role', role)
      const dot = within(li).getByTestId('landing-frieze-dot')
      expect(dot.getAttribute('style')).toContain(`var(--evt-${role})`)
      expect(dot).toHaveAttribute('aria-hidden', 'true')
    }
  })

  /**
   * #615 (arbitrage A1) — l'accent est réservé à today / actif / liens / CTA. La
   * maquette mettait les étiquettes en accent : verrou contre son retour.
   */
  it('n’emploie aucune classe d’accent (ornement interdit, #615)', () => {
    const { container } = render(<HowItWorksSection />)
    expect(container.innerHTML).not.toMatch(/\b(?:[a-z-]+:)*(?:text|bg|border|ring)-accent/)
    for (const tag of screen.getAllByTestId('landing-frieze-tag')) {
      expect(tag).toHaveClass('text-ink-muted')
    }
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<HowItWorksSection />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })

  it('n’a plus de chiffre d’étape ni de pastille ronde `bg-accent-soft` (#426 absorbée)', () => {
    const { container } = render(<HowItWorksSection />)
    expect(container.querySelector('.rounded-full')).toBeNull()
    for (const n of ['1', '2', '3', '4']) expect(screen.queryByText(n)).toBeNull()
  })

  for (const [locale, messages] of Object.entries({ fr, en, es, de })) {
    it(`résout toutes ses clés en \`${locale}\` avec les vrais messages, sans IntlError`, () => {
      const errors = renderWithMessages(locale, messages)
      expect(errors).toEqual([])
      expect(screen.getAllByTestId('landing-frieze-milestone')).toHaveLength(4)
      // Aucun chemin de clé brut rendu (fallback next-intl).
      expect(document.body.textContent).not.toContain('milestones.')
      expect(document.body.textContent).not.toContain('howItWorks')
    })
  }
})
