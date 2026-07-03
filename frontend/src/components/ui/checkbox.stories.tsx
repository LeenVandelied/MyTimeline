import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'

/**
 * Checkbox (Radix) — coche/focus adossés aux tokens Graphite via `@theme`
 * (`bg-primary` cochée, `ring-ring` focus → tokens DS).
 */
const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { defaultChecked: true } }

export const Disabled: Story = { args: { disabled: true } }

export const WithLabel: Story = {
  render: () => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <Checkbox defaultChecked />
      <span style={{ fontSize: 14 }}>Rappel avant échéance</span>
    </label>
  ),
}
