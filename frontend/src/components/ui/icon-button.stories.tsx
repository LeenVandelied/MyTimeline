import type { Meta, StoryObj } from '@storybook/react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { IconButton } from './icon-button'

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    variant: { control: 'inline-radio', options: ['default', 'ghost'] },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { 'aria-label': 'Ajouter', children: <Plus aria-hidden="true" /> },
}

export const Ghost: Story = {
  args: {
    'aria-label': 'Rechercher',
    variant: 'ghost',
    children: <Search aria-hidden="true" />,
  },
}

export const Small: Story = {
  args: {
    'aria-label': 'Supprimer',
    size: 'sm',
    children: <Trash2 aria-hidden="true" />,
  },
}

export const AllVariants: Story = {
  args: { 'aria-label': 'Ajouter' },
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconButton aria-label="Ajouter">
        <Plus aria-hidden="true" />
      </IconButton>
      <IconButton aria-label="Ajouter (sm)" size="sm">
        <Plus aria-hidden="true" />
      </IconButton>
      <IconButton aria-label="Rechercher" variant="ghost">
        <Search aria-hidden="true" />
      </IconButton>
      <IconButton aria-label="Supprimer" disabled>
        <Trash2 aria-hidden="true" />
      </IconButton>
    </div>
  ),
}
