import type { Meta, StoryObj } from '@storybook/react-vite'
import { Ruler } from './Ruler'
import { makeDays } from './fixtures'

/**
 * #47 — Ruler : en-tête complet (colonne ressources + grille de jours composée
 * de DateStamp). Le `now` tombe sur le 3e jour de la fenêtre → highlight visible.
 */
const days = makeDays(14, new Date(2026, 6, 1))

const meta = {
  title: 'Timeline/Ruler',
  component: Ruler,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-w-[800px]">
        <Story />
      </div>
    ),
  ],
  args: {
    days,
    locale: 'fr-FR',
    now: new Date(2026, 6, 3),
    productsLabel: 'Produits',
  },
} satisfies Meta<typeof Ruler>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Fenêtre pleine de 30 jours (comme le dashboard). */
export const ThirtyDays: Story = {
  args: { days: makeDays(30, new Date(2026, 6, 1)) },
}
