import type { Meta, StoryObj } from '@storybook/react-vite'
import { EventBar } from './EventBar'
import { makeEvent, stubEventContent } from './fixtures'

/**
 * #47 — EventBar : barre d'événement positionnée.
 * La pastille de statut (expired/ongoing/upcoming) mappe les tokens
 * `--color-*`. Les stories injectent `renderContent={stubEventContent}` pour
 * éviter les dépendances next-intl/auth d'`EventContent` (le défaut runtime).
 * Décorateur = piste `relative` (une EventBar se positionne en absolu).
 */
const meta = {
  title: 'Timeline/EventBar',
  component: EventBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-surface-2 border-rule relative h-16 w-full min-w-[600px] border">
        <div className="relative h-full">
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    event: makeEvent(),
    renderContent: stubEventContent,
  },
} satisfies Meta<typeof EventBar>

export default meta
type Story = StoryObj<typeof meta>

export const Upcoming: Story = {
  args: { event: makeEvent({ status: 'upcoming', leftPercent: 10, widthPercent: 20 }) },
}

export const Ongoing: Story = {
  args: {
    event: makeEvent({ title: 'En cours', status: 'ongoing', leftPercent: 35, widthPercent: 25 }),
  },
}

export const Expired: Story = {
  args: {
    event: makeEvent({ title: 'Expiré', status: 'expired', leftPercent: 5, widthPercent: 15 }),
  },
}

/** Les trois statuts côte à côte sur une même piste. */
export const AllStatuses: Story = {
  render: (args) => (
    <>
      <EventBar
        {...args}
        event={makeEvent({ title: 'Expiré', status: 'expired', leftPercent: 2, widthPercent: 22 })}
      />
      <EventBar
        {...args}
        event={makeEvent({
          id: 'evt-2',
          title: 'En cours',
          status: 'ongoing',
          leftPercent: 30,
          widthPercent: 22,
        })}
      />
      <EventBar
        {...args}
        event={makeEvent({
          id: 'evt-3',
          title: 'À venir',
          status: 'upcoming',
          leftPercent: 60,
          widthPercent: 22,
        })}
      />
    </>
  ),
}
