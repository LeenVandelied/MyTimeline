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
describe('#595 EventPill — glyphe ↻ des séries récurrentes', () => {
  const recurringProps = {
    productId: 'prod-1',
    productName: 'Lait entier bio',
    category: 'Produits frais',
    isRecurring: true,
    recurrenceUnit: 'MONTH' as const,
  }

  it('barre récurrente : `↻` décoratif en préfixe du titre (mono, aria-hidden)', () => {
    render(
      <EventPill
        event={makePositionedEvent({
          title: 'Assurance',
          extendedProps: { ...recurringProps, type: 'duration' },
        })}
        ariaLabel="Assurance, récurrent chaque mois"
        onSelect={() => {}}
      />,
    )
    const pill = screen.getByTestId('timeline-event')
    const glyph = pill.querySelector('.mt-evt-recur')
    expect(glyph).toHaveTextContent('↻')
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
    // Préfixe : le glyphe précède le titre ; aucune classe de retournement RTL.
    expect(glyph?.nextElementSibling).toHaveTextContent('Assurance')
    expect(glyph).not.toHaveClass('mt-dir-icon')
    expect(pill).toHaveAttribute('aria-label', 'Assurance, récurrent chaque mois')
  })

  it('pin récurrent : libellé « ↻ » + titre, glyphe aria-hidden', () => {
    render(
      <EventPill
        event={makePositionedEvent({
          title: 'Vidange',
          extendedProps: { ...recurringProps, type: 'single' },
        })}
        ariaLabel="Vidange"
        onSelect={() => {}}
      />,
    )
    const label = screen.getByTestId('timeline-event').querySelector('.mt-evt-pin__label')
    expect(label).toHaveTextContent('↻ Vidange')
    expect(label?.querySelector('.mt-evt-pin__recur')).toHaveAttribute('aria-hidden', 'true')
  })

  it('BR-EVE-006 : sans unité de récurrence, aucun glyphe', () => {
    render(
      <EventPill
        event={makePositionedEvent({
          extendedProps: { ...recurringProps, recurrenceUnit: null, type: 'duration' },
        })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('timeline-event').querySelector('.mt-evt-recur')).toBeNull()
  })
})

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

  // ==================== #594 — ponctuel = pin + libellé ====================
  describe('#594 rendu pin d’un événement ponctuel', () => {
    const single = (over: Partial<Parameters<typeof makePositionedEvent>[0]> = {}) =>
      makePositionedEvent({
        leftPx: 80,
        widthPx: 100,
        extendedProps: {
          productId: 'prod-1',
          productName: 'Lait entier bio',
          category: 'Produits frais',
          type: 'single',
        },
        ...over,
      })

    it('ponctuel → pin + libellé ; durée → barre (attribut data-event-kind, même testid)', () => {
      const { container, rerender } = render(
        <EventPill event={single()} ariaLabel="x" onSelect={() => {}} />,
      )
      const pin = screen.getByTestId('timeline-event')
      expect(pin).toHaveAttribute('data-event-kind', 'single')
      expect(pin).toHaveClass('mt-tlv__evt--pin')
      expect(container.querySelector('.mt-evt-pin')).toHaveAttribute('aria-hidden', 'true')
      expect(container.querySelector('.mt-tlv__evt-dot')).toBeNull()

      rerender(<EventPill event={makePositionedEvent()} ariaLabel="x" onSelect={() => {}} />)
      const bar = screen.getByTestId('timeline-event')
      expect(bar).toHaveAttribute('data-event-kind', 'duration')
      expect(bar).not.toHaveClass('mt-tlv__evt--pin')
      expect(container.querySelector('.mt-evt-pin')).toBeNull()
    })

    it('centré sur la date (left − 5) et SANS largeur posée : le pin ne s’étire pas', () => {
      render(<EventPill event={single()} ariaLabel="x" onSelect={() => {}} />)
      const pin = screen.getByTestId('timeline-event')
      expect(pin.style.left).toBe('75px')
      // `widthPx` est une emprise réservée (100 px), pas une largeur à peindre.
      expect(pin.style.width).toBe('')
      expect(pin.style.getPropertyValue('--mt-evt')).toBe('#6366f1')
    })

    it('libellé DANS la cible, non masqué, et JAMAIS de libellé extérieur de secours', () => {
      // #6366f1 fait sortir le libellé d'une BARRE (4.47:1) : pour un pin le
      // garde-fou est sans objet — un seul libellé, toujours sur le fond de lane.
      render(<EventPill event={single()} ariaLabel="Péremption, à venir" onSelect={() => {}} />)
      const pin = screen.getByTestId('timeline-event')
      const label = within(pin).getByText('Péremption')
      expect(label).toHaveClass('mt-evt-pin__label')
      expect(label).not.toHaveAttribute('aria-hidden')
      expect(pin.style.getPropertyValue('--mt-evt-ink')).toBe('')
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })

    it('conserve roving tabindex, data-evt-nav, ref, clavier et état archivé (#81, #230)', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      const onKeyDown = vi.fn()
      const pillRef = vi.fn()
      const event = single({
        extendedProps: {
          productId: 'prod-1',
          productName: 'Lait entier bio',
          category: 'Produits frais',
          type: 'single',
          archived: true,
        },
      })
      render(
        <EventPill
          event={event}
          ariaLabel="x"
          onSelect={onSelect}
          tabIndex={0}
          navKey="0:1"
          onKeyDown={onKeyDown}
          pillRef={pillRef}
        />,
      )
      const pin = screen.getByTestId('timeline-event')
      expect(pin).toHaveAttribute('tabindex', '0')
      expect(pin).toHaveAttribute('data-evt-nav', '0:1')
      expect(pin).toHaveAttribute('data-archived', 'true')
      expect(pin).toHaveClass('mt-tlv__evt--archived')
      expect(pillRef).toHaveBeenCalledWith(pin)
      // Clic sur le LIBELLÉ : il fait partie de la cible.
      await user.click(within(pin).getByText('Péremption'))
      expect(onSelect).toHaveBeenCalledWith(event)
      pin.focus()
      await user.keyboard('{ArrowRight}')
      expect(onKeyDown).toHaveBeenCalled()
    })
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
      expect(screen.getByTestId('timeline-event').style.getPropertyValue('--mt-evt-ink')).toBe(
        INK_LIGHT,
      )
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

describe('#746 EventPill — libellés bornés à leur réserve d’empilage', () => {
  it('pin : `--mt-label-max` = emprise − 11 px, `title` = titre complet', () => {
    const title = 'Steuererklärung für das Geschäftsjahr abgeben'
    render(
      <EventPill
        event={makePositionedEvent({
          title,
          widthPx: 180,
          extendedProps: {
            productId: 'prod-1',
            productName: 'P',
            category: 'C',
            type: 'single',
          },
        })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const label = screen.getByTestId('timeline-event').querySelector('.mt-evt-pin__label')
    expect(label).toHaveAttribute('title', title)
    expect((label as HTMLElement).style.getPropertyValue('--mt-label-max')).toBe('169px')
  })

  it('libellé extérieur : `--mt-label-max` = réserve − écart 6 px, `title` complet', () => {
    render(
      <EventPill
        event={makePositionedEvent({ color: '#787878', labelTrailPx: 120 })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const outside = screen.getByTestId('timeline-event-outside-label')
    expect(outside).toHaveAttribute('title', 'Péremption')
    expect(outside.style.getPropertyValue('--mt-label-max')).toBe('114px')
    expect(outside.style.left).toBe(`${40 + 120 + 6}px`)
  })

  it('libellé extérieur sans réserve (`labelTrailPx` absent) : repli CSS, pas de variable', () => {
    render(
      <EventPill
        event={makePositionedEvent({ color: '#787878' })}
        ariaLabel="x"
        onSelect={() => {}}
      />,
    )
    const outside = screen.getByTestId('timeline-event-outside-label')
    expect(outside.style.getPropertyValue('--mt-label-max')).toBe('')
  })
})
