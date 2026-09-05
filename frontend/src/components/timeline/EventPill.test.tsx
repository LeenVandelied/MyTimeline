import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EventPill } from './EventPill'
import { makePositionedEvent } from './fixtures'
import { INK_DARK, INK_LIGHT } from '@/lib/color'
import { DEFAULT_COLOR } from '@/types/event'

/**
 * #192 — Tests de rendu EventPill. Composant présentation pur (aucune dep
 * next-intl/auth). On vérifie : data-testid/attrs préservés (dépendance E2E
 * #163), positionnement px, callback de sélection, et l'encre calculée par
 * contraste WCAG (BR-EVE-009 : pas de blanc hardcodé sur fond clair).
 */
describe('EventPill', () => {
  it('rend le titre et préserve data-testid + data-event-title', () => {
    render(
      <EventPill
        event={makePositionedEvent({ title: 'Péremption lait' })}
        ariaLabel="label a11y"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveAttribute('data-event-title', 'Péremption lait')
    expect(pill).toHaveTextContent('Péremption lait')
  })

  it('expose le label a11y fourni', () => {
    render(
      <EventPill
        event={makePositionedEvent()}
        ariaLabel="Péremption, à venir"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('timeline-event')).toHaveAttribute(
      'aria-label',
      'Péremption, à venir',
    )
  })

  it('positionne la pastille via leftPx/widthPx', () => {
    render(
      <EventPill
        event={makePositionedEvent({ leftPx: 80, widthPx: 200 })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill.style.left).toBe('80px')
    expect(pill.style.width).toBe('200px')
  })

  it('appelle onSelect avec l’event au clic', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const event = makePositionedEvent({ id: 'e42' })
    render(<EventPill event={event} ariaLabel="x" onSelect={onSelect} />)
    await user.click(screen.getByTestId('timeline-event'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(event)
  })

  it('calcule une encre foncée sur fond clair (BR-EVE-009, pas de blanc hardcodé)', () => {
    render(
      <EventPill
        event={makePositionedEvent({ color: '#A7B83A' })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill.style.getPropertyValue('--mt-evt-ink')).toBe(INK_DARK)
  })

  it('calcule une encre claire sur fond foncé', () => {
    render(
      <EventPill
        event={makePositionedEvent({ color: '#0B0C0E' })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    expect(pill.style.getPropertyValue('--mt-evt-ink')).toBe(INK_LIGHT)
  })

  // ==================== #228 — aria-hidden conditionnel ====================
  // Le span titre interne ne doit PAS rester masqué aux lecteurs d'écran quand
  // il est le SEUL rendu visible du titre (readableInside). Il ne redevient
  // décoratif (aria-hidden) que lorsque le titre est répété en libellé extérieur.
  describe('#228 aria-hidden conditionnel sur le span titre', () => {
    it('DÉMASQUE le span titre quand le contraste passe AA dedans (readableInside)', () => {
      // #3B62D4 → contraste ≥ 4.5:1 dedans → titre lisible DANS la barre, seul visible.
      render(
        <EventPill
          event={makePositionedEvent({ color: '#3B62D4' })}
          ariaLabel="x"
          onSelect={() => {}}
        />,
      )
      const pill = screen.getByTestId('timeline-event')
      const titleSpan = within(pill).getByText('Péremption')
      expect(titleSpan).not.toHaveAttribute('aria-hidden')
      // Pas de libellé extérieur : le titre tient (lisible) dans la barre.
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })

    // #393 — CRITÈRE D'ACCEPTATION rendu : un event créé SANS couleur explicite
    // (mapping → `DEFAULT_COLOR`) doit afficher son libellé DEDANS. Avant #393 ce
    // cas tombait dans le test suivant (libellé dehors) à l'état NORMAL.
    it('event sans couleur explicite (DEFAULT_COLOR) → libellé DEDANS, aucun libellé dehors', () => {
      render(
        <EventPill
          event={makePositionedEvent({ color: DEFAULT_COLOR })}
          ariaLabel="x"
          onSelect={() => {}}
        />,
      )
      const pill = screen.getByTestId('timeline-event')
      expect(within(pill).getByText('Péremption')).not.toHaveAttribute('aria-hidden')
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })

    it('GARDE aria-hidden sur le span titre quand le contraste échoue dedans (libellé répété dehors)', () => {
      // #6366f1 → max 4.47:1 < AA → titre répété DEHORS → span interne décoratif.
      // #393 : ce hex n'est PLUS le défaut de l'app, c'est un échantillon non conforme.
      render(
        <EventPill
          event={makePositionedEvent({ color: '#6366f1' })}
          ariaLabel="x"
          onSelect={() => {}}
        />,
      )
      const pill = screen.getByTestId('timeline-event')
      const titleSpan = within(pill).getByText('Péremption')
      expect(titleSpan).toHaveAttribute('aria-hidden', 'true')
      // Libellé extérieur présent (garde-fou #81) → titre non perdu visuellement.
      expect(screen.getByTestId('timeline-event-outside-label')).toBeInTheDocument()
    })
  })

  // ==================== #230 — event ARCHIVÉ grisé (BR-EVE-011/013) ====================
  describe('#230 rendu grisé d’un événement archivé', () => {
    const archivedEvent = (color = '#3B62D4') =>
      makePositionedEvent({
        color,
        extendedProps: {
          productId: 'prod-1',
          productName: 'Lait entier bio',
          category: 'Produits frais',
          type: 'duration',
          archived: true,
        },
      })

    it('un event archivé reste RENDU (grisé, pas masqué) et se signale par data-archived', () => {
      render(<EventPill event={archivedEvent()} ariaLabel="x" onSelect={() => {}} />)
      const pill = screen.getByTestId('timeline-event')
      // Critère #230 : « grisé plutôt que simplement absent ».
      expect(pill).toBeInTheDocument()
      expect(pill).toHaveAttribute('data-archived', 'true')
      expect(pill).toHaveClass('mt-tlv__evt--archived')
    })

    it('la classe d’opacité `.mt-evt--archived` reste cantonnée à la pastille DÉCORATIVE', () => {
      // Décision #307 reprise ici : `opacity:.45` sur la barre ferait passer le
      // TITRE sous AA. La barre est désaturée sans opacité (`--archived`), seul le
      // point de statut (aria-hidden) porte `.mt-evt--archived`.
      const { container } = render(
        <EventPill event={archivedEvent()} ariaLabel="x" onSelect={() => {}} />,
      )
      const pill = screen.getByTestId('timeline-event')
      expect(pill).not.toHaveClass('mt-evt--archived')
      const dot = container.querySelector('.mt-tlv__evt-dot')
      expect(dot).toHaveClass('mt-evt--archived')
      expect(dot).toHaveAttribute('aria-hidden', 'true')
    })

    it('un event ACTIF ne porte ni la classe ni l’attribut (non-régression)', () => {
      const { container } = render(
        <EventPill event={makePositionedEvent()} ariaLabel="x" onSelect={() => {}} />,
      )
      const pill = screen.getByTestId('timeline-event')
      expect(pill).not.toHaveAttribute('data-archived')
      expect(pill).not.toHaveClass('mt-tlv__evt--archived')
      expect(container.querySelector('.mt-tlv__evt-dot')).not.toHaveClass('mt-evt--archived')
    })

    /**
     * Correction review S61 — le grisage archivé faisait passer le titre sous AA
     * pour ~8 % des couleurs hex : l'encre était calculée sur la couleur d'ORIGINE
     * alors que le DS peint un gris plus sombre (`filter: grayscale(1)`, pondération
     * sur canaux gamma-encodés), et noir/blanc sont des points fixes du filtre.
     */
    it('#0078F8 ARCHIVÉ → encre recalculée sur le gris peint (blanc, 5.57:1), titre DEDANS', () => {
      render(<EventPill event={archivedEvent('#0078F8')} ariaLabel="x" onSelect={() => {}} />)
      const pill = screen.getByTestId('timeline-event')
      // Avant : INK_DARK conservée, soit 3.51:1 sur le gris #686868 → échec AA muet.
      expect(pill.style.getPropertyValue('--mt-evt-ink')).toBe(INK_LIGHT)
      expect(within(pill).getByText('Péremption')).not.toHaveAttribute('aria-hidden')
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })

    it('#0078F8 NON archivé → encre et rendu STRICTEMENT inchangés (non-régression)', () => {
      render(
        <EventPill
          event={makePositionedEvent({ color: '#0078F8' })}
          ariaLabel="x"
          onSelect={() => {}}
        />,
      )
      const pill = screen.getByTestId('timeline-event')
      expect(pill.style.getPropertyValue('--mt-evt-ink')).toBe(INK_DARK)
      expect(within(pill).getByText('Péremption')).not.toHaveAttribute('aria-hidden')
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })

    it('#008DFF ARCHIVÉ → aucune encre ne passe sur le gris → LIBELLÉ DEHORS', () => {
      // Le cas que le garde-fou d'origine ratait : lisible avant grisage (5.83:1),
      // gris `#777777` après, meilleur ratio 4.48 → sous AA, repli obligatoire.
      render(<EventPill event={archivedEvent('#008DFF')} ariaLabel="x" onSelect={() => {}} />)
      const pill = screen.getByTestId('timeline-event')
      expect(within(pill).getByText('Péremption')).toHaveAttribute('aria-hidden', 'true')
      expect(screen.getByTestId('timeline-event-outside-label')).toBeInTheDocument()
    })

    it('#008DFF NON archivé → titre DEDANS (le repli ne se déclenche pas à tort)', () => {
      render(
        <EventPill
          event={makePositionedEvent({ color: '#008DFF' })}
          ariaLabel="x"
          onSelect={() => {}}
        />,
      )
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })

    it('fond très foncé archivé → l’encre BLANCHE est conservée (chemin non dégradé)', () => {
      render(<EventPill event={archivedEvent('#0B0C0E')} ariaLabel="x" onSelect={() => {}} />)
      expect(
        screen.getByTestId('timeline-event').style.getPropertyValue('--mt-evt-ink'),
      ).toBe(INK_LIGHT)
    })

    it('un archivé reste CLIQUABLE (le grisage n’est pas une désactivation)', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      const event = archivedEvent()
      render(<EventPill event={event} ariaLabel="x" onSelect={onSelect} />)
      await user.click(screen.getByTestId('timeline-event'))
      expect(onSelect).toHaveBeenCalledWith(event)
    })
  })
})
