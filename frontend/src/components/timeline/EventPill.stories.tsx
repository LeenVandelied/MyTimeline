import type { Meta, StoryObj } from '@storybook/react-vite'
import { EventPill } from './EventPill'
import { makePositionedEvent } from './fixtures'

/**
 * #192 — EventPill : rendu compact d'un event sur la frise desktop (#55).
 * Point de statut + titre tronqué, positionné en px (`leftPx`/`widthPx`).
 * L'encre du texte est calculée par contraste WCAG (`--mt-evt-ink`), lisible
 * sur les fonds clairs comme foncés de la palette event (BR-EVE-009).
 * Décorateur = lane `relative` (la pastille se positionne en absolu).
 */
const meta = {
  title: 'Timeline/EventPill',
  component: EventPill,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-surface-2 border-rule relative h-16 w-full min-w-[600px] border">
        <Story />
      </div>
    ),
  ],
  args: {
    event: makePositionedEvent(),
    ariaLabel: 'Péremption, à venir, 5 juil. 2026 – 10 juil. 2026, Lait entier bio',
    onSelect: () => {},
  },
} satisfies Meta<typeof EventPill>

export default meta
type Story = StoryObj<typeof meta>

export const Upcoming: Story = {
  args: { event: makePositionedEvent({ status: 'upcoming', leftPx: 40, widthPx: 120 }) },
}

export const Ongoing: Story = {
  args: {
    event: makePositionedEvent({ title: 'En cours', status: 'ongoing', leftPx: 40, widthPx: 140 }),
  },
}

export const Expired: Story = {
  args: {
    event: makePositionedEvent({ title: 'Expiré', status: 'expired', leftPx: 40, widthPx: 100 }),
  },
}

/** Fond clair : l'encre bascule en foncé (contraste WCAG), pas de blanc illisible. */
export const LightBackground: Story = {
  args: {
    event: makePositionedEvent({ title: 'Citron', color: '#A7B83A', leftPx: 40, widthPx: 120 }),
  },
}

/** Les trois statuts échelonnés sur la même lane. */
export const AllStatuses: Story = {
  render: (args) => (
    <>
      <EventPill
        {...args}
        event={makePositionedEvent({ title: 'Expiré', status: 'expired', leftPx: 10, widthPx: 110 })}
      />
      <EventPill
        {...args}
        event={makePositionedEvent({
          id: 'evt-2',
          title: 'En cours',
          status: 'ongoing',
          leftPx: 150,
          widthPx: 110,
        })}
      />
      <EventPill
        {...args}
        event={makePositionedEvent({
          id: 'evt-3',
          title: 'À venir',
          status: 'upcoming',
          leftPx: 290,
          widthPx: 110,
        })}
      />
    </>
  ),
}
