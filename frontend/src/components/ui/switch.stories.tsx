import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from './switch'

const meta = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: 'Notifications', defaultChecked: true },
}

export const Off: Story = { args: { label: 'Mode sombre' } }

export const Disabled: Story = {
  args: { label: 'Indisponible', disabled: true },
}
