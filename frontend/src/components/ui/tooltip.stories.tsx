import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tooltip } from './tooltip'
import { IconButton } from './icon-button'
import { Info } from 'lucide-react'

/**
 * Tooltip — la bulle se révèle au survol ET au focus clavier (`:focus-within`).
 * Le canvas Storybook garde de la marge pour laisser la bulle s'afficher au-dessus.
 */
const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '48px 24px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    content: 'Renouvellement chaque année',
    children: (
      <IconButton aria-label="Informations">
        <Info aria-hidden="true" />
      </IconButton>
    ),
  },
}
