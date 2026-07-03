import type { Meta, StoryObj } from '@storybook/react-vite'
import { Lane } from './Lane'
import { makeDays, makeEvent, sampleResource, stubEventContent } from './fixtures'

/**
 * #47 — Lane : ligne de ressource complète (titre + séparateurs de jours +
 * EventBars). data-testid `timeline-resource-row` / `timeline-resource-title`.
 * `renderEventContent={stubEventContent}` évite les deps d'`EventContent`.
 */
const days = makeDays(14, new Date(2026, 6, 1))
const dayKeys = days.map((d) => d.toISOString())

const meta = {
  title: 'Timeline/Lane',
  component: Lane,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-w-[800px]">
        <Story />
      </div>
    ),
  ],
  args: {
    resource: sampleResource,
    daysCount: days.length,
    dayKeys,
    renderEventContent: stubEventContent,
    events: [
      makeEvent({ id: 'e1', title: 'Expiré', status: 'expired', leftPercent: 3, widthPercent: 18 }),
      makeEvent({
        id: 'e2',
        title: 'En cours',
        status: 'ongoing',
        leftPercent: 40,
        widthPercent: 22,
      }),
      makeEvent({
        id: 'e3',
        title: 'À venir',
        status: 'upcoming',
        leftPercent: 70,
        widthPercent: 20,
      }),
    ],
  },
} satisfies Meta<typeof Lane>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Ligne vide (ressource sans event dans la fenêtre). */
export const Empty: Story = {
  args: { events: [] },
}
