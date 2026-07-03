import type { Meta, StoryObj } from '@storybook/react'
import { Radio } from './radio'

const meta = {
  title: 'UI/Radio',
  component: Radio,
  tags: ['autodocs'],
} satisfies Meta<typeof Radio>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { name: 'demo', label: 'Événement ponctuel', defaultChecked: true },
}

export const Disabled: Story = {
  args: { name: 'demo-d', label: 'Indisponible', disabled: true },
}

/** Groupe de radios (type d'événement). */
export const Group: Story = {
  render: () => (
    <div
      role="radiogroup"
      aria-label="Type d'événement"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <Radio name="event-type" defaultChecked label="Ponctuel" />
      <Radio name="event-type" label="Durée" />
      <Radio name="event-type" label="Récurrent" />
    </div>
  ),
}
