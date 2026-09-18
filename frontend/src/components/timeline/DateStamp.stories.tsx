import type { Meta, StoryObj } from '@storybook/react-vite'
import { DateStamp } from './DateStamp'

/**
 * #47 — DateStamp : cellule de jour de l'en-tête Timeline.
 * Highlight `bg-accent-soft` quand le jour === `now`. Rendu dans une grille pour
 * matérialiser les bordures (`border-r`).
 */
const now = new Date(2026, 6, 3)

const meta = {
  title: 'Timeline/DateStamp',
  component: DateStamp,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="grid w-40 grid-cols-1">
        <Story />
      </div>
    ),
  ],
  args: {
    day: new Date(2026, 6, 5),
    locale: 'fr-FR',
    now,
  },
} satisfies Meta<typeof DateStamp>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Le jour courant : fond accentué. */
export const Today: Story = {
  args: { day: now },
}

/** Rendu en anglais (Intl weekday short). */
export const EnLocale: Story = {
  args: { locale: 'en-US' },
}
