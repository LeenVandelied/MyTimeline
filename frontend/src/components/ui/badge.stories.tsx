import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'solid', 'accent', 'success', 'warning', 'danger', 'info'],
    },
    dot: { control: 'boolean' },
    dashed: { control: 'boolean' },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'Brouillon' } }

export const Solid: Story = { args: { variant: 'solid', children: 'Actif' } }

export const StatusDot: Story = {
  args: { variant: 'success', dot: true, children: 'En cours' },
}

/** Statuts calculés (expired / ongoing / upcoming) + variantes de contour. */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <Badge>Défaut</Badge>
      <Badge variant="solid">Solide</Badge>
      <Badge variant="accent">Accent</Badge>
      <Badge variant="success" dot>
        En cours
      </Badge>
      <Badge variant="warning" dot>
        Bientôt
      </Badge>
      <Badge variant="danger" dot>
        Expiré
      </Badge>
      <Badge variant="info">Info</Badge>
      <Badge dashed>Ébauche</Badge>
    </div>
  ),
}
