import type { Meta, StoryObj } from '@storybook/react-vite'
import { Cursor } from './Cursor'

/**
 * #47 — Cursor : indicateur « maintenant ». Positionné en absolu, il exige un
 * parent `relative` avec de la hauteur — fourni par le décorateur.
 */
const meta = {
  title: 'Timeline/Cursor',
  component: Cursor,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-surface-2 relative h-32 w-full min-w-[600px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
  args: {
    positionPercent: 40,
  },
} satisfies Meta<typeof Cursor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Début de fenêtre. */
export const Start: Story = { args: { positionPercent: 0 } }

/** Fin de fenêtre. */
export const End: Story = { args: { positionPercent: 100 } }

/** Hors fenêtre / indicateur désactivé → rien n'est rendu. */
export const Hidden: Story = { args: { positionPercent: null } }
