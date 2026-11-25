import { cleanup, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthSplitLayout } from './AuthSplitLayout'
import frAuth from '../../../public/locales/fr/auth.json'

/**
 * #625 — gabarit d'authentification en deux zones (panneau + carte de 380 px).
 * Rendu avec le VRAI `NextIntlClientProvider` et les vrais messages `fr` : le test ne
 * dépend pas de la forme du hook de traduction choisie par le gabarit.
 * Contrat de testids : `auth-side-panel`, `auth-form-zone`, `auth-form-card`,
 * `auth-quote`, `auth-quote-attribution`. jsdom n'applique aucune feuille : la
 * largeur réelle est mesurée par `e2e/auth-split-layout.spec.ts`, ici on lit les classes.
 */
afterEach(cleanup)

function renderLayout(auth: object = frAuth) {
  return render(
    <NextIntlClientProvider locale="fr" messages={{ auth }} onError={() => {}}>
      <AuthSplitLayout>
        <form data-testid="child-form" />
      </AuthSplitLayout>
    </NextIntlClientProvider>,
  )
}

describe('AuthSplitLayout', () => {
  it('renders the side panel and the form zone side by side', () => {
    renderLayout()

    const panel = screen.queryByTestId('auth-side-panel')
    const zone = screen.queryByTestId('auth-form-zone')
    expect(panel).not.toBeNull()
    expect(zone).not.toBeNull()
    expect(within(zone as HTMLElement).getByTestId('child-form')).toBeInTheDocument()
    expect(within(panel as HTMLElement).queryByTestId('child-form')).toBeNull()
    expect((panel as HTMLElement).contains(zone)).toBe(false)
    expect((zone as HTMLElement).contains(panel)).toBe(false)
  })

  it('caps the form column at 380px', () => {
    renderLayout()

    const card = screen.queryByTestId('auth-form-card')
    expect(card).not.toBeNull()
    expect(card).toHaveClass('max-w-[380px]')
    expect(card).not.toHaveClass('max-w-md')
    expect(within(card as HTMLElement).getByTestId('child-form')).toBeInTheDocument()
  })

  it('shows the quote in the side panel', () => {
    // Messages fournis en mémoire : le test ne dépend pas de `auth.json` (T10 le couvre).
    const quote = { text: 'Citation de test du panneau', attribution: 'Attribution de test' }
    renderLayout({ ...frAuth, quote })

    const panel = screen.getByTestId('auth-side-panel')
    expect(within(panel).getByTestId('auth-quote')).toHaveTextContent(quote.text)
    expect(within(panel).getByTestId('auth-quote-attribution')).toHaveTextContent(quote.attribution)
  })

  it('form card keeps border and light shadow', () => {
    renderLayout()

    const card = screen.queryByTestId('auth-form-card')
    expect(card).not.toBeNull()
    expect(card).toHaveClass('border', 'border-rule', 'shadow-xs')
    expect(card?.className).not.toMatch(
      /(^|\s)(shadow-(sm|md|lg|xl|2xl|\[.*?\])|drop-shadow(-\S+)?)(\s|$)/,
    )
  })
})
