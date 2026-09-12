import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileAppSection } from './MobileAppSection'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('MobileAppSection', () => {
  it('rend le titre, le sous-titre et les deux boutons de store', () => {
    render(<MobileAppSection />)
    expect(screen.getByText('common.landing.mobileApp.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.mobileApp.subtitle')).toBeInTheDocument()
    expect(screen.getByText('common.landing.mobileApp.ios')).toBeInTheDocument()
    expect(screen.getByText('common.landing.mobileApp.android')).toBeInTheDocument()
  })

  /**
   * #293 / #56 — les boutons de store n'ont pas de remplissage : leur BORDURE est
   * l'affordance, donc tier « fonctionnel » (seuil WCAG UI ≥ 3:1). Ils étaient sur
   * `border-rule` (1.24:1, tier décoratif). En jsdom les valeurs CSS ne sont pas
   * calculées : on vérifie la classe de token, pas le ratio.
   */
  it('utilise le tier de bordure fonctionnelle sur les boutons de store', () => {
    render(<MobileAppSection />)
    for (const key of ['ios', 'android']) {
      const button = screen.getByText(`common.landing.mobileApp.${key}`)
      expect(button.className).toMatch(/\bborder-rule-emphasis\b/)
      // le tier décoratif nu ne doit plus porter ces bordures
      expect(button.className).not.toMatch(/\bborder-rule(?![-\w])/)
    }
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<MobileAppSection />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
