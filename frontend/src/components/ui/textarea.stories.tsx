import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './textarea'

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: { invalid: { control: 'boolean' } },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { placeholder: 'Notes sur le produit…' },
}

export const Invalid: Story = {
  args: { placeholder: 'Champ requis', invalid: true },
}

export const Disabled: Story = {
  args: { placeholder: 'Indisponible', disabled: true },
}

export const WithLabel: Story = {
  render: () => (
    <label className="mt-field" style={{ maxWidth: 320 }}>
      <span className="mt-label">Description</span>
      <Textarea placeholder="Détails, référence, numéro de contrat…" />
    </label>
  ),
}
