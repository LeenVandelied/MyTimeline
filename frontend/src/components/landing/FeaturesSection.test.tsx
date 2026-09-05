import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FeaturesSection } from './FeaturesSection'

const LANDING_CSS = join(dirname(fileURLToPath(import.meta.url)), '../../styles/landing.css')

/**
 * Utilitaires Tailwind agissant sur la propriété `translate`, posées en tête de classe
 * (`translate-y-4`, `hover:-translate-y-2`, `md:translate-y-px`, `-translate-y-[3px]`…).
 * On lit la propriété `translate` et ELLE SEULE : c'est celle qui, en Tailwind 4, se compose
 * silencieusement avec un `transform` de feuille de style au lieu de l'écraser.
 */
function translateUtilities(className: string): string[] {
  return className.match(/(?<![^\s])(?:[\w-]+:)*-?translate-[\w./[\]-]+/g) ?? []
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}))

describe('FeaturesSection', () => {
  it('porte l’ancre #features ciblée par la navigation', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'features')
  })

  it('rend les trois fonctionnalités pilotées par données', () => {
    render(<FeaturesSection />)
    for (const key of ['timeline', 'reminders', 'organization']) {
      expect(screen.getByText(`common.landing.features.${key}.title`)).toBeInTheDocument()
      expect(screen.getByText(`common.landing.features.${key}.description`)).toBeInTheDocument()
    }
  })

  it('rend une icône par fonctionnalité', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.querySelectorAll('svg')).toHaveLength(3)
  })

  it('n’utilise aucune couleur hex hardcodée', () => {
    const { container } = render(<FeaturesSection />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})

/**
 * #384 — UN SEUL propriétaire de la lévitation au survol des cartes.
 *
 * Le défaut corrigé : `FeaturesSection` posait `hover:-translate-y-2` (propriété `translate` en
 * Tailwind 4) sur un élément déjà levé par `.feature-card:hover { transform: translateY(-10px) }`
 * (`styles/landing.css`, hors layer). Deux propriétés DIFFÉRENTES, donc aucun conflit de cascade
 * pour les départager : le navigateur les COMPOSE. Mesure de l'audit #340 : -18px au survol au
 * lieu de -10, et -13px sous 768px (palier `-5px`).
 *
 * CE QUE CES TESTS PROUVENT : qu'une seule des deux moitiés subsiste — l'absence d'utilitaire
 * `translate-*` sur la carte ET la présence de la règle CSS qui porte l'effet. Les deux assertions
 * vont ensemble : sans la seconde, supprimer l'effet entièrement rendrait le test vert.
 *
 * CE QU'ILS NE PROUVENT PAS : les pixels. jsdom ne fait ni mise en page ni cascade `@layer`
 * (PIT-S48) ; aucune mesure de -10px n'a de valeur ici. La distance réelle et la fluidité de la
 * transition relèvent de la vérification au navigateur, clair ET sombre.
 */
describe('FeaturesSection — lévitation au survol (#384)', () => {
  it('la carte ne porte aucune utilitaire `translate-*` — la levée appartient au CSS', () => {
    const { container } = render(<FeaturesSection />)
    const cards = container.querySelectorAll('.feature-card')
    expect(cards).toHaveLength(3)
    expect(
      Array.from(cards).flatMap((card) => translateUtilities(card.className)),
      'une utilitaire `translate-*` sur `.feature-card` s’AJOUTE au `transform` de ' +
        '`styles/landing.css` (propriétés distinctes en Tailwind 4) au lieu de le remplacer : ' +
        'la carte se lève de la somme des deux',
    ).toEqual([])
  })

  it('`.feature-card:hover` porte toujours la levée dans `landing.css`', () => {
    // Contrepartie du test ci-dessus : sans elle, retirer l’effet des DEUX côtés serait vert.
    const css = readFileSync(LANDING_CSS, 'utf8')
    expect(css).toMatch(/\.feature-card:hover\s*\{[^}]*transform:\s*translateY\(-10px\)/)
    expect(css).toMatch(/\.feature-card:hover\s*\{[^}]*transform:\s*translateY\(-5px\)/)
  })

  it('le détecteur voit la forme exacte que le Sprint 74 a retirée', () => {
    // Anti-vacuité : un détecteur devenu aveugle rendrait le premier test vert pour rien.
    expect(
      translateUtilities(
        'feature-card card-gradient-border transform shadow-lg hover:-translate-y-2 hover:shadow-md',
      ),
    ).toEqual(['hover:-translate-y-2'])
    expect(translateUtilities('md:translate-y-px -translate-y-[3px]')).toEqual([
      'md:translate-y-px',
      '-translate-y-[3px]',
    ])
    // `transition-all` ne doit pas être confondu avec une utilitaire de translation.
    expect(translateUtilities('transition-all duration-300 hover:shadow-md')).toEqual([])
  })
})
