import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tag } from './tag'

const meta = {
  title: 'UI/Tag',
  component: Tag,
  tags: ['autodocs'],
} satisfies Meta<typeof Tag>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'Assurance' } }

/** Pastille couleur issue de la palette event (token `--color-evt-*`). */
export const WithSwatch: Story = {
  args: { children: 'Véhicule', swatch: 'var(--color-evt-sky)' },
}

export const Removable: Story = {
  args: {
    children: 'Médical',
    swatch: 'var(--color-evt-rose)',
    onRemove: () => {},
    removeLabel: 'Retirer Médical',
  },
}

export const List: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Tag swatch="var(--color-evt-cobalt)">Assurance</Tag>
      <Tag swatch="var(--color-evt-grass)">Alimentation</Tag>
      <Tag swatch="var(--color-evt-amber)">Véhicule</Tag>
      <Tag>Sans couleur</Tag>
    </div>
  ),
}
